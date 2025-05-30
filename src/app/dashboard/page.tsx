
"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import HabitOverview from '@/components/overview/HabitOverview';
import type { Habit } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, LayoutDashboard } from 'lucide-react';
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className={cn(
        "min-h-screen p-2 sm:p-4 flex items-center justify-center",
      )}>
      <div className={cn(
        "bg-card text-foreground shadow-xl rounded-xl flex flex-col overflow-hidden mx-auto",
        "w-full max-w-md h-full max-h-[90vh] sm:max-h-[850px]",
        "md:max-w-lg md:max-h-[85vh]",
        "lg:max-w-2xl lg:max-h-[80vh]"
      )}>
        <header className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary flex items-center">
              <LayoutDashboard className="mr-2 h-5 w-5" /> Dashboard
            </h1>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-1 h-4 w-4" /> Home
              </Link>
            </Button>
          </div>
        </header>
        <div className="flex-grow overflow-y-auto p-4">
          <HabitOverview habits={habits} totalPoints={totalPoints} />
        </div>
         <footer className="py-3 text-center text-xs text-muted-foreground border-t">
            <p>&copy; {new Date().getFullYear()} Habitual.</p>
        </footer>
      </div>
    </div>
  );
};

export default DashboardPage;
