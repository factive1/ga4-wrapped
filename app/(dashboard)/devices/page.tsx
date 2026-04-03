import { Suspense } from "react"
import { getAccessToken, getPageContext } from "@/lib/auth"
import { getFullDeviceTable, aggregateByDimension } from "@/lib/ga4"
import type { SectionProps } from "@/lib/types"
import { DonutChart } from "@/components/charts/donut-chart"
import { SortableTable } from "@/components/sortable-table"
import { NoProperty } from "@/components/no-property"
import { SkeletonChart, SkeletonTable } from "@/components/skeletons"
import { ErrorDisplay } from "@/components/error-display"

const deviceColumns = [
  { key: "deviceCategory", label: "Device", format: "text" as const },
  { key: "browser", label: "Browser", format: "text" as const },
  { key: "operatingSystem", label: "OS", format: "text" as const },
  { key: "screenResolution", label: "Resolution", format: "text" as const },
  { key: "totalUsers", label: "Users", format: "number" as const },
  { key: "sessions", label: "Sessions", format: "number" as const },
]

export default async function DevicesPage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const { propertyId, dateRange } = await getPageContext(searchParams)

  if (!propertyId) return <NoProperty />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Devices</h1>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <SkeletonChart />
              <SkeletonChart />
              <SkeletonChart />
            </div>
            <SkeletonTable rows={10} />
          </div>
        }
      >
        <DeviceData propertyId={propertyId} dateRange={dateRange} />
      </Suspense>
    </div>
  )
}

async function DeviceData({ propertyId, dateRange }: SectionProps) {
  try {
    const accessToken = await getAccessToken()
    // Single API call — derive donut charts from the full table
    const allDevices = await getFullDeviceTable(accessToken, propertyId, dateRange)

    const devices = aggregateByDimension(allDevices, "deviceCategory")
    const browsers = aggregateByDimension(allDevices, "browser")
    const os = aggregateByDimension(allDevices, "operatingSystem")

    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <DonutChart
            title="Device Category"
            data={devices}
            labelKey="deviceCategory"
            valueKey="totalUsers"
          />
          <DonutChart
            title="Top Browsers"
            data={browsers}
            labelKey="browser"
            valueKey="totalUsers"
          />
          <DonutChart
            title="Operating Systems"
            data={os}
            labelKey="operatingSystem"
            valueKey="totalUsers"
          />
        </div>

        <SortableTable
          title="All Devices"
          data={allDevices}
          columns={deviceColumns}
        />
      </div>
    )
  } catch (error) {
    console.error("[DeviceData]", error)
    return <ErrorDisplay message="Failed to load device data." />
  }
}
