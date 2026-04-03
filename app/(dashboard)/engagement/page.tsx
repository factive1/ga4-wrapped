import { Suspense } from "react"
import { getAccessToken, getPageContext } from "@/lib/auth"
import { getEngagementMetrics, getTopEvents } from "@/lib/ga4"
import type { SectionProps } from "@/lib/types"
import { MetricCard } from "@/components/metric-card"
import { NoProperty } from "@/components/no-property"
import { SkeletonCards, SkeletonChart, SkeletonTable } from "@/components/skeletons"
import { ErrorDisplay } from "@/components/error-display"
import { EngagementEvents } from "./engagement-events"

export default async function EngagementPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const { propertyId, dateRange } = await getPageContext(searchParams)

  if (!propertyId) return <NoProperty />

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

async function EngagementMetricsSection({ propertyId, dateRange }: SectionProps) {
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
  } catch (error) {
    console.error("[EngagementMetrics]", error)
    return <ErrorDisplay message="Failed to load engagement metrics." />
  }
}

async function EngagementEventsSection({ propertyId, dateRange }: SectionProps) {
  try {
    const accessToken = await getAccessToken()
    const events = await getTopEvents(accessToken, propertyId, dateRange)

    return <EngagementEvents events={events} />
  } catch (error) {
    console.error("[EngagementEvents]", error)
    return <ErrorDisplay message="Failed to load event data." />
  }
}
