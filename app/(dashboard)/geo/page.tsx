import { Suspense } from "react"
import { cookies } from "next/headers"
import { getAccessToken } from "@/lib/auth"
import { parseDateParams } from "@/lib/date-utils"
import { getGeoMetrics } from "@/lib/ga4"
import { SortableTable } from "@/components/sortable-table"
import { SkeletonTable } from "@/components/skeleton-table"
import { ErrorDisplay } from "@/components/error-display"

const columns = [
  { key: "country", label: "Country", format: "text" as const },
  { key: "city", label: "City", format: "text" as const },
  { key: "users", label: "Users", format: "number" as const },
  { key: "sessions", label: "Sessions", format: "number" as const },
  { key: "bounceRate", label: "Bounce Rate", format: "percent" as const },
  { key: "avgDuration", label: "Avg. Duration", format: "duration" as const },
]

export default async function GeoPage(props: {
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
      <h1 className="text-2xl font-bold">Geographic</h1>
      <Suspense fallback={<SkeletonTable rows={10} />}>
        <GeoData propertyId={propertyId} dateRange={dateRange} />
      </Suspense>
    </div>
  )
}

async function GeoData({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const data = await getGeoMetrics(accessToken, propertyId, dateRange)

    return (
      <SortableTable
        title="Users by Location"
        data={data}
        columns={columns}
        searchKey="country"
        searchPlaceholder="Search by country or city..."
      />
    )
  } catch {
    return <ErrorDisplay message="Failed to load geographic data." />
  }
}
