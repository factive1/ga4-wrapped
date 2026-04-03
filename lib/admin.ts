import { cache } from "react"
import { OAuth2Client } from "google-auth-library"
import type { GA4Property } from "./types"
import { createTTLCache } from "./cache"

const { AnalyticsAdminServiceClient } =
  require("@google-analytics/admin") as typeof import("@google-analytics/admin")

function createAdminClient(accessToken: string) {
  const oauth2Client = new OAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  return new AnalyticsAdminServiceClient({ authClient: oauth2Client as never })
}

// ─── In-memory property list cache (1 hour TTL) ────────────────────────────

const PROPERTY_CACHE_TTL = 60 * 60 * 1000 // 1 hour
const propertyCache = createTTLCache<GA4Property[]>(5)

export const listProperties = cache(
  async (accessToken: string): Promise<GA4Property[]> => {
    const cached = propertyCache.get(accessToken)
    if (cached) return cached

    const client = createAdminClient(accessToken)
    const properties: GA4Property[] = []

    const [accounts] = await client.listAccountSummaries({})

    for (const account of accounts || []) {
      for (const property of account.propertySummaries || []) {
        if (property.property && property.displayName) {
          properties.push({
            propertyId: property.property.replace("properties/", ""),
            displayName: property.displayName,
            accountName: account.displayName || "Unknown Account",
          })
        }
      }
    }

    propertyCache.set(accessToken, properties, PROPERTY_CACHE_TTL)
    return properties
  }
)
