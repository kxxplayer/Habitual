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
    <div className="flex flex-col min-h-screen min-h-[100dvh] bg-gradient-to-br from-primary/10 via-background to-accent/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-y-auto overscroll-contain">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 dark:bg-primary/10 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-accent/20 dark:bg-accent/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-32 left-32 w-28 h-28 bg-primary/15 dark:bg-primary/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-36 h-36 bg-accent/15 dark:bg-accent/5 rounded-full blur-xl"></div>
      </div>
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <AppHeader />
        <div className="flex-1 flex flex-col items-center w-full">
          <div className="w-full max-w-2xl flex-1 flex flex-col">
            <ScrollArea className="flex-1">
              <main className="px-4 pt-2 pb-24">
                {children}
              </main>
            </ScrollArea>
          </div>
        </div>
        <BottomNavigationBar onAddNewHabitClick={onAddNew} />
      </div>
    </div>
  );
};

export default AppPageLayout;
