import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getToken } from "next-auth/jwt"

export async function requireAuth() {
  const session = await auth()

  if (!session) {
    redirect("/sign-in")
  }

  if ((session as Record<string, unknown>).error === "RefreshTokenError") {
    redirect("/sign-in")
  }

  return session
}

/**
 * Get the access token for GA4 API calls. Server-side only.
 * Redirects to sign-in if no valid session or token.
 */
export async function getAccessToken(): Promise<string> {
  const cookieStore = await cookies()

  const token = await getToken({
    req: { cookies: cookieStore } as never,
    secret: process.env.AUTH_SECRET,
  })

  if (!token?.accessToken) {
    redirect("/sign-in")
  }

  return token.accessToken as string
}
