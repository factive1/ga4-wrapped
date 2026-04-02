import { Suspense } from "react"
import { cookies } from "next/headers"
import { getAccessToken } from "@/lib/auth"
import { parseDateParams } from "@/lib/date-utils"
import {
  getRealtimeActiveUsers,
  getOverviewMetrics,
  getUsersByDay,
  getTopPages,
  getTopSources,
} from "@/lib/ga4"
import { MetricCard } from "@/components/metric-card"
import { UsersLineChart } from "@/components/charts/line-chart"
import { SkeletonCards } from "@/components/skeleton-card"
import { SkeletonChart } from "@/components/skeleton-chart"
import { SkeletonTable } from "@/components/skeleton-table"
import { ErrorDisplay } from "@/components/error-display"

export default async function OverviewPage(props: {
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
      <h1 className="text-2xl font-bold">Overview</h1>

      <Suspense fallback={<SkeletonCards count={6} />}>
        <OverviewMetrics
          propertyId={propertyId}
          dateRange={dateRange}
        />
      </Suspense>

      <Suspense fallback={<SkeletonChart />}>
        <UsersByDayChart
          propertyId={propertyId}
          dateRange={dateRange}
        />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<SkeletonTable />}>
          <TopPagesTable
            propertyId={propertyId}
            dateRange={dateRange}
          />
        </Suspense>
        <Suspense fallback={<SkeletonTable />}>
          <TopSourcesTable
            propertyId={propertyId}
            dateRange={dateRange}
          />
        </Suspense>
      </div>
    </div>
  )
}

async function OverviewMetrics({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const [activeUsers, metrics] = await Promise.all([
      getRealtimeActiveUsers(accessToken, propertyId),
      getOverviewMetrics(accessToken, propertyId, dateRange),
    ])

    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Active Now"
          value={String(activeUsers)}
          change={null}
        />
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    )
  } catch {
    return <ErrorDisplay message="Failed to load overview metrics." />
  }
}

async function UsersByDayChart({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const data = await getUsersByDay(accessToken, propertyId, dateRange)
    return <UsersLineChart title="Users by Day" data={data} />
  } catch {
    return <ErrorDisplay message="Failed to load users chart." />
  }
}

async function TopPagesTable({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const data = await getTopPages(accessToken, propertyId, dateRange)

    return (
      <div className="rounded-lg border">
        <div className="p-4">
          <h3 className="font-semibold text-sm">Top Pages</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Page
              </th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                Pageviews
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2 font-medium truncate max-w-xs">
                  {row.page as string}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {(row.pageviews as number).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  } catch {
    return <ErrorDisplay message="Failed to load top pages." />
  }
}

async function TopSourcesTable({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const data = await getTopSources(accessToken, propertyId, dateRange)

    return (
      <div className="rounded-lg border">
        <div className="p-4">
          <h3 className="font-semibold text-sm">Top Sources</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Source
              </th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                Users
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2 font-medium">
                  {row.source as string}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {(row.users as number).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  } catch {
    return <ErrorDisplay message="Failed to load top sources." />
  }
}
