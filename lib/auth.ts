import { cache } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getToken } from "next-auth/jwt"
import { listProperties } from "./admin"
import { parseDateParams } from "./date-utils"
import type { DateRangeParams } from "./types"
import { isValidPropertyId } from "./types"

export async function requireAuth() {
  const session = await auth()

  if (!session || session.error === "RefreshTokenError") {
    redirect("/sign-in")
  }

  return session
}

/**
 * Get the access token for GA4 API calls. Server-side only.
 * Wrapped in React.cache() to deduplicate across Suspense boundaries.
 */
export const getAccessToken = cache(async (): Promise<string> => {
  const cookieStore = await cookies()

  const token = await getToken({
    // getToken expects NextRequest but works with a cookies object
    req: { cookies: cookieStore } as never,
    secret: process.env.AUTH_SECRET,
  })

  if (!token?.accessToken) {
    redirect("/sign-in")
  }

  return token.accessToken
})

/**
 * Get property ID and date range from cookies/search params.
 * Validates property ID format and verifies the user has access to the property.
 * Returns null propertyId if no property selected or access is denied.
 */
export async function getPageContext(searchParams: Record<string, string>) {
  const cookieStore = await cookies()
  const raw = cookieStore.get("ga4_property_id")?.value
  let propertyId = raw && isValidPropertyId(raw) ? raw : null

  // Verify the user actually has access to this property (defense-in-depth)
  if (propertyId) {
    try {
      const accessToken = await getAccessToken()
      const properties = await listProperties(accessToken)
      if (!properties.some((p) => p.propertyId === propertyId)) {
        propertyId = null
      }
    } catch {
      // If we can't verify, let the GA4 API enforce access control
    }
  }

  const dateRange: DateRangeParams = parseDateParams(searchParams)
  return { propertyId, dateRange }
}
