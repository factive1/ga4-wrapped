import { describe, it, expect } from "vitest"
import { aggregateByDimension } from "../ga4"

describe("aggregateByDimension", () => {
  it("aggregates rows by a single dimension", () => {
    const rows = [
      { deviceCategory: "mobile", browser: "Chrome", totalUsers: 100 },
      { deviceCategory: "desktop", browser: "Firefox", totalUsers: 50 },
      { deviceCategory: "mobile", browser: "Safari", totalUsers: 75 },
      { deviceCategory: "desktop", browser: "Chrome", totalUsers: 30 },
    ]

    const result = aggregateByDimension(rows, "deviceCategory")

    expect(result).toEqual([
      { deviceCategory: "mobile", totalUsers: 175 },
      { deviceCategory: "desktop", totalUsers: 80 },
    ])
  })

  it("sorts by value descending", () => {
    const rows = [
      { browser: "Firefox", totalUsers: 10 },
      { browser: "Chrome", totalUsers: 100 },
      { browser: "Safari", totalUsers: 50 },
    ]

    const result = aggregateByDimension(rows, "browser")

    expect(result[0].browser).toBe("Chrome")
    expect(result[1].browser).toBe("Safari")
    expect(result[2].browser).toBe("Firefox")
  })

  it("supports custom metric key", () => {
    const rows = [
      { os: "Windows", sessions: 100 },
      { os: "macOS", sessions: 80 },
      { os: "Windows", sessions: 50 },
    ]

    const result = aggregateByDimension(rows, "os", "sessions")

    expect(result).toEqual([
      { os: "Windows", sessions: 150 },
      { os: "macOS", sessions: 80 },
    ])
  })

  it("handles empty input", () => {
    expect(aggregateByDimension([], "deviceCategory")).toEqual([])
  })
})
