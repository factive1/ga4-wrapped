"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SortableTable } from "@/components/sortable-table"
import { TopBarChart } from "@/components/charts/bar-chart"
import type { TableRow } from "@/lib/types"

const channelColumns = [
  { key: "sessionDefaultChannelGroup", label: "Channel", format: "text" as const },
  { key: "totalUsers", label: "Users", format: "number" as const },
  { key: "sessions", label: "Sessions", format: "number" as const },
  { key: "bounceRate", label: "Bounce Rate", format: "percent" as const },
  { key: "averageSessionDuration", label: "Avg. Duration", format: "duration" as const },
]

const sourceColumns = [
  { key: "sessionSource", label: "Source", format: "text" as const },
  { key: "sessionMedium", label: "Medium", format: "text" as const },
  { key: "totalUsers", label: "Users", format: "number" as const },
  { key: "sessions", label: "Sessions", format: "number" as const },
  { key: "bounceRate", label: "Bounce Rate", format: "percent" as const },
  { key: "averageSessionDuration", label: "Avg. Duration", format: "duration" as const },
]

const campaignColumns = [
  { key: "sessionCampaignName", label: "Campaign", format: "text" as const },
  { key: "sessionSource", label: "Source", format: "text" as const },
  { key: "sessionMedium", label: "Medium", format: "text" as const },
  { key: "totalUsers", label: "Users", format: "number" as const },
  { key: "sessions", label: "Sessions", format: "number" as const },
]

const TAB_CONFIG: Record<string, { labelKey: string; title: string }> = {
  channels: { labelKey: "sessionDefaultChannelGroup", title: "Channels" },
  sources: { labelKey: "sessionSource", title: "Sources" },
  campaigns: { labelKey: "sessionCampaignName", title: "Campaigns" },
}

export function TrafficView({
  channels,
  sources,
  campaigns,
}: {
  channels: TableRow[]
  sources: TableRow[]
  campaigns: TableRow[]
}) {
  const [tab, setTab] = useState("channels")

  const dataByTab: Record<string, TableRow[]> = { channels, sources, campaigns }
  const { labelKey, title } = TAB_CONFIG[tab]

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="channels">Channels</TabsTrigger>
        <TabsTrigger value="sources">Sources</TabsTrigger>
        <TabsTrigger value="campaigns">UTM Campaigns</TabsTrigger>
      </TabsList>

      <div className="mt-6 space-y-6">
        <TopBarChart
          title={`Top 10 ${title} by Users`}
          data={dataByTab[tab] as Record<string, string | number>[]}
          dataKey="totalUsers"
          labelKey={labelKey}
          valueLabel="Users"
        />

        <TabsContent value="channels" className="mt-0">
          <SortableTable
            title="Traffic by Channel"
            data={channels}
            columns={channelColumns}
          />
        </TabsContent>

        <TabsContent value="sources" className="mt-0">
          <SortableTable
            title="Traffic by Source / Medium"
            data={sources}
            columns={sourceColumns}
          />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-0">
          <SortableTable
            title="Traffic by Campaign"
            data={campaigns}
            columns={campaignColumns}
          />
        </TabsContent>
      </div>
    </Tabs>
  )
}
