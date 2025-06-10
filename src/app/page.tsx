
"use client";

// ==========================================================================
// HABITUAL MAIN PAGE - Firestore Integration
// ==========================================================================
import * as React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { NextPage } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { auth, db } from '@/lib/firebase'; // Added db
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'; // Firestore imports
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
import type { Habit, AISuggestion as AISuggestionType, WeekDay, HabitCompletionLogEntry, HabitCategory, EarnedBadge, CreateHabitFormData, SuggestedHabitForCommonList as CommonSuggestedHabitType } from '@/types';
import { HABIT_CATEGORIES, SEVEN_DAY_STREAK_BADGE_ID, THIRTY_DAY_STREAK_BADGE_ID, FIRST_HABIT_COMPLETED_BADGE_ID, THREE_DAY_SQL_STREAK_BADGE_ID } from '@/types';

import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { getSqlTip } from '@/ai/flows/sql-tip-flow';
import { getMotivationalQuote } from '@/ai/flows/motivational-quote-flow';
import { getCommonHabitSuggestions } from '@/ai/flows/common-habit-suggestions-flow';
import { generateHabitProgramFromGoal, type GenerateHabitProgramOutput, type SuggestedProgramHabit } from '@/ai/flows/generate-habit-program-flow';
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
const weekDaysArrayForForm = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
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


const HabitualPageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const previousAuthUserUidRef = React.useRef<string | null | undefined>(undefined);

  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [earnedBadges, setEarnedBadges] = React.useState<EarnedBadge[]>([]);
  const [totalPoints, setTotalPoints] = React.useState<number>(0);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = React.useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = React.useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = React.useState<AISuggestionType | null>(null);

  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = React.useState(false);
  const [editingHabit, setEditingHabit] = React.useState<Habit | null>(null);
  const [initialFormDataForDialog, setInitialFormDataForDialog] = React.useState<Partial<CreateHabitFormData> | null>(null);
  const [createHabitDialogStep, setCreateHabitDialogStep] = React.useState(1);
  const [dialogTriggeredByUrl, setDialogTriggeredByUrl] = React.useState(false);


  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission | null>(null);
  const reminderTimeouts = React.useRef<NodeJS.Timeout[]>([]);

  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = React.useState(false);
  const [reflectionDialogData, setReflectionDialogData] = React.useState<{
    habitId: string; date: string; initialNote?: string; habitName: string;
  } | null>(null);

  const [rescheduleDialogData, setRescheduleDialogData] = React.useState<{
    habit: Habit; missedDate: string;
  } | null>(null);

  const [commonHabitSuggestions, setCommonHabitSuggestions] = React.useState<CommonSuggestedHabitType[]>([]);
  const [isLoadingCommonSuggestions, setIsLoadingCommonSuggestions] = React.useState(false);
  const [commonSuggestionsFetched, setCommonSuggestionsFetched] = React.useState(false);

  const [isDeleteHabitConfirmOpen, setIsDeleteHabitConfirmOpen] = React.useState(false);
  const [habitToDelete, setHabitToDelete] = React.useState<{ id: string; name: string } | null>(null);

  const [todayString, setTodayString] = React.useState('');
  const [todayAbbr, setTodayAbbr] = React.useState<WeekDay | ''>('');
  const [allTodayTasksDone, setAllTodayTasksDone] = React.useState(false);

  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = React.useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(undefined);

  const [selectedHabitForDetailView, setSelectedHabitForDetailView] = React.useState<Habit | null>(null);
  const [isDetailViewDialogOpen, setIsDetailViewDialogOpen] = React.useState(false);

  const [isGoalInputProgramDialogOpen, setIsGoalInputProgramDialogOpen] = React.useState(false);
  const [isProgramSuggestionLoading, setIsProgramSuggestionLoading] = React.useState(false);
  const [programSuggestion, setProgramSuggestion] = React.useState<GenerateHabitProgramOutput | null>(null);
  const [isProgramSuggestionDialogOpen, setIsProgramSuggestionDialogOpen] = React.useState(false);

  const [isClientMounted, setIsClientMounted] = React.useState(false);

  const firstDataLoadCompleteRef = React.useRef(false); 
  const debounceSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);


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
    setInitialFormDataForDialog(null);
    setEditingHabit(null);
    setCreateHabitDialogStep(1);
    setIsCreateHabitDialogOpen(true);
    setDialogTriggeredByUrl(false); // Not triggered by URL if opened directly
  };
  
  // Effect to detect the URL action (e.g., for deep linking), open dialog, and clean URL
  React.useEffect(() => {
    if (mounted && searchParams.get('action') === 'addHabit') {
      if (!isCreateHabitDialogOpen) { // Only open if not already open
        console.log("PAGE.TSX: 'addHabit' action detected from URL. Preparing to open dialog.");
        setInitialFormDataForDialog(null);
        setEditingHabit(null);
        setCreateHabitDialogStep(1);
        setIsCreateHabitDialogOpen(true);
        setDialogTriggeredByUrl(true); // Mark that URL triggered it
      }
      // Always clean the URL if the action was present, regardless of whether dialog was opened by this effect or already open
      router.replace('/', { scroll: false });
    }
  }, [searchParams, mounted, router, isCreateHabitDialogOpen]);


  // Auth State Change Effect
  React.useEffect(() => {
    console.log("PAGE.TSX: Auth effect attaching. Current authUser UID:", authUser?.uid);
    const unsubscribeAuthMain = onAuthStateChanged(auth, (currentUserAuthMain) => {
      const previousUidAuthMain = previousAuthUserUidRef.current;
      const currentUidAuthMain = currentUserAuthMain?.uid || null;
      console.log(`PAGE.TSX: onAuthStateChanged fired. Prev UID: ${previousUidAuthMain}, New UID: ${currentUidAuthMain}. isLoadingAuth: ${isLoadingAuth}, isLoadingData: ${isLoadingData}`);

      if (previousUidAuthMain !== undefined && previousUidAuthMain !== currentUidAuthMain) {
        console.log("PAGE.TSX: User changed or logged in/out. Resetting states.");
        setHabits([]); setEarnedBadges([]); setTotalPoints(0);
        setIsLoadingData(true); // Explicitly start loading for new user/no user
        firstDataLoadCompleteRef.current = false;
        setCommonHabitSuggestions([]); setCommonSuggestionsFetched(false);
        setEditingHabit(null); setInitialFormDataForDialog(null); setCreateHabitDialogStep(1);
        setReflectionDialogData(null); setRescheduleDialogData(null);
        setHabitToDelete(null); setIsDeleteHabitConfirmOpen(false);
        setIsAISuggestionDialogOpen(false); setIsCreateHabitDialogOpen(false);
        setIsDailyQuestDialogOpen(false); setIsCalendarDialogOpen(false);
        setSelectedHabitForDetailView(null); setIsDetailViewDialogOpen(false);
        setIsGoalInputProgramDialogOpen(false); setIsProgramSuggestionDialogOpen(false); setProgramSuggestion(null);
        setDialogTriggeredByUrl(false);
      } else if (previousUidAuthMain === undefined && !currentUidAuthMain) {
        // Initial load, no user found yet or remains unauthenticated
        console.log("PAGE.TSX: Initial auth check, no user. Setting isLoadingData=false.");
        setIsLoadingData(false);
        firstDataLoadCompleteRef.current = false;
      }

      setAuthUser(currentUserAuthMain);
      setIsLoadingAuth(false); // Auth check itself is complete
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
        completionLog: (Array.isArray(h.completionLog) ? h.completionLog : []).map((log: { date?: string; time?: string; note?: string; status?: string; originalMissedDate?: string }): HabitCompletionLogEntry | null => {
          if (typeof log.date !== 'string' || !log.date.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
          return {
            date: log.date,
            time: typeof log.time === 'string' && log.time.length > 0 ? log.time : 'N/A',
            note: typeof log.note === 'string' ? log.note : undefined,
            status: ['completed', 'pending_makeup', 'skipped'].includes(log.status) ? log.status : 'completed',
 originalMissedDate: typeof log.originalMissedDate === 'string' && log.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? log.originalMissedDate : undefined,
          };
        }).filter((log: null): log is HabitCompletionLogEntry => log !== null).sort((a: { date: any; },b: { date: string; }) => b.date.localeCompare(a.date)),
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
              setCommonHabitSuggestions([]); console.error("Failed to load common habit suggestions:", err);
               toast({ title: "AI Error", description: "Could not load common habit suggestions.", variant: "destructive" });
          })
          .finally(() => {
            setIsLoadingCommonSuggestions(false); setCommonSuggestionsFetched(true);
            const dailyQuestKey = `${LS_KEY_PREFIX_DAILY_QUEST}${authUser.uid}`; 
            if (typeof window !== 'undefined' && !localStorage.getItem(dailyQuestKey)) setIsDailyQuestDialogOpen(true);
          });
      } else if (parsedHabits.length > 0) {
          if(!commonSuggestionsFetched) setCommonSuggestionsFetched(true); 
      }
      
      console.log("PAGE.TSX: Firestore snapshot processed. Setting isLoadingData=false, firstDataLoadComplete=true.");
      setIsLoadingData(false);
      firstDataLoadCompleteRef.current = true;
    }, (error) => {
      console.error(`PAGE.TSX: Firestore snapshot error for user ${authUser.uid} at ${new Date().toISOString()}:`, error);
      toast({ title: "Database Error", description: "Could not load your data from the cloud.", variant: "destructive" });
      setIsLoadingData(false);
      // If firstDataLoadCompleteRef.current is false, it means this error occurred during the *initial* data fetch.
      // In this case, we should NOT set firstDataLoadCompleteRef.current to true,
      // to prevent the debounced save from writing an empty local state over potentially existing data in Firestore.
      if (!firstDataLoadCompleteRef.current) {
        console.warn("PAGE.TSX: Initial data load from Firestore failed. Automatic saving is temporarily disabled to protect existing data. Please try refreshing the page.");
      }
      // If firstDataLoadCompleteRef.current was already true (meaning a previous load was successful),
      // it remains true, indicating this is a subsequent error.
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
          toast({ title: "Badge Earned!", description: `You've earned the "${newBadge.name}" badge!`, variant: "default" });
            if (newBadge.id === THREE_DAY_SQL_STREAK_BADGE_ID) { try { await getSqlTip(); } catch (e) {} }
        }
      });
      if (updatedBadges.length !== earnedBadges.length) setEarnedBadges(updatedBadges);
    }
  }, [habits, earnedBadges, authUser, isLoadingData, mounted, toast]); 

  React.useEffect(() => {
    reminderTimeouts.current.forEach(clearTimeout); reminderTimeouts.current = [];
    return () => { reminderTimeouts.current.forEach(clearTimeout); reminderTimeouts.current = []; };
  }, [habits, notificationPermission, authUser]);

  React.useEffect(() => {
    if (todayString && todayAbbr && habits.length > 0 && !isLoadingData) {
      const tasksScheduledTodayCheckAllDoneMain = habits.filter(hCheckAllDoneMain => 
        hCheckAllDoneMain.daysOfWeek.includes(todayAbbr) || 
        hCheckAllDoneMain.completionLog.some(log => log.date === todayString && log.status === 'pending_makeup')
      );
      if (tasksScheduledTodayCheckAllDoneMain.length === 0) { setAllTodayTasksDone(true); return; }
      setAllTodayTasksDone(tasksScheduledTodayCheckAllDoneMain.every(h => h.completionLog.some(l => l.date === todayString && l.status === 'completed')));
    } else if (habits.length === 0 && !isLoadingData && todayString) setAllTodayTasksDone(true);
  }, [habits, todayString, todayAbbr, isLoadingData]);

  const handleSaveHabit = (habitDataSaveHabitMain: CreateHabitFormData & { id?: string }) => {
    if (!authUser) return;
    const isEditingModeSaveHabitMain = !!(habitDataSaveHabitMain.id && editingHabit && editingHabit.id === habitDataSaveHabitMain.id);
    if (isEditingModeSaveHabitMain) {
      setHabits(prev => prev.map(h => h.id === habitDataSaveHabitMain.id ? {
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
      toast({ title: "Habit Updated", description: `"${habitDataSaveHabitMain.name}" has been updated.`});
    } else {
      const newHabitSaveHabitMain: Habit = {
        id: String(Date.now() + Math.random().toString(36).substring(2,9)),
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
      setHabits(prev => [...prev, newHabitSaveHabitMain]);
      if (commonHabitSuggestions.length > 0) setCommonHabitSuggestions([]);
      toast({ title: "Habit Added", description: `"${newHabitSaveHabitMain.name}" has been added to your list.`});
    }
    if(isCreateHabitDialogOpen) setIsCreateHabitDialogOpen(false);
    setInitialFormDataForDialog(null); setEditingHabit(null); setCreateHabitDialogStep(1);
    setDialogTriggeredByUrl(false); 
  };
  
  const handleOpenEditDialog = (habitToEditOpenEditMain: Habit) => {
    setEditingHabit(habitToEditOpenEditMain);
    setInitialFormDataForDialog({
      id: habitToEditOpenEditMain.id, name: habitToEditOpenEditMain.name, description: habitToEditOpenEditMain.description || '', category: habitToEditOpenEditMain.category || 'Other', daysOfWeek: habitToEditOpenEditMain.daysOfWeek, optimalTiming: habitToEditOpenEditMain.optimalTiming || '', durationHours: habitToEditOpenEditMain.durationHours ?? null, durationMinutes: habitToEditOpenEditMain.durationMinutes ?? null, specificTime: habitToEditOpenEditMain.specificTime || '',
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
    if(!authUser) return;
    setHabits(prev => prev.map(h => h.id === habitIdReminderToggleMain ? { ...h, reminderEnabled: !currentReminderStateReminderToggleMain } : h));
    toast({ title: "Reminder Updated", description: `Reminders for this habit are now ${!currentReminderStateReminderToggleMain ? "ON" : "OFF"}.`});
    if (!currentReminderStateReminderToggleMain && notificationPermission !== 'granted') handleRequestNotificationPermission();
  };

  const handleRequestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(p => {
        setNotificationPermission(p);
        toast({ title: "Notification Status", description: `Permission: ${p}`});
      });
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
       setNotificationPermission('granted');
       toast({ title: "Notifications Enabled", description: "You can now set reminders for habits."});
    }
  };

  const handleOpenAISuggestionDialog = async (habitParamAiSuggOpenMain: Habit) => {
    setSelectedHabitForAISuggestion(habitParamAiSuggOpenMain); setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habitParamAiSuggOpenMain.id, suggestionText: '', isLoading: true });
    try {
      const trackingData = `Completions & Status: ${habitParamAiSuggOpenMain.completionLog.map(l => `${l.date} at ${l.time || 'N/A'} (${l.status || 'completed'})${l.note ? ' Note: ' + l.note : ''}`).join('; ') || 'None yet'}.`;
      const result = await getHabitSuggestion({ habitName: habitParamAiSuggOpenMain.name, habitDescription: habitParamAiSuggOpenMain.description, daysOfWeek: habitParamAiSuggOpenMain.daysOfWeek, optimalTiming: habitParamAiSuggOpenMain.optimalTiming, durationHours: habitParamAiSuggOpenMain.durationHours, durationMinutes: habitParamAiSuggOpenMain.durationMinutes, specificTime: habitParamAiSuggOpenMain.specificTime, trackingData });
      setAISuggestion({ habitId: habitParamAiSuggOpenMain.id, suggestionText: result.suggestion, isLoading: false });
    } catch (error) {
        setAISuggestion({ habitId: habitParamAiSuggOpenMain.id, suggestionText: '', isLoading: false, error: 'Failed to get suggestion.' });
        console.error("Error getting AI habit suggestion:", error);
        toast({ title: "AI Tip Error", description: "Could not fetch AI suggestion for this habit.", variant: "destructive"});
    }
  };

  const handleOpenReflectionDialog = (habitId_reflection_open: string, date_reflection_open: string, habitName_reflection_open: string) => {
    const habitForReflectionOpenMain = habits.find(h => h.id === habitId_reflection_open);
    const logEntryForReflectionOpenMain = habitForReflectionOpenMain?.completionLog.find(l => l.date === date_reflection_open);
    setReflectionDialogData({ habitId: habitId_reflection_open, date: date_reflection_open, initialNote: logEntryForReflectionOpenMain?.note || '', habitName: habitName_reflection_open });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (habitId_reflection_save: string, date_reflection_save_note: string, note_to_save_reflection: string) => {
    if (!authUser) return;
    setHabits(prev => prev.map(h => {
      if (h.id === habitId_reflection_save) {
        let logExists = false;
        const newLog = h.completionLog.map(l => {
          if (l.date === date_reflection_save_note) {
            logExists = true;
            const updatedLogEntry: HabitCompletionLogEntry = { ...l, note: note_to_save_reflection.trim() || undefined };
            if (!updatedLogEntry.note && updatedLogEntry.status === 'skipped' && !updatedLogEntry.originalMissedDate && updatedLogEntry.time === 'N/A') {
              return null;
            }
            return updatedLogEntry;
          }
          return l;
        }).filter(Boolean) as HabitCompletionLogEntry[];

        if (!logExists && note_to_save_reflection.trim()) {
          const newEntry: HabitCompletionLogEntry = { date: date_reflection_save_note, time: 'N/A', status: 'skipped', note: note_to_save_reflection.trim() };
          newLog.push(newEntry);
        }
        return { ...h, completionLog: newLog.sort((a,b) => b.date.localeCompare(a.date)) };
      } return h;
    }));
    setReflectionDialogData(null); setIsReflectionDialogOpen(false);
    toast({ title: "Reflection Note Saved", description: "Your thoughts have been recorded."});
  };

  const handleOpenRescheduleDialog = (habitParamRescheduleOpenMain: Habit, missedDateParamRescheduleOpenMain: string) => {
    setRescheduleDialogData({ habit: habitParamRescheduleOpenMain, missedDate: missedDateParamRescheduleOpenMain });
  };

  const handleSaveRescheduledHabit = (habitId_rescheduled_save: string, originalMissedDate_rescheduled_save: string, newDate_rescheduled_save: string) => {
    if(!authUser) return;
    setHabits(prev => prev.map(h => {
      if (h.id === habitId_rescheduled_save) {
        let newLog = [...h.completionLog];
        const missedIdx = newLog.findIndex(l => l.date === originalMissedDate_rescheduled_save);
        if(missedIdx > -1) { if (newLog[missedIdx].status !== 'completed') newLog[missedIdx] = {...newLog[missedIdx], status: 'skipped', time: 'N/A'}; }
        else newLog.push({ date: originalMissedDate_rescheduled_save, time: 'N/A', status: 'skipped' });
        newLog.push({ date: newDate_rescheduled_save, time: 'N/A', status: 'pending_makeup', originalMissedDate: originalMissedDate_rescheduled_save });
        return { ...h, completionLog: newLog.sort((a,b) => b.date.localeCompare(a.date)) };
      } return h;
    }));
    setRescheduleDialogData(null);
    toast({ title: "Habit Rescheduled", description: `Marked for makeup on ${format(parseISO(newDate_rescheduled_save), 'MMM d')}.`});
  };

  const handleSaveMarkAsSkipped = (habitId_skipped_save: string, missedDate_skipped_save: string) => {
    if(!authUser) return;
    setHabits(prev => prev.map(h => {
      if (h.id === habitId_skipped_save) {
        let newLog = [...h.completionLog];
        const idx = newLog.findIndex(l => l.date === missedDate_skipped_save);
        if (idx > -1) { if (newLog[idx].status !== 'completed') newLog[idx] = { ...newLog[idx], status: 'skipped', time: 'N/A' }; }
        else newLog.push({ date: missedDate_skipped_save, time: 'N/A', status: 'skipped' });
        return { ...h, completionLog: newLog.sort((a,b) => b.date.localeCompare(a.date)) };
      } return h;
    }));
    setRescheduleDialogData(null);
    toast({ title: "Habit Skipped", description: "The missed day has been marked as skipped."});
  };

  const handleOpenDeleteHabitConfirm = (habitIdDeleteConfirmOpenMain: string, habitNameDeleteConfirmOpenMain: string) => {
    setHabitToDelete({ id: habitIdDeleteConfirmOpenMain, name: habitNameDeleteConfirmOpenMain }); setIsDeleteHabitConfirmOpen(true);
  };
  const handleConfirmDeleteSingleHabit = () => {
    if (habitToDelete && authUser) {
        setHabits(prev => prev.filter(h => h.id !== habitToDelete.id));
        toast({ title: "Habit Deleted", description: `"${habitToDelete.name}" has been removed.`, variant: "destructive" });
        setHabitToDelete(null);
    }
    setIsDeleteHabitConfirmOpen(false);
  };

  const handleCustomizeSuggestedHabit = (suggestionCustomizeMain: CommonSuggestedHabitType) => {
    setEditingHabit(null);
    setInitialFormDataForDialog({ name: suggestionCustomizeMain.name, category: suggestionCustomizeMain.category || 'Other', description: '', daysOfWeek: [] as WeekDay[] });
    setCreateHabitDialogStep(2);
    setIsCreateHabitDialogOpen(true);
  };

  const [isDailyQuestDialogOpen, setIsDailyQuestDialogOpen] = React.useState(false);
  const handleCloseDailyQuestDialog = () => {
    setIsDailyQuestDialogOpen(false);
    if (authUser && typeof window !== 'undefined') localStorage.setItem(`${LS_KEY_PREFIX_DAILY_QUEST}${authUser.uid}`, 'true');
  };

  const handleOpenDetailView = (habit: Habit) => {
    setSelectedHabitForDetailView(habit);
    setIsDetailViewDialogOpen(true);
  };

  const handleCloseDetailView = useCallback(() => {
    setIsDetailViewDialogOpen(false);
    setSelectedHabitForDetailView(null);
  }, []);

  React.useEffect(() => {
    if (selectedHabitForDetailView?.id && authUser && isDetailViewDialogOpen && habits.length > 0 && mounted && !isLoadingData) {
        const latestHabitInstance = habits.find(h => h.id === selectedHabitForDetailView.id);
        if (latestHabitInstance) {
            if (JSON.stringify(selectedHabitForDetailView.completionLog) !== JSON.stringify(latestHabitInstance.completionLog) ||
                selectedHabitForDetailView.name !== latestHabitInstance.name ||
                selectedHabitForDetailView.description !== latestHabitInstance.description ||
                selectedHabitForDetailView.reminderEnabled !== latestHabitInstance.reminderEnabled
            ) {
                 setSelectedHabitForDetailView(latestHabitInstance);
            }
        } else {
            handleCloseDetailView();
        }
    }
  }, [habits, selectedHabitForDetailView, isDetailViewDialogOpen, authUser, handleCloseDetailView, mounted, isLoadingData]);


  const calendarDialogModifiers = React.useMemo(() => { return {}; }, []);
  const calendarDialogModifierStyles: Record<string, React.CSSProperties> = { };
  const habitsForSelectedCalendarDate = React.useMemo(() => { return []; }, [selectedCalendarDate, habits, authUser]);

  const handleOpenGoalInputProgramDialog = () => setIsGoalInputProgramDialogOpen(true);
  
  const handleSubmitGoalForProgram = async (goal: string, duration: string) => {
    if (!programSuggestion) setIsProgramSuggestionLoading(true); // Only set loading if no suggestion already exists
    setIsGoalInputProgramDialogOpen(false);
    try {
      const suggestion = await generateHabitProgramFromGoal({ goal, focusDuration: duration });
      setProgramSuggestion(suggestion); 
      setIsProgramSuggestionDialogOpen(true);
    } catch (e: any) {
        console.error("Error generating habit program:", e?.message || e);
        toast({ title: "Program AI Error", description: "Could not generate a habit program. Please try again.", variant: "destructive"});
    }
    finally { setIsProgramSuggestionLoading(false); }
  };

  const handleAddProgramHabits = (suggestedProgramHabits: SuggestedProgramHabit[]) => {
    if (!authUser || !programSuggestion) return;

    const programInstanceId = String(Date.now() + Math.random().toString(36).substring(2,9));

    const newHabitsFromProgram: Habit[] = suggestedProgramHabits.map(sph => ({
      id: String(Date.now() + Math.random().toString(36).substring(2,9) + sph.name.slice(0,3)), // Ensure unique ID
      name: sph.name,
      description: sph.description || undefined,
      category: sph.category || 'Other',
      daysOfWeek: sph.daysOfWeek as WeekDay[],
      optimalTiming: sph.optimalTiming || undefined,
      durationHours: sph.durationHours,
      durationMinutes: sph.durationMinutes,
      specificTime: sph.specificTime || undefined,
      completionLog: [],
      reminderEnabled: false,
      programId: programInstanceId,
      programName: programSuggestion.programName,
    }));

    setHabits(prev => [...prev, ...newHabitsFromProgram]);
    if (habits.length === 0 && commonHabitSuggestions.length > 0 && newHabitsFromProgram.length > 0) {
      setCommonHabitSuggestions([]);
    }
    setIsProgramSuggestionDialogOpen(false); 
    setProgramSuggestion(null); // Clear suggestion after adding
    toast({ title: "Program Added!", description: `"${programSuggestion.programName}" habits have been added.`});
  };

  const loadingScreen = (message: string) => {
    console.log(`PAGE.TSX: Rendering loading screen: ${message}. isLoadingAuth: ${isLoadingAuth}, isLoadingData: ${isLoadingData}, authUser: ${!!authUser}, mounted: ${mounted}`);
    return (
        <div className="min-h-screen flex items-center justify-center p-0 sm:p-4 h-[97vh]">
          <div className={cn(
            "bg-card/95 backdrop-blur-sm text-foreground shadow-xl rounded-xl flex flex-col mx-auto h-full",
            "w-full max-w-sm",
            "md:max-w-md lg:max-w-lg"
          )}>
            <div className="flex flex-col items-center justify-center flex-grow p-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">{message}</p>
            </div>
          </div>
        </div>
    );
  };


  if (!mounted) return loadingScreen("Initializing app...");
  if (isLoadingAuth) return loadingScreen("Authenticating...");
  if (!authUser && mounted && !isLoadingAuth) { 
    return loadingScreen("Redirecting to login...");
  }
  if (authUser && isLoadingData) return loadingScreen("Loading your data...");


  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4 h-[97vh]">
      <div className={cn(
        "bg-card/95 backdrop-blur-sm text-foreground shadow-xl rounded-xl flex flex-col mx-auto relative h-full",
        "w-full max-w-sm",
        "md:max-w-md lg:max-w-lg"
      )}>
        <AppHeader />
        <ScrollArea className="flex-grow min-h-0">
          <div className="flex flex-col min-h-full">
            <main className="px-3 sm:px-4 pt-4 pb-20 flex-grow"> {/* Increased pb-20 for scroll clearance */}
             {allTodayTasksDone && habits.length > 0 && !isLoadingData && (
                 <div className="flex flex-col items-center justify-center text-center py-6 my-4 bg-accent/10 rounded-lg shadow">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-accent mb-3" />
                  <h3 className="text-lg font-semibold text-primary">All Done for Today!</h3>
                  <p className="text-muted-foreground text-sm">Great job completing all your tasks.</p>
                </div>
              )}
              
              {isLoadingData ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-3 text-muted-foreground">Loading habits...</p>
                </div>
              ) : habits.length === 0 ? (
                isLoadingCommonSuggestions ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading suggestions...</p></div>
                ) : commonHabitSuggestions.length > 0 ? (
                  <div className="my-4 p-3 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
                    <div className="px-2 pt-0"><h3 className="text-md font-semibold flex items-center text-primary mb-1">Welcome to Habitual!</h3>
                      <p className="text-xs text-muted-foreground mb-1.5">
                        Start by picking a common habit. You can also tap the "+" button (below)
                         to add your own custom habit or create a multi-habit program.
                      </p>
                    </div>
                    <div className="p-1">
                      <div className="flex flex-wrap gap-2 justify-center mb-2">
                        {commonHabitSuggestions.map((sugg, idx) => (
                          <Button key={idx} variant="outline" className="p-2.5 h-auto flex flex-col items-center justify-center space-y-0.5 min-w-[90px] text-center shadow-sm hover:shadow-md transition-shadow text-xs" onClick={() => handleCustomizeSuggestedHabit(sugg)}>
                            <span className="font-medium">{sugg.name}</span>{sugg.category && <span className="text-primary/80 opacity-80">{sugg.category}</span>}
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
      {selectedHabitForAISuggestion && aiSuggestion && (<AISuggestionDialog isOpen={isAISuggestionDialogOpen} onClose={() => setIsAISuggestionDialogOpen(false)} habitName={selectedHabitForAISuggestion.name} suggestion={aiSuggestion.suggestionText} isLoading={aiSuggestion.isLoading} error={aiSuggestion.error} />)}
      {reflectionDialogData && (<AddReflectionNoteDialog isOpen={isReflectionDialogOpen} onClose={() => { setIsReflectionDialogOpen(false); setReflectionDialogData(null); }} onSaveNote={(note) => handleSaveReflectionNote(reflectionDialogData.habitId, reflectionDialogData.date, note)} initialNote={reflectionDialogData.initialNote} habitName={reflectionDialogData.habitName} completionDate={reflectionDialogData.date} />)}
      {rescheduleDialogData && (<RescheduleMissedHabitDialog isOpen={!!rescheduleDialogData} onClose={() => setRescheduleDialogData(null)} habitName={rescheduleDialogData.habit.name} originalMissedDate={rescheduleDialogData.missedDate} onReschedule={(newDate) => { handleSaveRescheduledHabit(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate, newDate); setRescheduleDialogData(null); }} onMarkAsSkipped={() => { handleSaveMarkAsSkipped(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate); setRescheduleDialogData(null); }} />)}
      <AlertDialog open={isDeleteHabitConfirmOpen} onOpenChange={setIsDeleteHabitConfirmOpen}>
        <AlertDialogContent><AlertDialogHeaderEl><AlertTitle>Confirm Deletion</AlertTitle><AlertDialogDescriptionEl>Are you sure you want to delete the habit "{habitToDelete?.name || ''}"? This action cannot be undone.</AlertDialogDescriptionEl></AlertDialogHeaderEl><AlertDialogFooterEl><AlertDialogCancel onClick={() => setHabitToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteSingleHabit} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction></AlertDialogFooterEl></AlertDialogContent>
      </AlertDialog>
      <DailyQuestDialog isOpen={isDailyQuestDialogOpen} onClose={handleCloseDailyQuestDialog} />

      <HabitDetailViewDialog
        habit={selectedHabitForDetailView}
        isOpen={isDetailViewDialogOpen}
        onClose={handleCloseDetailView}
        onToggleComplete={handleToggleComplete}
        onGetAISuggestion={handleOpenAISuggestionDialog}
        onOpenReflectionDialog={handleOpenReflectionDialog}
        onOpenRescheduleDialog={handleOpenRescheduleDialog}
        onToggleReminder={handleToggleReminder}
        onOpenEditDialog={(habitToEdit) => {
          handleCloseDetailView();
          handleOpenEditDialog(habitToEdit);
        }}
        onOpenDeleteConfirm={(habitId, habitName) => {
          handleCloseDetailView();
          handleOpenDeleteHabitConfirm(habitId, habitName);
        }}
        onGetAIReflectionPrompt={getReflectionStarter}
      />

      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContentOriginal className="sm:max-w-lg bg-card">
          <DialogHeaderOriginal><DialogTitleOriginal className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary"/>Habit Calendar</DialogTitleOriginal><DialogDescriptionOriginal>View your habit activity.</DialogDescriptionOriginal></DialogHeaderOriginal>
          <Calendar mode="single" selected={selectedCalendarDate} onSelect={setSelectedCalendarDate} month={selectedCalendarDate || undefined} onMonthChange={(month) => { if (!selectedCalendarDate || selectedCalendarDate.getMonth() !== month.getMonth() || selectedCalendarDate.getFullYear() !== month.getFullYear()) setSelectedCalendarDate(startOfDay(month)); }} modifiers={calendarDialogModifiers} modifiersStyles={calendarDialogModifierStyles} className="rounded-md border p-0 sm:p-2" />
          {selectedCalendarDate && ( <div className="mt-3 w-full"><h3 className="text-md font-semibold mb-1.5 text-center text-primary">Status for {format(selectedCalendarDate, 'MMMM d, yyyy')}</h3>{habitsForSelectedCalendarDate.length > 0 ? (<ScrollArea className="max-h-40"><ul className="space-y-1.5 text-sm pr-2">{habitsForSelectedCalendarDate.map(h => { const log = h.completionLog.find((l: { date: string; }) => l.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd')); const isSch = h.daysOfWeek.includes(dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)]); let statTxt="Scheduled"; let StatIcon=Circle; let iCol="text-orange-500"; if(log?.status==='completed'){statTxt=`Completed ${log.time||''}`; StatIcon=CheckCircle2;iCol="text-accent";}else if(log?.status==='pending_makeup'){statTxt=`Makeup for ${log.originalMissedDate||'earlier'}`; StatIcon=MakeupIcon;iCol="text-blue-500";}else if(log?.status==='skipped'){statTxt="Skipped";StatIcon=XCircle;iCol="text-muted-foreground";}else if(isSch && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !log){statTxt="Missed";StatIcon=XCircle;iCol="text-destructive";}else if(!isSch && !log){statTxt="Not Scheduled";StatIcon=Circle;iCol="text-muted-foreground/50";} return(<li key={h.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md text-xs"><span className="font-medium truncate pr-2">{h.name}</span><div className="flex items-center space-x-1"><StatIcon className={cn("h-3.5 w-3.5",iCol)}/><span>{statTxt}</span></div></li>);})}</ul></ScrollArea>) : (<p className="text-xs text-muted-foreground text-center py-2">No habits for this day.</p>)}</div>)}
          <DialogFooterOriginal className="mt-2"><DialogCloseOriginal asChild><Button type="button" variant="outline">Close</Button></DialogCloseOriginal></DialogFooterOriginal>
        </DialogContentOriginal>
      </Dialog>

      <GoalInputProgramDialog isOpen={isGoalInputProgramDialogOpen} onClose={() => setIsGoalInputProgramDialogOpen(false)} onSubmit={handleSubmitGoalForProgram} isLoading={isProgramSuggestionLoading} />
      <ProgramSuggestionDialog 
        isOpen={isProgramSuggestionDialogOpen} 
        onClose={() => { setIsProgramSuggestionDialogOpen(false); setProgramSuggestion(null); }} 
        programSuggestion={programSuggestion} 
        onAddProgramHabits={handleAddProgramHabits} 
        isLoading={isProgramSuggestionLoading} 
      />
    </div>
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
    

    
