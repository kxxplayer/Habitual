
"use client";

import type { FC } from 'react';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';

interface AppHeaderProps {
  onOpenCalendar?: () => void;
}

const AppHeader: FC<AppHeaderProps> = ({ onOpenCalendar }) => {
  return (
    <header className="bg-card shadow-md sticky top-0 z-40 shrink-0">
      <div className="px-4 py-4 flex justify-between items-center w-full">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2 text-primary align-text-bottom">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
          <h1 className="text-2xl font-bold text-primary">
            Habitual
          </h1>
        </div>
        <div className="flex items-center space-x-1">
          {onOpenCalendar && (
            <Button variant="ghost" size="icon" onClick={onOpenCalendar} aria-label="Open Calendar">
              <CalendarDays className="h-5 w-5 text-primary" />
            </Button>
          )}
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
