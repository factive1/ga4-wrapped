import { Suspense } from "react"
import { getAccessToken, getPageContext } from "@/lib/auth"
import { getPageMetrics } from "@/lib/ga4"
import { SortableTable } from "@/components/sortable-table"
import { NoProperty } from "@/components/no-property"
import { SkeletonTable } from "@/components/skeletons"
import { ErrorDisplay } from "@/components/error-display"

const columns = [
  { key: "pagePath", label: "Page Path", format: "text" as const },
  { key: "pageTitle", label: "Title", format: "text" as const },
  { key: "screenPageViews", label: "Pageviews", format: "number" as const },
  { key: "totalUsers", label: "Users", format: "number" as const },
  { key: "avgTimeOnPage", label: "Avg. Time on Page", format: "duration" as const },
]

export default async function PagesPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const { propertyId, dateRange } = await getPageContext(searchParams)

  if (!propertyId) return <NoProperty />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pages</h1>
      <Suspense fallback={<SkeletonTable rows={10} />}>
        <PagesData propertyId={propertyId} dateRange={dateRange} />
      </Suspense>
    </div>
  )
}

async function PagesData({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const data = await getPageMetrics(accessToken, propertyId, dateRange)

    return (
      <SortableTable
        title="All Pages"
        data={data}
        columns={columns}
        searchKey="pagePath"
        searchPlaceholder="Search by path or title..."
      />
    )
  } catch {
    return <ErrorDisplay message="Failed to load page data." />
  }
}
