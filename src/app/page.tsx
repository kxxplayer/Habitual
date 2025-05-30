
"use client";

// ==========================================================================
// HABITUAL MAIN PAGE - REGENERATED (2025-05-20)
// This version is a clean regeneration based on all discussed features.
// Calendar dialog has basic styling for stability.
// Added "Mark All Today Done" feature.
// ==========================================================================

import * as React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
import DailyQuestDialog from '@/components/popups/DailyQuestDialog';


import type { Habit, AISuggestion as AISuggestionType, WeekDay, HabitCompletionLogEntry, HabitCategory, EarnedBadge, CreateHabitFormData, SuggestedHabit } from '@/types';
import { THREE_DAY_SQL_STREAK_BADGE_ID, HABIT_CATEGORIES, SEVEN_DAY_STREAK_BADGE_ID, THIRTY_DAY_STREAK_BADGE_ID, FIRST_HABIT_COMPLETED_BADGE_ID } from '@/types';

import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { getSqlTip } from '@/ai/flows/sql-tip-flow';
import { getMotivationalQuote } from '@/ai/flows/motivational-quote-flow';
import { getCommonHabitSuggestions } from '@/ai/flows/common-habit-suggestions-flow';

import { checkAndAwardBadges } from '@/lib/badgeUtils';
import { cn } from "@/lib/utils";

import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { DayPicker, DayModifiers } from 'react-day-picker';
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Dialog,
  DialogContent,
  DialogDescription as DialogCardDescription, // Renamed to avoid conflict
  DialogFooter,
  DialogHeader,
  DialogTitle as DialogCardTitle // Renamed to avoid conflict
} from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionUI,
  AlertDialogFooter as AlertDialogFooterUI,
  AlertDialogHeader as AlertDialogHeaderUI,
  AlertDialogTitle as AlertTitle,
} from '@/components/ui/alert-dialog';


import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Plus, LayoutDashboard, Home, Settings, StickyNote, CalendarDays, Award, Trophy, BookOpenText, UserCircle, BellRing, Loader2, Bell, Trash2, CheckCircle2, XCircle, Circle as CircleIcon, CalendarClock as MakeupIcon, MoreHorizontal, PlusCircle, Lightbulb, FilePenLine, Sparkles as SparklesIcon, ListChecks } from 'lucide-react';
import { format, parseISO, isSameDay, getDay, subDays, addDays as dateFnsAddDays, startOfWeek, endOfWeek, isWithinInterval, isPast as dateFnsIsPast, isToday as dateFnsIsToday, startOfDay } from 'date-fns';


const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const POINTS_PER_COMPLETION = 10;

const LS_KEY_PREFIX_HABITS = "habits_";
const LS_KEY_PREFIX_BADGES = "earnedBadges_";
const LS_KEY_PREFIX_POINTS = "totalPoints_";
const LS_KEY_PREFIX_DAILY_QUEST = "hasSeenDailyQuest_";

const HabitualPage: NextPage = () => {
  console.log("HabitualPage RENDER - Initializing page logic - REGENERATED VERSION (2025-05-20)");

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
  const [initialFormDataForDialog, setInitialFormDataForDialog] = React.useState<Partial<CreateHabitFormData> | null>(null);

  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = React.useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date());
  const [isDashboardDialogOpen, setIsDashboardDialogOpen] = React.useState(false);

  const [isAchievementsDialogOpen, setIsAchievementsDialogOpen] = React.useState(false);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = React.useState(false);
  const [earnedBadges, setEarnedBadges] = React.useState<EarnedBadge[]>([]);
  const [totalPoints, setTotalPoints] = React.useState<number>(0);

  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission | null>(null);
  const reminderTimeouts = React.useRef<NodeJS.Timeout[]>([]);

  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = React.useState(false);
  const [reflectionDialogData, setReflectionDialogData] = React.useState<{
    habitId: string;
    date: string; // YYYY-MM-DD
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

  const [isDeleteHabitConfirmOpen, setIsDeleteHabitConfirmOpen] = React.useState(false);
  const [habitToDelete, setHabitToDelete] = React.useState<{ id: string; name: string } | null>(null);

  const [isDailyQuestDialogOpen, setIsDailyQuestDialogOpen] = React.useState(false);

  const [todayString, setTodayString] = React.useState('');
  const [todayAbbr, setTodayAbbr] = React.useState<WeekDay | ''>('');
  const [allTodayTasksDone, setAllTodayTasksDone] = React.useState(false);


  React.useEffect(() => {
    const now = new Date();
    setTodayString(format(now, 'yyyy-MM-dd'));
    setTodayAbbr(dayIndexToWeekDayConstant[getDay(now)]);
  }, []);

  // Authentication State
  React.useEffect(() => {
    console.log("Auth effect running");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const previousUid = previousAuthUserUidRef.current;
      const currentUid = currentUser?.uid || null;
      console.log(`Auth state changed. Prev UID: ${previousUid}, Curr UID: ${currentUid}`);

      if (previousUid !== currentUid) {
        console.log("User identity changed. Clearing user-specific state and localStorage.");
        // Clear localStorage specific to the previous user
        if (previousUid && typeof window !== 'undefined') {
           localStorage.removeItem(`${LS_KEY_PREFIX_HABITS}${previousUid}`);
           localStorage.removeItem(`${LS_KEY_PREFIX_BADGES}${previousUid}`);
           localStorage.removeItem(`${LS_KEY_PREFIX_POINTS}${previousUid}`);
           localStorage.removeItem(`${LS_KEY_PREFIX_DAILY_QUEST}${previousUid}`);
           console.log(`Cleared localStorage for previous user: ${previousUid}`);
        } else if (!previousUid && currentUid && typeof window !== 'undefined') {
           // This means a user just logged in for the first time in this session,
           // and there was no "previous user" (anonymous session).
        }

        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(false);
        setEditingHabit(null);
        setInitialFormDataForDialog(null);
        setReflectionDialogData(null);
        setRescheduleDialogData(null);
        setHabitToDelete(null);
        setIsDeleteHabitConfirmOpen(false);
        setIsAISuggestionDialogOpen(false);
        setIsCalendarDialogOpen(false);
        setIsCreateHabitDialogOpen(false);
        setIsDailyQuestDialogOpen(false);
        setIsDashboardDialogOpen(false);
      }

      setAuthUser(currentUser);
      setIsLoadingAuth(false);
      previousAuthUserUidRef.current = currentUid;

      if (!currentUser && typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
        console.log('No current user, redirecting to login.');
        router.push('/auth/login');
      }
    });
    return () => {
      console.log("Unsubscribing from auth state changes");
      unsubscribe();
    };
  }, [router]);


  // Effect for Notification Permission
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


  // Load data from localStorage when authUser changes and auth is not loading
  React.useEffect(() => {
    if (isLoadingAuth) {
      console.log("Auth loading, skipping data load.");
      return;
    }
    if (!authUser) {
      console.log("No authenticated user, not loading data from localStorage.");
      if (habits.length > 0) setHabits([]);
      if (earnedBadges.length > 0) setEarnedBadges([]);
      if (totalPoints > 0) setTotalPoints(0);
      setIsLoadingHabits(false);
      return;
    }

    setIsLoadingHabits(true);
    const userUid = authUser.uid;
    console.log(`Loading data for user: ${userUid}`);

    const userHabitsKey = `${LS_KEY_PREFIX_HABITS}${userUid}`;
    const storedHabits = typeof window !== 'undefined' ? localStorage.getItem(userHabitsKey) : null;
    let parsedHabits: Habit[] = [];
    if (storedHabits) {
      try {
        const rawHabits: any[] = JSON.parse(storedHabits);
        parsedHabits = rawHabits.map((h: any): Habit => {
          const id_val = String(h.id || Date.now().toString() + Math.random().toString(36).substring(2, 7));
          const name_val = String(h.name || 'Unnamed Habit');
          const description_val = typeof h.description === 'string' ? h.description : undefined;
          const category_val = HABIT_CATEGORIES.includes(h.category as HabitCategory) ? h.category : 'Other';

          let daysOfWeek_val: WeekDay[] = Array.isArray(h.daysOfWeek) ? h.daysOfWeek.filter((d_val: any) => weekDays.includes(d_val as WeekDay)) : [];
          if (!Array.isArray(h.daysOfWeek) && typeof h.frequency === 'string') { // Migration from old 'frequency'
            const freqLower_val = h.frequency.toLowerCase();
            if (freqLower_val === 'daily') daysOfWeek_val = [...weekDays];
            else {
              const dayMap_val: { [key_val: string]: WeekDay } = {
                'sun': 'Sun', 'sunday': 'Sun', 'mon': 'Mon', 'monday': 'Mon',
                'tue': 'Tue', 'tuesday': 'Tue', 'wed': 'Wed', 'wednesday': 'Wed',
                'thu': 'Thu', 'thursday': 'Thu', 'fri': 'Fri', 'friday': 'Fri',
                'sat': 'Sat', 'saturday': 'Sat',
              };
              daysOfWeek_val = freqLower_val.split(/[\s,]+/).map((d_str: string) => dayMap_val[d_str.trim().toLowerCase() as keyof typeof dayMap_val]).filter(Boolean) as WeekDay[];
            }
          }


          const optimalTiming_val = typeof h.optimalTiming === 'string' ? h.optimalTiming : undefined;
          let migratedDurationHours_val: number | undefined = typeof h.durationHours === 'number' ? h.durationHours : undefined;
          let migratedDurationMinutes_val: number | undefined = typeof h.durationMinutes === 'number' ? h.durationMinutes : undefined;

          // Migration from old string 'duration'
          if (typeof h.duration === 'string' && migratedDurationHours_val === undefined && migratedDurationMinutes_val === undefined) {
            const durationStr_val = h.duration.toLowerCase();
            const hourMatch_val = durationStr_val.match(/(\d+)\s*h/);
            const minMatch_val = durationStr_val.match(/(\d+)\s*m/);
            if (hourMatch_val) migratedDurationHours_val = parseInt(hourMatch_val[1]);
            if (minMatch_val) migratedDurationMinutes_val = parseInt(minMatch_val[1]);
          }

          let migratedSpecificTime_val = typeof h.specificTime === 'string' ? h.specificTime : undefined;
          if (migratedSpecificTime_val && migratedSpecificTime_val.match(/^\d{1,2}:\d{2}\s*(am|pm)$/i)) {
            try {
              const [timePart_map, modifierPart_map] = migratedSpecificTime_val.split(/\s+/);
              let [hours_map_str, minutes_map_str] = timePart_map.split(':');
              let hours_map_val = parseInt(hours_map_str, 10);
              const minutes_map_val = parseInt(minutes_map_str, 10);
              if (modifierPart_map.toLowerCase() === 'pm' && hours_map_val < 12) hours_map_val += 12;
              if (modifierPart_map.toLowerCase() === 'am' && hours_map_val === 12) hours_map_val = 0;
              migratedSpecificTime_val = `${String(hours_map_val).padStart(2, '0')}:${String(minutes_map_val).padStart(2, '0')}`;
            } catch (e_map_time) { console.warn("Error parsing specificTime for migration", h.specificTime, e_map_time) }
          } else if (migratedSpecificTime_val && migratedSpecificTime_val.match(/^\d{1,2}:\d{2}$/)) { // Ensure HH:mm format
             const [hours_val_t, minutes_val_t] = migratedSpecificTime_val.split(':').map(Number);
             migratedSpecificTime_val = `${String(hours_val_t).padStart(2, '0')}:${String(minutes_val_t).padStart(2, '0')}`;
          }


          const migratedCompletionLog_val = (Array.isArray(h.completionLog) ? h.completionLog : (Array.isArray(h.completedDates) ? h.completedDates.map((d_map_log: string) => ({ date: d_map_log, time: 'N/A', note: undefined, status: 'completed' })) : []))
            .map((log_map_item: any): HabitCompletionLogEntry | null => {
              if (typeof log_map_item.date !== 'string' || !log_map_item.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.warn("Sanitizing: Invalid or missing date in log entry for habit id", id_val, log_map_item);
                return null;
              }
              const status_val = ['completed', 'pending_makeup', 'skipped'].includes(log_map_item.status) ? log_map_item.status : 'completed'; // Default old to completed
              const originalMissedDate_val = typeof log_map_item.originalMissedDate === 'string' && log_map_item.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? log_map_item.originalMissedDate : undefined;

              return {
                date: log_map_item.date,
                time: log_map_item.time || 'N/A',
                note: typeof log_map_item.note === 'string' ? log_map_item.note : undefined,
                status: status_val,
                originalMissedDate: originalMissedDate_val,
              };
            })
            .filter((log_item_filter): log_item_filter is HabitCompletionLogEntry => log_item_filter !== null)
            .sort((a_log_sort,b_log_sort) => b_log_sort.date.localeCompare(a_log_sort.date));

          const reminderEnabled_val = typeof h.reminderEnabled === 'boolean' ? h.reminderEnabled : false;

          return {
            id: id_val, name: name_val, description: description_val, category: category_val, daysOfWeek: daysOfWeek_val,
            optimalTiming: optimalTiming_val, durationHours: migratedDurationHours_val, durationMinutes: migratedDurationMinutes_val,
            specificTime: migratedSpecificTime_val, completionLog: migratedCompletionLog_val, reminderEnabled: reminderEnabled_val,
          };
        });
        setHabits(parsedHabits);
      } catch (e_parse_habits) {
        console.error(`Error parsing habits for user ${userUid} from localStorage:`, e_parse_habits);
        setHabits([]);
      }
    } else {
      setHabits([]); // No stored habits for this user
    }

    // Fetch common suggestions if this user has no habits and suggestions haven't been fetched yet for them
    if (authUser && parsedHabits.length === 0 && !commonSuggestionsFetched) {
      console.log(`Fetching common suggestions for new user ${userUid}`);
      setIsLoadingCommonSuggestions(true);
      getCommonHabitSuggestions({ count: 5 })
        .then(response => {
          if (response && Array.isArray(response.suggestions)) {
            setCommonHabitSuggestions(response.suggestions);
          } else {
            setCommonHabitSuggestions([]);
          }
        })
        .catch(err => {
          console.error("Failed to fetch common habit suggestions:", err);
          setCommonHabitSuggestions([]);
        })
        .finally(() => {
          setIsLoadingCommonSuggestions(false);
          setCommonSuggestionsFetched(true); // Mark as fetched for this user session
          const dailyQuestKey = `${LS_KEY_PREFIX_DAILY_QUEST}${userUid}`;
          const hasSeenDailyQuest = typeof window !== 'undefined' ? localStorage.getItem(dailyQuestKey) : null;
          if (!hasSeenDailyQuest) {
            setIsDailyQuestDialogOpen(true);
          }
        });
    } else if (parsedHabits.length > 0) {
      setCommonSuggestionsFetched(true); // User has habits, so mark as fetched
    }


    const userBadgesKey = `${LS_KEY_PREFIX_BADGES}${userUid}`;
    const storedBadges = typeof window !== 'undefined' ? localStorage.getItem(userBadgesKey) : null;
    if (storedBadges) { try { setEarnedBadges(JSON.parse(storedBadges)); } catch (e) { console.error("Error parsing badges:", e); setEarnedBadges([]); } }
    else { setEarnedBadges([]); }

    const userPointsKey = `${LS_KEY_PREFIX_POINTS}${userUid}`;
    const storedPoints = typeof window !== 'undefined' ? localStorage.getItem(userPointsKey) : null;
    if (storedPoints) { try { setTotalPoints(parseInt(storedPoints, 10) || 0); } catch (e) { console.error("Error parsing points:", e); setTotalPoints(0); } }
    else { setTotalPoints(0); }

    setIsLoadingHabits(false);
    console.log(`Data loading complete for user ${userUid}. Habits: ${parsedHabits.length}`);

  }, [authUser, isLoadingAuth]);


  // Save habits to localStorage & check for badges
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userHabitsKey = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    localStorage.setItem(userHabitsKey, JSON.stringify(habits));
    console.log(`Saved habits for user ${authUser.uid} to localStorage.`);

    const newlyEarned = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarned.length > 0) {
      const updatedBadges = [...earnedBadges];
      let newBadgeAwarded = false;
      newlyEarned.forEach(async newBadge => {
        if (!earnedBadges.some(eb => eb.id === newBadge.id)) {
            updatedBadges.push(newBadge);
            newBadgeAwarded = true;
            console.log(`New Badge Unlocked: ${newBadge.name} - ${newBadge.description}`);
            if (newBadge.id === THREE_DAY_SQL_STREAK_BADGE_ID) {
              try {
                const sqlTipResult = await getSqlTip();
                console.log(`Bonus SQL Tip Unlocked: ${sqlTipResult.tip}`);
              } catch (tipError) {
                console.error("Failed to fetch SQL tip:", tipError);
              }
            }
        }
      });
      if (newBadgeAwarded) {
        setEarnedBadges(updatedBadges);
      }
    }
  }, [habits, authUser, isLoadingAuth, isLoadingHabits, earnedBadges]);

  // Save badges to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userBadgesKey = `${LS_KEY_PREFIX_BADGES}${authUser.uid}`;
    localStorage.setItem(userBadgesKey, JSON.stringify(earnedBadges));
    console.log(`Saved badges for user ${authUser.uid} to localStorage.`);
  }, [earnedBadges, authUser, isLoadingAuth, isLoadingHabits]);

  // Save points to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userPointsKey = `${LS_KEY_PREFIX_POINTS}${authUser.uid}`;
    localStorage.setItem(userPointsKey, totalPoints.toString());
    console.log(`Saved points for user ${authUser.uid} to localStorage.`);
  }, [totalPoints, authUser, isLoadingAuth, isLoadingHabits]);

  // Reminder Scheduling Logic
  React.useEffect(() => {
    reminderTimeouts.current.forEach(clearTimeout);
    reminderTimeouts.current = [];

    if (notificationPermission === 'granted' && authUser) {
      console.log("Checking habits for reminders...");
      habits.forEach(habit => {
        if (habit.reminderEnabled) {
          let reminderDateTime: Date | null = null;
          const now = new Date();

          if (habit.specificTime && habit.specificTime.toLowerCase() !== 'anytime' && habit.specificTime.toLowerCase() !== 'flexible') {
            try {
              const [hours, minutes] = habit.specificTime.split(':').map(Number);
              if (isNaN(hours) || isNaN(minutes)) throw new Error("Invalid time format");
              let specificEventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
              // Schedule reminder 30 minutes before, but only if that time is in the future
              let potentialReminderTime = new Date(specificEventTime.getTime() - 30 * 60 * 1000);
              if (potentialReminderTime > now) {
                reminderDateTime = potentialReminderTime;
              } else {
                // If 30 mins before has passed, but the event time itself hasn't, schedule for event time
                // Or if it's very close, just schedule for event time.
                if(specificEventTime > now) reminderDateTime = specificEventTime;
              }
            } catch (e) {
              console.error(`Error parsing specificTime "${habit.specificTime}" for habit "${habit.name}"`, e);
            }
          } else {
            let baseHour = 10; // Default if no optimal timing
            const timingLower = habit.optimalTiming?.toLowerCase();
            if (timingLower?.includes('morning')) baseHour = 9;
            else if (timingLower?.includes('afternoon')) baseHour = 13;
            else if (timingLower?.includes('evening')) baseHour = 18;
            reminderDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), baseHour, 0, 0, 0);
          }

          if (reminderDateTime && reminderDateTime > now) {
            const delay = reminderDateTime.getTime() - now.getTime();
            console.log(`REMINDER SET (Placeholder): "${habit.name}" at ${reminderDateTime.toLocaleString()} (in ${Math.round(delay/60000)} mins)`);
            // Example of actual notification:
            // const timeoutId = setTimeout(() => {
            //   if (Notification.permission === 'granted') {
            //     new Notification("Habitual Reminder", {
            //       body: `Time for your habit: ${habit.name}!`,
            //       icon: "/icons/icon-192x192.png" // Ensure this icon exists
            //     });
            //     console.log(`REMINDER FIRED for: ${habit.name}`);
            //   }
            // }, delay);
            // reminderTimeouts.current.push(timeoutId);
          }
        }
      });
    }
    return () => {
      reminderTimeouts.current.forEach(clearTimeout);
      reminderTimeouts.current = [];
    };
  }, [habits, notificationPermission, authUser]);

  // Check if all today's tasks are done
  React.useEffect(() => {
    if (todayString && todayAbbr && habits.length > 0) {
      const tasksScheduledToday = habits.filter(h => h.daysOfWeek.includes(todayAbbr));
      if (tasksScheduledToday.length === 0) {
        setAllTodayTasksDone(true); // No tasks scheduled, so all "done"
        return;
      }
      const allDone = tasksScheduledToday.every(h =>
        h.completionLog.some(log => log.date === todayString && log.status === 'completed')
      );
      setAllTodayTasksDone(allDone);
    } else if (habits.length === 0 && todayString) {
      setAllTodayTasksDone(true); // No habits at all
    }
  }, [habits, todayString, todayAbbr]);


  const handleSaveHabit = (habitData: CreateHabitFormData & { id?: string }) => {
    if (!authUser) return;
    const isEditingMode = !!(habitData.id && editingHabit && editingHabit.id === habitData.id);

    if (isEditingMode) {
      setHabits(prevHabits => prevHabits.map(h => h.id === habitData.id ? {
        ...h,
        name: habitData.name,
        description: habitData.description,
        category: habitData.category || 'Other',
        daysOfWeek: habitData.daysOfWeek,
        optimalTiming: habitData.optimalTiming,
        durationHours: habitData.durationHours === null ? undefined : habitData.durationHours,
        durationMinutes: habitData.durationMinutes === null ? undefined : habitData.durationMinutes,
        specificTime: habitData.specificTime,
        // reminderEnabled is handled by handleToggleReminder
      } : h));
      console.log(`Habit Updated: ${habitData.name}`);
    } else {
      const newHabit: Habit = {
        id: String(Date.now() + Math.random()), // Ensure string ID
        name: habitData.name,
        description: habitData.description,
        category: habitData.category || 'Other',
        daysOfWeek: habitData.daysOfWeek,
        optimalTiming: habitData.optimalTiming,
        durationHours: habitData.durationHours === null ? undefined : habitData.durationHours,
        durationMinutes: habitData.durationMinutes === null ? undefined : habitData.durationMinutes,
        specificTime: habitData.specificTime,
        completionLog: [],
        reminderEnabled: false, // Default reminder state
      };
      setHabits(prevHabits => [...prevHabits, newHabit]);
      console.log(`Habit Added: ${newHabit.name}`);
      // If this was the first habit added after seeing suggestions, clear suggestions
      if (habits.length === 0 && commonHabitSuggestions.length > 0) {
        setCommonHabitSuggestions([]);
      }
    }
    setIsCreateHabitDialogOpen(false);
    setInitialFormDataForDialog(null);
    setEditingHabit(null);
  };

  const handleOpenEditDialog = (habitToEdit: Habit) => {
    setEditingHabit(habitToEdit);
    setInitialFormDataForDialog({
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


  const handleToggleComplete = async (habitId_toggle: string, date_toggle: string, completed_toggle: boolean) => {
    let habitNameForQuote: string | undefined = undefined;
    let pointsChange = 0;
    let justCompletedANewTask = false; // To trigger quote only when a task becomes newly completed
    let habitBeingToggled: Habit | undefined = undefined;

    setHabits(prevHabits =>
      prevHabits.map(h => {
        if (h.id === habitId_toggle) {
          habitBeingToggled = h; // Store the habit being toggled
          habitNameForQuote = h.name;
          let newCompletionLog = [...h.completionLog];
          const existingLogIndex = newCompletionLog.findIndex(log => log.date === date_toggle);
          const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          if (completed_toggle) { // If marking as complete
            if (existingLogIndex > -1) {
              const existingLog = newCompletionLog[existingLogIndex];
              if (existingLog.status !== 'completed') { // Was not completed before
                pointsChange = POINTS_PER_COMPLETION;
                justCompletedANewTask = true;
              }
              newCompletionLog[existingLogIndex] = { ...existingLog, status: 'completed', time: currentTime };
            } else { // No log entry existed, so it's a new completion
              pointsChange = POINTS_PER_COMPLETION;
              justCompletedANewTask = true;
              newCompletionLog.push({ date: date_toggle, time: currentTime, status: 'completed', note: undefined });
            }
          } else { // If un-marking as complete
            if (existingLogIndex > -1) {
              const logEntry = newCompletionLog[existingLogIndex];
              if (logEntry.status === 'completed') { // Was completed, now un-marking
                 pointsChange = -POINTS_PER_COMPLETION;
              }
              // If it was a completed makeup, revert to pending_makeup.
              // If it has a note, mark as skipped. Otherwise, remove log.
              if (logEntry.status === 'completed' && logEntry.originalMissedDate) {
                newCompletionLog[existingLogIndex] = { ...logEntry, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry.note) {
                newCompletionLog[existingLogIndex] = { ...logEntry, status: 'skipped', time: 'N/A' };
              }
              else { // No note, not a makeup, so remove the log entirely
                newCompletionLog.splice(existingLogIndex, 1);
              }
            }
            // If no log entry and un-marking, do nothing to points or log
          }
          return { ...h, completionLog: newCompletionLog.sort((a, b) => b.date.localeCompare(a.date)) };
        }
        return h;
      })
    );

    // Fetch motivational quote only if a task was newly completed
    if (justCompletedANewTask && habitNameForQuote && authUser) {
      try {
        const quoteResult = await getMotivationalQuote({ habitName: habitNameForQuote });
        console.log(`Motivational Quote for ${habitNameForQuote}: ${quoteResult.quote}`);
      } catch (error_quote) {
        console.error("Failed to fetch motivational quote:", error_quote);
      }
    }

    // Update total points
    if (pointsChange !== 0) {
      setTotalPoints(prevPoints => Math.max(0, prevPoints + pointsChange)); // Ensure points don't go negative
    }
  };

  const handleToggleReminder = (habitId: string, currentReminderState: boolean) => {
    setHabits(prevHabits =>
      prevHabits.map(h =>
        h.id === habitId ? { ...h, reminderEnabled: !currentReminderState } : h
      )
    );
    const habit = habits.find(h => h.id === habitId);
    console.log(`Reminder for habit "${habit?.name}" ${!currentReminderState ? 'enabled' : 'disabled'}`);
    if (!currentReminderState && notificationPermission !== 'granted') {
       console.log('Please enable notifications in your browser settings or allow permission when prompted to receive reminders.');
    }
  };


  const handleOpenAISuggestionDialog = async (habit_param_ai_sugg: Habit) => {
    setSelectedHabitForAISuggestion(habit_param_ai_sugg);
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habit_param_ai_sugg.id, suggestionText: '', isLoading: true });

    try {
      const completionEntries_ai_sugg = habit_param_ai_sugg.completionLog.map(log_ai_sugg => {
        let entry_ai_sugg = `${log_ai_sugg.date} at ${log_ai_sugg.time || 'N/A'}`;
        if (log_ai_sugg.status === 'skipped') entry_ai_sugg += ` (Skipped)`;
        else if (log_ai_sugg.status === 'pending_makeup') entry_ai_sugg += ` (Makeup Pending for ${log_ai_sugg.originalMissedDate})`;
        else if (log_ai_sugg.status === 'completed' || log_ai_sugg.status === undefined) entry_ai_sugg += ` (Completed)`;

        if (log_ai_sugg.note && log_ai_sugg.note.trim() !== "") entry_ai_sugg += ` (Note: ${log_ai_sugg.note.trim()})`;
        return entry_ai_sugg;
      });
      const trackingData_ai_sugg = `Completions & Status: ${completionEntries_ai_sugg.join('; ') || 'None yet'}.`;

      const inputForAI_ai_sugg = {
        habitName: habit_param_ai_sugg.name,
        habitDescription: habit_param_ai_sugg.description,
        daysOfWeek: habit_param_ai_sugg.daysOfWeek,
        optimalTiming: habit_param_ai_sugg.optimalTiming,
        durationHours: habit_param_ai_sugg.durationHours,
        durationMinutes: habit_param_ai_sugg.durationMinutes,
        specificTime: habit_param_ai_sugg.specificTime,
        trackingData: trackingData_ai_sugg,
      };

      const result_ai_sugg = await getHabitSuggestion(inputForAI_ai_sugg);
      setAISuggestion({ habitId: habit_param_ai_sugg.id, suggestionText: result_ai_sugg.suggestion, isLoading: false });
    } catch (error_ai_sugg) {
      console.error("Error fetching AI suggestion:", error_ai_sugg);
      setAISuggestion({
        habitId: habit_param_ai_sugg.id,
        suggestionText: '',
        isLoading: false,
        error: 'Failed to get suggestion.'
      });
    }
  };

  const handleOpenReflectionDialog = (habitId_reflection_open: string, date_reflection_open: string, habitName_reflection_open: string) => {
    const habit_for_reflection_open = habits.find(h_find_refl => h_find_refl.id === habitId_reflection_open);
    const logEntry_for_reflection_open = habit_for_reflection_open?.completionLog.find(log_find_refl_entry => log_find_refl_entry.date === date_reflection_open);
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
    const { habitId: habitId_reflection_save, date: date_reflection_save_note } = reflectionDialogData;

    setHabits(prevHabits_reflection_save =>
      prevHabits_reflection_save.map(h_for_note_save_reflection => {
        if (h_for_note_save_reflection.id === habitId_reflection_save) {
          let logEntryExists_for_note_save_reflection = false;
          const newCompletionLog_for_note_save_reflection = h_for_note_save_reflection.completionLog.map(log_item_for_note_save_reflection => {
            if (log_item_for_note_save_reflection.date === date_reflection_save_note) {
              logEntryExists_for_note_save_reflection = true;
              return { ...log_item_for_note_save_reflection, note: note_to_save_reflection.trim() === "" ? undefined : note_to_save_reflection.trim() };
            }
            return log_item_for_note_save_reflection;
          });
          if (!logEntryExists_for_note_save_reflection) {
             const existingStatus_reflection_save = h_for_note_save_reflection.completionLog.find(l_note_reflection => l_note_reflection.date === date_reflection_save_note)?.status;
             newCompletionLog_for_note_save_reflection.push({
                date: date_reflection_save_note,
                time: 'N/A',
                note: note_to_save_reflection.trim() === "" ? undefined : note_to_save_reflection.trim(),
                status: existingStatus_reflection_save || 'skipped' // Default to skipped if adding a note to an uncompleted day
             });
             newCompletionLog_for_note_save_reflection.sort((a_sort_reflection,b_sort_reflection) => b_sort_reflection.date.localeCompare(a_sort_reflection.date));
          }
          return { ...h_for_note_save_reflection, completionLog: newCompletionLog_for_note_save_reflection };
        }
        return h_for_note_save_reflection;
      })
    );
    console.log(`Reflection Saved for ${reflectionDialogData.habitName} on ${reflectionDialogData.date}`);
    setReflectionDialogData(null);
    setIsReflectionDialogOpen(false);
  };

  const handleOpenRescheduleDialog = (habit_param_reschedule: Habit, missedDate_param_reschedule: string) => {
    setRescheduleDialogData({ habit: habit_param_reschedule, missedDate: missedDate_param_reschedule });
  };

  const handleSaveRescheduledHabit = (habitId_rescheduled_save: string, originalMissedDate_rescheduled: string, newDate_rescheduled: string) => {
    setHabits(prevHabits_rescheduled_save => prevHabits_rescheduled_save.map(h_rescheduled_save => {
      if (h_rescheduled_save.id === habitId_rescheduled_save) {
        let newCompletionLog_rescheduled = [...h_rescheduled_save.completionLog];
        const existingMissedLogIndex_rescheduled = newCompletionLog_rescheduled.findIndex(log_reschedule_find => log_reschedule_find.date === originalMissedDate_rescheduled);

        if(existingMissedLogIndex_rescheduled > -1) {
            if (newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].status !== 'completed') {
                newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].status = 'skipped';
                newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].time = 'N/A';
            }
        } else {
            newCompletionLog_rescheduled.push({
                date: originalMissedDate_rescheduled,
                time: 'N/A',
                status: 'skipped'
            });
        }

        newCompletionLog_rescheduled.push({
          date: newDate_rescheduled,
          time: 'N/A',
          status: 'pending_makeup',
          originalMissedDate: originalMissedDate_rescheduled,
        });
        newCompletionLog_rescheduled.sort((a_sort_reschedule,b_sort_reschedule) => b_sort_reschedule.date.localeCompare(a_sort_reschedule.date));
        return { ...h_rescheduled_save, completionLog: newCompletionLog_rescheduled };
      }
      return h_rescheduled_save;
    }));
    const habitName_rescheduled = habits.find(h_find_rescheduled_name=>h_find_rescheduled_name.id === habitId_rescheduled_save)?.name || "Habit";
    console.log(`Habit Rescheduled: ${habitName_rescheduled} from ${originalMissedDate_rescheduled} to ${newDate_rescheduled}`);
  };

  const handleSaveMarkAsSkipped = (habitId_skipped_save: string, missedDate_skipped_save: string) => {
     setHabits(prevHabits_skipped_save => prevHabits_skipped_save.map(h_skipped_save => {
      if (h_skipped_save.id === habitId_skipped_save) {
        let newCompletionLog_skipped_save = [...h_skipped_save.completionLog];
        const existingLogIndex_skipped_save = newCompletionLog_skipped_save.findIndex(log_skipped_find => log_skipped_find.date === missedDate_skipped_save);
        if (existingLogIndex_skipped_save > -1) {
          if (newCompletionLog_skipped_save[existingLogIndex_skipped_save].status !== 'completed') {
            newCompletionLog_skipped_save[existingLogIndex_skipped_save] = { ...newCompletionLog_skipped_save[existingLogIndex_skipped_save], status: 'skipped', time: 'N/A' };
          }
        } else {
          newCompletionLog_skipped_save.push({ date: missedDate_skipped_save, time: 'N/A', status: 'skipped' });
        }
        newCompletionLog_skipped_save.sort((a_sort_skipped,b_sort_skipped) => b_sort_skipped.date.localeCompare(a_sort_skipped.date));
        return { ...h_skipped_save, completionLog: newCompletionLog_skipped_save };
      }
      return h_skipped_save;
    }));
    const habitName_skipped = habits.find(h_find_skipped_name => h_find_skipped_name.id === habitId_skipped_save)?.name || "Habit";
    console.log(`Habit Skipped: ${habitName_skipped} on ${missedDate_skipped_save}`);
  };

  const handleRequestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission().then(permission => {
            setNotificationPermission(permission);
            if (permission === 'granted') {
                console.log('Notification permission granted.');
            } else {
                console.log('Notification permission denied or dismissed.');
            }
        });
    }
  };

  const handleOpenDeleteHabitConfirm = (habitId_delete_confirm: string, habitName_delete_confirm: string) => {
    setHabitToDelete({ id: habitId_delete_confirm, name: habitName_delete_confirm });
    setIsDeleteHabitConfirmOpen(true);
  };

  const handleConfirmDeleteSingleHabit = () => {
    if (habitToDelete && authUser) {
      setHabits(prevHabits_delete_single => prevHabits_delete_single.filter(h_delete_single => h_delete_single.id !== habitToDelete.id));
      console.log(`Habit "${habitToDelete.name}" deleted.`);
      setHabitToDelete(null);
    }
    setIsDeleteHabitConfirmOpen(false);
  };

  const handleCustomizeSuggestedHabit = (suggestion_customize: SuggestedHabit) => {
    setEditingHabit(null); // Not editing, but starting from a suggestion
    setInitialFormDataForDialog({
      name: suggestion_customize.name,
      category: suggestion_customize.category || 'Other',
      description: '',
      daysOfWeek: [],
    });
    setIsCreateHabitDialogOpen(true);
  };

  const handleCloseDailyQuestDialog = () => {
    setIsDailyQuestDialogOpen(false);
    if (authUser && typeof window !== 'undefined') {
      localStorage.setItem(`${LS_KEY_PREFIX_DAILY_QUEST}${authUser.uid}`, 'true');
    }
  };

  const handleMarkAllTodayDone = () => {
    if (!todayString || !todayAbbr) return;
    let tasksMarked = 0;
    habits.forEach(habit => {
      const isScheduled = habit.daysOfWeek.includes(todayAbbr);
      const isCompleted = habit.completionLog.some(log => log.date === todayString && log.status === 'completed');
      if (isScheduled && !isCompleted) {
        handleToggleComplete(habit.id, todayString, true);
        tasksMarked++;
      }
    });
    if (tasksMarked > 0) {
      console.log(`Marked ${tasksMarked} tasks as done for today.`);
    } else {
      console.log("No pending tasks to mark as done for today.");
    }
  };

  const calendarDialogModifiers = React.useMemo(() => {
    try {
        const dates_completed_arr: Date[] = [];
        const dates_scheduled_missed_arr_initial: Date[] = [];
        const dates_scheduled_upcoming_arr_initial: Date[] = [];
        const dates_makeup_pending_arr: Date[] = [];

        habits.forEach(habit_item_for_modifiers_loop => {
            habit_item_for_modifiers_loop.completionLog.forEach(log_entry_for_modifiers_loop => {
                if (typeof log_entry_for_modifiers_loop.date === 'string' && log_entry_for_modifiers_loop.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    try {
                        const logDate_obj_minimal = parseISO(log_entry_for_modifiers_loop.date);
                        if (log_entry_for_modifiers_loop.status === 'completed') {
                            dates_completed_arr.push(logDate_obj_minimal);
                        } else if (log_entry_for_modifiers_loop.status === 'pending_makeup') {
                            dates_makeup_pending_arr.push(logDate_obj_minimal);
                        }
                    } catch (e_parse_log_date) {
                        console.error("Error parsing log date in calendar modifiers (minimal):", log_entry_for_modifiers_loop.date, e_parse_log_date);
                    }
                } else {
                     console.warn("Invalid or missing date in log entry for calendar modifiers (minimal):", habit_item_for_modifiers_loop.name, log_entry_for_modifiers_loop);
                }
            });
        });
        const today_date_obj_minimal = startOfDay(new Date());
        habits.forEach(habit_item_for_modifiers_loop => {
            const iteration_limit_minimal = 60; // Look back/ahead 60 days
            for (let day_offset_minimal = 0; day_offset_minimal < iteration_limit_minimal; day_offset_minimal++) {
                const pastDateToConsider_obj_minimal = subDays(today_date_obj_minimal, day_offset_minimal);
                const futureDateToConsider_obj_minimal = dateFnsAddDays(today_date_obj_minimal, day_offset_minimal);

                [pastDateToConsider_obj_minimal, futureDateToConsider_obj_minimal].forEach(current_day_being_checked_obj_minimal => {
                     if (isSameDay(current_day_being_checked_obj_minimal, today_date_obj_minimal) && day_offset_minimal !== 0 && current_day_being_checked_obj_minimal !== pastDateToConsider_obj_minimal) return;

                    const dateStrToMatch_str_minimal = format(current_day_being_checked_obj_minimal, 'yyyy-MM-dd');
                    const dayOfWeekForDate_val_minimal = dayIndexToWeekDayConstant[getDay(current_day_being_checked_obj_minimal)];
                    const isScheduledOnThisDay_bool_minimal = habit_item_for_modifiers_loop.daysOfWeek.includes(dayOfWeekForDate_val_minimal);

                    const logEntryForThisDay_obj_minimal = habit_item_for_modifiers_loop.completionLog.find(log_find_item_minimal => log_find_item_minimal.date === dateStrToMatch_str_minimal);

                    if (isScheduledOnThisDay_bool_minimal && (!logEntryForThisDay_obj_minimal || (logEntryForThisDay_obj_minimal.status !== 'completed' && logEntryForThisDay_obj_minimal.status !== 'skipped' && logEntryForThisDay_obj_minimal.status !== 'pending_makeup'))) {
                        if (current_day_being_checked_obj_minimal < today_date_obj_minimal && !isSameDay(current_day_being_checked_obj_minimal, today_date_obj_minimal)) {
                             if (!dates_scheduled_missed_arr_initial.some(missed_day_item_minimal => isSameDay(missed_day_item_minimal, current_day_being_checked_obj_minimal))) {
                                dates_scheduled_missed_arr_initial.push(current_day_being_checked_obj_minimal);
                            }
                        } else { // Today or future scheduled day, not yet completed/skipped/makeup
                            if (!dates_scheduled_upcoming_arr_initial.some(upcoming_day_item_minimal => isSameDay(upcoming_day_item_minimal, current_day_being_checked_obj_minimal))) {
                                dates_scheduled_upcoming_arr_initial.push(current_day_being_checked_obj_minimal);
                            }
                        }
                    }
                });
            }
        });

        // Filter out days that are already marked as completed or pending makeup from the initial scheduled/missed lists
        const finalScheduledUpcoming_arr = dates_scheduled_upcoming_arr_initial.filter(s_date_upcoming_for_final_filter =>
            !dates_completed_arr.some(comp_date_for_final_filter => isSameDay(s_date_upcoming_for_final_filter, comp_date_for_final_filter)) &&
            !dates_makeup_pending_arr.some(makeup_date_for_final_filter => isSameDay(s_date_upcoming_for_final_filter, makeup_date_for_final_filter))
        );
        const finalScheduledMissed_arr = dates_scheduled_missed_arr_initial.filter(s_date_missed_for_final_filter =>
            !dates_completed_arr.some(comp_date_for_final_filter_missed => isSameDay(s_date_missed_for_final_filter, comp_date_for_final_filter_missed)) &&
            !dates_makeup_pending_arr.some(makeup_date_for_final_filter_missed => isSameDay(s_date_missed_for_final_filter, makeup_date_for_final_filter_missed))
        );

        return {
            completed: dates_completed_arr,
            missed: finalScheduledMissed_arr,
            scheduled: finalScheduledUpcoming_arr,
            makeup: dates_makeup_pending_arr,
            selected: selectedCalendarDate ? [selectedCalendarDate] : [],
        };
    } catch (error_in_calendar_modifiers) {
        console.error("CRITICAL ERROR in calendarDialogModifiers calculation:", error_in_calendar_modifiers);
        return { // Return safe defaults
            completed: [], missed: [], scheduled: [], makeup: [],
            selected: selectedCalendarDate ? [selectedCalendarDate] : [],
        };
    }
  }, [habits, selectedCalendarDate]);


  const calendarDialogModifierStyles: DayPicker['modifiersStyles'] = React.useMemo(() => {
    return {
      completed: { backgroundColor: 'hsl(var(--accent)/0.15)', color: 'hsl(var(--accent))', fontWeight: 'bold' },
      missed: { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
      scheduled: { backgroundColor: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' },
      makeup: { backgroundColor: 'hsl(200,100%,50%)/0.15', color: 'hsl(200,100%,50%)' },
      selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
    };
  }, []);

  const habitsForSelectedCalendarDate = React.useMemo(() => {
    if (!selectedCalendarDate) return [];
    try {
      const dateStr_for_list_cal = format(selectedCalendarDate, 'yyyy-MM-dd');
      const dayOfWeek_for_list_cal = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

      return habits.filter(habit_for_list_cal => {
        const isScheduled_for_list_cal = habit_for_list_cal.daysOfWeek.includes(dayOfWeek_for_list_cal);
        const logEntry_for_list_cal = habit_for_list_cal.completionLog.find(log_for_list_cal => log_for_list_cal.date === dateStr_for_list_cal);
        return isScheduled_for_list_cal || logEntry_for_list_cal;
      });
    } catch (e_habits_for_date) {
      console.error("Error in habitsForSelectedCalendarDate calculation:", e_habits_for_date);
      return [];
    }
  }, [selectedCalendarDate, habits]);


  const sheetMenuItems = [
    { href: '/', label: 'Home', icon: Home, action: () => setIsSettingsSheetOpen(false) },
    { href: '/profile', label: 'Profile', icon: UserCircle, action: () => setIsSettingsSheetOpen(false) },
    {
      label: 'Reminders',
      icon: BellRing,
      action: () => { console.log('Reminder Settings: Current Permission -', notificationPermission); }
    },
    {
      label: 'Achievements',
      icon: Award,
      action: () => { setIsSettingsSheetOpen(false); setIsAchievementsDialogOpen(true); }
    },
    {
      label: 'Calendar',
      icon: CalendarDays,
      action: () => { setIsSettingsSheetOpen(false); setIsCalendarDialogOpen(true); }
    },
  ];

  if (isLoadingAuth || (authUser && isLoadingHabits)) {
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

            {habits.length > 0 && (
              <div className="my-4 flex justify-center">
                <Button
                  onClick={handleMarkAllTodayDone}
                  disabled={allTodayTasksDone}
                  variant={allTodayTasksDone ? "outline" : "default"}
                  className="w-full max-w-xs"
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  {allTodayTasksDone ? "All Done for Today!" : "Mark All Today Done"}
                </Button>
              </div>
            )}

            {!isLoadingCommonSuggestions && habits.length === 0 && commonHabitSuggestions.length > 0 && (
              <div className="my-4 p-3 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
                <div className="px-2 pt-0">
                  <h3 className="text-md font-semibold flex items-center text-primary mb-1">
                     <Lightbulb className="mr-2 h-5 w-5"/> Start with these!
                  </h3>
                  <p className="text-xs text-muted-foreground mb-1.5">Click a tile to customize and add it to your list:</p>
                </div>
                <div className="p-1">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {commonHabitSuggestions.map((sugg_item_map, idx_sugg_map) => (
                      <Button key={idx_sugg_map} variant="outline"
                        className="p-2.5 h-auto flex flex-col items-center justify-center space-y-0.5 min-w-[90px] text-center shadow-sm hover:shadow-md transition-shadow text-xs"
                        onClick={() => handleCustomizeSuggestedHabit(sugg_item_map)}
                      >
                        <span className="font-medium">{sugg_item_map.name}</span>
                        {sugg_item_map.category && <span className="text-primary/80 opacity-80">{sugg_item_map.category}</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
             {isLoadingCommonSuggestions && habits.length === 0 && (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading suggestions...</p>
                </div>
            )}

            <HabitList
              habits={habits}
              onToggleComplete={handleToggleComplete}
              onGetAISuggestion={handleOpenAISuggestionDialog}
              onOpenReflectionDialog={handleOpenReflectionDialog}
              onOpenRescheduleDialog={handleOpenRescheduleDialog}
              onToggleReminder={handleToggleReminder}
              onOpenEditDialog={handleOpenEditDialog}
              onOpenDeleteConfirm={handleOpenDeleteHabitConfirm}
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

       <AlertDialog open={isDeleteHabitConfirmOpen} onOpenChange={setIsDeleteHabitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeaderUI>
            <AlertTitle>Confirm Deletion</AlertTitle>
            <AlertDialogDescriptionUI>
              Are you sure you want to delete "{habitToDelete?.name || ''}"? This action cannot be undone.
            </AlertDialogDescriptionUI>
          </AlertDialogHeaderUI>
          <AlertDialogFooterUI>
            <AlertDialogCancel onClick={() => setHabitToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteSingleHabit} className={buttonVariants({ variant: "destructive" })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooterUI>
        </AlertDialogContent>
      </AlertDialog>

      <DailyQuestDialog isOpen={isDailyQuestDialogOpen} onClose={handleCloseDailyQuestDialog} />

      <Dialog open={isDashboardDialogOpen} onOpenChange={setIsDashboardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogCardTitle className="flex items-center text-xl">
              <LayoutDashboard className="mr-2 h-5 w-5 text-primary" />
              Your Habit Dashboard
            </DialogCardTitle>
            <DialogCardDescription>
              A snapshot of your progress and today's checklist.
            </DialogCardDescription>
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
                <DialogCardTitle className="flex items-center text-xl">
                    <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                    Habit Calendar
                </DialogCardTitle>
                 <DialogCardDescription>
                    View your habit activity.
                </DialogCardDescription>
            </DialogHeader>
            <div className="py-2 max-h-[65vh] overflow-y-auto pr-2 flex flex-col items-center">
                 <Calendar
                    mode="single"
                    selected={selectedCalendarDate}
                    onSelect={setSelectedCalendarDate}
                    modifiers={calendarDialogModifiers}
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
                        {habitsForSelectedCalendarDate.map(h_item_cal_list_map_item => {
                        const log_item_cal_list_map_item = h_item_cal_list_map_item.completionLog.find(l_cal_list_map_item => l_cal_list_map_item.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                        const dayOfWeekForSelected_list_map_item = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                        const isScheduledToday_list_map_item = h_item_cal_list_map_item.daysOfWeek.includes(dayOfWeekForSelected_list_map_item);

                        let statusText_list_map_item = "Scheduled";
                        let StatusIcon_list_map_item = CircleIcon;
                        let iconColor_list_map_item = "text-orange-500";

                        if (log_item_cal_list_map_item?.status === 'completed') { statusText_list_map_item = `Completed ${log_item_cal_list_map_item.time || ''}`; StatusIcon_list_map_item = CheckCircle2; iconColor_list_map_item = "text-accent"; }
                        else if (log_item_cal_list_map_item?.status === 'pending_makeup') { statusText_list_map_item = `Makeup for ${log_item_cal_list_map_item.originalMissedDate}`; StatusIcon_list_map_item = MakeupIcon; iconColor_list_map_item = "text-blue-500"; }
                        else if (log_item_cal_list_map_item?.status === 'skipped') { statusText_list_map_item = "Skipped"; StatusIcon_list_map_item = XCircle; iconColor_list_map_item = "text-muted-foreground"; }
                        else if (isScheduledToday_list_map_item && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !log_item_cal_list_map_item) {
                            statusText_list_map_item = "Missed"; StatusIcon_list_map_item = XCircle; iconColor_list_map_item = "text-destructive";
                        }

                        return (
                            <li key={h_item_cal_list_map_item.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                            <span className="font-medium truncate pr-2">{h_item_cal_list_map_item.name}</span>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <StatusIcon_list_map_item className={cn("h-3.5 w-3.5", iconColor_list_map_item)} />
                                <span>{statusText_list_map_item}</span>
                            </div>
                            </li>
                        );
                        })}
                    </ul>
                    ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No habits scheduled or logged for this day.</p>
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
            <DialogCardTitle className="flex items-center text-xl">
              <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
              Your Achievements
            </DialogCardTitle>
            <DialogCardDescription>
              All the badges you've unlocked so far!
            </DialogCardDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto pr-2 space-y-3">
            {earnedBadges.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No badges earned yet. Keep up the great work!</p>
            ) : (
              earnedBadges.map((b_item_page_ach_map) => (
                <div key={b_item_page_ach_map.id} className="p-3 border rounded-md bg-card shadow-sm">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">{b_item_page_ach_map.icon || "🏆"}</span>
                    <h4 className="font-semibold text-primary">{b_item_page_ach_map.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{b_item_page_ach_map.description}</p>
                  <p className="text-xs text-muted-foreground">Achieved: {format(new Date(b_item_page_ach_map.dateAchieved), "MMMM d, yyyy")}</p>
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
            {sheetMenuItems.map((item_menu_sheet_map) => (
              item_menu_sheet_map.href && item_menu_sheet_map.href === "/profile" ? (
                 <SheetClose asChild key={item_menu_sheet_map.label}><Link href={item_menu_sheet_map.href}><Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet_map.action}><item_menu_sheet_map.icon className="mr-3 h-5 w-5" />{item_menu_sheet_map.label}</Button></Link></SheetClose>
              ) : item_menu_sheet_map.href && item_menu_sheet_map.href !== "/profile" ? (
                <SheetClose asChild key={item_menu_sheet_map.label}><Link href={item_menu_sheet_map.href}><Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet_map.action}><item_menu_sheet_map.icon className="mr-3 h-5 w-5" />{item_menu_sheet_map.label}</Button></Link></SheetClose>
              ) : (
                <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => { item_menu_sheet_map.action(); if (item_menu_sheet_map.label !== 'Reminders') setIsSettingsSheetOpen(false); }} key={item_menu_sheet_map.label} >
                  <item_menu_sheet_map.icon className="mr-3 h-5 w-5" />
                  {item_menu_sheet_map.label}
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
                <SheetClose asChild><Button size="sm" variant="outline" onClick={handleRequestNotificationPermission}>Enable Notifications</Button></SheetClose>
              )}
            </div>
            {notificationPermission === 'denied' && <p className="text-xs text-muted-foreground px-1 mt-1">Notifications blocked. Please enable in browser settings.</p>}
           </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
export default HabitualPage;
    

    
