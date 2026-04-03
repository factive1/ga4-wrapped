import { Suspense } from "react"
import { getAccessToken, getPageContext } from "@/lib/auth"
import {
  getRevenueMetrics,
  getRevenueBySource,
  getRevenueByPage,
} from "@/lib/ga4"
import type { SectionProps } from "@/lib/types"
import { MetricCard } from "@/components/metric-card"
import { SortableTable } from "@/components/sortable-table"
import { NoProperty } from "@/components/no-property"
import { SkeletonCards, SkeletonTable } from "@/components/skeletons"
import { ErrorDisplay } from "@/components/error-display"

const sourceColumns = [
  { key: "sessionSource", label: "Source", format: "text" as const },
  { key: "sessionMedium", label: "Medium", format: "text" as const },
  { key: "totalRevenue", label: "Revenue", format: "currency" as const },
  { key: "transactions", label: "Transactions", format: "number" as const },
]

const pageColumns = [
  { key: "landingPage", label: "Landing Page", format: "text" as const },
  { key: "totalRevenue", label: "Revenue", format: "currency" as const },
  { key: "transactions", label: "Transactions", format: "number" as const },
]

export default async function RevenuePage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const { propertyId, dateRange } = await getPageContext(searchParams)

  if (!propertyId) return <NoProperty />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Revenue</h1>

      <Suspense fallback={<SkeletonCards count={3} />}>
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

async function RevenueMetricsSection({ propertyId, dateRange }: SectionProps) {
  try {
    const accessToken = await getAccessToken()
    const { cards, hasRevenue } = await getRevenueMetrics(accessToken, propertyId, dateRange)

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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {cards.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    )
  } catch (error) {
    console.error("[RevenueMetrics]", error)
    return <ErrorDisplay message="Failed to load revenue metrics." />
  }
}

async function RevenueBySourceSection({ propertyId, dateRange }: SectionProps) {
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
  } catch (error) {
    console.error("[RevenueBySource]", error)
    return <ErrorDisplay message="Failed to load revenue by source." />
  }
}

async function RevenueByPageSection({ propertyId, dateRange }: SectionProps) {
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
  } catch (error) {
    console.error("[RevenueByPage]", error)
    return <ErrorDisplay message="Failed to load revenue by page." />
  }
}
