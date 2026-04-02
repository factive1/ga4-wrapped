"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ArrowRightLeft,
  FileText,
  MousePointerClick,
  Target,
  DollarSign,
  Monitor,
  Globe,
} from "lucide-react"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Overview", href: "/", icon: LayoutDashboard },
  { title: "Traffic", href: "/traffic", icon: ArrowRightLeft },
  { title: "Pages", href: "/pages", icon: FileText },
  { title: "Engagement", href: "/engagement", icon: MousePointerClick },
  { title: "Conversions", href: "/conversions", icon: Target },
  { title: "Revenue", href: "/revenue", icon: DollarSign },
  { title: "Devices", href: "/devices", icon: Monitor },
  { title: "Geo", href: "/geo", icon: Globe },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href)
                  }
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}
