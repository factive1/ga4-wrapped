import { Suspense } from "react"
import { getAccessToken, getPageContext } from "@/lib/auth"
import { getConversionMetrics, getConversionsBySource } from "@/lib/ga4"
import { MetricCard } from "@/components/metric-card"
import { SortableTable } from "@/components/sortable-table"
import { NoProperty } from "@/components/no-property"
import { SkeletonCards, SkeletonTable } from "@/components/skeletons"
import { ErrorDisplay } from "@/components/error-display"

const eventColumns = [
  { key: "eventName", label: "Conversion Event", format: "text" as const },
  { key: "conversions", label: "Completions", format: "number" as const },
  { key: "totalUsers", label: "Users", format: "number" as const },
  { key: "sessionConversionRate", label: "Conversion Rate", format: "percent" as const },
]

const sourceColumns = [
  { key: "sessionSource", label: "Source", format: "text" as const },
  { key: "sessionMedium", label: "Medium", format: "text" as const },
  { key: "conversions", label: "Conversions", format: "number" as const },
  { key: "sessionConversionRate", label: "Conversion Rate", format: "percent" as const },
]

export default async function ConversionsPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const { propertyId, dateRange } = await getPageContext(searchParams)

  if (!propertyId) return <NoProperty />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Conversions</h1>

      <Suspense
        fallback={
          <div className="space-y-6">
            <SkeletonCards count={2} />
            <SkeletonTable rows={5} />
          </div>
        }
      >
        <ConversionsData propertyId={propertyId} dateRange={dateRange} />
      </Suspense>

      <Suspense fallback={<SkeletonTable rows={10} />}>
        <ConversionsBySourceSection
          propertyId={propertyId}
          dateRange={dateRange}
        />
      </Suspense>
    </div>
  )
}

async function ConversionsData({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const { cards, byEvent } = await getConversionMetrics(
      accessToken,
      propertyId,
      dateRange
    )

    if (byEvent.length === 0) {
      return (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            No conversion events found. Mark events as conversions in your GA4
            property to see data here.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2">
          {cards.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </div>
        <SortableTable
          title="Conversions by Event"
          data={byEvent}
          columns={eventColumns}
        />
      </div>
    )
  } catch {
    return <ErrorDisplay message="Failed to load conversion data." />
  }
}

async function ConversionsBySourceSection({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const data = await getConversionsBySource(
      accessToken,
      propertyId,
      dateRange
    )

    if (data.length === 0) return null

    return (
      <SortableTable
        title="Conversions by Source / Medium"
        data={data}
        columns={sourceColumns}
      />
    )
  } catch {
    return <ErrorDisplay message="Failed to load conversions by source." />
  }
}
