import { cache } from "react"
import { OAuth2Client } from "google-auth-library"
import type { GA4Property } from "./types"

const { AnalyticsAdminServiceClient } =
  require("@google-analytics/admin") as typeof import("@google-analytics/admin")

function createAdminClient(accessToken: string) {
  const oauth2Client = new OAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })
  return new AnalyticsAdminServiceClient({ authClient: oauth2Client as never })
}

export const listProperties = cache(
  async (accessToken: string): Promise<GA4Property[]> => {
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

    return properties
  }
)
