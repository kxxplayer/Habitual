
"use client";

// ==========================================================================
// HABITUAL MAIN PAGE - Vercel Build Debug ATTEMPT (Force Rebuild v7)
// Date: 2025-05-21
// Removed direct render of HabitOverview from main page.
// Reverted to Dialog-based dashboard.
// Ensured login redirect works.
// Ensured data persistence for same user across sessions.
// Removed localStorage.removeItem on user switch to persist data.
// Implemented PWA features.
// Added "Mark All Today Done"
// Added Dashboard to bottom nav.
// Removed direct HabitOverview rendering from main page.
// Made data persistence work correctly for Google accounts too.
// Implemented responsive aspect ratio styling.
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
  DialogDescription as DialogCardDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle as DialogCardTitle
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
import HabitOverview from '@/components/overview/HabitOverview';


const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const POINTS_PER_COMPLETION = 10;

const LS_KEY_PREFIX_HABITS = "habits_";
const LS_KEY_PREFIX_BADGES = "earnedBadges_";
const LS_KEY_PREFIX_POINTS = "totalPoints_";
const LS_KEY_PREFIX_DAILY_QUEST = "hasSeenDailyQuest_";

const HabitualPage: NextPage = () => {
  console.log("HabitualPage RENDER - Main App Logic (with PWA, Auth, Dialogs) - Version 2.1 - 2025-05-21");

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
    const unsubscribe_auth_state_changed = onAuthStateChanged(auth, (currentUser_auth_state) => {
      const previousUid_auth_state = previousAuthUserUidRef.current;
      const currentUid_auth_state = currentUser_auth_state?.uid || null;
      console.log(`Auth state changed. Prev UID: ${previousUid_auth_state}, Curr UID: ${currentUid_auth_state}`);

      if (previousUid_auth_state !== currentUid_auth_state) {
        console.log("User identity changed. Clearing active app state (React state).");
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
        // localStorage data for the PREVIOUS user is NOT removed here.
      }

      setAuthUser(currentUser_auth_state);
      setIsLoadingAuth(false);
      previousAuthUserUidRef.current = currentUid_auth_state;

      if (!currentUser_auth_state && typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
        console.log('No current user, redirecting to login.');
        router.push('/auth/login');
      }
    });
    return () => {
      console.log("Unsubscribing from auth state changes");
      unsubscribe_auth_state_changed();
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
      console.log("No authenticated user, ensuring app state is clear for data loading. Data will not be loaded from localStorage.");
      if (habits.length > 0 || earnedBadges.length > 0 || totalPoints > 0) {
        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
      }
      setIsLoadingHabits(false);
      return;
    }

    setIsLoadingHabits(true);
    const userUid_load_data = authUser.uid;
    console.log(`Loading data for user: ${userUid_load_data}`);

    const userHabitsKey_load = `${LS_KEY_PREFIX_HABITS}${userUid_load_data}`;
    const storedHabits_load = typeof window !== 'undefined' ? localStorage.getItem(userHabitsKey_load) : null;
    let parsedHabits_load: Habit[] = [];
    if (storedHabits_load) {
      try {
        const rawHabits_load: any[] = JSON.parse(storedHabits_load);
        parsedHabits_load = rawHabits_load.map((h_item_map_load: any): Habit => {
          const id_val_load = String(h_item_map_load.id || Date.now().toString() + Math.random().toString(36).substring(2, 7));
          const name_val_load = String(h_item_map_load.name || 'Unnamed Habit');
          const description_val_load = typeof h_item_map_load.description === 'string' ? h_item_map_load.description : undefined;
          const category_val_check_load = h_item_map_load.category as HabitCategory;
          const category_val_load = HABIT_CATEGORIES.includes(category_val_check_load) ? category_val_check_load : 'Other';

          let daysOfWeek_val_load: WeekDay[] = Array.isArray(h_item_map_load.daysOfWeek) ? h_item_map_load.daysOfWeek.filter((d_val_load: any) => weekDays.includes(d_val_load as WeekDay)) : [];
          if (!Array.isArray(h_item_map_load.daysOfWeek) && typeof h_item_map_load.frequency === 'string') {
            const freqLower_val_load = h_item_map_load.frequency.toLowerCase();
            if (freqLower_val_load === 'daily') daysOfWeek_val_load = [...weekDays];
            else {
              const dayMap_val_load: { [key_val_load: string]: WeekDay } = {
                'sun': 'Sun', 'sunday': 'Sun', 'mon': 'Mon', 'monday': 'Mon',
                'tue': 'Tue', 'tuesday': 'Tue', 'wed': 'Wed', 'wednesday': 'Wed',
                'thu': 'Thu', 'thursday': 'Thu', 'fri': 'Fri', 'friday': 'Fri',
                'sat': 'Sat', 'saturday': 'Sat',
              };
              daysOfWeek_val_load = freqLower_val_load.split(/[\s,]+/).map((d_str_load: string) => dayMap_val_load[d_str_load.trim().toLowerCase() as keyof typeof dayMap_val_load]).filter(Boolean) as WeekDay[];
            }
          }

          const optimalTiming_val_load = typeof h_item_map_load.optimalTiming === 'string' ? h_item_map_load.optimalTiming : undefined;
          let migratedDurationHours_val_load: number | undefined = typeof h_item_map_load.durationHours === 'number' ? h_item_map_load.durationHours : undefined;
          let migratedDurationMinutes_val_load: number | undefined = typeof h_item_map_load.durationMinutes === 'number' ? h_item_map_load.durationMinutes : undefined;

          if (typeof h_item_map_load.duration === 'string' && migratedDurationHours_val_load === undefined && migratedDurationMinutes_val_load === undefined) {
            const durationStr_val_load = h_item_map_load.duration.toLowerCase();
            const hourMatch_val_load = durationStr_val_load.match(/(\d+)\s*h/);
            const minMatch_val_load = durationStr_val_load.match(/(\d+)\s*m/);
            if (hourMatch_val_load) migratedDurationHours_val_load = parseInt(hourMatch_val_load[1]);
            if (minMatch_val_load) migratedDurationMinutes_val_load = parseInt(minMatch_val_load[1]);
          }

          let migratedSpecificTime_val_load = typeof h_item_map_load.specificTime === 'string' ? h_item_map_load.specificTime : undefined;
          if (migratedSpecificTime_val_load && migratedSpecificTime_val_load.match(/^\d{1,2}:\d{2}\s*(am|pm)$/i)) {
            try {
              const [timePart_map_load, modifierPart_map_load] = migratedSpecificTime_val_load.split(/\s+/);
              let [hours_map_str_load, minutes_map_str_load] = timePart_map_load.split(':');
              let hours_map_val_load = parseInt(hours_map_str_load, 10);
              const minutes_map_val_load = parseInt(minutes_map_str_load, 10);
              if (modifierPart_map_load.toLowerCase() === 'pm' && hours_map_val_load < 12) hours_map_val_load += 12;
              if (modifierPart_map_load.toLowerCase() === 'am' && hours_map_val_load === 12) hours_map_val_load = 0;
              migratedSpecificTime_val_load = `${String(hours_map_val_load).padStart(2, '0')}:${String(minutes_map_val_load).padStart(2, '0')}`;
            } catch (e_map_time_load) { console.warn("Error parsing specificTime for migration", h_item_map_load.specificTime, e_map_time_load) }
          } else if (migratedSpecificTime_val_load && migratedSpecificTime_val_load.match(/^\d{1,2}:\d{2}$/)) {
             const [hours_val_t_load, minutes_val_t_load] = migratedSpecificTime_val_load.split(':').map(Number);
             migratedSpecificTime_val_load = `${String(hours_val_t_load).padStart(2, '0')}:${String(minutes_val_t_load).padStart(2, '0')}`;
          }

          const migratedCompletionLog_val_load = (Array.isArray(h_item_map_load.completionLog) ? h_item_map_load.completionLog : (Array.isArray(h_item_map_load.completedDates) ? h_item_map_load.completedDates.map((d_map_log_load: string) => ({ date: d_map_log_load, time: 'N/A', note: undefined, status: 'completed' })) : []))
            .map((log_map_item_load: any): HabitCompletionLogEntry | null => {
              if (typeof log_map_item_load.date !== 'string' || !log_map_item_load.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.warn("Sanitizing: Invalid or missing date in log entry for habit id", id_val_load, log_map_item_load);
                return null;
              }
              const status_val_log_load = ['completed', 'pending_makeup', 'skipped'].includes(log_map_item_load.status) ? log_map_item_load.status : 'completed';
              const originalMissedDate_val_log_load = typeof log_map_item_load.originalMissedDate === 'string' && log_map_item_load.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? log_map_item_load.originalMissedDate : undefined;

              return {
                date: log_map_item_load.date,
                time: log_map_item_load.time || 'N/A',
                note: typeof log_map_item_load.note === 'string' ? log_map_item_load.note : undefined,
                status: status_val_log_load,
                originalMissedDate: originalMissedDate_val_log_load,
              };
            })
            .filter((log_item_filter_load): log_item_filter_load is HabitCompletionLogEntry => log_item_filter_load !== null)
            .sort((a_log_sort_load,b_log_sort_load) => b_log_sort_load.date.localeCompare(a_log_sort_load.date));

          const reminderEnabled_val_load = typeof h_item_map_load.reminderEnabled === 'boolean' ? h_item_map_load.reminderEnabled : false;

          return {
            id: id_val_load, name: name_val_load, description: description_val_load, category: category_val_load, daysOfWeek: daysOfWeek_val_load,
            optimalTiming: optimalTiming_val_load, durationHours: migratedDurationHours_val_load, durationMinutes: migratedDurationMinutes_val_load,
            specificTime: migratedSpecificTime_val_load, completionLog: migratedCompletionLog_val_load, reminderEnabled: reminderEnabled_val_load,
          };
        });
        setHabits(parsedHabits_load);
      } catch (e_parse_habits_load) {
        console.error(`Error parsing habits for user ${userUid_load_data} from localStorage:`, e_parse_habits_load);
        setHabits([]);
      }
    } else {
      setHabits([]);
    }

    if (authUser && parsedHabits_load.length === 0 && !commonSuggestionsFetched) {
      console.log(`Fetching common suggestions for new user or user with no habits: ${userUid_load_data}`);
      setIsLoadingCommonSuggestions(true);
      getCommonHabitSuggestions({ count: 5 })
        .then(response_common_sugg => {
          if (response_common_sugg && Array.isArray(response_common_sugg.suggestions)) {
            setCommonHabitSuggestions(response_common_sugg.suggestions);
          } else {
            setCommonHabitSuggestions([]);
          }
        })
        .catch(err_common_sugg => {
          console.error("Failed to fetch common habit suggestions:", err_common_sugg);
          setCommonHabitSuggestions([]);
        })
        .finally(() => {
          setIsLoadingCommonSuggestions(false);
          setCommonSuggestionsFetched(true);
          const dailyQuestKey_load = `${LS_KEY_PREFIX_DAILY_QUEST}${userUid_load_data}`;
          const hasSeenDailyQuest_load = typeof window !== 'undefined' ? localStorage.getItem(dailyQuestKey_load) : null;
          if (!hasSeenDailyQuest_load) {
            setIsDailyQuestDialogOpen(true);
          }
        });
    } else if (parsedHabits_load.length > 0) {
      setCommonSuggestionsFetched(true);
    }


    const userBadgesKey_load = `${LS_KEY_PREFIX_BADGES}${userUid_load_data}`;
    const storedBadges_load = typeof window !== 'undefined' ? localStorage.getItem(userBadgesKey_load) : null;
    if (storedBadges_load) { try { setEarnedBadges(JSON.parse(storedBadges_load)); } catch (e_parse_badge) { console.error("Error parsing badges:", e_parse_badge); setEarnedBadges([]); } }
    else { setEarnedBadges([]); }

    const userPointsKey_load = `${LS_KEY_PREFIX_POINTS}${userUid_load_data}`;
    const storedPoints_load = typeof window !== 'undefined' ? localStorage.getItem(userPointsKey_load) : null;
    if (storedPoints_load) { try { setTotalPoints(parseInt(storedPoints_load, 10) || 0); } catch (e_parse_points) { console.error("Error parsing points:", e_parse_points); setTotalPoints(0); } }
    else { setTotalPoints(0); }

    setIsLoadingHabits(false);
    console.log(`Data loading complete for user ${userUid_load_data}. Habits: ${parsedHabits_load.length}`);

  }, [authUser, isLoadingAuth]);


  // Save habits to localStorage & check for badges
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userHabitsKey_save = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    localStorage.setItem(userHabitsKey_save, JSON.stringify(habits));
    console.log(`Saved habits for user ${authUser.uid} to localStorage.`);

    const newlyEarned_badges_save = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarned_badges_save.length > 0) {
      const updatedBadges_save = [...earnedBadges];
      let newBadgeAwarded_save = false;
      newlyEarned_badges_save.forEach(async newBadge_item_save => {
        if (!earnedBadges.some(eb_find_save => eb_find_save.id === newBadge_item_save.id)) {
            updatedBadges_save.push(newBadge_item_save);
            newBadgeAwarded_save = true;
            console.log(`New Badge Unlocked: ${newBadge_item_save.name} - ${newBadge_item_save.description}`);
            if (newBadge_item_save.id === THREE_DAY_SQL_STREAK_BADGE_ID) {
              try {
                const sqlTipResult_save = await getSqlTip();
                console.log(`Bonus SQL Tip Unlocked: ${sqlTipResult_save.tip}`);
              } catch (tipError_save) {
                console.error("Failed to fetch SQL tip:", tipError_save);
              }
            }
        }
      });
      if (newBadgeAwarded_save) {
        setEarnedBadges(updatedBadges_save);
      }
    }
  }, [habits, authUser, isLoadingAuth, isLoadingHabits, earnedBadges]);

  // Save badges to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userBadgesKey_save = `${LS_KEY_PREFIX_BADGES}${authUser.uid}`;
    localStorage.setItem(userBadgesKey_save, JSON.stringify(earnedBadges));
    console.log(`Saved badges for user ${authUser.uid} to localStorage.`);
  }, [earnedBadges, authUser, isLoadingAuth, isLoadingHabits]);

  // Save points to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userPointsKey_save = `${LS_KEY_PREFIX_POINTS}${authUser.uid}`;
    localStorage.setItem(userPointsKey_save, totalPoints.toString());
    console.log(`Saved points for user ${authUser.uid} to localStorage.`);
  }, [totalPoints, authUser, isLoadingAuth, isLoadingHabits]);

  // Placeholder Reminder Scheduling Logic
  React.useEffect(() => {
    reminderTimeouts.current.forEach(clearTimeout);
    reminderTimeouts.current = [];

    if (notificationPermission === 'granted' && authUser) {
      console.log("Checking habits for reminders (placeholder)...");
      habits.forEach(habit_reminder_check => {
        if (habit_reminder_check.reminderEnabled) {
          let reminderDateTime_val: Date | null = null;
          const now_reminder = new Date();

          const todayDayAbbr_reminder = dayIndexToWeekDayConstant[getDay(now_reminder)];
          if (!habit_reminder_check.daysOfWeek.includes(todayDayAbbr_reminder)) {
            return;
          }

          if (habit_reminder_check.specificTime && habit_reminder_check.specificTime.toLowerCase() !== 'anytime' && habit_reminder_check.specificTime.toLowerCase() !== 'flexible') {
            try {
              const [hours_reminder_time, minutes_reminder_time] = habit_reminder_check.specificTime.split(':').map(Number);
              if (isNaN(hours_reminder_time) || isNaN(minutes_reminder_time)) throw new Error("Invalid time format");

              let specificEventTime_reminder = new Date(now_reminder.getFullYear(), now_reminder.getMonth(), now_reminder.getDate(), hours_reminder_time, minutes_reminder_time, 0, 0);
              let potentialReminderTime_reminder = new Date(specificEventTime_reminder.getTime() - 30 * 60 * 1000);

              if (potentialReminderTime_reminder <= now_reminder && specificEventTime_reminder > now_reminder) {
                reminderDateTime_val = specificEventTime_reminder;
              } else if (potentialReminderTime_reminder > now_reminder) {
                reminderDateTime_val = potentialReminderTime_reminder;
              }
            } catch (e_reminder_time) {
              console.error(`Error parsing specificTime "${habit_reminder_check.specificTime}" for habit "${habit_reminder_check.name}"`, e_reminder_time);
            }
          } else {
            let baseHour_reminder = 10;
            const timingLower_reminder = habit_reminder_check.optimalTiming?.toLowerCase();
            if (timingLower_reminder?.includes('morning')) baseHour_reminder = 9;
            else if (timingLower_reminder?.includes('afternoon')) baseHour_reminder = 13;
            else if (timingLower_reminder?.includes('evening')) baseHour_reminder = 18;

            const potentialReminderTime_opt = new Date(now_reminder.getFullYear(), now_reminder.getMonth(), now_reminder.getDate(), baseHour_reminder, 0, 0, 0);
            if (potentialReminderTime_opt > now_reminder) {
                reminderDateTime_val = potentialReminderTime_opt;
            }
          }

          if (reminderDateTime_val && reminderDateTime_val > now_reminder) {
            const delay_reminder = reminderDateTime_val.getTime() - now_reminder.getTime();
            console.log(`REMINDER LOG (Placeholder): "${habit_reminder_check.name}" would be at ${reminderDateTime_val.toLocaleString()} (in ${Math.round(delay_reminder/60000)} mins)`);
          }
        }
      });
    }
    return () => {
      reminderTimeouts.current.forEach(clearTimeout);
      reminderTimeouts.current = [];
    };
  }, [habits, notificationPermission, authUser]);

  React.useEffect(() => {
    if (todayString && todayAbbr && habits.length > 0 && !isLoadingHabits) {
      const tasksScheduledToday_check_all_done = habits.filter(h_check_all_done => h_check_all_done.daysOfWeek.includes(todayAbbr));
      if (tasksScheduledToday_check_all_done.length === 0) {
        setAllTodayTasksDone(true);
        return;
      }
      const allDone_check = tasksScheduledToday_check_all_done.every(h_check_all_done_inner =>
        h_check_all_done_inner.completionLog.some(log_check_all_done => log_check_all_done.date === todayString && log_check_all_done.status === 'completed')
      );
      setAllTodayTasksDone(allDone_check);
    } else if (habits.length === 0 && !isLoadingHabits && todayString) {
      setAllTodayTasksDone(true);
    }
  }, [habits, todayString, todayAbbr, isLoadingHabits]);


  const handleSaveHabit = (habitData_save_habit: CreateHabitFormData & { id?: string }) => {
    if (!authUser) return;
    const isEditingMode_save_habit = !!(habitData_save_habit.id && editingHabit && editingHabit.id === habitData_save_habit.id);

    if (isEditingMode_save_habit) {
      setHabits(prevHabits_save_habit => prevHabits_save_habit.map(h_map_edit_save => h_map_edit_save.id === habitData_save_habit.id ? {
        ...h_map_edit_save,
        name: habitData_save_habit.name,
        description: habitData_save_habit.description,
        category: habitData_save_habit.category || 'Other',
        daysOfWeek: habitData_save_habit.daysOfWeek,
        optimalTiming: habitData_save_habit.optimalTiming,
        durationHours: habitData_save_habit.durationHours === null ? undefined : habitData_save_habit.durationHours,
        durationMinutes: habitData_save_habit.durationMinutes === null ? undefined : habitData_save_habit.durationMinutes,
        specificTime: habitData_save_habit.specificTime,
      } : h_map_edit_save));
      console.log(`Habit Updated: ${habitData_save_habit.name}`);
    } else {
      const newHabit_save_habit: Habit = {
        id: String(Date.now() + Math.random()),
        name: habitData_save_habit.name,
        description: habitData_save_habit.description,
        category: habitData_save_habit.category || 'Other',
        daysOfWeek: habitData_save_habit.daysOfWeek,
        optimalTiming: habitData_save_habit.optimalTiming,
        durationHours: habitData_save_habit.durationHours === null ? undefined : habitData_save_habit.durationHours,
        durationMinutes: habitData_save_habit.durationMinutes === null ? undefined : habitData_save_habit.durationMinutes,
        specificTime: habitData_save_habit.specificTime,
        completionLog: [],
        reminderEnabled: false,
      };
      setHabits(prevHabits_new_save => [...prevHabits_new_save, newHabit_save_habit]);
      console.log(`Habit Added: ${newHabit_save_habit.name}`);
      if (habits.length === 0 && commonHabitSuggestions.length > 0) {
        setCommonHabitSuggestions([]);
      }
    }
    if(isCreateHabitDialogOpen) setIsCreateHabitDialogOpen(false);

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


  const handleToggleComplete = async (habitId_toggle_comp: string, date_toggle_comp: string, completed_toggle_comp: boolean) => {
    if (!authUser) return;
    let habitNameForQuote_toggle_comp: string | undefined = undefined;
    let pointsChange_toggle_comp = 0;
    let justCompletedANewTask_toggle_comp = false;

    setHabits(prevHabits_toggle_comp =>
      prevHabits_toggle_comp.map(h_toggle_map_comp => {
        if (h_toggle_map_comp.id === habitId_toggle_comp) {
          habitNameForQuote_toggle_comp = h_toggle_map_comp.name;
          let newCompletionLog_toggle_comp = [...h_toggle_map_comp.completionLog];
          const existingLogIndex_toggle_comp = newCompletionLog_toggle_comp.findIndex(log_toggle_find_comp => log_toggle_find_comp.date === date_toggle_comp);
          const currentTime_toggle_comp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          if (completed_toggle_comp) {
            if (existingLogIndex_toggle_comp > -1) {
              const existingLog_toggle_comp = newCompletionLog_toggle_comp[existingLogIndex_toggle_comp];
              if (existingLog_toggle_comp.status !== 'completed') {
                pointsChange_toggle_comp = POINTS_PER_COMPLETION;
                justCompletedANewTask_toggle_comp = true;
              }
              newCompletionLog_toggle_comp[existingLogIndex_toggle_comp] = { ...existingLog_toggle_comp, status: 'completed', time: currentTime_toggle_comp };
            } else {
              pointsChange_toggle_comp = POINTS_PER_COMPLETION;
              justCompletedANewTask_toggle_comp = true;
              newCompletionLog_toggle_comp.push({ date: date_toggle_comp, time: currentTime_toggle_comp, status: 'completed', note: undefined });
            }
          } else {
            if (existingLogIndex_toggle_comp > -1) {
              const logEntry_toggle_comp = newCompletionLog_toggle_comp[existingLogIndex_toggle_comp];
              if (logEntry_toggle_comp.status === 'completed') {
                 pointsChange_toggle_comp = -POINTS_PER_COMPLETION;
              }
              if (logEntry_toggle_comp.status === 'completed' && logEntry_toggle_comp.originalMissedDate) {
                newCompletionLog_toggle_comp[existingLogIndex_toggle_comp] = { ...logEntry_toggle_comp, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry_toggle_comp.note) {
                newCompletionLog_toggle_comp[existingLogIndex_toggle_comp] = { ...logEntry_toggle_comp, status: 'skipped', time: 'N/A' };
              }
              else {
                newCompletionLog_toggle_comp.splice(existingLogIndex_toggle_comp, 1);
              }
            }
          }
          return { ...h_toggle_map_comp, completionLog: newCompletionLog_toggle_comp.sort((a_sort_toggle_comp, b_sort_toggle_comp) => b_sort_toggle_comp.date.localeCompare(a_sort_toggle_comp.date)) };
        }
        return h_toggle_map_comp;
      })
    );

    if (justCompletedANewTask_toggle_comp && habitNameForQuote_toggle_comp && authUser) {
      try {
        const quoteResult_toggle_comp = await getMotivationalQuote({ habitName: habitNameForQuote_toggle_comp });
        console.log(`Motivational Quote for ${habitNameForQuote_toggle_comp}: ${quoteResult_toggle_comp.quote}`);
      } catch (error_quote_toggle_comp) {
        console.error("Failed to fetch motivational quote:", error_quote_toggle_comp);
      }
    }

    if (pointsChange_toggle_comp !== 0) {
      setTotalPoints(prevPoints_toggle_comp => Math.max(0, prevPoints_toggle_comp + pointsChange_toggle_comp));
    }
  };

  const handleToggleReminder = (habitId_reminder_toggle: string, currentReminderState_reminder_toggle: boolean) => {
    if(!authUser) return;
    setHabits(prevHabits_reminder_toggle =>
      prevHabits_reminder_toggle.map(h_reminder_map_toggle =>
        h_reminder_map_toggle.id === habitId_reminder_toggle ? { ...h_reminder_map_toggle, reminderEnabled: !currentReminderState_reminder_toggle } : h_reminder_map_toggle
      )
    );
    const habit_reminder_toggle_log = habits.find(h_find_reminder_toggle => h_find_reminder_toggle.id === habitId_reminder_toggle);
    console.log(`Reminder for habit "${habit_reminder_toggle_log?.name}" ${!currentReminderState_reminder_toggle ? 'enabled' : 'disabled'}`);
    if (!currentReminderState_reminder_toggle && notificationPermission !== 'granted') {
       console.log('Please enable notifications in your browser settings or allow permission when prompted to receive reminders.');
    }
  };


  const handleOpenAISuggestionDialog = async (habit_param_ai_sugg_open: Habit) => {
    setSelectedHabitForAISuggestion(habit_param_ai_sugg_open);
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habit_param_ai_sugg_open.id, suggestionText: '', isLoading: true });

    try {
      const completionEntries_ai_sugg_open = habit_param_ai_sugg_open.completionLog.map(log_ai_sugg_open => {
        let entry_ai_sugg_open = `${log_ai_sugg_open.date} at ${log_ai_sugg_open.time || 'N/A'}`;
        if (log_ai_sugg_open.status === 'skipped') entry_ai_sugg_open += ` (Skipped)`;
        else if (log_ai_sugg_open.status === 'pending_makeup') entry_ai_sugg_open += ` (Makeup Pending for ${log_ai_sugg_open.originalMissedDate})`;
        else if (log_ai_sugg_open.status === 'completed' || log_ai_sugg_open.status === undefined) entry_ai_sugg_open += ` (Completed)`;

        if (log_ai_sugg_open.note && log_ai_sugg_open.note.trim() !== "") entry_ai_sugg_open += ` (Note: ${log_ai_sugg_open.note.trim()})`;
        return entry_ai_sugg_open;
      });
      const trackingData_ai_sugg_open = `Completions & Status: ${completionEntries_ai_sugg_open.join('; ') || 'None yet'}.`;

      const inputForAI_ai_sugg_open = {
        habitName: habit_param_ai_sugg_open.name,
        habitDescription: habit_param_ai_sugg_open.description,
        daysOfWeek: habit_param_ai_sugg_open.daysOfWeek,
        optimalTiming: habit_param_ai_sugg_open.optimalTiming,
        durationHours: habit_param_ai_sugg_open.durationHours,
        durationMinutes: habit_param_ai_sugg_open.durationMinutes,
        specificTime: habit_param_ai_sugg_open.specificTime,
        trackingData: trackingData_ai_sugg_open,
      };

      const result_ai_sugg_open = await getHabitSuggestion(inputForAI_ai_sugg_open);
      setAISuggestion({ habitId: habit_param_ai_sugg_open.id, suggestionText: result_ai_sugg_open.suggestion, isLoading: false });
    } catch (error_ai_sugg_open) {
      console.error("Error fetching AI suggestion:", error_ai_sugg_open);
      setAISuggestion({
        habitId: habit_param_ai_sugg_open.id,
        suggestionText: '',
        isLoading: false,
        error: 'Failed to get suggestion.'
      });
    }
  };

  const handleOpenReflectionDialog = (habitId_reflection_open_page: string, date_reflection_open_page: string, habitName_reflection_open_page: string) => {
    const habit_for_reflection_open_page = habits.find(h_find_refl_page => h_find_refl_page.id === habitId_reflection_open_page);
    const logEntry_for_reflection_open_page = habit_for_reflection_open_page?.completionLog.find(log_find_refl_entry_page => log_find_refl_entry_page.date === date_reflection_open_page);
    setReflectionDialogData({
      habitId: habitId_reflection_open_page,
      date: date_reflection_open_page,
      initialNote: logEntry_for_reflection_open_page?.note || '',
      habitName: habitName_reflection_open_page,
    });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (note_to_save_reflection_page: string) => {
    if (!reflectionDialogData || !authUser) return;
    const { habitId: habitId_reflection_save_page, date: date_reflection_save_note_page } = reflectionDialogData;

    setHabits(prevHabits_reflection_save_page =>
      prevHabits_reflection_save_page.map(h_for_note_save_reflection => {
        if (h_for_note_save_reflection.id === habitId_reflection_save_page) {
          let logEntryExists_for_note_save_reflection = false;
          const newCompletionLog_for_note_save_reflection = h_for_note_save_reflection.completionLog.map(log_item_for_note_save_reflection => {
            if (log_item_for_note_save_reflection.date === date_reflection_save_note_page) {
              logEntryExists_for_note_save_reflection = true;
              return { ...log_item_for_note_save_reflection, note: note_to_save_reflection_page.trim() === "" ? undefined : note_to_save_reflection_page.trim() };
            }
            return log_item_for_note_save_reflection;
          });
          if (!logEntryExists_for_note_save_reflection) {
             const existingStatus_reflection_save = h_for_note_save_reflection.completionLog.find(l_note_reflection => l_note_reflection.date === date_reflection_save_note_page)?.status;
             newCompletionLog_for_note_save_reflection.push({
                date: date_reflection_save_note_page,
                time: 'N/A',
                note: note_to_save_reflection_page.trim() === "" ? undefined : note_to_save_reflection_page.trim(),
                status: existingStatus_reflection_save || 'skipped'
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

  const handleOpenRescheduleDialog = (habit_param_reschedule_open: Habit, missedDate_param_reschedule_open: string) => {
    setRescheduleDialogData({ habit: habit_param_reschedule_open, missedDate: missedDate_param_reschedule_open });
  };

  const handleSaveRescheduledHabit = (habitId_rescheduled_save_page: string, originalMissedDate_rescheduled_save_page: string, newDate_rescheduled_save_page: string) => {
    if(!authUser) return;
    setHabits(prevHabits_rescheduled_save_page => prevHabits_rescheduled_save_page.map(h_rescheduled_save_page => {
      if (h_rescheduled_save_page.id === habitId_rescheduled_save_page) {
        let newCompletionLog_rescheduled_save = [...h_rescheduled_save_page.completionLog];
        const existingMissedLogIndex_rescheduled_save = newCompletionLog_rescheduled_save.findIndex(log_reschedule_find_save_page => log_reschedule_find_save_page.date === originalMissedDate_rescheduled_save_page);

        if(existingMissedLogIndex_rescheduled_save > -1) {
            if (newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].status !== 'completed') {
                newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].status = 'skipped';
                newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].time = 'N/A';
            }
        } else {
            newCompletionLog_rescheduled_save.push({
                date: originalMissedDate_rescheduled_save_page,
                time: 'N/A',
                status: 'skipped'
            });
        }

        newCompletionLog_rescheduled_save.push({
          date: newDate_rescheduled_save_page,
          time: 'N/A',
          status: 'pending_makeup',
          originalMissedDate: originalMissedDate_rescheduled_save_page,
        });
        newCompletionLog_rescheduled_save.sort((a_sort_reschedule_page,b_sort_reschedule_page) => b_sort_reschedule_page.date.localeCompare(a_sort_reschedule_page.date));
        return { ...h_rescheduled_save_page, completionLog: newCompletionLog_rescheduled_save };
      }
      return h_rescheduled_save_page;
    }));
    const habitName_rescheduled_page = habits.find(h_find_rescheduled_name_page => h_find_rescheduled_name_page.id === habitId_rescheduled_save_page)?.name || "Habit";
    console.log(`Habit Rescheduled: ${habitName_rescheduled_page} from ${originalMissedDate_rescheduled_save_page} to ${newDate_rescheduled_save_page}`);
  };

  const handleSaveMarkAsSkipped = (habitId_skipped_save_page: string, missedDate_skipped_save_page: string) => {
    if(!authUser) return;
     setHabits(prevHabits_skipped_save_page => prevHabits_skipped_save_page.map(h_skipped_save_page => {
      if (h_skipped_save_page.id === habitId_skipped_save_page) {
        let newCompletionLog_skipped_save_page = [...h_skipped_save_page.completionLog];
        const existingLogIndex_skipped_save_page = newCompletionLog_skipped_save_page.findIndex(log_skipped_find_page => log_skipped_find_page.date === missedDate_skipped_save_page);
        if (existingLogIndex_skipped_save_page > -1) {
          if (newCompletionLog_skipped_save_page[existingLogIndex_skipped_save_page].status !== 'completed') {
            newCompletionLog_skipped_save_page[existingLogIndex_skipped_save_page] = { ...newCompletionLog_skipped_save_page[existingLogIndex_skipped_save_page], status: 'skipped', time: 'N/A' };
          }
        } else {
          newCompletionLog_skipped_save_page.push({ date: missedDate_skipped_save_page, time: 'N/A', status: 'skipped' });
        }
        newCompletionLog_skipped_save_page.sort((a_sort_skipped_page,b_sort_skipped_page) => b_sort_skipped_page.date.localeCompare(a_sort_skipped_page.date));
        return { ...h_skipped_save_page, completionLog: newCompletionLog_skipped_save_page };
      }
      return h_skipped_save_page;
    }));
    const habitName_skipped_page = habits.find(h_find_skipped_name_page => h_find_skipped_name_page.id === habitId_skipped_save_page)?.name || "Habit";
    console.log(`Habit Skipped: ${habitName_skipped_page} on ${missedDate_skipped_save_page}`);
  };

  const handleRequestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission().then(permission_req => {
            setNotificationPermission(permission_req);
            if (permission_req === 'granted') {
                console.log('Notification permission granted.');
            } else {
                console.log('Notification permission denied or dismissed.');
            }
        });
    }
  };

  const handleOpenDeleteHabitConfirm = (habitId_delete_confirm_open: string, habitName_delete_confirm_open: string) => {
    setHabitToDelete({ id: habitId_delete_confirm_open, name: habitName_delete_confirm_open });
    setIsDeleteHabitConfirmOpen(true);
  };

  const handleConfirmDeleteSingleHabit = () => {
    if (habitToDelete && authUser) {
      setHabits(prevHabits_delete_single_page => prevHabits_delete_single_page.filter(h_delete_single_page => h_delete_single_page.id !== habitToDelete.id));
      console.log(`Habit "${habitToDelete.name}" deleted.`);
      setHabitToDelete(null);
    }
    setIsDeleteHabitConfirmOpen(false);
  };

  const handleCustomizeSuggestedHabit = (suggestion_customize_page: SuggestedHabit) => {
    const formData_customize_page: Partial<CreateHabitFormData> = {
      name: suggestion_customize_page.name,
      category: suggestion_customize_page.category || 'Other',
      description: '',
      daysOfWeek: [] as WeekDay[],
    };
    setEditingHabit(null);
    setInitialFormDataForDialog(formData_customize_page);
    setIsCreateHabitDialogOpen(true);
  };

  const handleCloseDailyQuestDialog = () => {
    setIsDailyQuestDialogOpen(false);
    if (authUser && typeof window !== 'undefined') {
      localStorage.setItem(`${LS_KEY_PREFIX_DAILY_QUEST}${authUser.uid}`, 'true');
    }
  };

  const handleMarkAllTodayDone = () => {
    if (!todayString || !todayAbbr || isLoadingHabits || !authUser) return;
    let tasksMarked_all_done = 0;
    habits.forEach(habit_mark_all_done => {
      const isScheduled_mark_all_done = habit_mark_all_done.daysOfWeek.includes(todayAbbr);
      const isCompleted_mark_all_done = habit_mark_all_done.completionLog.some(log_mark_all_done => log_mark_all_done.date === todayString && log_mark_all_done.status === 'completed');
      if (isScheduled_mark_all_done && !isCompleted_mark_all_done) {
        handleToggleComplete(habit_mark_all_done.id, todayString, true);
        tasksMarked_all_done++;
      }
    });
    if (tasksMarked_all_done > 0) {
      console.log(`Marked ${tasksMarked_all_done} tasks as done for today.`);
    } else {
      console.log("No pending tasks to mark as done for today.");
    }
  };

  // Ultra-minimal for calendar modifiers to debug "cDate" error on Vercel
  const calendarDialogModifiers = React.useMemo(() => {
    console.log("ULTRA-MINIMAL calendarDialogModifiers. Habits:", habits?.length, "Selected Date:", selectedCalendarDate);
    // This is the most simplified version for debugging the "cDate is not defined" error.
    // It completely avoids processing the 'habits' array for styling.
    return {
      completed: [],
      missed: [],
      scheduled: [],
      makeup: [],
      selected: selectedCalendarDate ? [selectedCalendarDate] : [],
    };
  }, [selectedCalendarDate]); // Removed 'habits' dependency for extreme debugging

  const calendarDialogModifierStyles: DayPicker['modifiersStyles'] = React.useMemo(() => {
    return {
      completed: { backgroundColor: 'hsl(var(--accent)/0.15)', color: 'hsl(var(--accent))', fontWeight: 'bold' },
      missed: { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
      scheduled: { backgroundColor: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' },
      makeup: { backgroundColor: 'hsl(200,100%,50%)/0.15)', color: 'hsl(200,100%,50%)' },
      selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
    };
  }, []);

  const habitsForSelectedCalendarDate = React.useMemo(() => {
    console.log("DEBUG: Recalculating habitsForSelectedCalendarDate. Habits:", habits?.length, "Selected Date:", selectedCalendarDate);
    if (!selectedCalendarDate || !authUser) return [];
    try {
      const dateStr_for_list_cal_page = format(selectedCalendarDate, 'yyyy-MM-dd');
      const dayOfWeek_for_list_cal_page = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

      return habits.filter(habit_for_list_cal_page => {
        const isScheduled_for_list_cal_page = habit_for_list_cal_page.daysOfWeek.includes(dayOfWeek_for_list_cal_page);
        const logEntry_for_list_cal_page = habit_for_list_cal_page.completionLog.find(log_for_list_cal_page => log_for_list_cal_page.date === dateStr_for_list_cal_page);
        return isScheduled_for_list_cal_page || logEntry_for_list_cal_page;
      });
    } catch (e_habits_for_date_page) {
      console.error("Error in habitsForSelectedCalendarDate calculation:", e_habits_for_date_page);
      return [];
    }
  }, [selectedCalendarDate, habits, authUser]);


  const sheetMenuItems = [
    { href: '/', label: 'Home', icon: Home, action: () => setIsSettingsSheetOpen(false) },
    { href: '/profile', label: 'Profile', icon: UserCircle, action: () => setIsSettingsSheetOpen(false) },
    {
      label: 'Reminders',
      icon: BellRing,
      action: () => {
        console.log('Reminder Settings: Current Notification Permission -', notificationPermission);
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
    {
      label: 'Calendar',
      icon: CalendarDays,
      action: () => {
        setIsSettingsSheetOpen(false);
        setIsCalendarDialogOpen(true);
      }
    },
  ];

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
       <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  if (isLoadingHabits && authUser) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your habits...</p>
      </div>
    );
  }


  return (
    <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
      <div
        className={cn(
          "bg-card text-foreground shadow-xl rounded-xl flex flex-col overflow-hidden mx-auto",
          "w-full max-w-[calc(90vh*9/16)] max-h-[90vh] aspect-[9/16]",
          "md:w-auto md:max-w-[calc(85vh*4/3)] md:h-[85vh] md:max-h-[800px] md:aspect-[4/3]",
          "lg:w-auto lg:max-w-[calc(80vh*16/9)] lg:h-[80vh] lg:max-h-[700px] lg:aspect-[16/9]"
        )}
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
                    {commonHabitSuggestions.map((sugg_item_map_page, idx_sugg_map_page) => (
                      <Button key={idx_sugg_map_page} variant="outline"
                        className="p-2.5 h-auto flex flex-col items-center justify-center space-y-0.5 min-w-[90px] text-center shadow-sm hover:shadow-md transition-shadow text-xs"
                        onClick={() => handleCustomizeSuggestedHabit(sugg_item_map_page)}
                      >
                        <span className="font-medium">{sugg_item_map_page.name}</span>
                        {sugg_item_map_page.category && <span className="text-primary/80 opacity-80">{sugg_item_map_page.category}</span>}
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

       <AlertDialog open={isDeleteHabitConfirmOpen} onOpenChange={setIsDeleteHabitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeaderUI>
            <AlertTitle>Confirm Deletion</AlertTitle>
            <AlertDialogDescriptionUI>
              Are you sure you want to delete the habit "{habitToDelete?.name || ''}"? This action cannot be undone.
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
                    View your habit activity. Select a day to see details.
                </DialogCardDescription>
            </DialogHeader>
            <div className="py-2 max-h-[65vh] overflow-y-auto pr-2 flex flex-col items-center">
                 <Calendar
                    mode="single"
                    selected={selectedCalendarDate}
                    onSelect={setSelectedCalendarDate}
                    modifiers={undefined}
                    modifiersStyles={undefined}
                    className="rounded-md border p-0 sm:p-2"
                    month={selectedCalendarDate || new Date()}
                    onMonthChange={setSelectedCalendarDate}
                 />
                {selectedCalendarDate && (
                <div className="mt-4 w-full">
                    <h3 className="text-md font-semibold mb-2 text-center">
                    Habits for {format(selectedCalendarDate, 'MMMM d, yyyy')}
                    </h3>
                    {/* List of habits for the selected date - temporarily simplified/removed for debugging */}
                    {habitsForSelectedCalendarDate.length > 0 ? (
                       <ul className="space-y-1.5 text-sm max-h-40 overflow-y-auto">
                        {habitsForSelectedCalendarDate.map(h_item_cal_list_map_item_page => {
                        const log_item_cal_list_map_item_page = h_item_cal_list_map_item_page.completionLog.find(l_cal_list_map_item_page => l_cal_list_map_item_page.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                        const dayOfWeekForSelected_list_map_item_page = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                        const isScheduledToday_list_map_item_page = h_item_cal_list_map_item_page.daysOfWeek.includes(dayOfWeekForSelected_list_map_item_page);

                        let statusText_list_map_item_page = "Scheduled";
                        let StatusIcon_list_map_item_page = CircleIcon;
                        let iconColor_list_map_item_page = "text-orange-500";

                        if (log_item_cal_list_map_item_page?.status === 'completed') {
                           statusText_list_map_item_page = `Completed ${log_item_cal_list_map_item_page.time || ''}`;
                           StatusIcon_list_map_item_page = CheckCircle2; iconColor_list_map_item_page = "text-accent";
                        } else if (log_item_cal_list_map_item_page?.status === 'pending_makeup') {
                           statusText_list_map_item_page = `Makeup for ${log_item_cal_list_map_item_page.originalMissedDate}`;
                           StatusIcon_list_map_item_page = MakeupIcon; iconColor_list_map_item_page = "text-blue-500";
                        } else if (log_item_cal_list_map_item_page?.status === 'skipped') {
                           statusText_list_map_item_page = "Skipped";
                           StatusIcon_list_map_item_page = XCircle; iconColor_list_map_item_page = "text-muted-foreground";
                        } else if (isScheduledToday_list_map_item_page && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !log_item_cal_list_map_item_page) {
                            statusText_list_map_item_page = "Missed"; StatusIcon_list_map_item_page = XCircle; iconColor_list_map_item_page = "text-destructive";
                        } else if (!isScheduledToday_list_map_item_page && !log_item_cal_list_map_item_page) {
                            statusText_list_map_item_page = "Not Scheduled"; StatusIcon_list_map_item_page = CircleIcon; iconColor_list_map_item_page = "text-muted-foreground/50";
                        }

                        return (
                            <li key={h_item_cal_list_map_item_page.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                            <span className="font-medium truncate pr-2">{h_item_cal_list_map_item_page.name}</span>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <StatusIcon_list_map_item_page className={cn("h-3.5 w-3.5", iconColor_list_map_item_page)} />
                                <span>{statusText_list_map_item_page}</span>
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
              earnedBadges.map((b_item_page_ach_map_main) => (
                <div key={b_item_page_ach_map_main.id} className="p-3 border rounded-md bg-card shadow-sm">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">{b_item_page_ach_map_main.icon || "🏆"}</span>
                    <h4 className="font-semibold text-primary">{b_item_page_ach_map_main.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{b_item_page_ach_map_main.description}</p>
                  <p className="text-xs text-muted-foreground">Achieved: {format(new Date(b_item_page_ach_map_main.dateAchieved), "MMMM d, yyyy")}</p>
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
            {sheetMenuItems.map((item_menu_sheet_map_page) => (
              item_menu_sheet_map_page.href && item_menu_sheet_map_page.href === "/profile" ? (
                 <SheetClose asChild key={item_menu_sheet_map_page.label}>
                    <Link href={item_menu_sheet_map_page.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet_map_page.action} >
                            <item_menu_sheet_map_page.icon className="mr-3 h-5 w-5" />
                            {item_menu_sheet_map_page.label}
                        </Button>
                    </Link>
                 </SheetClose>
              ) : item_menu_sheet_map_page.href && item_menu_sheet_map_page.href !== "/profile" ? (
                <SheetClose asChild key={item_menu_sheet_map_page.label}>
                    <Link href={item_menu_sheet_map_page.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet_map_page.action}>
                        <item_menu_sheet_map_page.icon className="mr-3 h-5 w-5" />
                        {item_menu_sheet_map_page.label}
                        </Button>
                    </Link>
                </SheetClose>
              ) : (
                <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => { item_menu_sheet_map_page.action(); if (item_menu_sheet_map_page.label !== 'Reminders') setIsSettingsSheetOpen(false); }} key={item_menu_sheet_map_page.label} >
                  <item_menu_sheet_map_page.icon className="mr-3 h-5 w-5" />
                  {item_menu_sheet_map_page.label}
                </Button>
              )
            ))}
          </div>
           <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center text-sm"> <Bell className="mr-2 h-4 w-4 text-muted-foreground" /> <span>Notification Status:</span>
                <span className={cn("ml-1 font-semibold",
                    notificationPermission === 'granted' ? 'text-green-600' :
                    notificationPermission === 'denied' ? 'text-red-600' : 'text-yellow-600'
                )}>
                  {notificationPermission ? notificationPermission.charAt(0).toUpperCase() + notificationPermission.slice(1) : 'Checking...'}
                </span>
              </div>
              {(notificationPermission === 'default' || notificationPermission === 'denied') && (
                 <SheetClose asChild><Button size="sm" variant="outline" onClick={() => { handleRequestNotificationPermission(); }}>Enable Notifications</Button></SheetClose>
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
