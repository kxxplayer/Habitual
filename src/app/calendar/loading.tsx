
"use client";

import { Loader2, CalendarDays } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarSkeleton } from '@/components/ui/calendar'; // Use actual calendar for skeleton shape
import { cn } from '@/lib/utils';

export default function CalendarLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4">
      <div className={cn(
        "bg-card/95 backdrop-blur-sm text-foreground shadow-xl rounded-xl flex flex-col mx-auto",
        "w-full max-w-sm h-[97vh] max-h-[97vh]",
        "md:max-w-md lg:max-w-lg"
      )}>
        <AppHeader />
        <ScrollArea className="flex-grow min-h-0">
          <div className="flex flex-col min-h-full">
            <main className="px-3 sm:px-4 py-4 flex-grow">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-primary flex items-center">
                    <CalendarDays className="mr-2 h-5 w-5" /> Habit Calendar
                  </CardTitle>
                  <CardDescription>View your habit activity across dates.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 flex flex-col items-center justify-center min-h-[300px]">
                   <Loader2 className="h-8 w-8 animate-spin text-primary" />
                   <p className="mt-3 text-muted-foreground">Loading calendar...</p>
                </CardContent>
              </Card>
            </main>
            <footer className="py-3 text-center text-xs text-muted-foreground border-t shrink-0 mt-auto">
              <p>&copy; {new Date().getFullYear()} Habitual.</p>
            </footer>
          </div>
        </ScrollArea>
        <BottomNavigationBar />
      </div>
    </div>
  );
}
