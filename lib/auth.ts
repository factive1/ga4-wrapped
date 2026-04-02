import { cache } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getToken } from "next-auth/jwt"
import { parseDateParams } from "./date-utils"
import type { DateRangeParams } from "./types"
import { isValidPropertyId } from "./types"

export async function requireAuth() {
  const session = await auth()

  if (!session) {
    redirect("/sign-in")
  }

  if (session.error === "RefreshTokenError") {
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
 * Validates property ID format. Returns null if no property selected.
 */
export async function getPageContext(searchParams: Record<string, string>) {
  const cookieStore = await cookies()
  const raw = cookieStore.get("ga4_property_id")?.value
  const propertyId = raw && isValidPropertyId(raw) ? raw : null
  const dateRange: DateRangeParams = parseDateParams(searchParams)
  return { propertyId, dateRange }
}
