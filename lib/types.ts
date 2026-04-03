export interface DateRangeParams {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
}

export interface MetricCardData {
  label: string
  value: string
  change: number | null // percentage change, null if no comparison data
}

export interface TimeSeriesPoint {
  date: string // YYYY-MM-DD
  value: number
}

export type TableRow = Record<string, string | number>

export interface GA4Property {
  propertyId: string
  displayName: string
  accountName: string
}

/** Props shared by all async data-fetching sections inside dashboard pages */
export interface SectionProps {
  propertyId: string
  dateRange: DateRangeParams
}

export type SortDirection = "asc" | "desc"

export interface SortConfig {
  key: string
  direction: SortDirection
}

export type DatePreset = "today" | "7d" | "30d" | "90d" | "custom"

// Validates that a string looks like a GA4 property ID (numeric, 5-15 digits)
const PROPERTY_ID_REGEX = /^\d{5,15}$/

export function isValidPropertyId(id: string): boolean {
  return PROPERTY_ID_REGEX.test(id)
}
