import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import type { JWT } from "next-auth/jwt"

const PLACEHOLDER_SECRETS = [
  "changeme",
  "your-secret-here",
  "secret",
  "placeholder",
  "change-me",
  "replace-me",
]

function validateSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with: openssl rand -base64 32"
    )
  }
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long")
  }
  if (PLACEHOLDER_SECRETS.includes(secret.toLowerCase().trim())) {
    throw new Error(
      "AUTH_SECRET is a placeholder. Generate a real one with: openssl rand -base64 32"
    )
  }
}

// Validated lazily at first auth request, not at import time (breaks builds without .env)

async function refreshAccessToken(token: JWT): Promise<JWT> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken as string,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error("Failed to refresh access token")
  }

  return {
    ...token,
    accessToken: data.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    refreshToken: data.refresh_token ?? token.refreshToken,
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.manage.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, account }) {
      // Validate secret on first real auth request
      if (account && process.env.NODE_ENV === "production") {
        validateSecret()
      }
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }

      // Return token if still valid (with 60s buffer)
      if (Date.now() < ((token.expiresAt as number) - 60) * 1000) {
        return token
      }

      // Attempt refresh — on failure, clear tokens to force re-auth
      try {
        return await refreshAccessToken(token)
      } catch {
        return { ...token, accessToken: undefined, error: "RefreshTokenError" }
      }
    },
    session({ session, token }) {
      // Access token intentionally NOT exposed to client
      if (token.error) {
        (session as unknown as Record<string, unknown>).error = token.error
      }
      return session
    },
  },
})
