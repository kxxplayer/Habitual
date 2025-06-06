
"use client";

import type { FC } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Home, LayoutDashboard, Award, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

const BottomNavigationBar: FC = () => {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/?action=addHabit", icon: Plus, label: "Add", isCentral: true },
    { href: "/achievements", icon: Award, label: "Badges" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="shrink-0 bg-card border-t border-border p-1 flex justify-around items-center h-14 sticky bottom-0 z-30">
      {navItems.map((item) => {
        const isActive = item.isCentral ? false : pathname === item.href; // Central button isn't "active" in the same way
        const IconComponent = item.icon;

        if (item.isCentral) {
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => console.log(`BOTTOMNAV: Clicked on Nav Item: ${item.label}, Href: ${item.href}`)}
              className={cn(
                "flex flex-col items-center justify-center h-12 w-12 rounded-full text-primary-foreground transition-colors duration-150 ease-in-out",
                "bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95",
                "relative -top-3" // Elevate the button slightly
              )}
              aria-label="Add new habit"
            >
              <IconComponent className="h-6 w-6" />
            </Link>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => console.log(`BOTTOMNAV: Clicked on Nav Item: ${item.label}, Href: ${item.href}`)}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "flex flex-col items-center justify-center h-full p-1 flex-1",
              isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <IconComponent className="h-4 w-4" />
            <span className="text-xs mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNavigationBar;
