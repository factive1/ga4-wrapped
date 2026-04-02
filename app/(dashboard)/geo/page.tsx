import { Suspense } from "react"
import { getAccessToken, getPageContext } from "@/lib/auth"
import { getGeoMetrics } from "@/lib/ga4"
import { SortableTable } from "@/components/sortable-table"
import { NoProperty } from "@/components/no-property"
import { SkeletonTable } from "@/components/skeletons"
import { ErrorDisplay } from "@/components/error-display"

const columns = [
  { key: "country", label: "Country", format: "text" as const },
  { key: "city", label: "City", format: "text" as const },
  { key: "totalUsers", label: "Users", format: "number" as const },
  { key: "sessions", label: "Sessions", format: "number" as const },
  { key: "bounceRate", label: "Bounce Rate", format: "percent" as const },
  { key: "averageSessionDuration", label: "Avg. Duration", format: "duration" as const },
]

export default async function GeoPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const { propertyId, dateRange } = await getPageContext(searchParams)

  if (!propertyId) return <NoProperty />

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
