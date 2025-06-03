
"use client";

import type { FC } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Home, LayoutDashboard, Award, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomNavigationBar: FC = () => {
  // TODO: Add active state highlighting based on current route
  return (
    <div className="shrink-0 bg-card border-t border-border p-1 flex justify-around items-center h-16 sticky bottom-0 z-30">
      <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/4")}>
        <Home className="h-4 w-4" />
        <span className="text-xs mt-0.5">Home</span>
      </Link>
      <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost" }), "flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/4")}>
        <LayoutDashboard className="h-4 w-4" />
        <span className="text-xs mt-0.5">Dashboard</span>
      </Link>
      <Link href="/achievements" className={cn(buttonVariants({ variant: "ghost" }), "flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/4")}>
        <Award className="h-4 w-4" />
        <span className="text-xs mt-0.5">Badges</span>
      </Link>
      <Link href="/settings" className={cn(buttonVariants({ variant: "ghost" }), "flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/4")}>
        <Settings className="h-4 w-4" />
        <span className="text-xs mt-0.5">Settings</span>
      </Link>
    </div>
  );
};

export default BottomNavigationBar;

