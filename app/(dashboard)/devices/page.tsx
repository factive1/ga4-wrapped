import { Suspense } from "react"
import { cookies } from "next/headers"
import { getAccessToken } from "@/lib/auth"
import { parseDateParams } from "@/lib/date-utils"
import {
  getDeviceBreakdown,
  getBrowserBreakdown,
  getOSBreakdown,
  getFullDeviceTable,
} from "@/lib/ga4"
import { DonutChart } from "@/components/charts/donut-chart"
import { SortableTable } from "@/components/sortable-table"
import { SkeletonChart } from "@/components/skeleton-chart"
import { SkeletonTable } from "@/components/skeleton-table"
import { ErrorDisplay } from "@/components/error-display"

const deviceColumns = [
  { key: "device", label: "Device", format: "text" as const },
  { key: "browser", label: "Browser", format: "text" as const },
  { key: "os", label: "OS", format: "text" as const },
  { key: "resolution", label: "Resolution", format: "text" as const },
  { key: "users", label: "Users", format: "number" as const },
  { key: "sessions", label: "Sessions", format: "number" as const },
]

export default async function DevicesPage(props: {
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
      <h1 className="text-2xl font-bold">Devices</h1>

      <Suspense
        fallback={
          <div className="grid gap-6 md:grid-cols-3">
            <SkeletonChart />
            <SkeletonChart />
            <SkeletonChart />
          </div>
        }
      >
        <DeviceCharts propertyId={propertyId} dateRange={dateRange} />
      </Suspense>

      <Suspense fallback={<SkeletonTable rows={10} />}>
        <DeviceTableSection
          propertyId={propertyId}
          dateRange={dateRange}
        />
      </Suspense>
    </div>
  )
}

async function DeviceCharts({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const [devices, browsers, os] = await Promise.all([
      getDeviceBreakdown(accessToken, propertyId, dateRange),
      getBrowserBreakdown(accessToken, propertyId, dateRange),
      getOSBreakdown(accessToken, propertyId, dateRange),
    ])

    return (
      <div className="grid gap-6 md:grid-cols-3">
        <DonutChart
          title="Device Category"
          data={devices as Record<string, string | number>[]}
          labelKey="device"
          valueKey="users"
        />
        <DonutChart
          title="Top Browsers"
          data={browsers as Record<string, string | number>[]}
          labelKey="browser"
          valueKey="users"
        />
        <DonutChart
          title="Operating Systems"
          data={os as Record<string, string | number>[]}
          labelKey="os"
          valueKey="users"
        />
      </div>
    )
  } catch {
    return <ErrorDisplay message="Failed to load device breakdown." />
  }
}

async function DeviceTableSection({
  propertyId,
  dateRange,
}: {
  propertyId: string
  dateRange: { from: string; to: string }
}) {
  try {
    const accessToken = await getAccessToken()
    const data = await getFullDeviceTable(accessToken, propertyId, dateRange)

    return (
      <SortableTable
        title="All Devices"
        data={data}
        columns={deviceColumns}
      />
    )
  } catch {
    return <ErrorDisplay message="Failed to load device table." />
  }
}
