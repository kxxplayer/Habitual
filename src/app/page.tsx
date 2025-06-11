"use client";

// ==========================================================================
// HABITUAL MAIN PAGE - Firestore Integration
// ==========================================================================
import * as React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { NextPage } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import HabitList from '@/components/habits/HabitList';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import AddReflectionNoteDialog from '@/components/habits/AddReflectionNoteDialog';
import RescheduleMissedHabitDialog from '@/components/habits/RescheduleMissedHabitDialog';
import CreateHabitDialog from '@/components/habits/CreateHabitDialog';
import DailyQuestDialog from '@/components/popups/DailyQuestDialog';
import HabitDetailViewDialog from '@/components/habits/HabitDetailViewDialog';
import GoalInputProgramDialog from '@/components/programs/GoalInputProgramDialog';
import ProgramSuggestionDialog from '@/components/programs/ProgramSuggestionDialog';

import { Calendar } from '@/components/ui/calendar';
import type { 
  Habit, 
  AISuggestion as AISuggestionType, 
  WeekDay, 
  HabitCompletionLogEntry, 
  HabitCategory, 
  EarnedBadge, 
  CreateHabitFormData, 
  SuggestedHabitForCommonList as CommonSuggestedHabitType,
  SuggestedProgramHabit,
  GenerateHabitProgramOutput 
} from '@/types';
import { HABIT_CATEGORIES, SEVEN_DAY_STREAK_BADGE_ID, THIRTY_DAY_STREAK_BADGE_ID, FIRST_HABIT_COMPLETED_BADGE_ID, THREE_DAY_SQL_STREAK_BADGE_ID } from '@/types';

import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { getSqlTip } from '@/ai/flows/sql-tip-flow';
import { getMotivationalQuote } from '@/ai/flows/motivational-quote-flow';
import { getCommonHabitSuggestions } from '@/ai/flows/common-habit-suggestions-flow';
import { generateHabitProgramFromGoal } from '@/ai/flows/generate-habit-program-flow';
import { getReflectionStarter, type ReflectionStarterInput, type ReflectionStarterOutput } from '@/ai/flows/reflection-starter-flow';

import { checkAndAwardBadges } from '@/lib/badgeUtils';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent as DialogContentOriginal,
  DialogHeader as DialogHeaderOriginal,
  DialogTitle as DialogTitleOriginal,
  DialogClose as DialogCloseOriginal,
  DialogFooter as DialogFooterOriginal,
  DialogDescription as DialogDescriptionOriginal,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionEl,
  AlertDialogFooter as AlertDialogFooterEl,
  AlertDialogHeader as AlertDialogHeaderEl,
  AlertDialogTitle as AlertTitle,
} from '@/components/ui/alert-dialog';

import {
  Plus, Loader2, ListChecks, CalendarDays, BellRing, Bell, Home,
  Trash2, CheckCircle2, XCircle, Circle, CalendarClock as MakeupIcon, WandSparkles,
  Brain, Target,
} from 'lucide-react';
import { format, parseISO, getDay, startOfDay, subDays, addDays as dateFnsAddDays, isToday as dateFnsIsToday, isPast as dateFnsIsPast, isSameDay } from 'date-fns';

const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekDaysArrayForForm: readonly WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const POINTS_PER_COMPLETION = 10;

// Firestore collection path
const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";

const LS_KEY_PREFIX_DAILY_QUEST = "hasSeenDailyQuest_";
const DEBOUNCE_SAVE_DELAY_MS = 2500;

function sanitizeForFirestore<T>(data: T): T {
  if (data === null || typeof data !== 'object') {
    return data;
  }

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

// Moved LoadingFallback to top level for better SSR consistency
const LoadingFallback: React.FC = () => {
  const [isClientMounted, setIsClientMounted] = React.useState(false);
  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4 h-[97vh]">
      <div className={cn(
        "bg-card/95 backdrop-blur-sm text-foreground shadow-xl rounded-xl flex flex-col mx-auto h-full",
        "w-full max-w-sm",
        "md:max-w-md lg:max-w-lg"
      )}>
        <div className="flex flex-col items-center justify-center flex-grow p-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    </div>
  );
};

const HomePage: NextPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [mounted, setMounted] = useState(false);
  const previousAuthUserUidRef = useRef<string | null>(null);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = useState(false);
  const [createHabitDialogStep, setCreateHabitDialogStep] = useState(1);
  const [initialFormDataForDialog, setInitialFormDataForDialog] = useState<Partial<CreateHabitFormData> | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isDailyQuestDialogOpen, setIsDailyQuestDialogOpen] = useState(false);
  const [dialogTriggeredByUrl, setDialogTriggeredByUrl] = useState(false);

  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = useState<AISuggestionType | null>(null);
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = useState(false);

  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = useState(false);
  const [reflectionDialogData, setReflectionDialogData] = useState<{
    habitId: string; date: string; habitName: string; initialNote?: string;
  } | null>(null);

  const [rescheduleDialogData, setRescheduleDialogData] = useState<{
    habit: Habit; missedDate: string;
  } | null>(null);

  const [commonHabitSuggestions, setCommonHabitSuggestions] = useState<CommonSuggestedHabitType[]>([]);
  const [isLoadingCommonSuggestions, setIsLoadingCommonSuggestions] = useState(false);
  const [commonSuggestionsFetched, setCommonSuggestionsFetched] = useState(false);

  const [isDeleteHabitConfirmOpen, setIsDeleteHabitConfirmOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<{ id: string; name: string } | null>(null);

  const [todayString, setTodayString] = useState('');
  const [todayAbbr, setTodayAbbr] = useState<WeekDay | ''>('');
  const [allTodayTasksDone, setAllTodayTasksDone] = useState(false);

  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

  const [selectedHabitForDetailView, setSelectedHabitForDetailView] = useState<Habit | null>(null);
  const [isDetailViewDialogOpen, setIsDetailViewDialogOpen] = useState(false);

  const [isGoalInputProgramDialogOpen, setIsGoalInputProgramDialogOpen] = useState(false);
  const [isProgramSuggestionLoading, setIsProgramSuggestionLoading] = useState(false);
  const [programSuggestion, setProgramSuggestion] = useState<GenerateHabitProgramOutput | null>(null);
  const [isProgramSuggestionDialogOpen, setIsProgramSuggestionDialogOpen] = useState(false);

  const [isClientMounted, setIsClientMounted] = useState(false);

  const firstDataLoadCompleteRef = useRef(false);
  const debounceSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClientMounted(true);
    console.log("PAGE.TSX: Content mounted. Initial state: isLoadingAuth=", isLoadingAuth, "isLoadingData=", isLoadingData);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      const nowEffectToday = new Date();
      setTodayString(format(nowEffectToday, 'yyyy-MM-dd'));
      setTodayAbbr(dayIndexToWeekDayConstant[getDay(nowEffectToday)]);
      setSelectedCalendarDate(nowEffectToday);
    }
  }, [mounted]);

  // Function to directly open the Create Habit Dialog for a new habit
  const openCreateHabitDialogForNew = () => {
    console.log("PAGE.TSX: Opening Create Habit Dialog for new habit (direct action).");
    setEditingHabit(null);
    setInitialFormDataForDialog(null);
    setCreateHabitDialogStep(1);
    setIsCreateHabitDialogOpen(true);
  };

  // Auth Effect
  useEffect(() => {
    console.log(`PAGE.TSX: Auth effect running. mounted: ${mounted}`);
    const unsubscribeAuthMain = onAuthStateChanged(auth, (currentUserAuthMain) => {
      const currentUidAuthMain = currentUserAuthMain?.uid || null;
      console.log(`PAGE.TSX: Auth state changed. New UID: ${currentUidAuthMain}, Previous UID: ${previousAuthUserUidRef.current}`);

      if (previousAuthUserUidRef.current && previousAuthUserUidRef.current !== currentUidAuthMain) {
        console.log("PAGE.TSX: User changed. Resetting states.");
        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(false);
        setIsLoadingData(false);
        firstDataLoadCompleteRef.current = false;
      }

      setAuthUser(currentUserAuthMain);
      setIsLoadingAuth(false);
      previousAuthUserUidRef.current = currentUidAuthMain;

      if (!currentUserAuthMain && mounted && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
        console.log("PAGE.TSX: No authUser, redirecting to login.");
        router.push('/auth/login');
      } else if (currentUserAuthMain) {
        console.log("PAGE.TSX: Auth user confirmed/set:", currentUserAuthMain.uid);
      }
    });
    return () => {
      console.log("PAGE.TSX: Auth effect detaching.");
      unsubscribeAuthMain();
    };
  }, [router, mounted]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('denied');
    }
  }, []);

  // Data Loading Effect
  useEffect(() => {
    console.log(`PAGE.TSX: Data loading effect. authUser: ${authUser?.uid}, mounted: ${mounted}, isLoadingData: ${isLoadingData}, firstDataLoadComplete: ${firstDataLoadCompleteRef.current}, commonSuggestionsFetched: ${commonSuggestionsFetched}`);

    if (!authUser || !mounted) {
      if (isLoadingData) {
        console.log("PAGE.TSX: Data effect - No authUser or not mounted. Setting isLoadingData=false.");
        setIsLoadingData(false);
      }
      if (!authUser) firstDataLoadCompleteRef.current = false;
      return;
    }

    if (!firstDataLoadCompleteRef.current && !isLoadingData) {
      console.log("PAGE.TSX: Data effect - Conditions met to start loading. Setting isLoadingData=true.");
      setIsLoadingData(true);
    }

    const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);
    console.log(`PAGE.TSX: Subscribing to Firestore for user ${authUser.uid} at ${new Date().toISOString()}. Path: ${userDocRef.path}`);
    console.log("PAGE.TSX: Firebase App Name (from db):", db.app.name);
    console.log("PAGE.TSX: Firebase Project ID (from db options):", db.app.options.projectId);

    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      console.log(`PAGE.TSX: Firestore snapshot received for user ${authUser.uid} at ${new Date().toISOString()}. Doc exists: ${docSnap.exists()}`);
      const data = docSnap.exists() ? docSnap.data() : {};

      const parsedHabits = (Array.isArray(data.habits) ? data.habits : []).map((h: any): Habit => ({
        id: String(h.id || Date.now().toString() + Math.random().toString(36).substring(2, 7)),
        name: String(h.name || 'Unnamed Habit'),
        description: typeof h.description === 'string' ? h.description : undefined,
        category: HABIT_CATEGORIES.includes(h.category as HabitCategory) ? h.category : 'Other',
        daysOfWeek: Array.isArray(h.daysOfWeek) ? h.daysOfWeek.filter((d: any) => weekDaysArrayForForm.includes(d as WeekDay)) : [],
        optimalTiming: typeof h.optimalTiming === 'string' ? h.optimalTiming : undefined,
        durationHours: typeof h.durationHours === 'number' ? h.durationHours : undefined,
        durationMinutes: typeof h.durationMinutes === 'number' ? h.durationMinutes : undefined,
        specificTime: typeof h.specificTime === 'string' && h.specificTime.match(/^\d{2}:\d{2}$/) ? h.specificTime : undefined,
        completionLog: (Array.isArray(h.completionLog) ? h.completionLog : [])
          .map((log: { date?: string; time?: string; note?: string; status?: string; originalMissedDate?: string }): HabitCompletionLogEntry | undefined => {
            if (typeof log.date !== 'string' || !log.date.match(/^\d{4}-\d{2}-\d{2}$/)) return undefined;
            return {
              date: log.date,
              time: typeof log.time === 'string' && log.time.length > 0 ? log.time : 'N/A',
              note: typeof log.note === 'string' ? log.note : undefined,
              status: ['completed', 'pending_makeup', 'skipped'].includes(log.status as string) ? log.status as 'completed' | 'pending_makeup' | 'skipped' : 'completed',
              originalMissedDate: typeof log.originalMissedDate === 'string' && log.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? log.originalMissedDate : undefined,
            };
          })
          .filter((log: HabitCompletionLogEntry | undefined): log is HabitCompletionLogEntry => log !== undefined)
          .sort((a: HabitCompletionLogEntry, b: HabitCompletionLogEntry) => b.date.localeCompare(a.date)),
        reminderEnabled: typeof h.reminderEnabled === 'boolean' ? h.reminderEnabled : false,
        programId: typeof h.programId === 'string' ? h.programId : undefined,
        programName: typeof h.programName === 'string' ? h.programName : undefined,
      }));
      setHabits(parsedHabits);
      setEarnedBadges(Array.isArray(data.earnedBadges) ? data.earnedBadges : []);
      setTotalPoints(typeof data.totalPoints === 'number' ? data.totalPoints : 0);
      console.log(`PAGE.TSX: Habits set (${parsedHabits.length}), Badges set (${(Array.isArray(data.earnedBadges) ? data.earnedBadges : []).length}), Points set (${typeof data.totalPoints === 'number' ? data.totalPoints : 0})`);

      if (parsedHabits.length === 0 && !commonSuggestionsFetched && authUser) {
        console.log("PAGE.TSX: No habits, fetching common suggestions.");
        setIsLoadingCommonSuggestions(true);
        getCommonHabitSuggestions({ count: 5 })
          .then(response => {
            setCommonHabitSuggestions(response?.suggestions || []);
            console.log("PAGE.TSX: Common suggestions fetched:", response?.suggestions?.length || 0);
          })
          .catch(err => {
            setCommonHabitSuggestions([]);
            console.error("Failed to load common habit suggestions:", err);
            toast({ title: "AI Error", description: "Could not load common habit suggestions.", variant: "destructive" });
          })
          .finally(() => {
            setIsLoadingCommonSuggestions(false);
            setCommonSuggestionsFetched(true);
            const dailyQuestKey = `${LS_KEY_PREFIX_DAILY_QUEST}${authUser.uid}`;
            if (typeof window !== 'undefined' && !localStorage.getItem(dailyQuestKey)) setIsDailyQuestDialogOpen(true);
          });
      } else if (parsedHabits.length > 0) {
        if (!commonSuggestionsFetched) setCommonSuggestionsFetched(true);
      }

      console.log("PAGE.TSX: Firestore snapshot processed. Setting isLoadingData=false, firstDataLoadComplete=true.");
      setIsLoadingData(false);
      firstDataLoadCompleteRef.current = true;
    }, (error) => {
      console.error(`PAGE.TSX: Firestore snapshot error for user ${authUser.uid} at ${new Date().toISOString()}:`, error);
      toast({ title: "Database Error", description: "Could not load your data from the cloud.", variant: "destructive" });
      setIsLoadingData(false);
      if (!firstDataLoadCompleteRef.current) {
        console.warn("PAGE.TSX: Initial data load from Firestore failed. Automatic saving is temporarily disabled to protect existing data. Please try refreshing the page.");
      }
    });

    return () => {
      console.log(`PAGE.TSX: Unsubscribing Firestore for user ${authUser?.uid} at ${new Date().toISOString()}`);
      unsubscribeFirestore();
    };
  }, [authUser, mounted, commonSuggestionsFetched, toast]);

  // Debounced Save Effect
  useEffect(() => {
    if (!authUser || !mounted || !firstDataLoadCompleteRef.current) {
      return;
    }

    if (debounceSaveTimeoutRef.current) {
      clearTimeout(debounceSaveTimeoutRef.current);
    }

    debounceSaveTimeoutRef.current = setTimeout(() => {
      const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);
      const sanitizedHabits = sanitizeForFirestore(habits);
      const sanitizedBadges = sanitizeForFirestore(earnedBadges);
      const dataToSave = {
        habits: sanitizedHabits,
        earnedBadges: sanitizedBadges,
        totalPoints: totalPoints,
        lastUpdated: new Date().toISOString(),
      };

      console.log(`PAGE.TSX: Debounced save triggered for user ${authUser.uid} at ${new Date().toLocaleTimeString()}`);
      setDoc(userDocRef, dataToSave, { merge: true })
        .then(() => { /* console.log("Data saved to Firestore after debounce") */ })
        .catch(error => {
          console.error("Error saving debounced data to Firestore:", error);
          toast({ title: "Save Error", description: "Could not save your changes to the cloud.", variant: "destructive" });
        });
    }, DEBOUNCE_SAVE_DELAY_MS);

    return () => {
      if (debounceSaveTimeoutRef.current) {
        clearTimeout(debounceSaveTimeoutRef.current);
      }
    };
  }, [habits, earnedBadges, totalPoints, authUser, mounted, toast]);

  React.useEffect(() => {
    if (!authUser || isLoadingData || !mounted || !firstDataLoadCompleteRef.current) return;
    const newlyEarnedBadges = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarnedBadges.length > 0) {
      const updatedBadges = [...earnedBadges];
      newlyEarnedBadges.forEach(async newBadge => {
        if (!earnedBadges.some(eb => eb.id === newBadge.id)) {
          updatedBadges.push(newBadge);
          toast({ title: "Badge Earned!", description: `You've earned the "${newBadge.name}" badge!` });
        }
      });
      setEarnedBadges(updatedBadges);
    }
  }, [habits, earnedBadges, authUser, isLoadingData, mounted, toast]);

  React.useEffect(() => {
    if (!authUser || !mounted || habits.length === 0) return;
    const habitsScheduledToday = habits.filter(h => h.daysOfWeek.includes(todayAbbr));
    const completedToday = habitsScheduledToday.filter(h =>
      h.completionLog.some(log => log.date === todayString && log.status === 'completed')
    );
    setAllTodayTasksDone(habitsScheduledToday.length > 0 && completedToday.length === habitsScheduledToday.length);
  }, [habits, todayString, todayAbbr, authUser, mounted]);

  React.useEffect(() => {
    if (!authUser || !mounted) return;
    const hasCreateHabitQueryParam = searchParams.get('createHabit') === 'true';
    if (hasCreateHabitQueryParam && !isCreateHabitDialogOpen && !isLoadingData) {
      console.log("PAGE.TSX: createHabit=true detected in URL. Opening dialog.");
      setDialogTriggeredByUrl(true);
      openCreateHabitDialogForNew();
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, authUser, mounted, isLoadingData, isCreateHabitDialogOpen]);

  // Updated handleSaveHabit function with proper document initialization
  const handleSaveHabit = async (habitDataSaveHabitMain: CreateHabitFormData & { id?: string }) => {
    if (!authUser) {
      toast({ title: "Error", description: "You must be logged in to save habits.", variant: "destructive" });
      return;
    }

    const isEditing = editingHabit && editingHabit.id === habitDataSaveHabitMain.id;

    if (isEditing && editingHabit) {
      // Update existing habit
      setHabits(prev => prev.map(h => h.id === editingHabit.id ? {
        ...h,
        name: habitDataSaveHabitMain.name,
        description: habitDataSaveHabitMain.description || undefined,
        category: habitDataSaveHabitMain.category || 'Other',
        daysOfWeek: habitDataSaveHabitMain.daysOfWeek,
        optimalTiming: habitDataSaveHabitMain.optimalTiming || undefined,
        durationHours: habitDataSaveHabitMain.durationHours ?? undefined,
        durationMinutes: habitDataSaveHabitMain.durationMinutes ?? undefined,
        specificTime: habitDataSaveHabitMain.specificTime || undefined,
      } : h));
      toast({ title: "Habit Updated", description: `"${habitDataSaveHabitMain.name}" has been updated.` });
    } else {
      // Add new habit
      const newHabitSaveHabitMain: Habit = {
        id: habitDataSaveHabitMain.id || Date.now().toString() + Math.random().toString(36).substring(2, 7),
        name: habitDataSaveHabitMain.name,
        description: habitDataSaveHabitMain.description || undefined,
        category: habitDataSaveHabitMain.category || 'Other',
        daysOfWeek: habitDataSaveHabitMain.daysOfWeek,
        optimalTiming: habitDataSaveHabitMain.optimalTiming || undefined,
        durationHours: habitDataSaveHabitMain.durationHours ?? undefined,
        durationMinutes: habitDataSaveHabitMain.durationMinutes ?? undefined,
        specificTime: habitDataSaveHabitMain.specificTime || undefined,
        completionLog: [],
        reminderEnabled: false,
      };

      // Add to local state
      setHabits(prev => [...prev, newHabitSaveHabitMain]);

      // Clear common suggestions if they exist
      if (commonHabitSuggestions.length > 0) setCommonHabitSuggestions([]);

      toast({ title: "Habit Added", description: `"${newHabitSaveHabitMain.name}" has been added to your list.` });

      // If this is the first habit and no document exists, ensure we create one
      if (habits.length === 0 && authUser) {
        const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);
        try {
          await setDoc(userDocRef, {
            habits: [newHabitSaveHabitMain],
            earnedBadges: [],
            totalPoints: 0,
            lastUpdated: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error("Error creating initial document:", error);
        }
      }
    }

    // Clean up dialog state
    if (isCreateHabitDialogOpen) setIsCreateHabitDialogOpen(false);
    setInitialFormDataForDialog(null);
    setEditingHabit(null);
    setCreateHabitDialogStep(1);
    setDialogTriggeredByUrl(false);
  };

  const handleOpenEditDialog = (habitToEditOpenEditMain: Habit) => {
    setEditingHabit(habitToEditOpenEditMain);
    setInitialFormDataForDialog({
      id: habitToEditOpenEditMain.id,
      name: habitToEditOpenEditMain.name,
      description: habitToEditOpenEditMain.description || '',
      category: habitToEditOpenEditMain.category || 'Other',
      daysOfWeek: habitToEditOpenEditMain.daysOfWeek,
      optimalTiming: habitToEditOpenEditMain.optimalTiming || '',
      durationHours: habitToEditOpenEditMain.durationHours ?? null,
      durationMinutes: habitToEditOpenEditMain.durationMinutes ?? null,
      specificTime: habitToEditOpenEditMain.specificTime || '',
    });
    setCreateHabitDialogStep(2);
    setIsCreateHabitDialogOpen(true);
  };

  // This function is called from HabitDetailViewDialog
  const handleToggleComplete = async (habitIdToggleCompMain: string, dateToggleCompMain: string, completedToggleCompMain: boolean) => {
    if (!authUser) {
      toast({ title: "Error", description: "You must be logged in to update habits.", variant: "destructive" });
      return;
    }
    let habitNameForQuoteToggleCompMain: string | undefined = undefined;
    let pointsChangeToggleCompMain = 0;
    let justCompletedANewTaskToggleCompMain = false;

    console.log(`PAGE.TSX: handleToggleComplete called for habit ${habitIdToggleCompMain} on date ${dateToggleCompMain}, completed: ${completedToggleCompMain}`);
    setHabits(prevHabits => {
      const newHabits = prevHabits.map(h => {
        if (h.id === habitIdToggleCompMain) {
          habitNameForQuoteToggleCompMain = h.name;
          let newLog = [...h.completionLog];
          const idx = newLog.findIndex(l => l.date === dateToggleCompMain);
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          if (completedToggleCompMain) {
            console.log(`PAGE.TSX: Marking habit ${h.name} as completed on ${dateToggleCompMain}`);
            if (idx > -1) {
              if (newLog[idx].status !== 'completed') {
                pointsChangeToggleCompMain = POINTS_PER_COMPLETION;
                justCompletedANewTaskToggleCompMain = true;
                console.log(`PAGE.TSX: Earned ${POINTS_PER_COMPLETION} points for completing ${h.name}.`);
              }
              newLog[idx] = { ...newLog[idx], status: 'completed', time, note: newLog[idx].note };
            } else {
              pointsChangeToggleCompMain = POINTS_PER_COMPLETION;
              justCompletedANewTaskToggleCompMain = true;
              newLog.push({ date: dateToggleCompMain, time, status: 'completed' });
            }
          } else {
            console.log(`PAGE.TSX: Marking habit ${h.name} as incomplete/skipped on ${dateToggleCompMain}`);
            if (idx > -1) {
              const logEntry = newLog[idx];
              // Deduct points only if it was previously completed
              if (logEntry.status === 'completed') pointsChangeToggleCompMain = -POINTS_PER_COMPLETION;

              if (logEntry.originalMissedDate) {
                newLog[idx] = { ...logEntry, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry.note && logEntry.note.trim()) {
                newLog[idx] = { ...logEntry, status: 'skipped', time: 'N/A' };
              } else {
                newLog.splice(idx, 1);
              }
            }
          }
          console.log(`PAGE.TSX: Updated log for ${h.name}:`, newLog);
          const updatedHabit = { ...h, completionLog: newLog.sort((a, b) => b.date.localeCompare(a.date)) };
          if (selectedHabitForDetailView && selectedHabitForDetailView.id === updatedHabit.id) {
            setSelectedHabitForDetailView(updatedHabit);
          }
          return updatedHabit;
        }
        return h;
      });
      return newHabits;
    });

    // Trigger motivational quote and points update *after* state update is scheduled
    if (justCompletedANewTaskToggleCompMain && habitNameForQuoteToggleCompMain && authUser) {
      try {
        const quoteResult = await getMotivationalQuote({ habitName: habitNameForQuoteToggleCompMain });
        toast({ title: "Way to go!", description: quoteResult.quote });
      } catch (e) {
        console.error("Error getting motivational quote:", e);
      }
    }
    if (pointsChangeToggleCompMain !== 0) {
      console.log(`PAGE.TSX: Changing total points by ${pointsChangeToggleCompMain}`);
      setTotalPoints(prev => Math.max(0, prev + pointsChangeToggleCompMain));
    }
  };

  const handleToggleReminder = (habitIdReminderToggleMain: string, currentReminderStateReminderToggleMain: boolean) => {
    if (!authUser) return;
    setHabits(prev => prev.map(h => h.id === habitIdReminderToggleMain ? { ...h, reminderEnabled: !currentReminderStateReminderToggleMain } : h));
    if (selectedHabitForDetailView && selectedHabitForDetailView.id === habitIdReminderToggleMain) {
      setSelectedHabitForDetailView({ ...selectedHabitForDetailView, reminderEnabled: !currentReminderStateReminderToggleMain });
    }
    toast({
      title: currentReminderStateReminderToggleMain ? "Reminder Disabled" : "Reminder Enabled",
      description: currentReminderStateReminderToggleMain ? "You will no longer receive reminders for this habit." : "You will receive reminders for this habit."
    });
  };

  const handleOpenDeleteHabitConfirm = (habitIdOpenDeleteMain: string) => {
    const habitOpenDeleteMain = habits.find(h => h.id === habitIdOpenDeleteMain);
    if (habitOpenDeleteMain) {
      setHabitToDelete({ id: habitOpenDeleteMain.id, name: habitOpenDeleteMain.name });
      setIsDeleteHabitConfirmOpen(true);
    }
  };

  const handleConfirmDeleteHabit = () => {
    if (habitToDelete && authUser) {
      setHabits(prev => prev.filter(h => h.id !== habitToDelete.id));
      toast({ title: "Habit Deleted", description: `"${habitToDelete.name}" has been removed.` });
      setIsDeleteHabitConfirmOpen(false);
      setHabitToDelete(null);
    }
  };

  const handleGetAISuggestion = async (habitGetAISuggestionMain: Habit) => {
    if (!authUser) return;
    setSelectedHabitForAISuggestion(habitGetAISuggestionMain);
    setAISuggestion({ suggestionText: '', isLoading: true, error: null });
    setIsAISuggestionDialogOpen(true);
    try {
        const aiResponse = await getHabitSuggestion({
            habitName: habitGetAISuggestionMain.name,
            completionData: habitGetAISuggestionMain.completionLog.map(log => ({
              date: log.date,
              completed: log.status === 'completed'
            })),
            preferredTime: habitGetAISuggestionMain.optimalTiming || habitGetAISuggestionMain.specificTime || 'Not specified',
            currentStreakLength: 0
          });
      setAISuggestion({ suggestionText: aiResponse.suggestion, isLoading: false, error: null });
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      setAISuggestion({ suggestionText: '', isLoading: false, error: "Failed to get suggestion. Please try again." });
    }
  };

  const handleOpenReflectionDialog = (habitIdReflectionMain: string, dateReflectionMain: string, habitNameReflectionMain: string) => {
    const habitReflectionMain = habits.find(h => h.id === habitIdReflectionMain);
    const existingNote = habitReflectionMain?.completionLog.find(log => log.date === dateReflectionMain)?.note;
    setReflectionDialogData({
      habitId: habitIdReflectionMain,
      date: dateReflectionMain,
      habitName: habitNameReflectionMain,
      initialNote: existingNote
    });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (habitIdSaveNoteMain: string, dateSaveNoteMain: string, noteSaveNoteMain: string) => {
    if (!authUser) return;
    setHabits(prev => prev.map(h => {
      if (h.id === habitIdSaveNoteMain) {
        const updatedLog = [...h.completionLog];
        const logIndex = updatedLog.findIndex(l => l.date === dateSaveNoteMain);
        if (logIndex > -1) {
          updatedLog[logIndex] = { ...updatedLog[logIndex], note: noteSaveNoteMain };
        } else {
          updatedLog.push({ date: dateSaveNoteMain, time: 'N/A', note: noteSaveNoteMain, status: 'skipped' });
        }
        const updatedHabit = { ...h, completionLog: updatedLog.sort((a, b) => b.date.localeCompare(a.date)) };
        if (selectedHabitForDetailView && selectedHabitForDetailView.id === updatedHabit.id) {
          setSelectedHabitForDetailView(updatedHabit);
        }
        return updatedHabit;
      }
      return h;
    }));
    toast({ title: "Note Saved", description: "Your reflection has been saved." });
  };

  const handleOpenRescheduleDialog = (habitRescheduleMain: Habit, missedDateRescheduleMain: string) => {
    setRescheduleDialogData({ habit: habitRescheduleMain, missedDate: missedDateRescheduleMain });
  };

  const handleSaveRescheduledHabit = (habitIdSaveRescheduledMain: string, originalMissedDateSaveRescheduledMain: string, newDateSaveRescheduledMain: string) => {
    if (!authUser) return;
    setHabits(prev => prev.map(h => {
      if (h.id === habitIdSaveRescheduledMain) {
        const updatedLog = [...h.completionLog];
        const existingNewDateIndex = updatedLog.findIndex(l => l.date === newDateSaveRescheduledMain);
        if (existingNewDateIndex > -1) {
          updatedLog[existingNewDateIndex] = {
            ...updatedLog[existingNewDateIndex],
            status: 'pending_makeup',
            originalMissedDate: originalMissedDateSaveRescheduledMain
          };
        } else {
          updatedLog.push({
            date: newDateSaveRescheduledMain,
            time: 'N/A',
            status: 'pending_makeup',
            originalMissedDate: originalMissedDateSaveRescheduledMain
          });
        }
        const updatedHabit = { ...h, completionLog: updatedLog.sort((a, b) => b.date.localeCompare(a.date)) };
        if (selectedHabitForDetailView && selectedHabitForDetailView.id === updatedHabit.id) {
          setSelectedHabitForDetailView(updatedHabit);
        }
        return updatedHabit;
      }
      return h;
    }));
    toast({ title: "Habit Rescheduled", description: `Rescheduled to ${format(parseISO(newDateSaveRescheduledMain), 'MMMM d, yyyy')}` });
  };

  const handleSaveMarkAsSkipped = (habitIdMarkSkippedMain: string, dateMarkSkippedMain: string) => {
    if (!authUser) return;
    setHabits(prev => prev.map(h => {
      if (h.id === habitIdMarkSkippedMain) {
        const updatedLog = [...h.completionLog];
        const logIndex = updatedLog.findIndex(l => l.date === dateMarkSkippedMain);
        if (logIndex > -1) {
          updatedLog[logIndex] = { ...updatedLog[logIndex], status: 'skipped', time: 'N/A' };
        } else {
          updatedLog.push({ date: dateMarkSkippedMain, time: 'N/A', status: 'skipped' });
        }
        const updatedHabit = { ...h, completionLog: updatedLog.sort((a, b) => b.date.localeCompare(a.date)) };
        if (selectedHabitForDetailView && selectedHabitForDetailView.id === updatedHabit.id) {
          setSelectedHabitForDetailView(updatedHabit);
        }
        return updatedHabit;
      }
      return h;
    }));
    toast({ title: "Marked as Skipped", description: "This occurrence has been marked as skipped." });
  };

  const handleGetAIReflectionPrompt = async (input: ReflectionStarterInput): Promise<ReflectionStarterOutput> => {
    return await getReflectionStarter(input);
  };

  const handleOpenDetailView = (habitOpenDetailViewMain: Habit) => {
    setSelectedHabitForDetailView(habitOpenDetailViewMain);
    setIsDetailViewDialogOpen(true);
  };

  const handleDailyQuestSeen = () => {
    if (authUser) {
      const dailyQuestKey = `${LS_KEY_PREFIX_DAILY_QUEST}${authUser.uid}`;
      localStorage.setItem(dailyQuestKey, new Date().toISOString());
    }
    setIsDailyQuestDialogOpen(false);
  };

  const handleOpenGoalInputProgramDialog = () => {
    setIsGoalInputProgramDialogOpen(true);
  };

  const handleGenerateProgram = async (goal: string, durationWeeks: number) => {
    if (!authUser) return;
    setIsGoalInputProgramDialogOpen(false);
    setIsProgramSuggestionLoading(true);
    try {
        const result = await generateHabitProgramFromGoal({ 
            goal: goal, 
            durationWeeks: durationWeeks 
          });
      setProgramSuggestion(result);
      setIsProgramSuggestionDialogOpen(true);
    } catch (error) {
      console.error("Error generating program:", error);
      toast({ title: "Error", description: "Failed to generate program. Please try again.", variant: "destructive" });
    } finally {
      setIsProgramSuggestionLoading(false);
    }
  };

  const handleAddProgramHabits = (suggestedHabits: SuggestedProgramHabit[], programName: string) => {
    if (!authUser || !programSuggestion) return;
    const programId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    const newHabits: Habit[] = suggestedHabits.map((sh, index) => ({
      id: Date.now().toString() + index.toString() + Math.random().toString(36).substring(2, 7),
      name: sh.name,
      description: sh.description || undefined,
      category: sh.category || 'Other',
      daysOfWeek: sh.daysOfWeek || [],
      optimalTiming: sh.optimalTiming || undefined,
      durationHours: sh.durationHours ?? undefined,
      durationMinutes: sh.durationMinutes ?? undefined,
      specificTime: sh.specificTime || undefined,
      completionLog: [],
      reminderEnabled: false,
      programId: programId,
      programName: programName
    }));
    setHabits(prev => [...prev, ...newHabits]);
    setIsProgramSuggestionDialogOpen(false);
    setProgramSuggestion(null);
    toast({ title: "Program Added", description: `"${programName}" program with ${newHabits.length} habits has been added.` });
  };

  const handleCustomizeSuggestedHabit = (suggestedHabit: CommonSuggestedHabitType) => {
    setInitialFormDataForDialog({
      name: suggestedHabit.name,
      description: suggestedHabit.description || '',
      category: suggestedHabit.category || 'Other',
      daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as WeekDay[],
      optimalTiming: suggestedHabit.defaultOptimalTiming || '',
      durationHours: null,
      durationMinutes: suggestedHabit.estimatedMinutes || null,
      specificTime: '',
    });
    setCreateHabitDialogStep(2);
    setIsCreateHabitDialogOpen(true);
  };

  if (!isClientMounted) {
    return <LoadingFallback />;
  }

  if (isLoadingAuth || (authUser && isLoadingData && !firstDataLoadCompleteRef.current)) {
    return <LoadingFallback />;
  }

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-0 sm:p-4 h-[97vh]">
        <div className={cn(
          "bg-card/95 backdrop-blur-sm text-foreground shadow-xl rounded-xl flex flex-col mx-auto h-full",
          "w-full max-w-sm",
          "md:max-w-md lg:max-w-lg"
        )}>
          <div className="flex flex-col items-center justify-center flex-grow p-4">
            <p className="text-muted-foreground">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4">
      <div className={cn(
        "bg-card/95 backdrop-blur-sm text-foreground shadow-xl rounded-xl flex flex-col mx-auto",
        "w-full max-w-sm h-[97vh] max-h-[97vh]",
        "md:max-w-md",
        "lg:max-w-lg"
      )}>
        <AppHeader />
        <ScrollArea className="flex-grow min-h-0">
          <div className="flex flex-col min-h-full">
            <main className="px-3 sm:px-4 pb-2 pt-4 flex-grow">
              {habits.length === 0 && (
                isLoadingCommonSuggestions ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading suggestions...</p>
                  </div>
                ) : commonHabitSuggestions.length > 0 ? (
                  <div className="my-4 p-3 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
                    <div className="px-2 pt-0">
                      <h3 className="text-md font-semibold flex items-center text-primary mb-1">Welcome to Habitual!</h3>
                      <p className="text-xs text-muted-foreground mb-1.5">
                        Start by picking a common habit. You can also tap the "+" button (below)
                        to add your own custom habit or create a multi-habit program.
                      </p>
                    </div>
                    <div className="p-1">
                      <div className="flex flex-wrap gap-2 justify-center mb-2">
                        {commonHabitSuggestions.map((sugg, idx) => (
                          <Button key={idx} variant="outline" className="p-2.5 h-auto flex flex-col items-center justify-center space-y-0.5 min-w-[90px] text-center shadow-sm hover:shadow-md transition-shadow text-xs" onClick={() => handleCustomizeSuggestedHabit(sugg)}>
                            <span className="font-medium">{sugg.name}</span>
                            {sugg.category && <span className="text-primary/80 opacity-80">{sugg.category}</span>}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
                    <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No Habits Yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Tap the "+" button to add a habit or create a program!
                    </p>
                  </div>
                )
              ) : (
                <HabitList
                  habits={habits}
                  onOpenDetailView={handleOpenDetailView}
                  todayString={todayString}
                  todayAbbr={todayAbbr}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleOpenDeleteHabitConfirm}
                  onEdit={handleOpenEditDialog}
                  onReschedule={handleOpenRescheduleDialog}
                />
              )}
            </main>
          </div>
        </ScrollArea>
        <BottomNavigationBar onAddNewHabitClick={openCreateHabitDialogForNew} />
      </div>

      <CreateHabitDialog
        isOpen={isCreateHabitDialogOpen}
        onClose={() => {
          setIsCreateHabitDialogOpen(false);
          setInitialFormDataForDialog(null);
          setEditingHabit(null);
          setCreateHabitDialogStep(1);
          setDialogTriggeredByUrl(false);
        }}
        onSaveHabit={handleSaveHabit}
        initialData={initialFormDataForDialog}
        currentStep={createHabitDialogStep}
        setCurrentStep={setCreateHabitDialogStep}
        onOpenGoalProgramDialog={handleOpenGoalInputProgramDialog}
      />
      {selectedHabitForAISuggestion && aiSuggestion && (
        <AISuggestionDialog
          isOpen={isAISuggestionDialogOpen}
          onClose={() => setIsAISuggestionDialogOpen(false)}
          habitName={selectedHabitForAISuggestion.name}
          suggestion={aiSuggestion.suggestionText}
          isLoading={aiSuggestion.isLoading}
          error={aiSuggestion.error}
        />
      )}
      {reflectionDialogData && (
        <AddReflectionNoteDialog
          isOpen={isReflectionDialogOpen}
          onClose={() => {
            setIsReflectionDialogOpen(false);
            setReflectionDialogData(null);
          }}
          onSaveNote={(note) => handleSaveReflectionNote(reflectionDialogData.habitId, reflectionDialogData.date, note)}
          initialNote={reflectionDialogData.initialNote}
          habitName={reflectionDialogData.habitName}
          completionDate={reflectionDialogData.date}
        />
      )}
      {rescheduleDialogData && (
        <RescheduleMissedHabitDialog
          isOpen={!!rescheduleDialogData}
          onClose={() => setRescheduleDialogData(null)}
          habitName={rescheduleDialogData.habit.name}
          originalMissedDate={rescheduleDialogData.missedDate}
          onReschedule={(newDate) => {
            handleSaveRescheduledHabit(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate, newDate);
            setRescheduleDialogData(null);
          }}
          onMarkAsSkipped={() => {
            handleSaveMarkAsSkipped(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate);
            setRescheduleDialogData(null);
          }}
        />
      )}
      <AlertDialog open={isDeleteHabitConfirmOpen} onOpenChange={setIsDeleteHabitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeaderEl>
            <AlertTitle>Confirm Deletion</AlertTitle>
            <AlertDialogDescriptionEl>
              Are you sure you want to delete the habit "{habitToDelete?.name || ''}"? This action cannot be undone.
            </AlertDialogDescriptionEl>
          </AlertDialogHeaderEl>
          <AlertDialogFooterEl>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteHabit}>Delete</AlertDialogAction>
          </AlertDialogFooterEl>
        </AlertDialogContent>
      </AlertDialog>
      {selectedHabitForDetailView && (
        <HabitDetailViewDialog
          habit={selectedHabitForDetailView}
          isOpen={isDetailViewDialogOpen}
          onClose={() => {
            setIsDetailViewDialogOpen(false);
            setSelectedHabitForDetailView(null);
          }}
          onToggleComplete={handleToggleComplete}
          onGetAISuggestion={handleGetAISuggestion}
          onOpenReflectionDialog={handleOpenReflectionDialog}
          onOpenRescheduleDialog={handleOpenRescheduleDialog}
          onToggleReminder={handleToggleReminder}
          onOpenEditDialog={handleOpenEditDialog}
          onOpenDeleteConfirm={handleOpenDeleteHabitConfirm}
          onGetAIReflectionPrompt={handleGetAIReflectionPrompt}
        />
      )}
      <DailyQuestDialog
        isOpen={isDailyQuestDialogOpen}
        onClose={handleDailyQuestSeen}
        userName={authUser?.displayName || authUser?.email?.split('@')[0] || 'Friend'}
      />
      {isProgramSuggestionLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl flex flex-col items-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating your program...</p>
          </div>
        </div>
      )}
      <GoalInputProgramDialog
        isOpen={isGoalInputProgramDialogOpen}
        onClose={() => setIsGoalInputProgramDialogOpen(false)}
        onGenerateProgram={handleGenerateProgram}
      />
      {programSuggestion && (
        <ProgramSuggestionDialog
          isOpen={isProgramSuggestionDialogOpen}
          onClose={() => {
            setIsProgramSuggestionDialogOpen(false);
            setProgramSuggestion(null);
          }}
          programSuggestion={programSuggestion}
          onAddAllHabits={handleAddProgramHabits}
        />
      )}
    </div>
  );
};

export default HomePage;