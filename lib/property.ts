import { cookies } from "next/headers"
import { getAccessToken } from "./auth"
import { listProperties } from "./admin"

export async function getPropertyId(): Promise<string | null> {
  const cookieStore = await cookies()
  const stored = cookieStore.get("ga4_property_id")?.value

  if (!stored) return null

  // Validate against user's accessible properties
  const accessToken = await getAccessToken()
  const properties = await listProperties(accessToken)

  if (properties.some((p) => p.propertyId === stored)) {
    return stored
  }

  return properties[0]?.propertyId ?? null
}
