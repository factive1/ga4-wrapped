import { Suspense } from "react"
import { cookies } from "next/headers"
import { getAccessToken } from "@/lib/auth"
import { parseDateParams } from "@/lib/date-utils"
import {
  getTrafficByChannel,
  getTrafficBySource,
  getTrafficByCampaign,
} from "@/lib/ga4"
import { TrafficView } from "./traffic-view"
import { SkeletonTable } from "@/components/skeleton-table"
import { SkeletonChart } from "@/components/skeleton-chart"
import { ErrorDisplay } from "@/components/error-display"

export default async function TrafficPage(props: {
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
      <h1 className="text-2xl font-bold">Traffic</h1>
      <Suspense
        fallback={
          <div className="space-y-6">
            <SkeletonChart />
            <SkeletonTable rows={10} />
          </div>
        }
      >
        <TrafficData propertyId={propertyId} dateRange={dateRange} />
      </Suspense>
    </div>
  )
}

async function TrafficData({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const [channels, sources, campaigns] = await Promise.all([
      getTrafficByChannel(accessToken, propertyId, dateRange),
      getTrafficBySource(accessToken, propertyId, dateRange),
      getTrafficByCampaign(accessToken, propertyId, dateRange),
    ])

    return (
      <TrafficView
        channels={channels}
        sources={sources}
        campaigns={campaigns}
      />
    )
  } catch {
    return <ErrorDisplay message="Failed to load traffic data." />
  }
}
