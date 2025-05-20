
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
import { THREE_DAY_SQL_STREAK_BADGE_ID, HABIT_CATEGORIES, SEVEN_DAY_STREAK_BADGE_ID, THIRTY_DAY_STREAK_BADGE_ID, FIRST_HABIT_COMPLETED_BADGE_ID } from '@/types';
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
  AlertDialogTitle as AlertTitle, // Renamed to avoid conflict
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
      const previousUid_auth_effect = previousAuthUserUidRef.current;
      const currentUid_auth_effect = currentUser?.uid || null;

      if (previousUid_auth_effect !== currentUid_auth_effect) {
        console.log(`Auth state changed. Previous UID: ${previousUid_auth_effect}, Current UID: ${currentUid_auth_effect}. Resetting app state for user switch/logout.`);

        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(false);
        setInitialFormDataForDialog(null);
        setEditingHabit(null);
        setReflectionDialogData(null);
        setRescheduleDialogData(null);

        setIsDashboardDialogOpen(false);
        setIsCalendarDialogOpen(false);
        setIsAISuggestionDialogOpen(false);
        setIsReflectionDialogOpen(false);
        setIsCreateHabitDialogOpen(false);

        if (previousUid_auth_effect) {
            console.log(`Clearing localStorage for previous user: ${previousUid_auth_effect}`);
            localStorage.removeItem(`${LS_KEY_PREFIX_HABITS}${previousUid_auth_effect}`);
            localStorage.removeItem(`${LS_KEY_PREFIX_BADGES}${previousUid_auth_effect}`);
            localStorage.removeItem(`${LS_KEY_PREFIX_POINTS}${previousUid_auth_effect}`);
        }
      }

      setAuthUser(currentUser);
      setIsLoadingAuth(false);
      previousAuthUserUidRef.current = currentUid_auth_effect;

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
        // Don't request permission automatically here, let user do it via settings
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
      if (habits.length > 0) setHabits([]);
      if (earnedBadges.length > 0) setEarnedBadges([]);
      if (totalPoints > 0) setTotalPoints(0);
      if (commonHabitSuggestions.length > 0) setCommonHabitSuggestions([]);
      if (commonSuggestionsFetched) setCommonSuggestionsFetched(false);
      setIsLoadingHabits(false);

      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
         console.log('No authUser after auth check (data loading effect), redirecting to login. Pathname:', window.location.pathname);
         router.push('/auth/login');
      }
      return;
    }

    setIsLoadingHabits(true);
    console.log(`Loading data for user: ${authUser.uid}`);

    const userHabitsKey_data_load = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    const storedHabits_data_load = localStorage.getItem(userHabitsKey_data_load);
    let parsedHabits_data_load: Habit[] = [];

    if (storedHabits_data_load) {
      try {
        const potentiallyUnsafeHabits: any[] = JSON.parse(storedHabits_data_load);
        parsedHabits_data_load = potentiallyUnsafeHabits.map((habit_data_migration_map: any): Habit => {
          // Robust Sanitization
          const habitId_safe = habit_data_migration_map.id || String(Date.now() + Math.random());
          const habitName_safe = habit_data_migration_map.name || 'Unnamed Habit';

          let daysOfWeek_migrated_data_load: WeekDay[] = [];
          if (Array.isArray(habit_data_migration_map.daysOfWeek)) {
            daysOfWeek_migrated_data_load = habit_data_migration_map.daysOfWeek.filter((d: any) => weekDays.includes(d as WeekDay));
            if (daysOfWeek_migrated_data_load.length !== habit_data_migration_map.daysOfWeek.length) {
                console.warn(`Sanitizing: Invalid daysOfWeek for habit '${habitName_safe}' (ID: ${habitId_safe})`, habit_data_migration_map.daysOfWeek);
            }
          } else if (habit_data_migration_map.frequency) { // Migration from old frequency
            const freqLower_migrated_data_load = habit_data_migration_map.frequency.toLowerCase();
            if (freqLower_migrated_data_load === 'daily') daysOfWeek_migrated_data_load = [...weekDays];
            else {
              const dayMap_migrated_data_load: { [key: string]: WeekDay } = {
                'sun': 'Sun', 'sunday': 'Sun', 'mon': 'Mon', 'monday': 'Mon',
                'tue': 'Tue', 'tuesday': 'Tue', 'wed': 'Wed', 'wednesday': 'Wed',
                'thu': 'Thu', 'thursday': 'Thu', 'fri': 'Fri', 'friday': 'Fri',
                'sat': 'Sat', 'saturday': 'Sat',
              };
              daysOfWeek_migrated_data_load = freqLower_migrated_data_load.split(/[\s,]+/).map((d_str_data_load: string) => dayMap_migrated_data_load[d_str_data_load.trim() as keyof typeof dayMap_migrated_data_load]).filter(Boolean) as WeekDay[];
            }
          }

          let migratedDurationHours_val_data_load: number | undefined = typeof habit_data_migration_map.durationHours === 'number' ? habit_data_migration_map.durationHours : undefined;
          let migratedDurationMinutes_val_data_load: number | undefined = typeof habit_data_migration_map.durationMinutes === 'number' ? habit_data_migration_map.durationMinutes : undefined;

          if (habit_data_migration_map.duration && typeof habit_data_migration_map.duration === 'string' && migratedDurationHours_val_data_load === undefined && migratedDurationMinutes_val_data_load === undefined) {
            const durationStr_migrated_data_load = habit_data_migration_map.duration.toLowerCase();
            const hourMatch_migrated_data_load = durationStr_migrated_data_load.match(/(\d+)\s*hour/);
            const minMatch_migrated_data_load = durationStr_migrated_data_load.match(/(\d+)\s*min/);
            if (hourMatch_migrated_data_load) migratedDurationHours_val_data_load = parseInt(hourMatch_migrated_data_load[1]);
            if (minMatch_migrated_data_load) migratedDurationMinutes_val_data_load = parseInt(minMatch_migrated_data_load[1]);
            if (!hourMatch_migrated_data_load && !minMatch_migrated_data_load && /^\d+$/.test(durationStr_migrated_data_load)) {
                const numVal_migrated_data_load = parseInt(durationStr_migrated_data_load);
                if (numVal_migrated_data_load <= 120) migratedDurationMinutes_val_data_load = numVal_migrated_data_load;
            }
          }

          let migratedSpecificTime_val_data_load = habit_data_migration_map.specificTime || undefined;
          if (migratedSpecificTime_val_data_load && typeof migratedSpecificTime_val_data_load === 'string') {
              if (/\d{1,2}:\d{2}\s*(am|pm)/i.test(migratedSpecificTime_val_data_load)) {
                try {
                  const [timePart_migrated_data_load, modifierPart_migrated_data_load] = migratedSpecificTime_val_data_load.split(/\s+/);
                  const [hoursStr_migrated_data_load, minutesStr_migrated_data_load] = timePart_migrated_data_load.split(':');
                  let hours_migrated_data_load = parseInt(hoursStr_migrated_data_load, 10);
                  const minutes_migrated_data_load = parseInt(minutesStr_migrated_data_load, 10);
                  const modifier_migrated_data_load = modifierPart_migrated_data_load ? modifierPart_migrated_data_load.toLowerCase() : '';
                  if (modifier_migrated_data_load === 'pm' && hours_migrated_data_load < 12) hours_migrated_data_load += 12;
                  if (modifier_migrated_data_load === 'am' && hours_migrated_data_load === 12) hours_migrated_data_load = 0;
                  migratedSpecificTime_val_data_load = `${String(hours_migrated_data_load).padStart(2, '0')}:${String(minutes_migrated_data_load).padStart(2, '0')}`;
                } catch (e_time_parse_data_load) { console.warn("Error parsing 12hr time during migration for habit:", habitName_safe, e_time_parse_data_load); migratedSpecificTime_val_data_load = undefined; }
              } else if (/^\d{1,2}:\d{2}$/.test(migratedSpecificTime_val_data_load)) {
                 const [hours_num_migrated_data_load, minutes_num_migrated_data_load] = migratedSpecificTime_val_data_load.split(':').map(Number);
                 migratedSpecificTime_val_data_load = `${String(hours_num_migrated_data_load).padStart(2, '0')}:${String(minutes_num_migrated_data_load).padStart(2, '0')}`;
              } else if (migratedSpecificTime_val_data_load.toLowerCase() === 'anytime' || migratedSpecificTime_val_data_load.toLowerCase() === 'flexible') {
                migratedSpecificTime_val_data_load = undefined;
              }
          } else {
             migratedSpecificTime_val_data_load = undefined;
          }

          const migratedCompletionLog_arr_data_load: HabitCompletionLogEntry[] = (habit_data_migration_map.completionLog || (habit_data_migration_map.completedDates
              ? habit_data_migration_map.completedDates.map((d_log_data_load: any) => ({ date: typeof d_log_data_load === 'string' && d_log_data_load.match(/^\d{4}-\d{2}-\d{2}$/) ? d_log_data_load : '1970-01-01', time: 'N/A', note: undefined, status: 'completed' }))
              : [])).filter((log_item_migrated_data_load: any) => {
                if (typeof log_item_migrated_data_load.date !== 'string' || !log_item_migrated_data_load.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  console.warn(`Sanitizing: Filtering out completionLog entry with invalid date for habit '${habitName_safe}' (ID: ${habitId_safe}):`, log_item_migrated_data_load);
                  return false;
                }
                return true;
              }).map((log_item_migrated_data_load: any) => {
                  let status_safe = log_item_migrated_data_load.status || 'completed';
                  if (!['completed', 'pending_makeup', 'skipped'].includes(status_safe)) {
                      console.warn(`Sanitizing: Invalid status '${status_safe}' in log for habit '${habitName_safe}'. Defaulting to 'completed'.`, log_item_migrated_data_load);
                      status_safe = 'completed';
                  }
                  return {
                    date: log_item_migrated_data_load.date,
                    time: log_item_migrated_data_load.time || 'N/A',
                    note: log_item_migrated_data_load.note || undefined,
                    status: status_safe as 'completed' | 'pending_makeup' | 'skipped',
                    originalMissedDate: (typeof log_item_migrated_data_load.originalMissedDate === 'string' && log_item_migrated_data_load.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/)) ? log_item_migrated_data_load.originalMissedDate : undefined,
                  };
              });

          return {
            id: habitId_safe,
            name: habitName_safe,
            description: habit_data_migration_map.description || undefined,
            category: habit_data_migration_map.category && HABIT_CATEGORIES.includes(habit_data_migration_map.category as HabitCategory) ? habit_data_migration_map.category : 'Other',
            daysOfWeek: daysOfWeek_migrated_data_load,
            optimalTiming: habit_data_migration_map.optimalTiming || undefined,
            durationHours: migratedDurationHours_val_data_load,
            durationMinutes: migratedDurationMinutes_val_data_load,
            specificTime: migratedSpecificTime_val_data_load,
            completionLog: migratedCompletionLog_arr_data_load,
            reminderEnabled: habit_data_migration_map.reminderEnabled === undefined ? false : !!habit_data_migration_map.reminderEnabled,
          };
        });
        setHabits(parsedHabits_data_load);
      } catch (error_data_load) {
        console.error(`Failed to parse/sanitize habits from localStorage key ${userHabitsKey_data_load}:`, error_data_load);
        setHabits([]); // Set to empty on error to prevent bad data propagation
      }
    } else {
        console.log(`No habits found in localStorage for user ${authUser.uid}`);
        setHabits([]);
    }

    if (authUser && parsedHabits_data_load.length === 0 && !commonSuggestionsFetched) {
      console.log(`Fetching common habit suggestions for new user ${authUser.uid}`);
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
    } else if (parsedHabits_data_load.length > 0) {
        console.log("User has existing habits, not fetching common suggestions.");
        if (commonHabitSuggestions.length > 0) setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(true);
    }


    const userBadgesKey_data_load = `${LS_KEY_PREFIX_BADGES}${authUser.uid}`;
    const storedBadges_data_load = localStorage.getItem(userBadgesKey_data_load);
    if (storedBadges_data_load) {
      try {
        setEarnedBadges(JSON.parse(storedBadges_data_load));
      } catch (error_data_load_badge) {
        console.error(`Failed to parse badges from localStorage key ${userBadgesKey_data_load}:`, error_data_load_badge);
        setEarnedBadges([]);
      }
    } else {
        setEarnedBadges([]);
    }

    const userPointsKey_data_load = `${LS_KEY_PREFIX_POINTS}${authUser.uid}`;
    const storedPoints_data_load = localStorage.getItem(userPointsKey_data_load);
    if (storedPoints_data_load) {
      try {
        setTotalPoints(parseInt(storedPoints_data_load, 10));
      } catch (error_data_load_points) {
        console.error(`Failed to parse totalPoints from localStorage key ${userPointsKey_data_load}:`, error_data_load_points);
        setTotalPoints(0);
      }
    } else {
        setTotalPoints(0);
    }
    setIsLoadingHabits(false);
    console.log(`Data loading complete for user ${authUser.uid}. Habits loaded: ${parsedHabits_data_load.length}`);
  }, [authUser, isLoadingAuth, router]);

  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
    const userHabitsKey_data_save = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    localStorage.setItem(userHabitsKey_data_save, JSON.stringify(habits));

    const newlyEarned_data_save = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarned_data_save.length > 0) {
      const updatedBadges_data_save = [...earnedBadges];
      newlyEarned_data_save.forEach(async newBadge_data_save => {
        if (!earnedBadges.some(eb_data_save => eb_data_save.id === newBadge_data_save.id)) {
            updatedBadges_data_save.push(newBadge_data_save);
            console.log(`New Badge Unlocked for user ${authUser.uid}: ${newBadge_data_save.name} - ${newBadge_data_save.description}`);
            if (newBadge_data_save.id === THREE_DAY_SQL_STREAK_BADGE_ID) {
              try {
                const sqlTipResult_data_save = await getSqlTip();
                console.log(`💡 Bonus SQL Tip Unlocked for ${authUser.uid}: ${sqlTipResult_data_save.tip}`);
              } catch (tipError_data_save) {
                console.error("Failed to fetch SQL tip:", tipError_data_save);
              }
            }
        }
      });
      setEarnedBadges(updatedBadges_data_save);
    }
  }, [habits, earnedBadges, authUser, isLoadingAuth, isLoadingHabits]);

  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
    const userBadgesKey_badge_save = `${LS_KEY_PREFIX_BADGES}${authUser.uid}`;
    localStorage.setItem(userBadgesKey_badge_save, JSON.stringify(earnedBadges));
  }, [earnedBadges, authUser, isLoadingAuth, isLoadingHabits]);

  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
    const userPointsKey_points_save = `${LS_KEY_PREFIX_POINTS}${authUser.uid}`;
    localStorage.setItem(userPointsKey_points_save, totalPoints.toString());
  }, [totalPoints, authUser, isLoadingAuth, isLoadingHabits]);

  useEffect(() => {
    reminderTimeouts.current.forEach(clearTimeout);
    reminderTimeouts.current = [];

    if (notificationPermission === 'granted' && authUser) {
      console.log(`Checking habits for reminders for user ${authUser.uid}...`);
      habits.forEach(habit_for_reminder_effect => {
        if (habit_for_reminder_effect.reminderEnabled) {
          let reminderDateTime_effect: Date | null = null;
          const now_effect = new Date();

          if (habit_for_reminder_effect.specificTime) {
            try {
              const [hours_effect, minutes_effect] = habit_for_reminder_effect.specificTime.split(':').map(Number);
              if (isNaN(hours_effect) || isNaN(minutes_effect)) throw new Error("Invalid time format");
              let specificEventTime_effect = new Date(now_effect.getFullYear(), now_effect.getMonth(), now_effect.getDate(), hours_effect, minutes_effect, 0, 0);
              reminderDateTime_effect = new Date(specificEventTime_effect.getTime() - 30 * 60 * 1000);
            } catch (e_effect) {
              console.error(`Error parsing specificTime "${habit_for_reminder_effect.specificTime}" for habit "${habit_for_reminder_effect.name}"`, e_effect);
            }
          } else {
            let baseHour_effect = 10;
            if (habit_for_reminder_effect.optimalTiming?.toLowerCase().includes('morning')) baseHour_effect = 9;
            else if (habit_for_reminder_effect.optimalTiming?.toLowerCase().includes('afternoon')) baseHour_effect = 13;
            else if (habit_for_reminder_effect.optimalTiming?.toLowerCase().includes('evening')) baseHour_effect = 18;
            reminderDateTime_effect = new Date(now_effect.getFullYear(), now_effect.getMonth(), now_effect.getDate(), baseHour_effect, 0, 0, 0);
          }

          if (reminderDateTime_effect && reminderDateTime_effect > now_effect) {
            const delay_effect = reminderDateTime_effect.getTime() - now_effect.getTime();
            console.log(`Reminder for "${habit_for_reminder_effect.name}" would be scheduled at: ${reminderDateTime_effect.toLocaleString()} (in ${Math.round(delay_effect/60000)} mins)`);
          }
        }
      });
    }
    return () => {
      reminderTimeouts.current.forEach(clearTimeout);
      reminderTimeouts.current = [];
    };
  }, [habits, notificationPermission, authUser]);


  const handleSaveHabit = (habitData_save: CreateHabitFormData & { id?: string }) => {
    if (editingHabit && habitData_save.id) {
      setHabits(prevHabits_save =>
        prevHabits_save.map(h_edit_save =>
          h_edit_save.id === habitData_save.id
            ? {
                ...h_edit_save,
                name: habitData_save.name,
                description: habitData_save.description,
                category: habitData_save.category || 'Other',
                daysOfWeek: habitData_save.daysOfWeek,
                optimalTiming: habitData_save.optimalTiming,
                durationHours: habitData_save.durationHours === null ? undefined : habitData_save.durationHours,
                durationMinutes: habitData_save.durationMinutes === null ? undefined : habitData_save.durationMinutes,
                specificTime: habitData_save.specificTime,
              }
            : h_edit_save
        )
      );
      console.log(`Habit Updated for user ${authUser?.uid}: ${habitData_save.name}`);
    } else {
      const newHabit_save: Habit = {
        id: String(Date.now() + Math.random()),
        name: habitData_save.name,
        description: habitData_save.description,
        category: habitData_save.category || 'Other',
        daysOfWeek: habitData_save.daysOfWeek,
        optimalTiming: habitData_save.optimalTiming,
        durationHours: habitData_save.durationHours === null ? undefined : habitData_save.durationHours,
        durationMinutes: habitData_save.durationMinutes === null ? undefined : habitData_save.durationMinutes,
        specificTime: habitData_save.specificTime,
        completionLog: [],
        reminderEnabled: false,
      };
      setHabits(prevHabits_save_add => [...prevHabits_save_add, newHabit_save]);
      console.log(`Habit Added for user ${authUser?.uid}: ${newHabit_save.name}`);
    }
    setIsCreateHabitDialogOpen(false);
    setInitialFormDataForDialog(null);
    setEditingHabit(null);
  };

  const handleOpenEditDialog = (habitToEdit_open_edit: Habit) => {
    setEditingHabit(habitToEdit_open_edit);
    setInitialFormDataForDialog({
      id: habitToEdit_open_edit.id,
      name: habitToEdit_open_edit.name,
      description: habitToEdit_open_edit.description || '',
      category: habitToEdit_open_edit.category || 'Other',
      daysOfWeek: habitToEdit_open_edit.daysOfWeek,
      optimalTiming: habitToEdit_open_edit.optimalTiming || '',
      durationHours: habitToEdit_open_edit.durationHours === undefined ? null : habitToEdit_open_edit.durationHours,
      durationMinutes: habitToEdit_open_edit.durationMinutes === undefined ? null : habitToEdit_open_edit.durationMinutes,
      specificTime: habitToEdit_open_edit.specificTime || '',
    });
    setIsCreateHabitDialogOpen(true);
  };

  const handleToggleComplete = async (habitId_toggle_complete: string, date_toggle_complete: string, completed_toggle_complete: boolean) => {
    let habitNameForQuote_toggle_complete: string | undefined = undefined;
    let pointsChange_toggle_complete = 0;
    let justCompleted_toggle_complete = false;

    setHabits((prevHabits_toggle_complete) =>
      prevHabits_toggle_complete.map((habit_item_for_toggle_map) => {
        if (habit_item_for_toggle_map.id === habitId_toggle_complete) {
          habitNameForQuote_toggle_complete = habit_item_for_toggle_map.name;
          let newCompletionLog_for_toggle_map = [...habit_item_for_toggle_map.completionLog];
          const existingLogIndex_for_toggle_map = newCompletionLog_for_toggle_map.findIndex(log_entry_for_toggle_map => log_entry_for_toggle_map.date === date_toggle_complete);
          const currentTime_for_toggle_map = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          if (completed_toggle_complete) {
            if (existingLogIndex_for_toggle_map > -1) {
              const existingLog_item_for_toggle_map = newCompletionLog_for_toggle_map[existingLogIndex_for_toggle_map];
              if (existingLog_item_for_toggle_map.status !== 'completed') {
                pointsChange_toggle_complete = POINTS_PER_COMPLETION;
                justCompleted_toggle_complete = true;
              }
              newCompletionLog_for_toggle_map[existingLogIndex_for_toggle_map] = { ...existingLog_item_for_toggle_map, status: 'completed', time: currentTime_for_toggle_map };
            } else {
              pointsChange_toggle_complete = POINTS_PER_COMPLETION;
              justCompleted_toggle_complete = true;
              newCompletionLog_for_toggle_map.push({ date: date_toggle_complete, time: currentTime_for_toggle_map, status: 'completed', note: undefined });
            }
          } else { // Un-completing
            if (existingLogIndex_for_toggle_map > -1) {
              const logEntry_item_for_toggle_map = newCompletionLog_for_toggle_map[existingLogIndex_for_toggle_map];
              if (logEntry_item_for_toggle_map.status === 'completed') { // Only deduct points if it was actually completed
                 pointsChange_toggle_complete = -POINTS_PER_COMPLETION;
              }
              // If it was a completed makeup task, revert to pending_makeup
              if (logEntry_item_for_toggle_map.status === 'completed' && logEntry_item_for_toggle_map.originalMissedDate) {
                newCompletionLog_for_toggle_map[existingLogIndex_for_toggle_map] = { ...logEntry_item_for_toggle_map, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry_item_for_toggle_map.note) { // If there's a note, mark as skipped instead of removing
                newCompletionLog_for_toggle_map[existingLogIndex_for_toggle_map] = { ...logEntry_item_for_toggle_map, status: 'skipped', time: 'N/A' };
              }
              else { // Otherwise, remove the log if it has no note and wasn't a makeup
                newCompletionLog_for_toggle_map.splice(existingLogIndex_for_toggle_map, 1);
              }
            }
          }
          return { ...habit_item_for_toggle_map, completionLog: newCompletionLog_for_toggle_map.sort((a_log_sort, b_log_sort) => b_log_sort.date.localeCompare(a_log_sort.date)) };
        }
        return habit_item_for_toggle_map;
      })
    );

    if (justCompleted_toggle_complete && habitNameForQuote_toggle_complete) {
      try {
        const quoteResult_toggle_complete = await getMotivationalQuote({ habitName: habitNameForQuote_toggle_complete });
        console.log(`Motivational Quote for user ${authUser?.uid}: ${quoteResult_toggle_complete.quote}`);
      } catch (error_toggle_complete) {
        console.error("Failed to fetch motivational quote:", error_toggle_complete);
        console.log(`Motivational Quote for user ${authUser?.uid}: Well Done! You're making progress!`);
      }
    }

    if (pointsChange_toggle_complete !== 0) {
      setTotalPoints(prevPoints_toggle_complete => Math.max(0, prevPoints_toggle_complete + pointsChange_toggle_complete));
    }
  };

  const handleToggleReminder = (habitId_toggle_reminder: string, currentReminderState_toggle_reminder: boolean) => {
    setHabits(prevHabits_toggle_reminder =>
      prevHabits_toggle_reminder.map(h_reminder_map =>
        h_reminder_map.id === habitId_toggle_reminder ? { ...h_reminder_map, reminderEnabled: !currentReminderState_toggle_reminder } : h_reminder_map
      )
    );
    const habit_for_reminder_toggle_find = habits.find(h_find_reminder => h_find_reminder.id === habitId_toggle_reminder);
    console.log(`Reminder for habit "${habit_for_reminder_toggle_find?.name}" for user ${authUser?.uid} ${!currentReminderState_toggle_reminder ? 'enabled' : 'disabled'}`);
    if (!currentReminderState_toggle_reminder && notificationPermission !== 'granted') {
       console.log('Please enable notifications in your browser settings or allow permission when prompted to receive reminders.');
    }
  };


  const handleOpenAISuggestionDialog = async (habit_for_ai_open: Habit) => {
    setSelectedHabitForAISuggestion(habit_for_ai_open);
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habit_for_ai_open.id, suggestionText: '', isLoading: true });

    try {
      const completionEntries_for_ai_open = habit_for_ai_open.completionLog.map(log_for_ai_open => {
        let entry_for_ai_open = `${log_for_ai_open.date} at ${log_for_ai_open.time || 'N/A'}`;
        if (log_for_ai_open.status === 'skipped') entry_for_ai_open += ` (Skipped)`;
        else if (log_for_ai_open.status === 'pending_makeup') entry_for_ai_open += ` (Makeup Pending for ${log_for_ai_open.originalMissedDate})`;
        else if (log_for_ai_open.status === 'completed' || log_for_ai_open.status === undefined) entry_for_ai_open += ` (Completed)`;

        if (log_for_ai_open.note && log_for_ai_open.note.trim() !== "") entry_for_ai_open += ` (Note: ${log_for_ai_open.note.trim()})`;
        return entry_for_ai_open;
      });
      const trackingData_for_ai_open = `Completions & Status: ${completionEntries_for_ai_open.join('; ') || 'None yet'}.`;

      const inputForAI_call_open = {
        habitName: habit_for_ai_open.name,
        habitDescription: habit_for_ai_open.description,
        daysOfWeek: habit_for_ai_open.daysOfWeek,
        optimalTiming: habit_for_ai_open.optimalTiming,
        durationHours: habit_for_ai_open.durationHours,
        durationMinutes: habit_for_ai_open.durationMinutes,
        specificTime: habit_for_ai_open.specificTime,
        trackingData: trackingData_for_ai_open,
      };

      const result_from_ai_open = await getHabitSuggestion(inputForAI_call_open);
      setAISuggestion({ habitId: habit_for_ai_open.id, suggestionText: result_from_ai_open.suggestion, isLoading: false });
    } catch (error_fetching_ai_open) {
      console.error("Error fetching AI suggestion:", error_fetching_ai_open);
      setAISuggestion({
        habitId: habit_for_ai_open.id,
        suggestionText: '',
        isLoading: false,
        error: 'Failed to get AI suggestion.'
      });
      console.error(`AI Suggestion Error for user ${authUser?.uid}: Could not fetch suggestion.`);
    }
  };

  const handleOpenReflectionDialog = (habitId_reflection_open: string, date_reflection_open: string, habitName_reflection_open: string) => {
    const habit_for_reflection_open = habits.find(h_ref_open => h_ref_open.id === habitId_reflection_open);
    const logEntry_for_reflection_open = habit_for_reflection_open?.completionLog.find(log_ref_open => log_ref_open.date === date_reflection_open);
    setReflectionDialogData({
      habitId: habitId_reflection_open,
      date: date_reflection_open,
      initialNote: logEntry_for_reflection_open?.note || '',
      habitName: habitName_reflection_open,
    });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (note_to_save_reflection: string) => {
    if (!reflectionDialogData) return;
    const { habitId: habitId_reflection_save, date: date_reflection_save } = reflectionDialogData;

    setHabits(prevHabits_reflection_save =>
      prevHabits_reflection_save.map(h_for_note_save_reflection => {
        if (h_for_note_save_reflection.id === habitId_reflection_save) {
          let logEntryExists_for_note_save_reflection = false;
          const newCompletionLog_for_note_save_reflection = h_for_note_save_reflection.completionLog.map(log_item_for_note_save_reflection => {
            if (log_item_for_note_save_reflection.date === date_reflection_save) {
              logEntryExists_for_note_save_reflection = true;
              return { ...log_item_for_note_save_reflection, note: note_to_save_reflection.trim() === "" ? undefined : note_to_save_reflection.trim() };
            }
            return log_item_for_note_save_reflection;
          });
          if (!logEntryExists_for_note_save_reflection) {
             const existingStatus_reflection_save = h_for_note_save_reflection.completionLog.find(l_note_reflection => l_note_reflection.date === date_reflection_save)?.status;
             newCompletionLog_for_note_save_reflection.push({
                date: date_reflection_save,
                time: 'N/A',
                note: note_to_save_reflection.trim() === "" ? undefined : note_to_save_reflection.trim(),
                status: existingStatus_reflection_save || 'skipped'
             });
             newCompletionLog_for_note_save_reflection.sort((a_sort_reflection,b_sort_reflection) => b_sort_reflection.date.localeCompare(a_sort_reflection.date));
          }
          return { ...h_for_note_save_reflection, completionLog: newCompletionLog_for_note_save_reflection };
        }
        return h_for_note_save_reflection;
      })
    );
    console.log(`Reflection Saved for user ${authUser?.uid} for habit ${reflectionDialogData.habitName} on ${date_reflection_save}`);
    setReflectionDialogData(null);
    setIsReflectionDialogOpen(false);
  };

  const handleOpenRescheduleDialog = (habit_to_reschedule_open: Habit, missedDate_for_reschedule_open: string) => {
    setRescheduleDialogData({ habit: habit_to_reschedule_open, missedDate: missedDate_for_reschedule_open });
  };

  const handleSaveRescheduledHabit = (habitId_rescheduled_save: string, originalMissedDate_rescheduled_save: string, newDate_rescheduled_save: string) => {
    setHabits(prevHabits_reschedule_save => prevHabits_reschedule_save.map(h_rescheduled_map_save => {
      if (h_rescheduled_map_save.id === habitId_rescheduled_save) {
        let newCompletionLog_rescheduled_save = [...h_rescheduled_map_save.completionLog];
        const existingMissedLogIndex_rescheduled_save = newCompletionLog_rescheduled_save.findIndex(log_rescheduled_find_save => log_rescheduled_find_save.date === originalMissedDate_rescheduled_save);

        if(existingMissedLogIndex_rescheduled_save > -1) {
            if (newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].status !== 'completed') {
                newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].status = 'skipped';
                newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].time = 'N/A';
            }
        } else {
            newCompletionLog_rescheduled_save.push({
                date: originalMissedDate_rescheduled_save,
                time: 'N/A',
                status: 'skipped'
            });
        }

        newCompletionLog_rescheduled_save.push({
          date: newDate_rescheduled_save,
          time: 'N/A',
          status: 'pending_makeup',
          originalMissedDate: originalMissedDate_rescheduled_save,
        });
        newCompletionLog_rescheduled_save.sort((a_sort_res_save,b_sort_res_save) => b_sort_res_save.date.localeCompare(a_sort_res_save.date));
        return { ...h_rescheduled_map_save, completionLog: newCompletionLog_rescheduled_save };
      }
      return h_rescheduled_map_save;
    }));
    const habitName_rescheduled_save = habits.find(h_find_name_res_save => h_find_name_res_save.id === habitId_rescheduled_save)?.name || "Habit";
    console.log(`Habit "${habitName_rescheduled_save}" for user ${authUser?.uid} missed on ${originalMissedDate_rescheduled_save} rescheduled to ${newDate_rescheduled_save}.`);
  };

  const handleSaveMarkAsSkipped = (habitId_skipped_save: string, missedDate_skipped_save: string) => {
     setHabits(prevHabits_skipped_save => prevHabits_skipped_save.map(h_skipped_map_save => {
      if (h_skipped_map_save.id === habitId_skipped_save) {
        let newCompletionLog_skipped_save = [...h_skipped_map_save.completionLog];
        const existingLogIndex_skipped_save = newCompletionLog_skipped_save.findIndex(log_skipped_find_save => log_skipped_find_save.date === missedDate_skipped_save);
        if (existingLogIndex_skipped_save > -1) {
          newCompletionLog_skipped_save[existingLogIndex_skipped_save] = {
            ...newCompletionLog_skipped_save[existingLogIndex_skipped_save],
            status: 'skipped',
            time: 'N/A'
          };
        } else {
          newCompletionLog_skipped_save.push({ date: missedDate_skipped_save, time: 'N/A', status: 'skipped' });
        }
        newCompletionLog_skipped_save.sort((a_sort_skip_save,b_sort_skip_save) => b_sort_skip_save.date.localeCompare(a_sort_skip_save.date));
        return { ...h_skipped_map_save, completionLog: newCompletionLog_skipped_save };
      }
      return h_skipped_map_save;
    }));
    const habitName_skipped_save = habits.find(h_find_name_skip_save => h_find_name_skip_save.id === habitId_skipped_save)?.name || "Habit";
    console.log(`Habit "${habitName_skipped_save}" for user ${authUser?.uid} for ${missedDate_skipped_save} marked as skipped.`);
  };

  const handleRequestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission().then(permission_val_req => {
            setNotificationPermission(permission_val_req);
            if (permission_val_req === 'granted') {
                console.log('Notification permission granted.');
            } else {
                console.log('Notification permission denied or dismissed.');
            }
        });
    }
  };

  const habitsForSelectedCalendarDate = React.useMemo(() => {
    try {
      if (!selectedCalendarDate) return [];
      const dateStr_for_cal_dialog_display_memo = format(selectedCalendarDate, 'yyyy-MM-dd');
      const dayOfWeek_for_cal_dialog_display_memo = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

      return habits.filter(habit_item_for_cal_dialog_memo => {
        const isScheduled_for_cal_dialog_memo = habit_item_for_cal_dialog_memo.daysOfWeek.includes(dayOfWeek_for_cal_dialog_display_memo);
        const logEntry_for_cal_dialog_memo = habit_item_for_cal_dialog_memo.completionLog.find(log_cal_dialog_memo => log_cal_dialog_memo.date === dateStr_for_cal_dialog_display_memo);
        return isScheduled_for_cal_dialog_memo || logEntry_for_cal_dialog_memo;
      });
    } catch (error_memo) {
      console.error("Error in habitsForSelectedCalendarDate: ", error_memo);
      return [];
    }
  }, [selectedCalendarDate, habits]);

  // Ultra-minimal version of calendarDialogModifiers for diagnostics
  const calendarDialogModifiers = React.useMemo(() => {
    try {
      console.log("Recalculating calendarDialogModifiers. Habits:", habits, "Selected Date:", selectedCalendarDate);
      // Return a very simple structure to see if the hook itself or its dependencies are the issue
      return {
        completed: [] as Date[],
        missed: [] as Date[],
        scheduled: [] as Date[],
        makeup: [] as Date[],
        selected: selectedCalendarDate ? [selectedCalendarDate] : [],
      };
    } catch (error) {
        console.error("CRITICAL ERROR in calendarDialogModifiers calculation:", error);
        return {
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
      action: () => { /* Action handled by sheet content */ }
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

  const handleCustomizeSuggestedHabit = (suggestion_customize: SuggestedHabit) => {
    setEditingHabit(null);
    setInitialFormDataForDialog({
      name: suggestion_customize.name,
      category: suggestion_customize.category || 'Other',
      description: '', // Keep description empty for tile-based suggestions
      daysOfWeek: [], // User will define days
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
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 p-2 sm:p-4">
      <div
        className="bg-background text-foreground shadow-xl rounded-xl flex flex-col w-full"
        style={{
          maxWidth: 'clamp(320px, 100%, 450px)',
          height: 'clamp(700px, 90vh, 850px)',
          overflow: 'hidden',
        }}
      >
        <AppHeader onOpenCalendar={() => setIsCalendarDialogOpen(true)} />

        <ScrollArea className="flex-grow">
          <main className="px-3 sm:px-4 py-4">

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
                      {commonHabitSuggestions.map((suggestion_item_display, index_sug_display) => (
                        <Button
                          key={index_sug_display}
                          variant="outline"
                          className="p-3 h-auto flex flex-col items-center justify-center space-y-1 min-w-[100px] text-center shadow-sm hover:shadow-md transition-shadow"
                          onClick={() => handleCustomizeSuggestedHabit(suggestion_item_display)}
                        >
                          <span className="font-medium text-sm">{suggestion_item_display.name}</span>
                          {suggestion_item_display.category && <span className="text-xs text-primary/80">{suggestion_item_display.category}</span>}
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
              onOpenEditDialog={handleOpenEditDialog}
            />
          </main>
          <footer className="py-3 text-center text-xs text-muted-foreground border-t mt-auto">
            <p>&copy; {new Date().getFullYear()} Habitual.</p>
          </footer>
        </ScrollArea>


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

      <Button
        className="fixed bottom-[calc(4rem+1.5rem)] right-6 sm:right-10 h-14 w-14 p-0 rounded-full shadow-xl z-30 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
        onClick={() => {
          setEditingHabit(null);
          setInitialFormDataForDialog(null);
          setIsCreateHabitDialogOpen(true);
         }}
        aria-label="Add New Habit"
      >
        <Plus className="h-7 w-7" />
      </Button>

      <CreateHabitDialog
        isOpen={isCreateHabitDialogOpen}
        onClose={() => {
            setIsCreateHabitDialogOpen(false);
            setInitialFormDataForDialog(null);
            setEditingHabit(null);
        }}
        onSaveHabit={handleSaveHabit}
        initialData={initialFormDataForDialog}
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
          onReschedule={(newDate_reschedule_cb_page) => {
            handleSaveRescheduledHabit(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate, newDate_reschedule_cb_page);
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

      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-full max-w-[calc(100%-2rem)]">
            <DialogHeader>
                <DialogTitle className="flex items-center text-xl">
                    <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                    Habit Calendar
                </DialogTitle>
                 <DialogDescription>
                    View your habit activity on the calendar.
                </DialogDescription>
            </DialogHeader>
            <div className="py-2 max-h-[65vh] overflow-y-auto pr-2 flex flex-col items-center">
                 <Calendar
                    mode="single"
                    selected={selectedCalendarDate}
                    onSelect={setSelectedCalendarDate}
                    modifiers={calendarDialogModifiers} // Using the ultra-minimal version for diagnostics
                    modifiersStyles={calendarDialogModifierStyles}
                    className="rounded-md border p-0 sm:p-2"
                    month={selectedCalendarDate || new Date()}
                    onMonthChange={setSelectedCalendarDate}
                 />
                {selectedCalendarDate && (
                <div className="mt-4 w-full">
                    <h3 className="text-md font-semibold mb-2 text-center">
                    Habits for {format(selectedCalendarDate, 'MMMM d, yyyy')}
                    </h3>
                    {habitsForSelectedCalendarDate.length > 0 ? (
                    <ul className="space-y-1.5 text-sm max-h-40 overflow-y-auto">
                        {habitsForSelectedCalendarDate.map(habit_item_for_cal_date_display_page => {
                        const logEntryForCalDate_display_page = habit_item_for_cal_date_display_page.completionLog.find(log_cal_display_page => log_cal_display_page.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                        const dayOfWeekForSelectedDate_display_page = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                        const isScheduledOnSelectedDate_display_page = habit_item_for_cal_date_display_page.daysOfWeek.includes(dayOfWeekForSelectedDate_display_page);
                        let statusTextForCalDate_display_page = "Scheduled";
                        let StatusIconForCalDate_display_page = CircleIcon;
                        let iconColorForCalDate_display_page = "text-orange-500"; // Default to orange for scheduled

                        if (logEntryForCalDate_display_page?.status === 'completed') {
                            statusTextForCalDate_display_page = `Completed at ${logEntryForCalDate_display_page.time || ''}`;
                            StatusIconForCalDate_display_page = CheckCircle2;
                            iconColorForCalDate_display_page = "text-accent";
                        } else if (logEntryForCalDate_display_page?.status === 'pending_makeup') {
                            statusTextForCalDate_display_page = `Makeup for ${logEntryForCalDate_display_page.originalMissedDate}`;
                            StatusIconForCalDate_display_page = MakeupIcon;
                            iconColorForCalDate_display_page = "text-blue-500";
                        } else if (logEntryForCalDate_display_page?.status === 'skipped') {
                            statusTextForCalDate_display_page = "Skipped";
                            StatusIconForCalDate_display_page = XCircle;
                            iconColorForCalDate_display_page = "text-muted-foreground";
                        } else if (isScheduledOnSelectedDate_display_page && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !logEntryForCalDate_display_page) {
                            statusTextForCalDate_display_page = "Missed";
                            StatusIconForCalDate_display_page = XCircle;
                            iconColorForCalDate_display_page = "text-destructive";
                        } else if (!isScheduledOnSelectedDate_display_page && !logEntryForCalDate_display_page) {
                           // If not scheduled and no log entry, don't display it in this "Habits for {date}" list
                           return null;
                        }
                        
                        return (
                            <li key={habit_item_for_cal_date_display_page.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                            <span className="font-medium truncate pr-2">{habit_item_for_cal_date_display_page.name}</span>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <StatusIconForCalDate_display_page className={cn("h-3.5 w-3.5", iconColorForCalDate_display_page)} />
                                <span>{statusTextForCalDate_display_page}</span>
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
              earnedBadges.map((badge_item_display_page) => (
                <div key={badge_item_display_page.id} className="p-3 border rounded-md bg-card shadow-sm">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">{badge_item_display_page.icon || "🏆"}</span>
                    <h4 className="font-semibold text-primary">{badge_item_display_page.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{badge_item_display_page.description}</p>
                  <p className="text-xs text-muted-foreground">Achieved: {format(new Date(badge_item_display_page.dateAchieved), "MMMM d, yyyy")}</p>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsAchievementsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isSettingsSheetOpen} onOpenChange={setIsSettingsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader className="mb-4">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Navigate to different sections of the app.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2">
            {sheetMenuItems.map((item_menu_sheet_page) => (
              item_menu_sheet_page.href && item_menu_sheet_page.href === "/profile" ? (
                 <SheetClose asChild key={item_menu_sheet_page.label}>
                    <Link href={item_menu_sheet_page.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet_page.action} >
                            <item_menu_sheet_page.icon className="mr-3 h-5 w-5" />
                            {item_menu_sheet_page.label}
                        </Button>
                    </Link>
                 </SheetClose>
              ) : item_menu_sheet_page.href && item_menu_sheet_page.href !== "/profile" ? (
                <SheetClose asChild key={item_menu_sheet_page.label}>
                    <Link href={item_menu_sheet_page.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet_page.action}>
                        <item_menu_sheet_page.icon className="mr-3 h-5 w-5" />
                        {item_menu_sheet_page.label}
                        </Button>
                    </Link>
                </SheetClose>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base py-3"
                  onClick={() => {
                    item_menu_sheet_page.action();
                    if (item_menu_sheet_page.label !== 'Reminders' && 
                        item_menu_sheet_page.label !== 'Calendar' && 
                        item_menu_sheet_page.label !== 'Achievements') {
                        setIsSettingsSheetOpen(false);
                    }
                  }}
                  key={item_menu_sheet_page.label}
                >
                  <item_menu_sheet_page.icon className="mr-3 h-5 w-5" />
                  {item_menu_sheet_page.label}
                </Button>
              )
            ))}
          </div>
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

    