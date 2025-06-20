"use client";

import * as React from 'react';
import type { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Importing Trophy, which will be used below
import { Home, LayoutDashboard, Trophy, Settings, Plus } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  href?: string;
  action?: () => void;
  icon: React.ElementType;
  label: string;
  isCentral?: boolean;
}

interface BottomNavigationBarProps {
  onAddNewHabitClick?: () => void;
}

const BottomNavigationBar: FC<BottomNavigationBarProps> = ({ onAddNewHabitClick }) => {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { id: "home", href: "/", icon: Home, label: "Home" },
    { id: "dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "add-habit", action: onAddNewHabitClick, icon: Plus, label: "Add", isCentral: true },
    // Corrected this line to use the imported 'Trophy' icon instead of 'Award'
    { id: "achievements", href: "/achievements", icon: Trophy, label: "Badges" }, 
    { id: "settings", href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div 
      className="shrink-0 bg-card/80 backdrop-blur-md border-t border-border/30 p-1 flex justify-around items-center h-14 sticky bottom-0 z-30"
      style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))' }}
    >
      {navItems.map((item) => {
        const isActive = item.isCentral || !item.href ? false : pathname === item.href;
        const IconComponent = item.icon;

        if (item.isCentral) {
          return (
            <Button
              key={item.id}
              onClick={() => {
                console.log(`BOTTOMNAV: Clicked on Nav Item: ${item.label}`);
                if (item.action) {
                  item.action();
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center h-11 w-11 rounded-full text-primary-foreground transition-colors duration-150 ease-in-out",
                "bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95",
                "relative -top-2"
              )}
              aria-label="Add new habit"
            >
              <IconComponent className="h-5 w-5" />
            </Button>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href!}
            className={cn(
              "flex flex-col items-center justify-center h-full p-0.5 flex-1 transition-colors duration-150 ease-in-out group"
            )}
            aria-label={item.label}
          >
            <div className={cn(
              "p-1 rounded-full transition-colors",
              isActive ? "bg-primary/10" : "bg-transparent"
            )}>
              <IconComponent className={cn(
                "h-4 w-4",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )} />
            </div>
            <span className={cn(
              "mt-0.5 text-[9px] leading-tight",
              isActive ? "text-primary font-medium" : "text-muted-foreground group-hover:text-primary"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNavigationBar;