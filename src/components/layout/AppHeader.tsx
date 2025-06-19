"use client";

import Link from 'next/link';
import { Target, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';

const AppHeader = () => {
  const pathname = usePathname();

  return (
    <header 
      className="shrink-0 sticky top-0 z-40 w-full bg-background/80 backdrop-blur-sm border-b"
      style={{ paddingTop: 'env(safe-area-inset-top)' }} // <-- Add this line
    >
      <div className="container flex h-16 items-center max-w-2xl">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Target className="h-6 w-6 text-primary" />
          <span className="font-bold">GroviaHabits</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;