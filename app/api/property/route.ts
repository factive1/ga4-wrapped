import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { isValidPropertyId } from "@/lib/types"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { propertyId } = body

  if (!propertyId || !isValidPropertyId(propertyId)) {
    return NextResponse.json({ error: "Invalid property ID" }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set("ga4_property_id", propertyId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  })

  return NextResponse.json({ ok: true })
}
