"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import type { DatePreset } from "@/lib/types"
import { getDateRange, isValidDateRange } from "@/lib/date-utils"

const presets: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
]

export function DateRangePicker() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentPreset = (searchParams.get("preset") as DatePreset) ?? "30d"
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const activeRange =
    from && to && isValidDateRange(from, to)
      ? { from, to }
      : getDateRange(currentPreset)

  const updateParams = useCallback(
    (preset: DatePreset, range?: { from: string; to: string }) => {
      const r = range ?? getDateRange(preset)
      const params = new URLSearchParams(searchParams.toString())
      params.set("preset", preset)
      params.set("from", r.from)
      params.set("to", r.to)
      startTransition(() => {
        router.push(`?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const handleDateSelect = useCallback(
    (range: { from?: Date; to?: Date } | undefined) => {
      if (range?.from && range?.to) {
        const fromStr = range.from.toISOString().split("T")[0]
        const toStr = range.to.toISOString().split("T")[0]
        if (isValidDateRange(fromStr, toStr)) {
          updateParams("custom", { from: fromStr, to: toStr })
        }
      }
    },
    [updateParams]
  )

  const formatDisplay = () => {
    const preset = presets.find((p) => p.value === currentPreset)
    if (preset && currentPreset !== "custom") return preset.label
    return `${activeRange.from} — ${activeRange.to}`
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-1">
        {presets.map((preset) => (
          <Button
            key={preset.value}
            variant={currentPreset === preset.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => updateParams(preset.value)}
            disabled={isPending}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            <CalendarDays className="mr-2 h-4 w-4" />
            <span className="sm:hidden">{formatDisplay()}</span>
            <span className="hidden sm:inline">Custom</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="sm:hidden flex flex-wrap gap-1 p-3 border-b">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant={currentPreset === preset.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => updateParams(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={{
              from: new Date(activeRange.from),
              to: new Date(activeRange.to),
            }}
            onSelect={handleDateSelect}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
