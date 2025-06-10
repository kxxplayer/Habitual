"use client";

// ==========================================================================
// HABITUAL MAIN PAGE - Firestore Integration
// ==========================================================================
import * as React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { NextPage } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';

import { auth, db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

import AppPageLayout from '@/components/layout/AppPageLayout';
import HabitList from '@/components/habits/HabitList';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import AddReflectionNoteDialog from '@/components/habits/AddReflectionNoteDialog';
import RescheduleMissedHabitDialog from '@/components/habits/RescheduleMissedHabitDialog';
import CreateHabitDialog from '@/components/habits/CreateHabitDialog';
import DailyQuestDialog from '@/components/popups/DailyQuestDialog';
import HabitDetailViewDialog from '@/components/habits/HabitDetailViewDialog';
import GoalInputProgramDialog from '@/components/programs/GoalInputProgramDialog';
import ProgramSuggestionDialog from '@/components/programs/ProgramSuggestionDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import type { Habit, AISuggestion as AISuggestionType, WeekDay, HabitCompletionLogEntry, HabitCategory, EarnedBadge, CreateHabitFormData, SuggestedHabitForCommonList as CommonSuggestedHabitType } from '@/types';
import { HABIT_CATEGORIES, weekDays as weekDaysArrayForForm, SEVEN_DAY_STREAK_BADGE_ID, THIRTY_DAY_STREAK_BADGE_ID, FIRST_HABIT_COMPLETED_BADGE_ID, THREE_DAY_SQL_STREAK_BADGE_ID } from '@/types';

import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { getSqlTip } from '@/ai/flows/sql-tip-flow';
import { getMotivationalQuote } from '@/ai/flows/motivational-quote-flow';
import { getCommonHabitSuggestions } from '@/ai/flows/common-habit-suggestions-flow';
import { generateHabitProgramFromGoal, type GenerateHabitProgramOutput, type SuggestedProgramHabit } from '@/ai/flows/generate-habit-program-flow';
import { getReflectionStarter, type ReflectionStarterInput, type ReflectionStarterOutput } from '@/ai/flows/reflection-starter-flow';

import { checkAndAwardBadges } from '@/lib/badgeUtils';
import { useToast } from "@/hooks/use-toast";

import { Loader2, ListChecks } from 'lucide-react';
import { format, getDay, parseISO } from 'date-fns';

const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const POINTS_PER_COMPLETION = 10;
const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";
const LS_KEY_PREFIX_DAILY_QUEST = "hasSeenDailyQuest_";
const DEBOUNCE_SAVE_DELAY_MS = 2500;

function sanitizeForFirestore<T>(data: T): T {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined) as unknown as T;
  }
  const sanitizedObject: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = (data as any)[key];
      if (value !== undefined) {
        sanitizedObject[key] = sanitizeForFirestore(value);
      }
    }
  }
  return sanitizedObject as T;
}

const LoadingFallback: React.FC = () => (
  <div className="flex min-h-screen flex-col items-center justify-center p-4">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
    <p className="mt-4 text-muted-foreground">Loading your habits...</p>
  </div>
);


const HabitualPageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  
  const [habits, setHabits] = useState<Habit[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [initialFormDataForDialog, setInitialFormDataForDialog] = useState<Partial<CreateHabitFormData> | null>(null);
  const [createHabitDialogStep, setCreateHabitDialogStep] = useState(1);
  
  const [isDailyQuestDialogOpen, setIsDailyQuestDialogOpen] = useState(false);
  const [selectedHabitForDetailView, setSelectedHabitForDetailView] = useState<Habit | null>(null);
  const [isDetailViewDialogOpen, setIsDetailViewDialogOpen] = useState(false);
  
  const [isGoalInputProgramDialogOpen, setIsGoalInputProgramDialogOpen] = useState(false);
  const [isProgramSuggestionLoading, setIsProgramSuggestionLoading] = useState(false);
  const [programSuggestion, setProgramSuggestion] = useState<GenerateHabitProgramOutput | null>(null);
  const [isProgramSuggestionDialogOpen, setIsProgramSuggestionDialogOpen] = useState(false);
  
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = React.useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = React.useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = React.useState<AISuggestionType | null>(null);
  
  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = React.useState(false);
  const [reflectionDialogData, setReflectionDialogData] = React.useState<{ habitId: string; date: string; initialNote?: string; habitName: string; } | null>(null);
  
  const [rescheduleDialogData, setRescheduleDialogData] = React.useState<{ habit: Habit; missedDate: string; } | null>(null);
  const [isDeleteHabitConfirmOpen, setIsDeleteHabitConfirmOpen] = React.useState(false);
  const [habitToDelete, setHabitToDelete] = React.useState<{ id: string; name: string } | null>(null);
  
  const [commonHabitSuggestions, setCommonHabitSuggestions] = React.useState<CommonSuggestedHabitType[]>([]);
  const [isLoadingCommonSuggestions, setIsLoadingCommonSuggestions] = React.useState(false);
  const [commonSuggestionsFetched, setCommonSuggestionsFetched] = React.useState(false);

  const debounceSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const firstDataLoadCompleteRef = React.useRef<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const todayString = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayAbbr = useMemo(() => dayIndexToWeekDayConstant[getDay(new Date())], []);

  // ... (Other useEffects and handlers) ...
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setIsLoadingAuth(false);
      if (!user) {
        router.push('/auth/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
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
            .filter((log): log is HabitCompletionLogEntry => log !== null)
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
      console.error("Error fetching data from Firestore:", error);
      toast({ title: "Data Error", description: "Could not load data.", variant: "destructive" });
      setIsLoadingData(false);
    });

    return () => unsubscribeFirestore();
  }, [authUser, isLoadingAuth, toast]);
  
  const handleAddNewHabit = () => {
    setEditingHabit(null);
    setInitialFormDataForDialog(null);
    setCreateHabitDialogStep(1);
    setIsCreateHabitDialogOpen(true);
  };
    
  const handleOpenDetailView = (habit: Habit) => {
    setSelectedHabitForDetailView(habit);
    setIsDetailViewDialogOpen(true);
  };
  
  const handleCloseDetailView = useCallback(() => {
    setIsDetailViewDialogOpen(false);
    setSelectedHabitForDetailView(null);
  }, []);
  
  const handleSaveHabit = () => {};
  const handleToggleComplete = () => {};
  const handleOpenDeleteConfirm = () => {};
  const handleOpenEditDialog = () => {};
  const handleOpenRescheduleDialog = () => {};
  const handleOpenReflectionDialog = () => {};
  const handleGetAISuggestion = () => {};
  const handleToggleReminder = () => {};


  if (isLoadingAuth || isLoadingData) {
    return <LoadingFallback />;
  }
  
  return (
    <AppPageLayout onAddNew={handleAddNewHabit}>
      <HabitList 
          habits={habits}
          onOpenDetailView={handleOpenDetailView}
          todayString={todayString}
          todayAbbr={todayAbbr}
          onToggleComplete={handleToggleComplete}
          onDelete={handleOpenDeleteConfirm}
          onEdit={handleOpenEditDialog}
          onReschedule={handleOpenRescheduleDialog}
      />
      {/* Other dialogs... */}
      <HabitDetailViewDialog
          habit={selectedHabitForDetailView}
          isOpen={isDetailViewDialogOpen}
          onClose={handleCloseDetailView}
          onToggleComplete={handleToggleComplete}
          onGetAISuggestion={handleGetAISuggestion}
          onOpenReflectionDialog={handleOpenReflectionDialog}
          onOpenRescheduleDialog={handleOpenRescheduleDialog}
          onToggleReminder={handleToggleReminder}
          onOpenEditDialog={handleOpenEditDialog}
          onOpenDeleteConfirm={handleOpenDeleteConfirm}
          onGetAIReflectionPrompt={getReflectionStarter}
      />
      <CreateHabitDialog
          isOpen={isCreateHabitDialogOpen}
          onClose={() => setIsCreateHabitDialogOpen(false)}
          onSaveHabit={handleSaveHabit}
          initialData={initialFormDataForDialog}
          currentStep={createHabitDialogStep}
          setCurrentStep={setCreateHabitDialogStep}
          onOpenGoalProgramDialog={() => setIsGoalInputProgramDialogOpen(true)}
      />
    </AppPageLayout>
  );
};

const HabitualPage: NextPage = () => {
    return (
        <React.Suspense fallback={<LoadingFallback />}>
            <HabitualPageContent />
        </React.Suspense>
    );
};

export default HabitualPage;

