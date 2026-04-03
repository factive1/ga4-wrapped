import type { DatePreset, DateRangeParams } from "./types"

export function getDateRange(preset: DatePreset): DateRangeParams {
  const now = new Date()
  const to = formatDate(now)
  const from = new Date(now)

  switch (preset) {
    case "today":
      break
    case "7d":
      from.setUTCDate(from.getUTCDate() - 6)
      break
    case "30d":
      from.setUTCDate(from.getUTCDate() - 29)
      break
    case "90d":
      from.setUTCDate(from.getUTCDate() - 89)
      break
    default:
      from.setUTCDate(from.getUTCDate() - 29)
  }

  return { from: formatDate(from), to }
}

export function getComparisonRange(range: DateRangeParams): DateRangeParams {
  const from = parseUTCDate(range.from)
  const to = parseUTCDate(range.to)
  const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

  const compTo = new Date(from.getTime())
  compTo.setUTCDate(compTo.getUTCDate() - 1)
  const compFrom = new Date(compTo.getTime())
  compFrom.setUTCDate(compFrom.getUTCDate() - days)

  return { from: formatDate(compFrom), to: formatDate(compTo) }
}

/** Format a Date to YYYY-MM-DD using UTC to avoid timezone drift */
export function formatDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Parse a YYYY-MM-DD string as a UTC date to avoid timezone drift */
function parseUTCDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z")
}

export function isValidDateRange(from: string, to: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(from) || !dateRegex.test(to)) return false

  const fromDate = parseUTCDate(from)
  const toDate = parseUTCDate(to)

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return false
  if (fromDate > toDate) return false
  if (toDate > new Date()) return false
  if (fromDate < parseUTCDate("2020-01-01")) return false

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
