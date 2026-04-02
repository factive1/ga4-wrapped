import { Suspense } from "react"
import { getAccessToken, getPageContext } from "@/lib/auth"
import {
  getRealtimeActiveUsers,
  getOverviewMetrics,
  getUsersByDay,
  getTopPages,
  getTopSources,
} from "@/lib/ga4"
import { MetricCard } from "@/components/metric-card"
import { UsersLineChart } from "@/components/charts/line-chart"
import { SkeletonCards, SkeletonChart, SkeletonTable } from "@/components/skeletons"
import { ErrorDisplay } from "@/components/error-display"
import { NoProperty } from "@/components/no-property"

export default async function OverviewPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const { propertyId, dateRange } = await getPageContext(searchParams)

  if (!propertyId) return <NoProperty />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>

      <Suspense fallback={<SkeletonCards count={6} />}>
        <OverviewMetrics propertyId={propertyId} dateRange={dateRange} />
      </Suspense>

      <Suspense fallback={<SkeletonChart />}>
        <UsersByDayChart propertyId={propertyId} dateRange={dateRange} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<SkeletonTable />}>
          <TopPagesTable propertyId={propertyId} dateRange={dateRange} />
        </Suspense>
        <Suspense fallback={<SkeletonTable />}>
          <TopSourcesTable propertyId={propertyId} dateRange={dateRange} />
        </Suspense>
      </div>
    </div>
  )
}

async function OverviewMetrics({ propertyId, dateRange }: { propertyId: string; dateRange: { from: string; to: string } }) {
  try {
    const accessToken = await getAccessToken()
    const [activeUsers, metrics] = await Promise.all([
      getRealtimeActiveUsers(accessToken, propertyId),
      getOverviewMetrics(accessToken, propertyId, dateRange),
    ])
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Active Now" value={String(activeUsers)} change={null} />
        {metrics.map((m) => <MetricCard key={m.label} {...m} />)}
      </div>
    )
  } catch {
    return <ErrorDisplay message="Failed to load overview metrics." />
  }
}

async function UsersByDayChart({ propertyId, dateRange }: { propertyId: string; dateRange: { from: string; to: string } }) {
  try {
    const accessToken = await getAccessToken()
    const data = await getUsersByDay(accessToken, propertyId, dateRange)
    return <UsersLineChart title="Users by Day" data={data} />
  } catch {
    return <ErrorDisplay message="Failed to load users chart." />
  }
}

async function TopPagesTable({ propertyId, dateRange }: { propertyId: string; dateRange: { from: string; to: string } }) {
  try {
    const accessToken = await getAccessToken()
    const data = await getTopPages(accessToken, propertyId, dateRange)
    return (
      <div className="rounded-lg border">
        <div className="p-4"><h3 className="font-semibold text-sm">Top Pages</h3></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Page</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Pageviews</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2 font-medium truncate max-w-xs">{row.pagePath}</td>
                <td className="px-4 py-2 text-right tabular-nums">{(row.screenPageViews as number).toLocaleString()}</td>
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

async function TopSourcesTable({ propertyId, dateRange }: { propertyId: string; dateRange: { from: string; to: string } }) {
  try {
    const accessToken = await getAccessToken()
    const data = await getTopSources(accessToken, propertyId, dateRange)
    return (
      <div className="rounded-lg border">
        <div className="p-4"><h3 className="font-semibold text-sm">Top Sources</h3></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Source</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Users</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2 font-medium">{row.sessionSource}</td>
                <td className="px-4 py-2 text-right tabular-nums">{(row.totalUsers as number).toLocaleString()}</td>
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
