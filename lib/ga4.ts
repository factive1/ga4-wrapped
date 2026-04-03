import { cache } from "react"
import { OAuth2Client } from "google-auth-library"
import type { DateRangeParams, MetricCardData, TimeSeriesPoint, TableRow } from "./types"
import { getComparisonRange, formatDate, formatNumber, formatDuration, formatPercent } from "./date-utils"
import { createTTLCache } from "./cache"

// Google client libraries use CommonJS; require() avoids ESM interop issues
const { BetaAnalyticsDataClient } =
  require("@google-analytics/data") as typeof import("@google-analytics/data")

// ─── Singleton client per request (React.cache deduplicates within a render) ─

const getDataClient = cache((accessToken: string) => {
  const oauth2Client = new OAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  // The Google client library accepts OAuth2Client but the types don't fully align
  return new BetaAnalyticsDataClient({ authClient: oauth2Client as never })
})

// ─── GA4 response types ─────────────────────────────────────────────────────

interface GA4DimensionValue {
  value?: string | null
}

interface GA4MetricValue {
  value?: string | null
}

interface GA4Row {
  dimensionValues?: GA4DimensionValue[]
  metricValues?: GA4MetricValue[]
}

interface GA4ReportResponse {
  rows?: GA4Row[]
  propertyQuota?: unknown
}

// ─── TTL-based report cache ─────────────────────────────────────────────────

const reportCache = createTTLCache<unknown>(500)

function reportCacheKey(propertyId: string, dateRange: DateRangeParams, config: ReportConfig): string {
  return `report:${propertyId}:${dateRange.from}:${dateRange.to}:${JSON.stringify(config)}`
}

/** Returns TTL in ms: historical ranges (end < today) get 1 hour, current ranges get 5 minutes */
function getTTL(dateRange: DateRangeParams): number {
  const today = formatDate(new Date())
  if (dateRange.to < today) return 60 * 60 * 1000 // 1 hour for historical data
  return 5 * 60 * 1000 // 5 minutes for ranges including today
}

// ─── Generic report helpers ──────────────────────────────────────────────────

interface ReportConfig {
  dimensions: string[]
  metrics: string[]
  orderBy?: { metric?: string; dimension?: string; desc?: boolean }
  limit?: number
  dimensionFilter?: {
    filter?: {
      fieldName: string
      stringFilter: { value: string; matchType?: string }
    }
  }
}

async function runWithRetry(
  client: InstanceType<typeof BetaAnalyticsDataClient>,
  method: "runReport" | "runRealtimeReport",
  request: unknown,
  retries = 3
): Promise<[GA4ReportResponse]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (client as any)[method](request)
    } catch (error: unknown) {
      const err = error as { code?: number }
      if (err.code === 429 && attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
        continue
      }
      throw error
    }
  }
  throw new Error("Max retries exceeded")
}

function mapRows(
  rows: GA4Row[],
  dimKeys: string[],
  metricKeys: string[],
  defaults?: Record<string, string>
): TableRow[] {
  return rows.map((row) => {
    const obj: TableRow = {}
    dimKeys.forEach((key, i) => {
      obj[key] = row.dimensionValues?.[i]?.value ?? defaults?.[key] ?? ""
    })
    metricKeys.forEach((key, i) => {
      obj[key] = Number(row.metricValues?.[i]?.value ?? 0)
    })
    return obj
  })
}

const runReport = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams,
    config: ReportConfig
  ): Promise<TableRow[]> => {
    const cacheKey = reportCacheKey(propertyId, dateRange, config)
    const cached = reportCache.get(cacheKey) as TableRow[] | undefined
    if (cached) return cached

    const client = getDataClient(accessToken)
    const [response] = await runWithRetry(client, "runReport", {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: config.dimensions.map((name) => ({ name })),
      metrics: config.metrics.map((name) => ({ name })),
      orderBys: config.orderBy
        ? [
            config.orderBy.metric
              ? { metric: { metricName: config.orderBy.metric }, desc: config.orderBy.desc ?? true }
              : { dimension: { dimensionName: config.orderBy.dimension } },
          ]
        : undefined,
      limit: config.limit ?? 500,
      dimensionFilter: config.dimensionFilter,
      returnPropertyQuota: true,
    })
    const result = mapRows(response.rows ?? [], config.dimensions, config.metrics)
    reportCache.set(cacheKey, result, getTTL(dateRange))
    return result
  }
)

// ─── Comparison metrics helper ──────────────────────────────────────────────

interface MetricDef {
  label: string
  fmt: (v: number) => string
}

/**
 * Fetches metrics with a comparison date range and produces MetricCardData[].
 * Shared by getOverviewMetrics and getEngagementMetrics to avoid duplication.
 */
async function getComparisonMetrics(
  accessToken: string,
  propertyId: string,
  dateRange: DateRangeParams,
  cachePrefix: string,
  metricNames: string[],
  defs: MetricDef[]
): Promise<MetricCardData[]> {
  const cacheKey = `${cachePrefix}:${propertyId}:${dateRange.from}:${dateRange.to}`
  const cached = reportCache.get(cacheKey) as MetricCardData[] | undefined
  if (cached) return cached

  const client = getDataClient(accessToken)
  const comparison = getComparisonRange(dateRange)

  const [response] = await runWithRetry(client, "runReport", {
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: dateRange.from, endDate: dateRange.to },
      { startDate: comparison.from, endDate: comparison.to },
    ],
    metrics: metricNames.map((name) => ({ name })),
    returnPropertyQuota: true,
  })

  const current = response.rows?.[0]?.metricValues ?? []
  const previous = response.rows?.[1]?.metricValues ?? []

  const result = defs.map(({ label, fmt }, idx) => {
    const curVal = Number(current[idx]?.value ?? 0)
    const prevVal = Number(previous[idx]?.value ?? 0)
    return { label, value: fmt(curVal), change: calcChange(curVal, prevVal) }
  })
  reportCache.set(cacheKey, result, getTTL(dateRange))
  return result
}

// ─── Overview ────────────────────────────────────────────────────────────────

export const getRealtimeActiveUsers = cache(
  async (accessToken: string, propertyId: string): Promise<number> => {
    const client = getDataClient(accessToken)
    const [response] = await runWithRetry(client, "runRealtimeReport", {
      property: `properties/${propertyId}`,
      metrics: [{ name: "activeUsers" }],
    })
    return Number(response.rows?.[0]?.metricValues?.[0]?.value ?? 0)
  }
)

export const getOverviewMetrics = cache(
  (accessToken: string, propertyId: string, dateRange: DateRangeParams): Promise<MetricCardData[]> =>
    getComparisonMetrics(
      accessToken,
      propertyId,
      dateRange,
      "overview",
      ["totalUsers", "sessions", "screenPageViews", "bounceRate", "averageSessionDuration"],
      [
        { label: "Users", fmt: formatNumber },
        { label: "Sessions", fmt: formatNumber },
        { label: "Pageviews", fmt: formatNumber },
        { label: "Bounce Rate", fmt: formatPercent },
        { label: "Avg. Session Duration", fmt: formatDuration },
      ]
    )
)

export const getUsersByDay = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TimeSeriesPoint[]> => {
    const rows = await runReport(accessToken, propertyId, dateRange, {
      dimensions: ["date"],
      metrics: ["totalUsers"],
      orderBy: { dimension: "date", desc: false },
    })
    return rows.map((r) => ({
      date: formatGA4Date(r.date as string),
      value: r.totalUsers as number,
    }))
  }
)

export const getTopPages = cache(
  async (accessToken: string, propertyId: string, dateRange: DateRangeParams, limit = 5) =>
    runReport(accessToken, propertyId, dateRange, {
      dimensions: ["pagePath"],
      metrics: ["screenPageViews"],
      orderBy: { metric: "screenPageViews" },
      limit,
    })
)

export const getTopSources = cache(
  async (accessToken: string, propertyId: string, dateRange: DateRangeParams, limit = 5) =>
    runReport(accessToken, propertyId, dateRange, {
      dimensions: ["sessionSource"],
      metrics: ["totalUsers"],
      orderBy: { metric: "totalUsers" },
      limit,
    })
)

// ─── Traffic ─────────────────────────────────────────────────────────────────

const TRAFFIC_METRICS = ["totalUsers", "sessions", "bounceRate", "averageSessionDuration"]

export const getTrafficByChannel = cache(
  (accessToken: string, propertyId: string, dateRange: DateRangeParams) =>
    runReport(accessToken, propertyId, dateRange, {
      dimensions: ["sessionDefaultChannelGroup"],
      metrics: TRAFFIC_METRICS,
      orderBy: { metric: "totalUsers" },
    })
)

export const getTrafficBySource = cache(
  (accessToken: string, propertyId: string, dateRange: DateRangeParams) =>
    runReport(accessToken, propertyId, dateRange, {
      dimensions: ["sessionSource", "sessionMedium"],
      metrics: TRAFFIC_METRICS,
      orderBy: { metric: "totalUsers" },
    })
)

export const getTrafficByCampaign = cache(
  (accessToken: string, propertyId: string, dateRange: DateRangeParams) =>
    runReport(accessToken, propertyId, dateRange, {
      dimensions: ["sessionCampaignName", "sessionSource", "sessionMedium"],
      metrics: TRAFFIC_METRICS,
      orderBy: { metric: "totalUsers" },
    })
)

// ─── Pages ───────────────────────────────────────────────────────────────────

export const getPageMetrics = cache(
  async (accessToken: string, propertyId: string, dateRange: DateRangeParams): Promise<TableRow[]> => {
    const rows = await runReport(accessToken, propertyId, dateRange, {
      dimensions: ["pagePath", "pageTitle"],
      metrics: ["screenPageViews", "totalUsers", "userEngagementDuration"],
      orderBy: { metric: "screenPageViews" },
    })
    return rows.map((r) => ({
      ...r,
      avgTimeOnPage:
        (r.screenPageViews as number) > 0
          ? (r.userEngagementDuration as number) / (r.screenPageViews as number)
          : 0,
    }))
  }
)

// ─── Engagement ──────────────────────────────────────────────────────────────

export const getEngagementMetrics = cache(
  (accessToken: string, propertyId: string, dateRange: DateRangeParams): Promise<MetricCardData[]> =>
    getComparisonMetrics(
      accessToken,
      propertyId,
      dateRange,
      "engagement",
      ["engagementRate", "userEngagementDuration", "screenPageViewsPerSession", "eventCountPerSession"],
      [
        { label: "Engagement Rate", fmt: (v: number) => formatPercent(v * 100) },
        { label: "Avg. Engaged Time", fmt: formatDuration },
        { label: "Pages / Session", fmt: (v: number) => v.toFixed(1) },
        { label: "Events / Session", fmt: (v: number) => v.toFixed(1) },
      ]
    )
)

export const getTopEvents = cache(
  (accessToken: string, propertyId: string, dateRange: DateRangeParams) =>
    runReport(accessToken, propertyId, dateRange, {
      dimensions: ["eventName"],
      metrics: ["eventCount", "totalUsers"],
      orderBy: { metric: "eventCount" },
    })
)

// ─── Conversions ─────────────────────────────────────────────────────────────

export const getConversionMetrics = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<{ cards: MetricCardData[]; byEvent: TableRow[] }> => {
    const cacheKey = `conversions:${propertyId}:${dateRange.from}:${dateRange.to}`
    const cached = reportCache.get(cacheKey) as { cards: MetricCardData[]; byEvent: TableRow[] } | undefined
    if (cached) return cached

    const client = getDataClient(accessToken)
    const comparison = getComparisonRange(dateRange)

    // Fire both requests in parallel (they are independent)
    const [summaryResult, eventResult] = await Promise.all([
      runWithRetry(client, "runReport", {
        property: `properties/${propertyId}`,
        dateRanges: [
          { startDate: dateRange.from, endDate: dateRange.to },
          { startDate: comparison.from, endDate: comparison.to },
        ],
        metrics: [{ name: "conversions" }, { name: "sessionConversionRate" }],
        returnPropertyQuota: true,
      }),
      runWithRetry(client, "runReport", {
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
        dimensions: [{ name: "eventName" }],
        metrics: [
          { name: "conversions" },
          { name: "totalUsers" },
          { name: "sessionConversionRate" },
        ],
        dimensionFilter: {
          filter: { fieldName: "isConversionEvent", stringFilter: { value: "true" } },
        },
        orderBys: [{ metric: { metricName: "conversions" }, desc: true }],
        limit: 500,
        returnPropertyQuota: true,
      }),
    ])

    const [summaryResponse] = summaryResult
    const [eventResponse] = eventResult
    const current = summaryResponse.rows?.[0]?.metricValues ?? []
    const previous = summaryResponse.rows?.[1]?.metricValues ?? []

    const cards: MetricCardData[] = [
      {
        label: "Total Conversions",
        value: formatNumber(Number(current[0]?.value ?? 0)),
        change: calcChange(Number(current[0]?.value ?? 0), Number(previous[0]?.value ?? 0)),
      },
      {
        label: "Conversion Rate",
        value: formatPercent(Number(current[1]?.value ?? 0) * 100),
        change: calcChange(Number(current[1]?.value ?? 0), Number(previous[1]?.value ?? 0)),
      },
    ]

    const byEvent = mapRows(
      eventResponse.rows ?? [],
      ["eventName"],
      ["conversions", "totalUsers", "sessionConversionRate"]
    )

    const result = { cards, byEvent }
    reportCache.set(cacheKey, result, getTTL(dateRange))
    return result
  }
)

export const getConversionsBySource = cache(
  (accessToken: string, propertyId: string, dateRange: DateRangeParams) =>
    runReport(accessToken, propertyId, dateRange, {
      dimensions: ["sessionSource", "sessionMedium"],
      metrics: ["conversions", "sessionConversionRate"],
      orderBy: { metric: "conversions" },
    })
)

// ─── Revenue ─────────────────────────────────────────────────────────────────

export const getRevenueMetrics = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<{ cards: MetricCardData[]; hasRevenue: boolean }> => {
    const cacheKey = `revenue:${propertyId}:${dateRange.from}:${dateRange.to}`
    const cached = reportCache.get(cacheKey) as { cards: MetricCardData[]; hasRevenue: boolean } | undefined
    if (cached) return cached

    const client = getDataClient(accessToken)
    const comparison = getComparisonRange(dateRange)

    const [response] = await runWithRetry(client, "runReport", {
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: dateRange.from, endDate: dateRange.to },
        { startDate: comparison.from, endDate: comparison.to },
      ],
      metrics: [
        { name: "totalRevenue" },
        { name: "transactions" },
        { name: "purchaseRevenue" },
      ],
      returnPropertyQuota: true,
    })

    const current = response.rows?.[0]?.metricValues ?? []
    const previous = response.rows?.[1]?.metricValues ?? []

    const revenue = Number(current[0]?.value ?? 0)
    const transactions = Number(current[1]?.value ?? 0)
    const avgOrderValue = transactions > 0 ? revenue / transactions : 0

    const result = {
      cards: [
        {
          label: "Total Revenue",
          value: `$${formatNumber(revenue)}`,
          change: calcChange(revenue, Number(previous[0]?.value ?? 0)),
        },
        {
          label: "Transactions",
          value: formatNumber(transactions),
          change: calcChange(transactions, Number(previous[1]?.value ?? 0)),
        },
        {
          label: "Avg. Order Value",
          value: `$${avgOrderValue.toFixed(2)}`,
          change: null,
        },
      ],
      hasRevenue: revenue > 0 || transactions > 0,
    }
    reportCache.set(cacheKey, result, getTTL(dateRange))
    return result
  }
)

export const getRevenueBySource = cache(
  (accessToken: string, propertyId: string, dateRange: DateRangeParams) =>
    runReport(accessToken, propertyId, dateRange, {
      dimensions: ["sessionSource", "sessionMedium"],
      metrics: ["totalRevenue", "transactions"],
      orderBy: { metric: "totalRevenue" },
    })
)

export const getRevenueByPage = cache(
  (accessToken: string, propertyId: string, dateRange: DateRangeParams) =>
    runReport(accessToken, propertyId, dateRange, {
      dimensions: ["landingPage"],
      metrics: ["totalRevenue", "transactions"],
      orderBy: { metric: "totalRevenue" },
    })
)

// ─── Devices ─────────────────────────────────────────────────────────────────

export const getFullDeviceTable = cache(
  (accessToken: string, propertyId: string, dateRange: DateRangeParams) =>
    runReport(accessToken, propertyId, dateRange, {
      dimensions: ["deviceCategory", "browser", "operatingSystem", "screenResolution"],
      metrics: ["totalUsers", "sessions"],
      orderBy: { metric: "totalUsers" },
    })
)

/** Aggregate full device table rows by a single dimension for donut charts */
export function aggregateByDimension(
  rows: TableRow[],
  dimension: string,
  metricKey = "totalUsers"
): TableRow[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = row[dimension] as string
    map.set(key, (map.get(key) ?? 0) + (row[metricKey] as number))
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([dim, val]) => ({ [dimension]: dim, [metricKey]: val }))
}

// ─── Geo ─────────────────────────────────────────────────────────────────────

export const getGeoMetrics = cache(
  (accessToken: string, propertyId: string, dateRange: DateRangeParams) =>
    runReport(accessToken, propertyId, dateRange, {
      dimensions: ["country", "city"],
      metrics: ["totalUsers", "sessions", "bounceRate", "averageSessionDuration"],
      orderBy: { metric: "totalUsers" },
    })
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatGA4Date(dateStr: string): string {
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }
  return dateStr
}

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}
