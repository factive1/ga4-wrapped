"use client"

import { AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function ErrorDisplay({
  title = "Something went wrong",
  message,
}: {
  title?: string
  message?: string
}) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex items-center gap-3 py-4">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <div>
          <p className="font-medium text-sm">{title}</p>
          {message && (
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
