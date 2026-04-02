import { Suspense } from "react"
import { cookies } from "next/headers"
import { getAccessToken } from "@/lib/auth"
import { parseDateParams } from "@/lib/date-utils"
import { getEngagementMetrics, getTopEvents } from "@/lib/ga4"
import { MetricCard } from "@/components/metric-card"
import { TopBarChart } from "@/components/charts/bar-chart"
import { SkeletonCards } from "@/components/skeleton-card"
import { SkeletonChart } from "@/components/skeleton-chart"
import { SkeletonTable } from "@/components/skeleton-table"
import { ErrorDisplay } from "@/components/error-display"
import { EngagementEvents } from "./engagement-events"

export default async function EngagementPage(props: {
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
      <h1 className="text-2xl font-bold">Engagement</h1>

      <Suspense fallback={<SkeletonCards count={4} />}>
        <EngagementMetricsSection
          propertyId={propertyId}
          dateRange={dateRange}
        />
      </Suspense>

      <Suspense
        fallback={
          <div className="space-y-6">
            <SkeletonChart />
            <SkeletonTable rows={10} />
          </div>
        }
      >
        <EngagementEventsSection
          propertyId={propertyId}
          dateRange={dateRange}
        />
      </Suspense>
    </div>
  )
}

async function EngagementMetricsSection({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const metrics = await getEngagementMetrics(accessToken, propertyId, dateRange)

    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    )
  } catch {
    return <ErrorDisplay message="Failed to load engagement metrics." />
  }
}

async function EngagementEventsSection({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const events = await getTopEvents(accessToken, propertyId, dateRange)

    return <EngagementEvents events={events} />
  } catch {
    return <ErrorDisplay message="Failed to load event data." />
  }
}
