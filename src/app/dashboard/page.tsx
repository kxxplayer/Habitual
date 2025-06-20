"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';

// ADDED: Imports for Firebase Functions
import { genkitService } from '@/lib/genkit-service';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import dynamic from 'next/dynamic';
import type { Habit, HabitCategory, HabitCompletionLogEntry, WeekDay, EarnedBadge, CreateHabitFormData } from '@/types';
import { HABIT_CATEGORIES, weekDays as weekDaysArrayForForm } from '@/types';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import CreateHabitDialog from '@/components/habits/CreateHabitDialog';
import GoalInputProgramDialog from '@/components/programs/GoalInputProgramDialog';
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

const DashboardPage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [earnedBadges, setEarnedBadges] = React.useState<EarnedBadge[]>([]);
  const [totalPoints, setTotalPoints] = React.useState<number>(0);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  // Dialog states
  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = React.useState(false);
  const [isGoalInputProgramDialogOpen, setIsGoalInputProgramDialogOpen] = React.useState(false);

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
    if (!authUser || isLoadingAuth) return;

    setIsLoadingData(true);
    const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);

    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const parsedHabits = (Array.isArray(data.habits) ? data.habits : []).map((h: any): Habit => ({
          id: typeof h.id === 'string' ? h.id : `h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: typeof h.name === 'string' ? h.name : 'Unnamed Habit',
          description: typeof h.description === 'string' ? h.description : '',
          category: HABIT_CATEGORIES.includes(h.category) ? h.category : 'Other',
          daysOfWeek: Array.isArray(h.daysOfWeek) ? h.daysOfWeek.filter((day: any) => weekDaysArrayForForm.includes(day)) : [],
          optimalTiming: typeof h.optimalTiming === 'string' ? h.optimalTiming : '',
          durationHours: typeof h.durationHours === 'number' && h.durationHours > 0 ? h.durationHours : undefined,
          durationMinutes: typeof h.durationMinutes === 'number' && h.durationMinutes > 0 ? h.durationMinutes : undefined,
          specificTime: typeof h.specificTime === 'string' ? h.specificTime : '',
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

  const handleOpenCreateHabitDialog = () => {
    setIsCreateHabitDialogOpen(true);
  };

  const handleOpenGoalInputProgramDialog = () => {
    setIsCreateHabitDialogOpen(false);
    setIsGoalInputProgramDialogOpen(true);
  };

  const handleSaveHabit = (habitData: CreateHabitFormData & { id?: string }) => {
    // Handle saving the habit here if needed, or just close dialog and navigate
    setIsCreateHabitDialogOpen(false);
    toast({
      title: "Habit Created!",
      description: `"${habitData.name}" has been added. Redirecting to home...`,
    });
    // Navigate to home page after successful creation
    setTimeout(() => {
      router.push('/');
    }, 1000);
  };

  // ADDED: Wrapper function to call the cloud function.
  const getAISuggestion = async (input: { habitName: string; trackingData: string; daysOfWeek: string[] }): Promise<{ suggestion: string }> => {
    try {
      const response = await genkitService.getHabitSuggestion({
        habitName: input.habitName,
        trackingData: input.trackingData,
        daysOfWeek: input.daysOfWeek as ("Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat")[],
      });
      
      return { suggestion: response.suggestion };
    } catch (e) {
      console.error('Failed to get AI suggestion:', e);
      throw new Error('Could not get AI suggestion');
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
    <>
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow">
          <HabitOverview
            habits={habits}
            totalPoints={totalPoints}
            earnedBadges={earnedBadges}
          />
        </main>
        <BottomNavigationBar onAddNewHabitClick={handleOpenCreateHabitDialog} />
      </div>

      <CreateHabitDialog
        isOpen={isCreateHabitDialogOpen}
        onClose={() => setIsCreateHabitDialogOpen(false)}
        onSaveHabit={handleSaveHabit}
        initialData={null}
        onOpenGoalProgramDialog={handleOpenGoalInputProgramDialog}
      />

      <GoalInputProgramDialog
        isOpen={isGoalInputProgramDialogOpen}
        onClose={() => setIsGoalInputProgramDialogOpen(false)}
        onSubmit={() => {
          setIsGoalInputProgramDialogOpen(false);
          toast({
            title: "Program Created!",
            description: "Your habit program has been created. Redirecting to home...",
          });
          setTimeout(() => {
            router.push('/');
          }, 1000);
        }}
        isLoading={false}
      />
    </>
  );
};

export default DashboardPage;