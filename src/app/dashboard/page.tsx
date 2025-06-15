"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';

// ADDED: Imports for Firebase Functions
import { getFunctions, httpsCallable } from 'firebase/functions';

import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import dynamic from 'next/dynamic';
import type { Habit, HabitCategory, HabitCompletionLogEntry, WeekDay, EarnedBadge } from '@/types';
import { HABIT_CATEGORIES, weekDays as weekDaysArrayForForm } from '@/types';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// REMOVED: The import from '@/ai/flows/...' has been deleted.

const HabitOverview = dynamic(
  () => import('@/components/overview/HabitOverview'),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);
const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";

// ADDED: Create a reference to your Cloud Function
const functions = getFunctions();
const getHabitSuggestionCallable = httpsCallable(functions, 'getHabitSuggestion');

const DashboardPage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [earnedBadges, setEarnedBadges] = React.useState<EarnedBadge[]>([]);
  const [totalPoints, setTotalPoints] = React.useState<number>(0);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        router.push('/auth/login');
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribeAuth();
  }, [router]);

  React.useEffect(() => {
    if (!authUser || isLoadingAuth) {
      if (!authUser && !isLoadingAuth) {
        setIsLoadingData(false);
      }
      return;
    }

    setIsLoadingData(true);
    const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);

    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const parsedHabits = (Array.isArray(data.habits) ? data.habits : []).map((h: any): Habit => ({
          id: String(h.id || Date.now().toString() + Math.random().toString(36).substring(2, 7)),
          name: String(h.name || 'Unnamed Habit'),
          description: typeof h.description === 'string' ? h.description : undefined,
          category: HABIT_CATEGORIES.includes(h.category as HabitCategory) ? h.category : 'Other',
          daysOfWeek: Array.isArray(h.daysOfWeek) ? h.daysOfWeek.filter((d: any): d is WeekDay => weekDaysArrayForForm.includes(d as WeekDay)) : [],
          optimalTiming: typeof h.optimalTiming === 'string' ? h.optimalTiming : undefined,
          durationHours: typeof h.durationHours === 'number' ? h.durationHours : undefined,
          durationMinutes: typeof h.durationMinutes === 'number' ? h.durationMinutes : undefined,
          specificTime: typeof h.specificTime === 'string' ? h.specificTime : undefined,
          completionLog: (Array.isArray(h.completionLog) ? h.completionLog : [])
            .map((log: Partial<HabitCompletionLogEntry>): HabitCompletionLogEntry | null => {
              if (typeof log.date !== 'string' || !log.date.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
              return {
                date: log.date,
                time: typeof log.time === 'string' && log.time.length > 0 ? log.time : 'N/A',
                note: typeof log.note === 'string' ? log.note : undefined,
                status: ['completed', 'pending_makeup', 'skipped'].includes(log.status as string) ? log.status as 'completed' | 'pending_makeup' | 'skipped' : 'completed',
                originalMissedDate: typeof log.originalMissedDate === 'string' && log.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? log.originalMissedDate : undefined,
              };
            })
            .filter((log: HabitCompletionLogEntry | null): log is HabitCompletionLogEntry => log !== null)
            .sort((a: HabitCompletionLogEntry, b: HabitCompletionLogEntry) => b.date.localeCompare(a.date)),
          reminderEnabled: typeof h.reminderEnabled === 'boolean' ? h.reminderEnabled : false,
          programId: typeof h.programId === 'string' ? h.programId : undefined,
          programName: typeof h.programName === 'string' ? h.programName : undefined,
        }));
        
        setHabits(parsedHabits);
        setEarnedBadges(Array.isArray(data.earnedBadges) ? data.earnedBadges : []);
        setTotalPoints(typeof data.totalPoints === 'number' ? data.totalPoints : 0);
      } else {
        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
      }
      setIsLoadingData(false);
    }, (error) => {
      console.error("Error fetching dashboard data from Firestore:", error);
      toast({ title: "Data Error", description: "Could not load dashboard data.", variant: "destructive" });
      setIsLoadingData(false);
    });

    return () => unsubscribeFirestore();
  }, [authUser, isLoadingAuth, toast]);

  // ADDED: Wrapper function to call the cloud function.
  const handleGetAISuggestion = async (habit: Habit) => {
    try {
      const response = await getHabitSuggestionCallable({
        habitName: habit.name,
        trackingData: `Completions: ${habit.completionLog.length}`,
        daysOfWeek: habit.daysOfWeek,
      });
      const data = response.data as { suggestion: string };
      // You might want to display this suggestion in a toast or dialog
      toast({ title: "AI Suggestion", description: data.suggestion });
      return data;
    } catch (e) {
      toast({ title: "Error", description: "Could not get AI suggestion.", variant: "destructive" });
      throw e; // Re-throw error so the calling component knows it failed
    }
  };


  if (isLoadingAuth || (authUser && isLoadingData)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!authUser) {
    return null; // The auth listener will redirect
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow">
        <HabitOverview
          habits={habits}
          totalPoints={totalPoints}
          earnedBadges={earnedBadges}
          // MODIFIED: Pass the new handler function as a prop
          getAISuggestion={handleGetAISuggestion}
        />
      </main>
      <BottomNavigationBar onAddNewHabitClick={() => router.push('/?action=addHabit')} />
    </div>
  );
};

export default DashboardPage;