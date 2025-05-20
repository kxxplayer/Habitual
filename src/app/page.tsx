
"use client";

import * as React from 'react';
// Keep useState, useEffect, useMemo, useRef explicitly from 'react'
import { useState, useEffect, useMemo, useRef } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

import AppHeader from '@/components/layout/AppHeader';
import HabitList from '@/components/habits/HabitList';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import AddReflectionNoteDialog from '@/components/habits/AddReflectionNoteDialog';
import RescheduleMissedHabitDialog from '@/components/habits/RescheduleMissedHabitDialog';
import CreateHabitDialog from '@/components/habits/CreateHabitDialog';
import HabitOverview from '@/components/overview/HabitOverview';
import type { Habit, AISuggestion as AISuggestionType, WeekDay, HabitCompletionLogEntry, HabitCategory, EarnedBadge, CreateHabitFormData, SuggestedHabit } from '@/types';
import { THREE_DAY_SQL_STREAK_BADGE_ID, HABIT_CATEGORIES } from '@/types';
import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { getSqlTip } from '@/ai/flows/sql-tip-flow';
import { getMotivationalQuote } from '@/ai/flows/motivational-quote-flow';
import { getCommonHabitSuggestions } from '@/ai/flows/common-habit-suggestions-flow';
import { checkAndAwardBadges } from '@/lib/badgeUtils';
import Link from 'next/link';
import { cn } from "@/lib/utils";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle as DialogCardTitleCal, CardDescription as DialogCardDescriptionCal } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import type { DayPicker, DayModifiers } from 'react-day-picker';
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionEl,
  AlertDialogHeader as AlertDialogHeaderEl,
  AlertDialogTitle as AlertDialogTitleEl,
  AlertDialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Plus, LayoutDashboard, Home, Settings, StickyNote, CalendarDays, Award, Trophy, BookOpenText, UserCircle, BellRing, Loader2, Bell, Trash2, CheckCircle2, XCircle, Circle as CircleIcon, CalendarClock as MakeupIcon, MoreHorizontal, PlusCircle, Lightbulb, FilePenLine } from 'lucide-react';
import { format, parseISO, isSameDay, getDay, subDays, addDays as dateFnsAddDays, startOfWeek, endOfWeek, isWithinInterval, isPast as dateFnsIsPast, isToday as dateFnsIsToday, startOfDay } from 'date-fns';


const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const POINTS_PER_COMPLETION = 10;

const LS_KEY_PREFIX_HABITS = "habits_";
const LS_KEY_PREFIX_BADGES = "earnedBadges_";
const LS_KEY_PREFIX_POINTS = "totalPoints_";


const HabitualPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const previousAuthUserUidRef = React.useRef<string | null | undefined>(undefined);

  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [isLoadingHabits, setIsLoadingHabits] = React.useState(true);
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = React.useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = React.useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = React.useState<AISuggestionType | null>(null);

  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = React.useState(false);
  const [editingHabit, setEditingHabit] = React.useState<Habit | null>(null);


  const [isDashboardDialogOpen, setIsDashboardDialogOpen] = React.useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = React.useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date());

  const [isAchievementsDialogOpen, setIsAchievementsDialogOpen] = React.useState(false);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = React.useState(false);
  const [earnedBadges, setEarnedBadges] = React.useState<EarnedBadge[]>([]);
  const [totalPoints, setTotalPoints] = React.useState<number>(0);

  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission | null>(null);
  const reminderTimeouts = React.useRef<NodeJS.Timeout[]>([]);


  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = React.useState(false);
  const [reflectionDialogData, setReflectionDialogData] = React.useState<{
    habitId: string;
    date: string;
    initialNote?: string;
    habitName: string;
  } | null>(null);

  const [rescheduleDialogData, setRescheduleDialogData] = React.useState<{
    habit: Habit;
    missedDate: string;
  } | null>(null);

  const [commonHabitSuggestions, setCommonHabitSuggestions] = React.useState<SuggestedHabit[]>([]);
  const [isLoadingCommonSuggestions, setIsLoadingCommonSuggestions] = React.useState(false);
  const [commonSuggestionsFetched, setCommonSuggestionsFetched] = React.useState(false);
  const [initialFormDataForDialog, setInitialFormDataForDialog] = React.useState<Partial<CreateHabitFormData> | null>(null);


  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const previousUid = previousAuthUserUidRef.current;
      const currentUid = currentUser?.uid || null;

      if (previousUid !== currentUid) {
        console.log(`Auth state changed. Previous UID: ${previousUid}, Current UID: ${currentUid}. Resetting app state.`);

        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(false);
        setInitialFormDataForDialog(null);
        setEditingHabit(null);

        setIsDashboardDialogOpen(false);
        setIsCalendarDialogOpen(false);
        setIsAISuggestionDialogOpen(false);
        setIsReflectionDialogOpen(false);
        setRescheduleDialogData(null);
        setIsCreateHabitDialogOpen(false);

        // Clear localStorage for the previous user IF one existed
        if (previousUid) {
            console.log(`Clearing localStorage for previous user: ${previousUid}`);
            localStorage.removeItem(`${LS_KEY_PREFIX_HABITS}${previousUid}`);
            localStorage.removeItem(`${LS_KEY_PREFIX_BADGES}${previousUid}`);
            localStorage.removeItem(`${LS_KEY_PREFIX_POINTS}${previousUid}`);
        } else if (!currentUid && previousUid === undefined && typeof window !== 'undefined') {
            // This handles the case where the app loads, no user was previously logged in (previousUid is undefined)
            // AND no user is currently logging in (currentUid is null). This means it's an initial anonymous session.
            // No need to clear here, as subsequent effects will load or init for anonymous (if that's a use case)
            // or for the user who eventually logs in. The key is that data is namespaced on *save*.
            console.log("Initial load, no previous user, no current user. No specific localStorage clear needed here.");
        }
      }

      setAuthUser(currentUser);
      setIsLoadingAuth(false);
      previousAuthUserUidRef.current = currentUid;

      if (!currentUser && typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
        console.log('No current user, redirecting to login from auth state change effect.');
        router.push('/auth/login');
      }
    });

    return () => unsubscribe();
  }, [router]);


  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        setNotificationPermission(Notification.permission);
      } else {
        setNotificationPermission(Notification.permission);
      }
    } else {
      console.log('Notifications not supported by this browser.');
      setNotificationPermission('denied');
    }
  }, []);


  React.useEffect(() => {
    if (isLoadingAuth) {
      console.log("Auth state is loading, skipping data load from localStorage.");
      return;
    }

    if (!authUser) {
      console.log("No authenticated user, ensuring React state is clear and not loading from localStorage.");
      setHabits([]);
      setEarnedBadges([]);
      setTotalPoints(0);
      setCommonHabitSuggestions([]);
      setCommonSuggestionsFetched(false);
      setIsLoadingHabits(false);

      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
         console.log('No authUser after auth check (data loading effect), redirecting to login. Pathname:', window.location.pathname);
         router.push('/auth/login');
      }
      return;
    }

    setIsLoadingHabits(true);
    console.log(`Loading data for user: ${authUser.uid}`);

    let parsedHabits: Habit[] = [];
    const userHabitsKey = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    const storedHabits = localStorage.getItem(userHabitsKey);

    if (storedHabits) {
      try {
        parsedHabits = JSON.parse(storedHabits).map((habit_data_migration: any) => {
          let daysOfWeek_migrated: WeekDay[] = habit_data_migration.daysOfWeek || [];
          if (!habit_data_migration.daysOfWeek && habit_data_migration.frequency) {
            const freqLower_migrated = habit_data_migration.frequency.toLowerCase();
            if (freqLower_migrated === 'daily') daysOfWeek_migrated = [...weekDays];
            else {
              const dayMap_migrated: { [key: string]: WeekDay } = {
                'sun': 'Sun', 'sunday': 'Sun', 'mon': 'Mon', 'monday': 'Mon',
                'tue': 'Tue', 'tuesday': 'Tue', 'wed': 'Wed', 'wednesday': 'Wed',
                'thu': 'Thu', 'thursday': 'Thu', 'fri': 'Fri', 'friday': 'Fri',
                'sat': 'Sat', 'saturday': 'Sat',
              };
              daysOfWeek_migrated = freqLower_migrated.split(/[\s,]+/).map((d_str: string) => dayMap_migrated[d_str.trim() as keyof typeof dayMap_migrated]).filter(Boolean) as WeekDay[];
            }
          }

          let migratedDurationHours_val: number | undefined = habit_data_migration.durationHours;
          let migratedDurationMinutes_val: number | undefined = habit_data_migration.durationMinutes;

          if (habit_data_migration.duration && typeof habit_data_migration.duration === 'string' && migratedDurationHours_val === undefined && migratedDurationMinutes_val === undefined) {
            const durationStr_migrated = habit_data_migration.duration.toLowerCase();
            const hourMatch_migrated = durationStr_migrated.match(/(\d+)\s*hour/);
            const minMatch_migrated = durationStr_migrated.match(/(\d+)\s*min/);
            if (hourMatch_migrated) migratedDurationHours_val = parseInt(hourMatch_migrated[1]);
            if (minMatch_migrated) migratedDurationMinutes_val = parseInt(minMatch_migrated[1]);
            if (!hourMatch_migrated && !minMatch_migrated && /^\d+$/.test(durationStr_migrated)) {
                const numVal_migrated = parseInt(durationStr_migrated);
                if (numVal_migrated <= 120) migratedDurationMinutes_val = numVal_migrated;
            }
          }

          let migratedSpecificTime_val = habit_data_migration.specificTime;
          if (migratedSpecificTime_val && /\d{1,2}:\d{2}\s*(am|pm)/i.test(migratedSpecificTime_val)) {
            try {
              const [timePart_migrated, modifierPart_migrated] = migratedSpecificTime_val.split(/\s+/);
              const [hoursStr_migrated, minutesStr_migrated] = timePart_migrated.split(':');
              let hours_migrated = parseInt(hoursStr_migrated, 10);
              const minutes_migrated = parseInt(minutesStr_migrated, 10);
              const modifier_migrated = modifierPart_migrated ? modifierPart_migrated.toLowerCase() : '';
              if (modifier_migrated === 'pm' && hours_migrated < 12) hours_migrated += 12;
              if (modifier_migrated === 'am' && hours_migrated === 12) hours_migrated = 0;
              migratedSpecificTime_val = `${String(hours_migrated).padStart(2, '0')}:${String(minutes_migrated).padStart(2, '0')}`;
            } catch (e_time_parse) { console.warn("Error parsing 12hr time during migration", e_time_parse) }
          } else if (migratedSpecificTime_val && /^\d{1,2}:\d{2}$/.test(migratedSpecificTime_val)) {
             const [hours_num_migrated, minutes_num_migrated] = migratedSpecificTime_val.split(':').map(Number);
             migratedSpecificTime_val = `${String(hours_num_migrated).padStart(2, '0')}:${String(minutes_num_migrated).padStart(2, '0')}`;
          }


          const migratedCompletionLog_arr = (habit_data_migration.completionLog || (habit_data_migration.completedDates
              ? habit_data_migration.completedDates.map((d_log: string) => ({ date: d_log, time: 'N/A', note: undefined, status: 'completed' }))
              : [])).map((log_item_migrated: any) => ({
                date: typeof log_item_migrated.date === 'string' ? log_item_migrated.date : '1970-01-01', // Fallback for invalid date
                time: log_item_migrated.time || 'N/A',
                note: log_item_migrated.note || undefined,
                status: log_item_migrated.status || 'completed', // Default old entries to 'completed'
                originalMissedDate: log_item_migrated.originalMissedDate || undefined,
              }));

          return {
            id: habit_data_migration.id || Date.now().toString() + Math.random().toString(36).substring(2,7),
            name: habit_data_migration.name || 'Unnamed Habit',
            description: habit_data_migration.description || undefined,
            category: habit_data_migration.category && HABIT_CATEGORIES.includes(habit_data_migration.category) ? habit_data_migration.category : 'Other',
            daysOfWeek: daysOfWeek_migrated,
            optimalTiming: habit_data_migration.optimalTiming || undefined,
            durationHours: migratedDurationHours_val,
            durationMinutes: migratedDurationMinutes_val,
            specificTime: migratedSpecificTime_val || undefined,
            completionLog: migratedCompletionLog_arr as HabitCompletionLogEntry[],
            reminderEnabled: habit_data_migration.reminderEnabled === undefined ? false : habit_data_migration.reminderEnabled,
          };
        });
        setHabits(parsedHabits);
      } catch (error) {
        console.error(`Failed to parse habits from localStorage key ${userHabitsKey}:`, error);
        setHabits([]);
      }
    } else {
        setHabits([]); // No habits found for this user
    }

    // Fetch common suggestions only if no habits were parsed for this user AND suggestions haven't been fetched yet
    if (authUser && parsedHabits.length === 0 && !commonSuggestionsFetched) {
      setIsLoadingCommonSuggestions(true);
      getCommonHabitSuggestions({ count: 5 })
        .then(response => {
          if (response && response.suggestions) {
            setCommonHabitSuggestions(response.suggestions);
          }
        })
        .catch(err => {
          console.error("Failed to fetch common habit suggestions:", err);
        })
        .finally(() => {
          setIsLoadingCommonSuggestions(false);
          setCommonSuggestionsFetched(true);
        });
    } else if (parsedHabits.length > 0) {
        // If habits were loaded, don't show common suggestions
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(true); // Mark as fetched to prevent re-fetching
    }


    const userBadgesKey = `${LS_KEY_PREFIX_BADGES}${authUser.uid}`;
    const storedBadges = localStorage.getItem(userBadgesKey);
    if (storedBadges) {
      try {
        setEarnedBadges(JSON.parse(storedBadges));
      } catch (error) {
        console.error(`Failed to parse badges from localStorage key ${userBadgesKey}:`, error);
        setEarnedBadges([]);
      }
    } else {
        setEarnedBadges([]);
    }

    const userPointsKey = `${LS_KEY_PREFIX_POINTS}${authUser.uid}`;
    const storedPoints = localStorage.getItem(userPointsKey);
    if (storedPoints) {
      try {
        setTotalPoints(parseInt(storedPoints, 10));
      } catch (error) {
        console.error(`Failed to parse totalPoints from localStorage key ${userPointsKey}:`, error);
        setTotalPoints(0);
      }
    } else {
        setTotalPoints(0);
    }
    setIsLoadingHabits(false);
  }, [authUser, isLoadingAuth, commonSuggestionsFetched, router]); // commonSuggestionsFetched added

  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
    const userHabitsKey = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    localStorage.setItem(userHabitsKey, JSON.stringify(habits));

    const newlyEarned = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarned.length > 0) {
      const updatedBadges = [...earnedBadges];
      newlyEarned.forEach(async newBadge => {
        if (!earnedBadges.some(eb => eb.id === newBadge.id)) {
            updatedBadges.push(newBadge);
            console.log(`New Badge Unlocked: ${newBadge.name} - ${newBadge.description}`);
            // Only trigger SQL tip for the specific badge
            if (newBadge.id === THREE_DAY_SQL_STREAK_BADGE_ID) {
              try {
                const sqlTipResult = await getSqlTip();
                console.log(`💡 Bonus SQL Tip Unlocked: ${sqlTipResult.tip}`);
              } catch (tipError) {
                console.error("Failed to fetch SQL tip:", tipError);
              }
            }
        }
      });
      setEarnedBadges(updatedBadges);
    }
  }, [habits, earnedBadges, authUser, isLoadingAuth, isLoadingHabits]);

  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
    const userBadgesKey = `${LS_KEY_PREFIX_BADGES}${authUser.uid}`;
    localStorage.setItem(userBadgesKey, JSON.stringify(earnedBadges));
  }, [earnedBadges, authUser, isLoadingAuth, isLoadingHabits]);

  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
    const userPointsKey = `${LS_KEY_PREFIX_POINTS}${authUser.uid}`;
    localStorage.setItem(userPointsKey, totalPoints.toString());
  }, [totalPoints, authUser, isLoadingAuth, isLoadingHabits]);

  useEffect(() => {
    // Clear existing timeouts
    reminderTimeouts.current.forEach(clearTimeout);
    reminderTimeouts.current = [];

    if (notificationPermission === 'granted') {
      console.log("Checking habits for reminders (placeholder)...");
      habits.forEach(habit_for_reminder => {
        if (habit_for_reminder.reminderEnabled) {
          let reminderDateTime: Date | null = null;
          const now = new Date();

          if (habit_for_reminder.specificTime) {
            try {
              const [hours, minutes] = habit_for_reminder.specificTime.split(':').map(Number);
              if (isNaN(hours) || isNaN(minutes)) throw new Error("Invalid time format");
              let specificEventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
              reminderDateTime = new Date(specificEventTime.getTime() - 30 * 60 * 1000); // 30 minutes before
            } catch (e) {
              console.error(`Error parsing specificTime "${habit_for_reminder.specificTime}" for habit "${habit_for_reminder.name}"`, e);
            }
          } else {
            // Fallback for habits without specific time - remind at a default time based on optimalTiming
            let baseHour = 10; // Default to 10 AM if no optimal timing specified
            if (habit_for_reminder.optimalTiming?.toLowerCase().includes('morning')) baseHour = 9; // Morning reminder at 9 AM
            else if (habit_for_reminder.optimalTiming?.toLowerCase().includes('afternoon')) baseHour = 13; // Afternoon at 1 PM
            else if (habit_for_reminder.optimalTiming?.toLowerCase().includes('evening')) baseHour = 18; // Evening at 6 PM
            reminderDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), baseHour, 0, 0, 0);
          }

          if (reminderDateTime && reminderDateTime > now) {
            const delay = reminderDateTime.getTime() - now.getTime();
            console.log(`Reminder for "${habit_for_reminder.name}" would be scheduled at: ${reminderDateTime.toLocaleString()} (in ${Math.round(delay/60000)} mins)`);

            // Actual setTimeout logic would go here
            // const timeoutId = setTimeout(() => {
            //   new Notification("Habitual Reminder", {
            //     body: `Time for your habit: ${habit.name}!`,
            //     // icon: "/icons/icon-192x192.png" // Optional icon
            //   });
            //   console.log(`REMINDER FIRED for: ${habit.name}`);
            // }, delay);
            // reminderTimeouts.current.push(timeoutId);

          } else if (reminderDateTime) {
            // console.log(`Reminder time for "${habit.name}" (${reminderDateTime.toLocaleTimeString()}) has passed for today or is invalid.`);
          }
        }
      });
    }
    // Cleanup function to clear timeouts when component unmounts or dependencies change
    return () => {
      reminderTimeouts.current.forEach(clearTimeout);
      reminderTimeouts.current = [];
    };
  }, [habits, notificationPermission]);


  const handleSaveHabit = (habitData: CreateHabitFormData & { id?: string }) => {
    if (editingHabit && habitData.id) {
      // Editing existing habit
      setHabits(prevHabits =>
        prevHabits.map(h_edit =>
          h_edit.id === habitData.id
            ? { // Spread existing habit to preserve completionLog and reminderEnabled
                ...h_edit,
                name: habitData.name,
                description: habitData.description,
                category: habitData.category || 'Other',
                daysOfWeek: habitData.daysOfWeek,
                optimalTiming: habitData.optimalTiming,
                durationHours: habitData.durationHours === null ? undefined : habitData.durationHours,
                durationMinutes: habitData.durationMinutes === null ? undefined : habitData.durationMinutes,
                specificTime: habitData.specificTime,
                // reminderEnabled is preserved from h_edit
              }
            : h_edit
        )
      );
      console.log(`Habit Updated: ${habitData.name}`);
    } else {
      // Adding new habit
      const newHabit: Habit = {
        id: Date.now().toString() + Math.random().toString(36).substring(2,7),
        name: habitData.name,
        description: habitData.description,
        category: habitData.category || 'Other',
        daysOfWeek: habitData.daysOfWeek,
        optimalTiming: habitData.optimalTiming,
        durationHours: habitData.durationHours === null ? undefined : habitData.durationHours,
        durationMinutes: habitData.durationMinutes === null ? undefined : habitData.durationMinutes,
        specificTime: habitData.specificTime,
        completionLog: [],
        reminderEnabled: false, // Default reminder state for new habits
      };
      setHabits(prevHabits => [...prevHabits, newHabit]);
      console.log(`Habit Added: ${newHabit.name}`);
    }
    setIsCreateHabitDialogOpen(false);
    setInitialFormDataForDialog(null); // Clear initial data after save
    setEditingHabit(null); // Clear editing state
  };

  const handleOpenEditDialog = (habitToEdit: Habit) => {
    setEditingHabit(habitToEdit);
    setInitialFormDataForDialog({ // Ensure all fields, including id, are passed for pre-fill
      id: habitToEdit.id,
      name: habitToEdit.name,
      description: habitToEdit.description || '',
      category: habitToEdit.category || 'Other',
      daysOfWeek: habitToEdit.daysOfWeek,
      optimalTiming: habitToEdit.optimalTiming || '',
      durationHours: habitToEdit.durationHours === undefined ? null : habitToEdit.durationHours,
      durationMinutes: habitToEdit.durationMinutes === undefined ? null : habitToEdit.durationMinutes,
      specificTime: habitToEdit.specificTime || '',
    });
    setIsCreateHabitDialogOpen(true);
  };

  const handleToggleComplete = async (habitId: string, date: string, completed: boolean) => {
    let habitNameForQuote: string | undefined = undefined;
    let pointsChange = 0;
    let justCompleted = false;

    setHabits((prevHabits) =>
      prevHabits.map((habit_item_for_toggle) => {
        if (habit_item_for_toggle.id === habitId) {
          habitNameForQuote = habit_item_for_toggle.name;
          let newCompletionLog_for_toggle = [...habit_item_for_toggle.completionLog];
          const existingLogIndex_for_toggle = newCompletionLog_for_toggle.findIndex(log_entry_for_toggle => log_entry_for_toggle.date === date);
          const currentTime_for_toggle = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          if (completed) {
            if (existingLogIndex_for_toggle > -1) {
              const existingLog_item_for_toggle = newCompletionLog_for_toggle[existingLogIndex_for_toggle];
              if (existingLog_item_for_toggle.status !== 'completed') {
                pointsChange = POINTS_PER_COMPLETION;
                justCompleted = true;
              }
              newCompletionLog_for_toggle[existingLogIndex_for_toggle] = { ...existingLog_item_for_toggle, status: 'completed', time: currentTime_for_toggle };
            } else {
              pointsChange = POINTS_PER_COMPLETION;
              justCompleted = true;
              newCompletionLog_for_toggle.push({ date, time: currentTime_for_toggle, status: 'completed', note: undefined });
            }
          } else { // Un-completing
            if (existingLogIndex_for_toggle > -1) {
              const logEntry_item_for_toggle = newCompletionLog_for_toggle[existingLogIndex_for_toggle];
              if (logEntry_item_for_toggle.status === 'completed') {
                 pointsChange = -POINTS_PER_COMPLETION;
              }
              // If it was a completed makeup task, revert to pending_makeup
              // Otherwise, if it has a note, mark as skipped. Else, remove.
              if (logEntry_item_for_toggle.status === 'completed' && logEntry_item_for_toggle.originalMissedDate) {
                newCompletionLog_for_toggle[existingLogIndex_for_toggle] = { ...logEntry_item_for_toggle, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry_item_for_toggle.note) {
                newCompletionLog_for_toggle[existingLogIndex_for_toggle] = { ...logEntry_item_for_toggle, status: 'skipped', time: 'N/A' };
              }
              else { // No note, and not a completed makeup, so remove the log entirely
                newCompletionLog_for_toggle.splice(existingLogIndex_for_toggle, 1);
              }
            }
          }
          return { ...habit_item_for_toggle, completionLog: newCompletionLog_for_toggle.sort((a_log, b_log) => b_log.date.localeCompare(a_log.date)) };
        }
        return habit_item_for_toggle;
      })
    );

    if (justCompleted && habitNameForQuote) {
      try {
        const quoteResult = await getMotivationalQuote({ habitName: habitNameForQuote });
        console.log("Motivational Quote:", quoteResult.quote);
      } catch (error) {
        console.error("Failed to fetch motivational quote:", error);
        console.log("Motivational Quote: Well Done! You're making progress!");
      }
    }

    if (pointsChange !== 0) {
      setTotalPoints(prevPoints => Math.max(0, prevPoints + pointsChange));
    }
  };

  const handleToggleReminder = (habitId: string, currentReminderState: boolean) => {
    setHabits(prevHabits =>
      prevHabits.map(h_reminder =>
        h_reminder.id === habitId ? { ...h_reminder, reminderEnabled: !currentReminderState } : h_reminder
      )
    );
    const habit_for_reminder_toggle = habits.find(h_find => h_find.id === habitId);
    console.log(`Reminder for habit "${habit_for_reminder_toggle?.name}" ${!currentReminderState ? 'enabled' : 'disabled'}`);
    if (!currentReminderState && notificationPermission !== 'granted') {
       console.log('Please enable notifications in your browser settings or allow permission when prompted to receive reminders.');
    }
  };


  const handleOpenAISuggestionDialog = async (habit_for_ai: Habit) => {
    setSelectedHabitForAISuggestion(habit_for_ai);
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habit_for_ai.id, suggestionText: '', isLoading: true });

    try {
      const completionEntries_for_ai = habit_for_ai.completionLog.map(log_for_ai => {
        let entry_for_ai = `${log_for_ai.date} at ${log_for_ai.time || 'N/A'}`;
        if (log_for_ai.status === 'skipped') entry_for_ai += ` (Skipped)`;
        else if (log_for_ai.status === 'pending_makeup') entry_for_ai += ` (Makeup Pending for ${log_for_ai.originalMissedDate})`;
        else if (log_for_ai.status === 'completed' || log_for_ai.status === undefined) entry_for_ai += ` (Completed)`;

        if (log_for_ai.note && log_for_ai.note.trim() !== "") entry_for_ai += ` (Note: ${log_for_ai.note.trim()})`;
        return entry_for_ai;
      });
      const trackingData_for_ai = `Completions & Status: ${completionEntries_for_ai.join('; ') || 'None yet'}.`;

      const inputForAI_call = {
        habitName: habit_for_ai.name,
        habitDescription: habit_for_ai.description,
        daysOfWeek: habit_for_ai.daysOfWeek,
        optimalTiming: habit_for_ai.optimalTiming,
        durationHours: habit_for_ai.durationHours,
        durationMinutes: habit_for_ai.durationMinutes,
        specificTime: habit_for_ai.specificTime,
        trackingData: trackingData_for_ai,
      };

      const result_from_ai = await getHabitSuggestion(inputForAI_call);
      setAISuggestion({ habitId: habit_for_ai.id, suggestionText: result_from_ai.suggestion, isLoading: false });
    } catch (error_fetching_ai) {
      console.error("Error fetching AI suggestion:", error_fetching_ai);
      setAISuggestion({
        habitId: habit_for_ai.id,
        suggestionText: '',
        isLoading: false,
        error: 'Failed to get suggestion.'
      });
      console.error("AI Suggestion Error: Could not fetch suggestion.");
    }
  };

  const handleOpenReflectionDialog = (habitId: string, date: string, habitName: string) => {
    const habit_for_reflection = habits.find(h_ref => h_ref.id === habitId);
    const logEntry_for_reflection = habit_for_reflection?.completionLog.find(log_ref => log_ref.date === date);
    setReflectionDialogData({
      habitId,
      date,
      initialNote: logEntry_for_reflection?.note || '',
      habitName,
    });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (note_to_save: string) => {
    if (!reflectionDialogData) return;
    const { habitId, date } = reflectionDialogData;

    setHabits(prevHabits =>
      prevHabits.map(h_for_note_save => {
        if (h_for_note_save.id === habitId) {
          let logEntryExists_for_note_save = false;
          const newCompletionLog_for_note_save = h_for_note_save.completionLog.map(log_item_for_note_save => {
            if (log_item_for_note_save.date === date) {
              logEntryExists_for_note_save = true;
              return { ...log_item_for_note_save, note: note_to_save.trim() === "" ? undefined : note_to_save.trim() };
            }
            return log_item_for_note_save;
          });
          if (!logEntryExists_for_note_save) {
             // Determine default status if adding a note to a day without a log entry
             // If it was scheduled, it should be 'skipped', otherwise 'completed' if note is added to non-scheduled day.
             // For simplicity, default to 'skipped' or check if it's a scheduled day.
             const dayOfWeekForDate = dayIndexToWeekDayConstant[getDay(parseISO(date))];
             const wasScheduled = h_for_note_save.daysOfWeek.includes(dayOfWeekForDate);

             // If a note is added to a day, and it wasn't explicitly completed, it's likely skipped or just a note.
             // Let's mark it as 'skipped' if it was scheduled and no completion status exists.
             // If it wasn't scheduled, then adding a note doesn't mean it was 'completed'.
             const defaultStatusForNewLog = wasScheduled ? 'skipped' : 'skipped'; // Or consider a different status for non-scheduled noted days.

             newCompletionLog_for_note_save.push({
                date,
                time: 'N/A', // No time if just adding a note without explicit completion
                note: note_to_save.trim() === "" ? undefined : note_to_save.trim(),
                status: defaultStatusForNewLog // Default to 'skipped' if it's a new log entry just for a note
             });
             newCompletionLog_for_note_save.sort((a_sort,b_sort) => b_sort.date.localeCompare(a_sort.date));
          }
          return { ...h_for_note_save, completionLog: newCompletionLog_for_note_save };
        }
        return h_for_note_save;
      })
    );
    console.log(`Reflection Saved for ${reflectionDialogData.habitName} on ${date}`);
    setReflectionDialogData(null);
    setIsReflectionDialogOpen(false);
  };

  const handleOpenRescheduleDialog = (habit_to_reschedule: Habit, missedDate_for_reschedule: string) => {
    setRescheduleDialogData({ habit: habit_to_reschedule, missedDate: missedDate_for_reschedule });
  };

  const handleSaveRescheduledHabit = (habitId_rescheduled: string, originalMissedDate_rescheduled: string, newDate_rescheduled: string) => {
    setHabits(prevHabits => prevHabits.map(h_rescheduled_map => {
      if (h_rescheduled_map.id === habitId_rescheduled) {
        const newCompletionLog_rescheduled = [...h_rescheduled_map.completionLog];
        // Find the original missed log. If it exists and isn't completed, update its status to 'skipped'.
        // If it doesn't exist, add a 'skipped' entry for the original date.
        const existingMissedLogIndex_rescheduled = newCompletionLog_rescheduled.findIndex(log_rescheduled_find => log_rescheduled_find.date === originalMissedDate_rescheduled);

        if(existingMissedLogIndex_rescheduled > -1) {
            // If the entry for the original missed date exists and is not 'completed'
            if (newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].status !== 'completed') {
                newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].status = 'skipped';
                newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].time = 'N/A'; // Ensure time is 'N/A' for skipped
            }
            // If it was completed, we don't change its status here; rescheduling is separate.
        } else {
            // If no entry exists for the original missed date, add one as 'skipped'.
            newCompletionLog_rescheduled.push({
                date: originalMissedDate_rescheduled,
                time: 'N/A',
                status: 'skipped'
            });
        }

        // Add the new 'pending_makeup' entry
        newCompletionLog_rescheduled.push({
          date: newDate_rescheduled,
          time: 'N/A',
          status: 'pending_makeup',
          originalMissedDate: originalMissedDate_rescheduled,
        });
        newCompletionLog_rescheduled.sort((a_sort_res,b_sort_res) => b_sort_res.date.localeCompare(a_sort_res.date));
        return { ...h_rescheduled_map, completionLog: newCompletionLog_rescheduled };
      }
      return h_rescheduled_map;
    }));
    const habitName_rescheduled = habits.find(h_find_name_res => h_find_name_res.id === habitId_rescheduled)?.name || "Habit";
    console.log(`Habit "${habitName_rescheduled}" missed on ${originalMissedDate_rescheduled} rescheduled to ${newDate_rescheduled}.`);
  };

  const handleSaveMarkAsSkipped = (habitId_skipped: string, missedDate_skipped: string) => {
     setHabits(prevHabits => prevHabits.map(h_skipped_map => {
      if (h_skipped_map.id === habitId_skipped) {
        let newCompletionLog_skipped = [...h_skipped_map.completionLog];
        const existingLogIndex_skipped = newCompletionLog_skipped.findIndex(log_skipped_find => log_skipped_find.date === missedDate_skipped);
        if (existingLogIndex_skipped > -1) {
          newCompletionLog_skipped[existingLogIndex_skipped] = {
            ...newCompletionLog_skipped[existingLogIndex_skipped],
            status: 'skipped',
            time: 'N/A' // Ensure time is N/A for skipped
          };
        } else {
          newCompletionLog_skipped.push({ date: missedDate_skipped, time: 'N/A', status: 'skipped' });
        }
        newCompletionLog_skipped.sort((a_sort_skip,b_sort_skip) => b_sort_skip.date.localeCompare(a_sort_skip.date));
        return { ...h_skipped_map, completionLog: newCompletionLog_skipped };
      }
      return h_skipped_map;
    }));
    const habitName_skipped = habits.find(h_find_name_skip => h_find_name_skip.id === habitId_skipped)?.name || "Habit";
    console.log(`Habit "${habitName_skipped}" for ${missedDate_skipped} marked as skipped.`);
  };

  const handleRequestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission().then(permission_val => {
            setNotificationPermission(permission_val);
            if (permission_val === 'granted') {
                console.log('Notification permission granted.');
            } else {
                console.log('Notification permission denied or dismissed.');
            }
        });
    }
  };

  const habitsForSelectedCalendarDate = useMemo(() => {
    if (!selectedCalendarDate) return [];
    const dateStr_for_cal_dialog_display = format(selectedCalendarDate, 'yyyy-MM-dd');
    const dayOfWeek_for_cal_dialog_display = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

    return habits.filter(habit_item_for_cal_dialog => {
      const isScheduled_for_cal_dialog = habit_item_for_cal_dialog.daysOfWeek.includes(dayOfWeek_for_cal_dialog_display);
      const logEntry_for_cal_dialog = habit_item_for_cal_dialog.completionLog.find(log_cal_dialog => log_cal_dialog.date === dateStr_for_cal_dialog_display);
      return isScheduled_for_cal_dialog || logEntry_for_cal_dialog; // Show if scheduled OR if there's any log entry for that day
    });
  }, [selectedCalendarDate, habits]);

  const calendarDialogModifiers = React.useMemo(() => {
    try {
      console.log("Recalculating calendarDialogModifiers - MINIMAL. Habits:", habits, "Selected Date:", selectedCalendarDate);
      // Minimal version: Only handle 'selected' and empty arrays for others.
      if (habits && habits.length > 0) {
        // Perform a trivial operation to ensure `habits` is "used" if React's dependency check is overly aggressive.
        // This line doesn't actually do anything to the result but might prevent premature optimization issues.
        const _ = habits[0]?.id;
      }

      return {
        completed: [],
        missed: [],
        scheduled: [],
        makeup: [],
        selected: selectedCalendarDate ? [selectedCalendarDate] : [],
      };
    } catch (error) {
      console.error("CRITICAL ERROR in calendarDialogModifiers calculation:", error);
      return { // Fallback to safe values
          completed: [],
          missed: [],
          scheduled: [],
          makeup: [],
          selected: selectedCalendarDate ? [selectedCalendarDate] : [],
      };
    }
  }, [habits, selectedCalendarDate]);


  const calendarDialogModifierStyles: DayPicker['modifiersStyles'] = {
    completed: { backgroundColor: 'hsl(var(--accent)/0.15)', color: 'hsl(var(--accent))', fontWeight: 'bold' },
    missed: { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
    scheduled: { backgroundColor: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' },
    makeup: { backgroundColor: 'hsl(200,100%,50%)/0.15)', color: 'hsl(200,100%,50%)' },
    selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
  };


  const sheetMenuItems = [
    { href: '/', label: 'Home', icon: Home, action: () => setIsSettingsSheetOpen(false) },
    { href: '/profile', label: 'Profile', icon: UserCircle, action: () => setIsSettingsSheetOpen(false) },
    {
      label: 'Reminders',
      icon: BellRing,
      action: () => {
        // This will now be handled by the content within the sheet
      }
    },
    {
      label: 'Achievements',
      icon: Award,
      action: () => {
        setIsSettingsSheetOpen(false);
        setIsAchievementsDialogOpen(true);
      }
    },
    { label: 'Calendar', icon: CalendarDays, action: () => { setIsSettingsSheetOpen(false); setIsCalendarDialogOpen(true); } },
  ];

  const handleCustomizeSuggestedHabit = (suggestion: SuggestedHabit) => {
    setEditingHabit(null); // Ensure not in edit mode
    setInitialFormDataForDialog({
      name: suggestion.name,
      category: suggestion.category || 'Other',
      description: '', // Suggested habits are now just names/categories
      daysOfWeek: [], // User will customize days
      // Other fields like optimalTiming, duration, specificTime will be default/empty
    });
    setIsCreateHabitDialogOpen(true);
  };


  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!authUser) {
    // This state should ideally be brief due to the redirect in onAuthStateChanged
    // but acts as a fallback.
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  // Main app view
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 p-2 sm:p-4">
      <div
        className="bg-background text-foreground shadow-xl rounded-xl flex flex-col w-full"
        style={{
          maxWidth: 'clamp(320px, 100%, 450px)', // Mobile-like max width
          height: 'clamp(700px, 90vh, 850px)', // Mobile-like height
          overflow: 'hidden', // Crucial for containing fixed elements and scroll
        }}
      >
        <AppHeader onOpenCalendar={() => setIsCalendarDialogOpen(true)} />

        <ScrollArea className="flex-grow"> {/* Makes the main content area scrollable */}
          <main className="px-3 sm:px-4 py-4"> {/* Padding for content within scroll area */}

            {/* Common Habit Suggestions for New Users */}
            {authUser && !isLoadingAuth && !isLoadingHabits && habits.length === 0 && commonHabitSuggestions.length > 0 && (
              <Card className="my-4 p-4 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
                <CardHeader className="p-2 pt-0">
                  <DialogCardTitleCal className="text-lg font-semibold flex items-center text-primary">
                     <Lightbulb className="mr-2 h-5 w-5"/>
                     Start with these habits!
                  </DialogCardTitleCal>
                  <DialogCardDescriptionCal className="text-sm text-muted-foreground">
                    Click a tile to customize and add it:
                  </DialogCardDescriptionCal>
                </CardHeader>
                <CardContent className="p-2">
                  {isLoadingCommonSuggestions ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="ml-2 text-sm text-muted-foreground">Loading suggestions...</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {commonHabitSuggestions.map((suggestion_item, index_sug) => (
                        <Button
                          key={index_sug}
                          variant="outline"
                          className="p-3 h-auto flex flex-col items-center justify-center space-y-1 min-w-[100px] text-center shadow-sm hover:shadow-md transition-shadow"
                          onClick={() => handleCustomizeSuggestedHabit(suggestion_item)}
                        >
                          <span className="font-medium text-sm">{suggestion_item.name}</span>
                          {suggestion_item.category && <span className="text-xs text-primary/80">{suggestion_item.category}</span>}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <HabitList
              habits={habits}
              onToggleComplete={handleToggleComplete}
              onGetAISuggestion={handleOpenAISuggestionDialog}
              onOpenReflectionDialog={handleOpenReflectionDialog}
              onOpenRescheduleDialog={handleOpenRescheduleDialog}
              onToggleReminder={handleToggleReminder}
              onOpenEditDialog={handleOpenEditDialog} // Pass down edit handler
            />
          </main>
          <footer className="py-3 text-center text-xs text-muted-foreground border-t mt-auto">
            <p>&copy; {new Date().getFullYear()} Habitual.</p>
          </footer>
        </ScrollArea>


        {/* Bottom Navigation Bar */}
        <div className="shrink-0 bg-card border-t border-border p-1 flex justify-around items-center h-16 sticky bottom-0 z-30">
          <Button variant="ghost" className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/4">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-0.5">Home</span>
          </Button>
          <Button variant="ghost" onClick={() => setIsDashboardDialogOpen(true)} className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/4">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs mt-0.5">Dashboard</span>
          </Button>
          <Button variant="ghost" onClick={() => setIsAchievementsDialogOpen(true)} className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/4">
            <Award className="h-5 w-5" />
            <span className="text-xs mt-0.5">Badges</span>
          </Button>
          <Button variant="ghost" onClick={() => setIsSettingsSheetOpen(true)} className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/4">
            <Settings className="h-5 w-5" />
            <span className="text-xs mt-0.5">Settings</span>
          </Button>
        </div>
      </div>

      {/* Floating Action Button (FAB) for Add New Habit */}
      <Button
        className="fixed bottom-[calc(4rem+1.5rem)] right-6 sm:right-10 h-14 w-14 p-0 rounded-full shadow-xl z-30 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
        onClick={() => {
          setEditingHabit(null); // Ensure not in edit mode
          setInitialFormDataForDialog(null); // Clear any previous initial data
          setIsCreateHabitDialogOpen(true);
         }}
        aria-label="Add New Habit"
      >
        <Plus className="h-7 w-7" />
      </Button>

      {/* Dialogs */}
      <CreateHabitDialog
        isOpen={isCreateHabitDialogOpen}
        onClose={() => {
            setIsCreateHabitDialogOpen(false);
            setInitialFormDataForDialog(null); // Clear initial data on close
            setEditingHabit(null); // Clear editing state on close
        }}
        onSaveHabit={handleSaveHabit}
        initialData={initialFormDataForDialog} // Pass initial data for pre-fill
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
          onSaveNote={handleSaveReflectionNote}
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
          onReschedule={(newDate_reschedule_cb) => {
            handleSaveRescheduledHabit(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate, newDate_reschedule_cb);
            setRescheduleDialogData(null);
          }}
          onMarkAsSkipped={() => {
            handleSaveMarkAsSkipped(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate);
            setRescheduleDialogData(null);
          }}
        />
      )}

      <Dialog open={isDashboardDialogOpen} onOpenChange={setIsDashboardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <LayoutDashboard className="mr-2 h-5 w-5 text-primary" />
              Your Habit Dashboard
            </DialogTitle>
            <DialogDescription>
              A snapshot of your progress and today's checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-[65vh] overflow-y-auto pr-2">
            <HabitOverview habits={habits} totalPoints={totalPoints} />
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsDashboardDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar Dialog */}
      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-full max-w-[calc(100%-2rem)]"> {/* Ensure dialog doesn't exceed viewport width */}
            <DialogHeader>
                <DialogTitle className="flex items-center text-xl">
                    <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                    Habit Calendar
                </DialogTitle>
                 <DialogDescription>
                    View your habit activity on the calendar.
                </DialogDescription>
            </DialogHeader>
            <div className="py-2 max-h-[65vh] overflow-y-auto pr-2 flex flex-col items-center"> {/* Centering calendar */}
                 <Calendar
                    mode="single"
                    selected={selectedCalendarDate}
                    onSelect={setSelectedCalendarDate}
                    modifiers={calendarDialogModifiers} // This is the critical part
                    modifiersStyles={calendarDialogModifierStyles}
                    className="rounded-md border p-0 sm:p-2" // Adjusted padding for smaller screens
                    month={selectedCalendarDate || new Date()} // Ensure month navigates correctly
                    onMonthChange={setSelectedCalendarDate}   // Allow month navigation
                 />
                {selectedCalendarDate && (
                <div className="mt-4 w-full">
                    <h3 className="text-md font-semibold mb-2 text-center">
                    Habits for {format(selectedCalendarDate, 'MMMM d, yyyy')}
                    </h3>
                    {habitsForSelectedCalendarDate.length > 0 ? (
                    <ul className="space-y-1.5 text-sm max-h-40 overflow-y-auto">
                        {habitsForSelectedCalendarDate.map(habit_item_for_cal_date_display => {
                        const logEntryForCalDate_display = habit_item_for_cal_date_display.completionLog.find(log_cal_display => log_cal_display.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                        const dayOfWeekForSelectedDate_display = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                        const isScheduledOnSelectedDate_display = habit_item_for_cal_date_display.daysOfWeek.includes(dayOfWeekForSelectedDate_display);
                        let statusTextForCalDate_display = "Scheduled"; // Default
                        let StatusIconForCalDate_display = CircleIcon; // Default
                        let iconColorForCalDate_display = "text-orange-500"; // Default for scheduled

                        if (logEntryForCalDate_display?.status === 'completed') {
                            statusTextForCalDate_display = `Completed at ${logEntryForCalDate_display.time || ''}`;
                            StatusIconForCalDate_display = CheckCircle2;
                            iconColorForCalDate_display = "text-accent";
                        } else if (logEntryForCalDate_display?.status === 'pending_makeup') {
                            statusTextForCalDate_display = `Makeup for ${logEntryForCalDate_display.originalMissedDate}`;
                            StatusIconForCalDate_display = MakeupIcon;
                            iconColorForCalDate_display = "text-blue-500";
                        } else if (logEntryForCalDate_display?.status === 'skipped') {
                            statusTextForCalDate_display = "Skipped";
                            StatusIconForCalDate_display = XCircle;
                            iconColorForCalDate_display = "text-muted-foreground";
                        } else if (isScheduledOnSelectedDate_display && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !logEntryForCalDate_display) {
                            // Only mark as missed if it was scheduled, is in the past (not today), and has no log entry
                            statusTextForCalDate_display = "Missed";
                            StatusIconForCalDate_display = XCircle;
                            iconColorForCalDate_display = "text-destructive";
                        } else if (!isScheduledOnSelectedDate_display && !logEntryForCalDate_display) {
                            // If not scheduled and no log entry, it's just an empty day for this habit.
                            statusTextForCalDate_display = "Not Scheduled";
                            StatusIconForCalDate_display = CircleIcon; // or a more neutral icon
                            iconColorForCalDate_display = "text-muted-foreground/50";
                        }
                        // If it's scheduled and today/future with no log, the default "Scheduled" text will apply.

                        return (
                            <li key={habit_item_for_cal_date_display.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                            <span className="font-medium truncate pr-2">{habit_item_for_cal_date_display.name}</span>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <StatusIconForCalDate_display className={cn("h-3.5 w-3.5", iconColorForCalDate_display)} />
                                <span>{statusTextForCalDate_display}</span>
                            </div>
                            </li>
                        );
                        })}
                    </ul>
                    ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No habits for this day.</p>
                    )}
                </div>
                )}
            </div>
            <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsCalendarDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={isAchievementsDialogOpen} onOpenChange={setIsAchievementsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
              Your Achievements
            </DialogTitle>
            <DialogDescription>
              All the badges you've unlocked so far!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto pr-2 space-y-3">
            {earnedBadges.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No badges earned yet. Keep up the great work!</p>
            ) : (
              earnedBadges.map((badge_item_display) => (
                <div key={badge_item_display.id} className="p-3 border rounded-md bg-card shadow-sm">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">{badge_item_display.icon || "🏆"}</span>
                    <h4 className="font-semibold text-primary">{badge_item_display.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{badge_item_display.description}</p>
                  <p className="text-xs text-muted-foreground">Achieved: {format(new Date(badge_item_display.dateAchieved), "MMMM d, yyyy")}</p>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsAchievementsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Sheet */}
      <Sheet open={isSettingsSheetOpen} onOpenChange={setIsSettingsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader className="mb-4">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Navigate to different sections of the app.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2">
            {sheetMenuItems.map((item_menu_sheet) => (
              item_menu_sheet.href && item_menu_sheet.href === "/profile" ? (
                 <SheetClose asChild key={item_menu_sheet.label}>
                    <Link href={item_menu_sheet.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet.action} >
                            <item_menu_sheet.icon className="mr-3 h-5 w-5" />
                            {item_menu_sheet.label}
                        </Button>
                    </Link>
                 </SheetClose>
              ) : item_menu_sheet.href && item_menu_sheet.href !== "/profile" ? (
                <SheetClose asChild key={item_menu_sheet.label}>
                    <Link href={item_menu_sheet.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet.action}>
                        <item_menu_sheet.icon className="mr-3 h-5 w-5" />
                        {item_menu_sheet.label}
                        </Button>
                    </Link>
                </SheetClose>
              ) : (
                // For non-link items (like Reminders, Achievements, Calendar that open dialogs/sheets)
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base py-3"
                  onClick={() => {
                    item_menu_sheet.action();
                    // Close sheet only if the action doesn't open another modal/dialog from within the sheet
                    if (item_menu_sheet.label !== 'Reminders') { // Keep sheet open for reminder interaction
                       // setIsSettingsSheetOpen(false); // Handled by SheetClose if needed
                    }
                  }}
                  key={item_menu_sheet.label}
                >
                  <item_menu_sheet.icon className="mr-3 h-5 w-5" />
                  {item_menu_sheet.label}
                </Button>
              )
            ))}
          </div>
           {/* Section to show notification status and allow re-request */}
           <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center text-sm">
                        <Bell className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Notification Status:</span>
                        <span className={cn("ml-1 font-semibold",
                            notificationPermission === 'granted' ? 'text-green-600' :
                            notificationPermission === 'denied' ? 'text-red-600' : 'text-yellow-600'
                        )}>
                            {notificationPermission ? notificationPermission.charAt(0).toUpperCase() + notificationPermission.slice(1) : 'Checking...'}
                        </span>
                    </div>
                    {(notificationPermission === 'default' || notificationPermission === 'denied') && (
                        <SheetClose asChild>
                            <Button size="sm" variant="outline" onClick={handleRequestNotificationPermission}>
                                Enable Notifications
                            </Button>
                        </SheetClose>
                    )}
                </div>
                {notificationPermission === 'denied' && <p className="text-xs text-muted-foreground px-1 mt-1">Notifications are blocked. Please enable them in your browser settings for Habitual to send reminders.</p>}
            </div>
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default HabitualPage;
