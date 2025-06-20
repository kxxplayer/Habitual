"use client";

import * as React from 'react';
import type { FC, ReactNode } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppPageLayoutProps {
  children: ReactNode;
  onAddNew?: () => void;
}

const AppPageLayout: FC<AppPageLayoutProps> = ({ children, onAddNew }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col">
        <ScrollArea className="flex-1">
          <main className="px-3 sm:px-4 pt-2 pb-20">
            {children}
          </main>
        </ScrollArea>
      </div>
      <BottomNavigationBar onAddNewHabitClick={onAddNew} />
    </div>
  );
};

export default AppPageLayout;
