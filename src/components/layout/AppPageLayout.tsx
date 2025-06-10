"use client";

import * as React from 'react';
import type { FC, ReactNode } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';

interface AppPageLayoutProps {
  children: ReactNode;
  title?: string;
  titleIcon?: React.ElementType;
  onAddNew?: () => void;
}

const AppPageLayout: FC<AppPageLayoutProps> = ({ children, title, titleIcon: Icon, onAddNew }) => {
  const router = useRouter();
  
  const handleAddNewClick = onAddNew || (() => router.push('/?action=addHabit'));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <div className="flex-grow w-full max-w-lg mx-auto flex flex-col">
        <ScrollArea className="flex-grow">
          <main className="px-4 py-6">
            {children}
          </main>
        </ScrollArea>
      </div>
      <BottomNavigationBar onAddNewHabitClick={handleAddNewClick} />
    </div>
  );
};

export default AppPageLayout;
