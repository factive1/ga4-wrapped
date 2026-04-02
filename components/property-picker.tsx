"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import type { GA4Property } from "@/lib/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function PropertyPicker({
  properties,
  currentPropertyId,
}: {
  properties: GA4Property[]
  currentPropertyId: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(currentPropertyId ?? "")

  function handleChange(propertyId: string) {
    setValue(propertyId)
    // Set cookie and refresh
    document.cookie = `ga4_property_id=${propertyId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    startTransition(() => {
      router.refresh()
    })
  }

  if (properties.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-2">
        No GA4 properties found
      </p>
    )
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a property" />
      </SelectTrigger>
      <SelectContent>
        {properties.map((property) => (
          <SelectItem key={property.propertyId} value={property.propertyId}>
            <span className="truncate">{property.displayName}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
