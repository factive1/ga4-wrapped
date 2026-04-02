"use client"

import { useState, useMemo } from "react"
import { SortableTable } from "@/components/sortable-table"
import { TopBarChart } from "@/components/charts/bar-chart"
import { Button } from "@/components/ui/button"
import type { TableRow } from "@/lib/types"

const DEFAULT_EXCLUDED = ["page_view", "session_start", "first_visit", "scroll"]

const columns = [
  { key: "event", label: "Event Name", format: "text" as const },
  { key: "count", label: "Event Count", format: "number" as const },
  { key: "users", label: "Users", format: "number" as const },
]

export function EngagementEvents({ events }: { events: TableRow[] }) {
  const [showDefault, setShowDefault] = useState(false)

  const filtered = useMemo(() => {
    if (showDefault) return events
    return events.filter(
      (e) => !DEFAULT_EXCLUDED.includes(e.event as string)
    )
  }, [events, showDefault])

  return (
    <div className="space-y-6">
      <TopBarChart
        title="Top Events by Count"
        data={filtered as Record<string, string | number>[]}
        dataKey="count"
        labelKey="event"
        valueLabel="Events"
      />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDefault(!showDefault)}
          >
            {showDefault ? "Hide" : "Show"} default events
          </Button>
          {!showDefault && (
            <span className="text-xs text-muted-foreground">
              Hiding: {DEFAULT_EXCLUDED.join(", ")}
            </span>
          )}
        </div>
        <SortableTable
          title="All Events"
          data={filtered}
          columns={columns}
        />
      </div>
    </div>
  )
}
