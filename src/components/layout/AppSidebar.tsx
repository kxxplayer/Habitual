
"use client";

import type { FC } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { UserCircle, Settings, CalendarDays, Home, BellRing } from 'lucide-react';
import Link from 'next/link';

const AppSidebar: FC = () => {
  const menuItems = [
    { href: '#profile', label: 'Profile', icon: UserCircle, tooltip: 'Profile' },
    { href: '#reminders', label: 'Reminders', icon: BellRing, tooltip: 'Reminders' },
    { href: '#settings', label: 'Settings', icon: Settings, tooltip: 'Settings' },
    { href: '#calendar', label: 'Calendar', icon: CalendarDays, tooltip: 'Calendar' },
  ];

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarContent className="pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={{ children: "Home", side: "right", align: "center" }}>
              <Link href="/">
                <Home />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton asChild tooltip={{ children: item.tooltip, side: "right", align: "center" }}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
