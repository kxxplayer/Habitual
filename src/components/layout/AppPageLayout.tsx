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
      <div className="flex-grow w-full max-w-2xl mx-auto flex flex-col">
        <ScrollArea className="flex-grow">
          <main className="px-4 sm:px-6 py-6">
            {children}
          </main>
        </ScrollArea>
      </div>
      <BottomNavigationBar onAddNewHabitClick={onAddNew} />
    </div>
  );
};

export default AppPageLayout;
