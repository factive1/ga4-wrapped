import { Suspense } from "react"
import { getAccessToken, getPageContext } from "@/lib/auth"
import {
  getTrafficByChannel,
  getTrafficBySource,
  getTrafficByCampaign,
} from "@/lib/ga4"
import type { SectionProps } from "@/lib/types"
import { TrafficView } from "./traffic-view"
import { NoProperty } from "@/components/no-property"
import { SkeletonChart, SkeletonTable } from "@/components/skeletons"
import { ErrorDisplay } from "@/components/error-display"

export default async function TrafficPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const { propertyId, dateRange } = await getPageContext(searchParams)

  if (!propertyId) return <NoProperty />

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

async function TrafficData({ propertyId, dateRange }: SectionProps) {
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
  } catch (error) {
    console.error("[TrafficData]", error)
    return <ErrorDisplay message="Failed to load traffic data." />
  }
}
