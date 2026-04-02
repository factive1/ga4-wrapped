import type { DatePreset, DateRangeParams } from "./types"

export function getDateRange(preset: DatePreset): DateRangeParams {
  const to = new Date()
  const from = new Date()

  switch (preset) {
    case "today":
      break
    case "7d":
      from.setDate(from.getDate() - 6)
      break
    case "30d":
      from.setDate(from.getDate() - 29)
      break
    case "90d":
      from.setDate(from.getDate() - 89)
      break
    default:
      from.setDate(from.getDate() - 29)
  }

  return {
    from: formatDate(from),
    to: formatDate(to),
  }
}

export function getComparisonRange(range: DateRangeParams): DateRangeParams {
  const from = new Date(range.from)
  const to = new Date(range.to)
  const days = Math.round(
    (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
  )

  const compTo = new Date(from)
  compTo.setDate(compTo.getDate() - 1)
  const compFrom = new Date(compTo)
  compFrom.setDate(compFrom.getDate() - days)

  return {
    from: formatDate(compFrom),
    to: formatDate(compTo),
  }
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function isValidDateRange(from: string, to: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(from) || !dateRegex.test(to)) return false

  const fromDate = new Date(from)
  const toDate = new Date(to)

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return false
  if (fromDate > toDate) return false
  if (toDate > new Date()) return false
  if (fromDate < new Date("2020-01-01")) return false

  return true
}

export function parseDateParams(
  searchParams: Record<string, string | undefined>
): DateRangeParams {
  const preset = searchParams.preset as DatePreset | undefined
  const from = searchParams.from
  const to = searchParams.to

  if (from && to && isValidDateRange(from, to)) {
    return { from, to }
  }

  return getDateRange(preset ?? "30d")
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
