export interface DateRangeParams {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
}

export interface MetricCardData {
  label: string
  value: string
  change: number | null // percentage change, null if no comparison data
  changeLabel?: string
}

export interface TimeSeriesPoint {
  date: string // YYYY-MM-DD
  value: number
}

export interface TableRow {
  [key: string]: string | number
}

export interface GA4Property {
  propertyId: string
  displayName: string
  accountName: string
}

export interface QuotaStatus {
  tokensPerDay: { consumed: number; remaining: number }
  tokensPerHour: { consumed: number; remaining: number }
  concurrentRequests: { consumed: number; remaining: number }
}

export type SortDirection = "asc" | "desc"

export interface SortConfig {
  key: string
  direction: SortDirection
}

export type DatePreset = "today" | "7d" | "30d" | "90d" | "custom"

export interface DateRangeState {
  from: string
  to: string
  preset: DatePreset
}
