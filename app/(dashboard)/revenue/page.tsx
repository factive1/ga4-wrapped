import { Suspense } from "react"
import { cookies } from "next/headers"
import { getAccessToken } from "@/lib/auth"
import { parseDateParams } from "@/lib/date-utils"
import {
  getRevenueMetrics,
  getRevenueBySource,
  getRevenueByPage,
} from "@/lib/ga4"
import { MetricCard } from "@/components/metric-card"
import { SortableTable } from "@/components/sortable-table"
import { SkeletonCards } from "@/components/skeleton-card"
import { SkeletonTable } from "@/components/skeleton-table"
import { ErrorDisplay } from "@/components/error-display"

const sourceColumns = [
  { key: "source", label: "Source", format: "text" as const },
  { key: "medium", label: "Medium", format: "text" as const },
  { key: "revenue", label: "Revenue", format: "currency" as const },
  { key: "transactions", label: "Transactions", format: "number" as const },
]

const pageColumns = [
  { key: "page", label: "Landing Page", format: "text" as const },
  { key: "revenue", label: "Revenue", format: "currency" as const },
  { key: "transactions", label: "Transactions", format: "number" as const },
]

export default async function RevenuePage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const propertyId = cookieStore.get("ga4_property_id")?.value

  if (!propertyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Select a GA4 property from the sidebar to get started.
        </p>
      </div>
    )
  }

  const dateRange = parseDateParams(searchParams)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Revenue</h1>

      <Suspense fallback={<SkeletonCards count={4} />}>
        <RevenueMetricsSection
          propertyId={propertyId}
          dateRange={dateRange}
        />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<SkeletonTable rows={10} />}>
          <RevenueBySourceSection
            propertyId={propertyId}
            dateRange={dateRange}
          />
        </Suspense>
        <Suspense fallback={<SkeletonTable rows={10} />}>
          <RevenueByPageSection
            propertyId={propertyId}
            dateRange={dateRange}
          />
        </Suspense>
      </div>
    </div>
  )
}

async function RevenueMetricsSection({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const metrics = await getRevenueMetrics(accessToken, propertyId, dateRange)

    const hasRevenue = metrics.some(
      (m) => m.value !== "$0" && m.value !== "$0.00"
    )

    if (!hasRevenue) {
      return (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            No revenue data found. This view requires ecommerce tracking to be
            configured in GA4.
          </p>
        </div>
      )
    }

    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    )
  } catch {
    return <ErrorDisplay message="Failed to load revenue metrics." />
  }
}

async function RevenueBySourceSection({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const data = await getRevenueBySource(accessToken, propertyId, dateRange)

    if (data.length === 0) return null

    return (
      <SortableTable
        title="Revenue by Source / Medium"
        data={data}
        columns={sourceColumns}
      />
    )
  } catch {
    return <ErrorDisplay message="Failed to load revenue by source." />
  }
}

async function RevenueByPageSection({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const data = await getRevenueByPage(accessToken, propertyId, dateRange)

    if (data.length === 0) return null

    return (
      <SortableTable
        title="Revenue by Landing Page"
        data={data}
        columns={pageColumns}
      />
    )
  } catch {
    return <ErrorDisplay message="Failed to load revenue by page." />
  }
}
