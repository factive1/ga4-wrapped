import { Suspense } from "react"
import { cookies } from "next/headers"
import { getAccessToken } from "@/lib/auth"
import { parseDateParams } from "@/lib/date-utils"
import { getPageMetrics } from "@/lib/ga4"
import { SortableTable } from "@/components/sortable-table"
import { SkeletonTable } from "@/components/skeleton-table"
import { ErrorDisplay } from "@/components/error-display"

const columns = [
  { key: "path", label: "Page Path", format: "text" as const },
  { key: "title", label: "Title", format: "text" as const },
  { key: "pageviews", label: "Pageviews", format: "number" as const },
  { key: "users", label: "Users", format: "number" as const },
  { key: "avgTimeOnPage", label: "Avg. Time on Page", format: "duration" as const },
]

export default async function PagesPage(props: {
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
        searchKey="path"
        searchPlaceholder="Search by path or title..."
      />
    )
  } catch {
    return <ErrorDisplay message="Failed to load page data." />
  }
}
