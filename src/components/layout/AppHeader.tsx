
"use client";

import type { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';
import { Button, buttonVariants } from '@/components/ui/button';
import { CalendarDays, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const AppHeader: FC = () => {
  const router = useRouter();

  return (
    <header className="bg-card/95 backdrop-blur-sm shadow sticky top-0 z-40 shrink-0"> {/* Added translucency & blur */}
      <div className="px-3 py-2 flex justify-between items-center w-full"> {/* Slimmer padding */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-7 w-7 mr-1.5" /* Slimmer button */
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4 text-primary" /> {/* Slimmer icon */}
          </Button>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5 text-primary align-text-bottom"> {/* Slimmer icon */}
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
          <h1 className="text-base font-medium text-primary"> {/* Slimmer font size & weight */}
            Habitual
          </h1>
        </div>
        <div className="flex items-center space-x-0.5"> {/* Reduced space */}
          <Link
            href="/calendar"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-7 w-7")} /* Slimmer button */
            aria-label="Open Calendar"
          >
            <CalendarDays className="h-3.5 w-3.5 text-primary" /> {/* Slimmer icon */}
          </Link>
          <ThemeToggleButton /> {/* Uses icon button size internally */}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
