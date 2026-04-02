"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const chartConfig = {
  value: {
    label: "Value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function TopBarChart({
  title,
  data,
  dataKey,
  labelKey,
  valueLabel,
}: {
  title: string
  data: Record<string, string | number>[]
  dataKey: string
  labelKey: string
  valueLabel?: string
}) {
  const config = valueLabel
    ? { ...chartConfig, value: { ...chartConfig.value, label: valueLabel } }
    : chartConfig

  const chartData = data.slice(0, 10).map((item) => ({
    name: String(item[labelKey]),
    value: Number(item[dataKey]),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full">
          <BarChart data={chartData} layout="vertical" accessibilityLayer>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={120}
              tickFormatter={(v: string) =>
                v.length > 18 ? `${v.slice(0, 18)}...` : v
              }
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
