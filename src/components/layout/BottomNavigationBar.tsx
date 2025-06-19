
"use client";

import type { FC } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, LayoutDashboard, Award, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

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
    { id: "achievements", href: "/achievements", icon: Award, label: "Badges" },
    { id: "settings", href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="shrink-0 bg-card border-t border-border p-1 flex justify-around items-center h-14 sticky bottom-0 z-30"
          style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))' }} // 0.25rem is p-1
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
                "flex flex-col items-center justify-center h-12 w-12 rounded-full text-primary-foreground transition-colors duration-150 ease-in-out",
                "bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95",
                "relative -top-3"
              )}
              aria-label="Add new habit"
            >
              <IconComponent className="h-6 w-6" />
            </Button>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href!}
            className={cn(
              "flex flex-col items-center justify-center h-full p-1 flex-1 transition-colors duration-150 ease-in-out group",
              !isActive && "hover:text-primary" // Apply hover to Link for group hover effect
            )}
            aria-label={item.label}
          >
            <div className={cn(
              "p-1 rounded-full transition-colors",
              isActive ? "bg-primary/10" : "bg-transparent"
            )}>
              <IconComponent className={cn(
                "h-5 w-5",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )} />
            </div>
            <span className={cn(
              "mt-0.5 text-[10px] leading-tight",
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
