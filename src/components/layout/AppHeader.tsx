"use client";

import type { FC } from 'react';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';
// Removed Button and PlusCircle as "Add Habit" is moved to main page

interface AppHeaderProps {
  // onAddHabitClick prop is removed
}

const AppHeader: FC<AppHeaderProps> = () => {
  return (
    <header className="bg-card shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2 text-primary align-text-bottom">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
          <h1 className="text-3xl font-bold text-primary">
            Habitual
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <ThemeToggleButton />
          {/* "Add Habit" button removed from here */}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
