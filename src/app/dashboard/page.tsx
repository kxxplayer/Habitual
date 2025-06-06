
"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import HabitOverview from '@/components/overview/HabitOverview';
import type { Habit } from '@/types';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const LS_KEY_PREFIX_HABITS = "habits_";
const LS_KEY_PREFIX_POINTS = "totalPoints_";

const DashboardPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [totalPoints, setTotalPoints] = React.useState<number>(0);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        router.push('/auth/login');
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  React.useEffect(() => {
    if (!authUser || isLoadingAuth) return;

    setIsLoadingData(true);
    const userUid = authUser.uid;

    const habitsKey = `${LS_KEY_PREFIX_HABITS}${userUid}`;
    const storedHabits = localStorage.getItem(habitsKey);
    if (storedHabits) {
      try {
        setHabits(JSON.parse(storedHabits));
      } catch (e) {
        console.error("Error parsing habits from localStorage on dashboard:", e);
        setHabits([]);
      }
    } else {
      setHabits([]);
    }

    const pointsKey = `${LS_KEY_PREFIX_POINTS}${userUid}`;
    const storedPoints = localStorage.getItem(pointsKey);
    if (storedPoints) {
      try {
        setTotalPoints(parseInt(storedPoints, 10) || 0);
      } catch (e) {
        console.error("Error parsing points from localStorage on dashboard:", e);
        setTotalPoints(0);
      }
    } else {
      setTotalPoints(0);
    }
    setIsLoadingData(false);
  }, [authUser, isLoadingAuth]);

  if (isLoadingAuth || (authUser && isLoadingData)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4">
      <div className={cn(
        "bg-card text-foreground shadow-xl rounded-xl flex flex-col mx-auto",
        "w-full max-w-sm",      
        "max-h-[97vh]",                    
        "md:max-w-md",                   
        "lg:max-w-lg"                   
      )}>
        <AppHeader />
        <ScrollArea className="flex-grow min-h-0">
          <div className="flex flex-col min-h-full">
            <main className="px-3 sm:px-4 py-4 flex-grow">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-primary flex items-center">
                    <LayoutDashboard className="mr-2 h-5 w-5" /> Dashboard
                  </CardTitle>
                  <CardDescription>Your habit progress and statistics.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <HabitOverview habits={habits} totalPoints={totalPoints} />
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
};

export default DashboardPage;
