"use client"

import { useState, useMemo } from "react"
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { TableRow, SortConfig } from "@/lib/types"
import { formatNumber, formatDuration, formatPercent } from "@/lib/date-utils"

interface Column {
  key: string
  label: string
  format?: "number" | "duration" | "percent" | "currency" | "text"
  align?: "left" | "right"
}

const PAGE_SIZE = 50

export function SortableTable({
  title,
  data,
  columns,
  searchKey,
  searchPlaceholder,
}: {
  title: string
  data: TableRow[]
  columns: Column[]
  searchKey?: string
  searchPlaceholder?: string
}) {
  const [sort, setSort] = useState<SortConfig | null>(null)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search || !searchKey) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      String(row[searchKey] ?? "")
        .toLowerCase()
        .includes(q)
    )
  }, [data, search, searchKey])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sort.key] ?? ""
      const bVal = b[sort.key] ?? ""
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal)
      const bStr = String(bVal)
      return sort.direction === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })
  }, [filtered, sort])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleSort(key: string) {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.direction === "asc"
          ? { key, direction: "desc" }
          : null
      }
      return { key, direction: "desc" }
    })
    setPage(0)
  }

  function formatValue(value: string | number, format?: Column["format"]) {
    if (typeof value === "number") {
      switch (format) {
        case "duration":
          return formatDuration(value)
        case "percent":
          return formatPercent(value * 100)
        case "currency":
          return `$${formatNumber(value)}`
        case "number":
          return formatNumber(value)
        default:
          return formatNumber(value)
      }
    }
    return value
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">{title}</CardTitle>
          {searchKey && (
            <input
              type="text"
              placeholder={searchPlaceholder ?? "Search..."}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="h-8 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-2 font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground transition-colors ${
                      col.align === "right" || (col.format && col.format !== "text")
                        ? "text-right"
                        : "text-left"
                    }`}
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sort?.key === col.key ? (
                        sort.direction === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-6 py-2 whitespace-nowrap ${
                          col.align === "right" || (col.format && col.format !== "text")
                            ? "text-right tabular-nums"
                            : "text-left"
                        } ${col.key === columns[0]?.key ? "font-medium" : ""}`}
                      >
                        {formatValue(row[col.key] as string | number, col.format)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm text-muted-foreground">
              {sorted.length} rows &middot; Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
