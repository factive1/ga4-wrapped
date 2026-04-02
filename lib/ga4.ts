import { cache } from "react"
import { OAuth2Client } from "google-auth-library"
import type { DateRangeParams, MetricCardData, TimeSeriesPoint, TableRow } from "./types"
import { getComparisonRange, formatNumber, formatDuration, formatPercent } from "./date-utils"

const { BetaAnalyticsDataClient } =
  require("@google-analytics/data") as typeof import("@google-analytics/data")

function createClient(accessToken: string) {
  const oauth2Client = new OAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  return new BetaAnalyticsDataClient({ authClient: oauth2Client as never })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runReportWithRetry(
  client: InstanceType<typeof BetaAnalyticsDataClient>,
  request: Parameters<typeof client.runReport>[0],
  retries = 3
): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await client.runReport(request)
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

// ─── Overview ────────────────────────────────────────────────────────────────

export const getRealtimeActiveUsers = cache(
  async (accessToken: string, propertyId: string): Promise<number> => {
    const client = createClient(accessToken)
    const [response] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: "activeUsers" }],
    })

    return Number(response.rows?.[0]?.metricValues?.[0]?.value ?? 0)
  }
)

export const getOverviewMetrics = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<MetricCardData[]> => {
    const client = createClient(accessToken)
    const comparison = getComparisonRange(dateRange)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: dateRange.from, endDate: dateRange.to },
        { startDate: comparison.from, endDate: comparison.to },
      ],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      returnPropertyQuota: true,
    })

    const current = response.rows?.[0]?.metricValues ?? []
    const previous = response.rows?.[1]?.metricValues ?? []

    const metrics = [
      { label: "Users", idx: 0, fmt: formatNumber, isNum: true },
      { label: "Sessions", idx: 1, fmt: formatNumber, isNum: true },
      { label: "Pageviews", idx: 2, fmt: formatNumber, isNum: true },
      { label: "Bounce Rate", idx: 3, fmt: formatPercent, isNum: false },
      { label: "Avg. Session Duration", idx: 4, fmt: formatDuration, isNum: false },
    ]

    return metrics.map(({ label, idx, fmt, isNum }) => {
      const curVal = Number(current[idx]?.value ?? 0)
      const prevVal = Number(previous[idx]?.value ?? 0)
      const change =
        prevVal === 0 ? null : ((curVal - prevVal) / prevVal) * 100

      return {
        label,
        value: isNum ? fmt(curVal) : fmt(curVal),
        change: change !== null ? Math.round(change * 10) / 10 : null,
      }
    })
  }
)

export const getUsersByDay = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TimeSeriesPoint[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "totalUsers" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      date: formatGA4Date(row.dimensionValues?.[0]?.value ?? ""),
      value: Number(row.metricValues?.[0]?.value ?? 0),
    }))
  }
)

export const getTopPages = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams,
    limit = 5
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit,
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      page: row.dimensionValues?.[0]?.value ?? "",
      pageviews: Number(row.metricValues?.[0]?.value ?? 0),
    }))
  }
)

export const getTopSources = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams,
    limit = 5
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "sessionSource" }],
      metrics: [{ name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit,
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      source: row.dimensionValues?.[0]?.value ?? "(direct)",
      users: Number(row.metricValues?.[0]?.value ?? 0),
    }))
  }
)

// ─── Traffic ─────────────────────────────────────────────────────────────────

export const getTrafficByChannel = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      channel: row.dimensionValues?.[0]?.value ?? "",
      users: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
      bounceRate: Number(row.metricValues?.[2]?.value ?? 0),
      avgDuration: Number(row.metricValues?.[3]?.value ?? 0),
    }))
  }
)

export const getTrafficBySource = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      source: row.dimensionValues?.[0]?.value ?? "(direct)",
      medium: row.dimensionValues?.[1]?.value ?? "(none)",
      users: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
      bounceRate: Number(row.metricValues?.[2]?.value ?? 0),
      avgDuration: Number(row.metricValues?.[3]?.value ?? 0),
    }))
  }
)

export const getTrafficByCampaign = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [
        { name: "sessionCampaignName" },
        { name: "sessionSource" },
        { name: "sessionMedium" },
      ],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      campaign: row.dimensionValues?.[0]?.value ?? "(not set)",
      source: row.dimensionValues?.[1]?.value ?? "",
      medium: row.dimensionValues?.[2]?.value ?? "",
      users: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
      bounceRate: Number(row.metricValues?.[2]?.value ?? 0),
      avgDuration: Number(row.metricValues?.[3]?.value ?? 0),
    }))
  }
)

// ─── Pages ───────────────────────────────────────────────────────────────────

export const getPageMetrics = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "totalUsers" },
        { name: "userEngagementDuration" },
      ],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => {
      const pageviews = Number(row.metricValues?.[0]?.value ?? 0)
      const engagementDuration = Number(row.metricValues?.[2]?.value ?? 0)
      return {
        path: row.dimensionValues?.[0]?.value ?? "",
        title: row.dimensionValues?.[1]?.value ?? "",
        pageviews,
        users: Number(row.metricValues?.[1]?.value ?? 0),
        avgTimeOnPage: pageviews > 0 ? engagementDuration / pageviews : 0,
      }
    })
  }
)

// ─── Engagement ──────────────────────────────────────────────────────────────

export const getEngagementMetrics = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<MetricCardData[]> => {
    const client = createClient(accessToken)
    const comparison = getComparisonRange(dateRange)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: dateRange.from, endDate: dateRange.to },
        { startDate: comparison.from, endDate: comparison.to },
      ],
      metrics: [
        { name: "engagementRate" },
        { name: "userEngagementDuration" },
        { name: "screenPageViewsPerSession" },
        { name: "eventCountPerSession" },
      ],
      returnPropertyQuota: true,
    })

    const current = response.rows?.[0]?.metricValues ?? []
    const previous = response.rows?.[1]?.metricValues ?? []

    const metrics = [
      { label: "Engagement Rate", idx: 0, fmt: (v: number) => formatPercent(v * 100) },
      { label: "Avg. Engaged Time", idx: 1, fmt: formatDuration },
      { label: "Pages / Session", idx: 2, fmt: (v: number) => v.toFixed(1) },
      { label: "Events / Session", idx: 3, fmt: (v: number) => v.toFixed(1) },
    ]

    return metrics.map(({ label, idx, fmt }) => {
      const curVal = Number(current[idx]?.value ?? 0)
      const prevVal = Number(previous[idx]?.value ?? 0)
      const change =
        prevVal === 0 ? null : ((curVal - prevVal) / prevVal) * 100

      return {
        label,
        value: fmt(curVal),
        change: change !== null ? Math.round(change * 10) / 10 : null,
      }
    })
  }
)

export const getTopEvents = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      event: row.dimensionValues?.[0]?.value ?? "",
      count: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0),
    }))
  }
)

// ─── Conversions ─────────────────────────────────────────────────────────────

export const getConversionMetrics = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<{ cards: MetricCardData[]; byEvent: TableRow[] }> => {
    const client = createClient(accessToken)
    const comparison = getComparisonRange(dateRange)

    const [summaryResponse] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: dateRange.from, endDate: dateRange.to },
        { startDate: comparison.from, endDate: comparison.to },
      ],
      metrics: [{ name: "conversions" }, { name: "sessionConversionRate" }],
      returnPropertyQuota: true,
    })

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

    const [eventResponse] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "eventName" }],
      metrics: [
        { name: "conversions" },
        { name: "totalUsers" },
        { name: "sessionConversionRate" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "isConversionEvent",
          stringFilter: { value: "true" },
        },
      },
      orderBys: [{ metric: { metricName: "conversions" }, desc: true }],
      returnPropertyQuota: true,
    })

    const byEvent = (eventResponse.rows ?? []).map((row: any) => ({
      event: row.dimensionValues?.[0]?.value ?? "",
      conversions: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0),
      rate: Number(row.metricValues?.[2]?.value ?? 0),
    }))

    return { cards, byEvent }
  }
)

export const getConversionsBySource = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "conversions" }, { name: "sessionConversionRate" }],
      orderBys: [{ metric: { metricName: "conversions" }, desc: true }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      source: row.dimensionValues?.[0]?.value ?? "(direct)",
      medium: row.dimensionValues?.[1]?.value ?? "(none)",
      conversions: Number(row.metricValues?.[0]?.value ?? 0),
      rate: Number(row.metricValues?.[1]?.value ?? 0),
    }))
  }
)

// ─── Revenue ─────────────────────────────────────────────────────────────────

export const getRevenueMetrics = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<MetricCardData[]> => {
    const client = createClient(accessToken)
    const comparison = getComparisonRange(dateRange)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: dateRange.from, endDate: dateRange.to },
        { startDate: comparison.from, endDate: comparison.to },
      ],
      metrics: [
        { name: "totalRevenue" },
        { name: "transactions" },
        { name: "totalRevenue" },
        { name: "purchaseRevenue" },
      ],
      returnPropertyQuota: true,
    })

    const current = response.rows?.[0]?.metricValues ?? []
    const previous = response.rows?.[1]?.metricValues ?? []

    const revenue = Number(current[0]?.value ?? 0)
    const transactions = Number(current[1]?.value ?? 0)
    const users = transactions > 0 ? revenue / transactions : 0

    return [
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
        label: "Revenue per Transaction",
        value: `$${users.toFixed(2)}`,
        change: null,
      },
      {
        label: "Avg. Order Value",
        value: transactions > 0 ? `$${(revenue / transactions).toFixed(2)}` : "$0",
        change: null,
      },
    ]
  }
)

export const getRevenueBySource = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [
        { name: "totalRevenue" },
        { name: "transactions" },
      ],
      orderBys: [{ metric: { metricName: "totalRevenue" }, desc: true }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      source: row.dimensionValues?.[0]?.value ?? "(direct)",
      medium: row.dimensionValues?.[1]?.value ?? "(none)",
      revenue: Number(row.metricValues?.[0]?.value ?? 0),
      transactions: Number(row.metricValues?.[1]?.value ?? 0),
    }))
  }
)

export const getRevenueByPage = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "landingPage" }],
      metrics: [
        { name: "totalRevenue" },
        { name: "transactions" },
      ],
      orderBys: [{ metric: { metricName: "totalRevenue" }, desc: true }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      page: row.dimensionValues?.[0]?.value ?? "",
      revenue: Number(row.metricValues?.[0]?.value ?? 0),
      transactions: Number(row.metricValues?.[1]?.value ?? 0),
    }))
  }
)

// ─── Devices ─────────────────────────────────────────────────────────────────

export const getDeviceBreakdown = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "totalUsers" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      device: row.dimensionValues?.[0]?.value ?? "",
      users: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
    }))
  }
)

export const getBrowserBreakdown = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "browser" }],
      metrics: [{ name: "totalUsers" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 10,
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      browser: row.dimensionValues?.[0]?.value ?? "",
      users: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
    }))
  }
)

export const getOSBreakdown = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "operatingSystem" }],
      metrics: [{ name: "totalUsers" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 10,
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      os: row.dimensionValues?.[0]?.value ?? "",
      users: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
    }))
  }
)

export const getFullDeviceTable = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [
        { name: "deviceCategory" },
        { name: "browser" },
        { name: "operatingSystem" },
        { name: "screenResolution" },
      ],
      metrics: [{ name: "totalUsers" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      device: row.dimensionValues?.[0]?.value ?? "",
      browser: row.dimensionValues?.[1]?.value ?? "",
      os: row.dimensionValues?.[2]?.value ?? "",
      resolution: row.dimensionValues?.[3]?.value ?? "",
      users: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
    }))
  }
)

// ─── Geo ─────────────────────────────────────────────────────────────────────

export const getGeoMetrics = cache(
  async (
    accessToken: string,
    propertyId: string,
    dateRange: DateRangeParams
  ): Promise<TableRow[]> => {
    const client = createClient(accessToken)

    const [response] = await runReportWithRetry(client, {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: dateRange.from, endDate: dateRange.to }],
      dimensions: [{ name: "country" }, { name: "city" }],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      returnPropertyQuota: true,
    })

    return (response.rows ?? []).map((row: any) => ({
      country: row.dimensionValues?.[0]?.value ?? "",
      city: row.dimensionValues?.[1]?.value ?? "",
      users: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
      bounceRate: Number(row.metricValues?.[2]?.value ?? 0),
      avgDuration: Number(row.metricValues?.[3]?.value ?? 0),
    }))
  }
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatGA4Date(dateStr: string): string {
  // GA4 returns dates as YYYYMMDD
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }
  return dateStr
}

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}
