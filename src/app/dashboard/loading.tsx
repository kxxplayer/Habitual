
"use client";

import { Loader2, LayoutDashboard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { cn } from '@/lib/utils';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4">
      <div className={cn(
        "bg-card/95 backdrop-blur-sm text-foreground shadow-xl rounded-xl flex flex-col mx-auto",
        "w-full max-w-sm h-[97vh] max-h-[97vh]",
        "md:max-w-md lg:max-w-lg"
      )}>
        <AppHeader />
        <div className="flex-grow overflow-auto">
          <div className="flex flex-col min-h-full">
            <main className="px-3 sm:px-4 py-4 flex-grow">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-primary flex items-center">
                    <LayoutDashboard className="mr-2 h-5 w-5" /> Dashboard
                  </CardTitle>
                  <CardDescription>Your habit progress and statistics.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 flex flex-col items-center justify-center min-h-[200px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-muted-foreground">Loading dashboard...</p>
                </CardContent>
              </Card>
            </main>
            <footer className="py-3 text-center text-xs text-muted-foreground border-t shrink-0 mt-auto">
              <p>&copy; {new Date().getFullYear()} Habitual.</p>
            </footer>
          </div>
        </div>
        <BottomNavigationBar />
      </div>
    </div>
  );
}
