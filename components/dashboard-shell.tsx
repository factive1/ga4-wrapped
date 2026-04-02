import { cookies } from "next/headers"
import { auth, signOut } from "@/auth"
import { getAccessToken } from "@/lib/auth"
import { listProperties } from "@/lib/admin"
import {
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "@/components/sidebar-nav"
import { PropertyPicker } from "@/components/property-picker"
import { DateRangePicker } from "@/components/date-range-picker"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export async function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const accessToken = await getAccessToken()
  const cookieStore = await cookies()
  const propertyId = cookieStore.get("ga4_property_id")?.value ?? null
  const sidebarState = cookieStore.get("sidebar_state")?.value

  let properties: Awaited<ReturnType<typeof listProperties>> = []
  try {
    properties = await listProperties(accessToken)
  } catch {
    // Properties will be empty — picker shows "No properties found"
  }

  // Validate the stored property ID against user's accessible properties
  const validPropertyId =
    propertyId && properties.some((p) => p.propertyId === propertyId)
      ? propertyId
      : properties[0]?.propertyId ?? null

  // If stored property doesn't match valid one, the picker will handle updating

  return (
    <SidebarProvider defaultOpen={sidebarState !== "false"}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <svg
              className="h-6 w-6 shrink-0"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                width="32"
                height="32"
                rx="8"
                className="fill-primary"
              />
              <path
                d="M8 22L12 10L16 18L20 12L24 22"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-semibold text-lg">Clearview</span>
          </div>
          <div className="mt-2 group-data-[collapsible=icon]:hidden">
            <PropertyPicker
              properties={properties}
              currentPropertyId={validPropertyId}
            />
          </div>
        </SidebarHeader>
        <SidebarNav />
        <SidebarFooter className="p-4 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground truncate">
              {session?.user?.email}
            </span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/sign-in" })
              }}
            >
              <Button variant="ghost" size="icon" type="submit">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1" />
          <DateRangePicker />
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
