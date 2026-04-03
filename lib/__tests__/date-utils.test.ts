import { describe, it, expect, vi, afterEach } from "vitest"
import {
  getDateRange,
  getComparisonRange,
  formatDate,
  isValidDateRange,
  parseDateParams,
  formatNumber,
  formatDuration,
  formatPercent,
} from "../date-utils"

describe("formatDate", () => {
  it("formats a UTC date to YYYY-MM-DD", () => {
    const date = new Date("2026-03-15T00:00:00Z")
    expect(formatDate(date)).toBe("2026-03-15")
  })

  it("uses UTC getters to avoid timezone drift", () => {
    // Date that is March 15 in UTC but could be March 14 in UTC-12
    const date = new Date("2026-03-15T02:00:00Z")
    expect(formatDate(date)).toBe("2026-03-15")
  })

  it("pads single-digit month and day", () => {
    const date = new Date("2026-01-05T00:00:00Z")
    expect(formatDate(date)).toBe("2026-01-05")
  })
})

describe("getDateRange", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns today for "today" preset', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    const range = getDateRange("today")
    expect(range.from).toBe("2026-04-02")
    expect(range.to).toBe("2026-04-02")
  })

  it('returns 7-day range for "7d" preset', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    const range = getDateRange("7d")
    expect(range.from).toBe("2026-03-27")
    expect(range.to).toBe("2026-04-02")
  })

  it('returns 30-day range for "30d" preset', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    const range = getDateRange("30d")
    expect(range.from).toBe("2026-03-04")
    expect(range.to).toBe("2026-04-02")
  })

  it('returns 90-day range for "90d" preset', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    const range = getDateRange("90d")
    expect(range.from).toBe("2026-01-03")
    expect(range.to).toBe("2026-04-02")
  })

  it("defaults to 30d for unknown preset", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    const range = getDateRange("custom")
    expect(range.from).toBe("2026-03-04")
    expect(range.to).toBe("2026-04-02")
  })
})

describe("getComparisonRange", () => {
  it("returns previous period of same length", () => {
    const range = { from: "2026-03-04", to: "2026-04-02" }
    const comp = getComparisonRange(range)
    // 30-day range: comparison should be the 30 days before that
    expect(comp.to).toBe("2026-03-03")
    expect(comp.from).toBe("2026-02-02")
  })

  it("handles single-day range", () => {
    const range = { from: "2026-04-02", to: "2026-04-02" }
    const comp = getComparisonRange(range)
    expect(comp.to).toBe("2026-04-01")
    expect(comp.from).toBe("2026-04-01")
  })

  it("handles 7-day range", () => {
    const range = { from: "2026-03-27", to: "2026-04-02" }
    const comp = getComparisonRange(range)
    expect(comp.to).toBe("2026-03-26")
    expect(comp.from).toBe("2026-03-20")
  })
})

describe("isValidDateRange", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("accepts valid date ranges", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    expect(isValidDateRange("2026-03-01", "2026-03-31")).toBe(true)
  })

  it("rejects invalid date format", () => {
    expect(isValidDateRange("2026/03/01", "2026-03-31")).toBe(false)
    expect(isValidDateRange("not-a-date", "2026-03-31")).toBe(false)
  })

  it("rejects from > to", () => {
    expect(isValidDateRange("2026-04-01", "2026-03-01")).toBe(false)
  })

  it("rejects dates before 2020", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    expect(isValidDateRange("2019-12-31", "2020-01-01")).toBe(false)
  })

  it("rejects future dates", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    expect(isValidDateRange("2026-04-02", "2026-04-03")).toBe(false)
  })
})

describe("parseDateParams", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns from/to when both are valid", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    const result = parseDateParams({ from: "2026-03-01", to: "2026-03-31" })
    expect(result).toEqual({ from: "2026-03-01", to: "2026-03-31" })
  })

  it("falls back to preset when dates are invalid", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    const result = parseDateParams({ from: "bad", to: "bad" })
    expect(result.from).toBe("2026-03-04")
    expect(result.to).toBe("2026-04-02")
  })

  it("falls back to 30d when no params given", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    const result = parseDateParams({})
    expect(result.from).toBe("2026-03-04")
    expect(result.to).toBe("2026-04-02")
  })

  it("uses preset param when no from/to", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T12:00:00Z"))
    const result = parseDateParams({ preset: "7d" })
    expect(result.from).toBe("2026-03-27")
    expect(result.to).toBe("2026-04-02")
  })
})

describe("formatNumber", () => {
  it("formats millions", () => {
    expect(formatNumber(1_500_000)).toBe("1.5M")
  })

  it("formats thousands", () => {
    expect(formatNumber(1_500)).toBe("1.5K")
  })

  it("formats small numbers with locale string", () => {
    expect(formatNumber(42)).toBe("42")
  })
})

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("45s")
  })

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1m 30s")
  })

  it("formats zero", () => {
    expect(formatDuration(0)).toBe("0s")
  })
})

describe("formatPercent", () => {
  it("formats to one decimal", () => {
    expect(formatPercent(42.567)).toBe("42.6%")
  })

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.0%")
  })
})
