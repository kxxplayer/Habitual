
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
// Added User-Specific localStorage Keys.
// Reverted dashboard to inline.
// Implemented responsive max-width/max-height for better screen utilization.
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
import HabitOverview from '@/components/overview/HabitOverview';


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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionUI, // Renamed to avoid conflict
  AlertDialogFooter as AlertDialogFooterUI, // Renamed to avoid conflict
  AlertDialogHeader as AlertDialogHeaderUI, // Renamed to avoid conflict
  AlertDialogTitle as AlertTitle, // Renamed to avoid conflict
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

// CONSOLE LOG FOR VERSION TRACKING
console.log("HabitualPage RENDER - Main App Logic - Version 3.0 - 2025-05-21 (Responsive Sizing)");


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
    const now_effect_today = new Date();
    setTodayString(format(now_effect_today, 'yyyy-MM-dd'));
    setTodayAbbr(dayIndexToWeekDayConstant[getDay(now_effect_today)]);
  }, []);

  // Authentication State
  React.useEffect(() => {
    console.log("Auth effect running - Main Page");
    const unsubscribe_auth_main = onAuthStateChanged(auth, (currentUser_auth_main) => {
      const previousUid_auth_main = previousAuthUserUidRef.current;
      const currentUid_auth_main = currentUser_auth_main?.uid || null;
      console.log(`Auth state changed (Main Page). Prev UID: ${previousUid_auth_main}, Curr UID: ${currentUid_auth_main}`);

      if (previousUid_auth_main !== currentUid_auth_main) {
        console.log("User identity changed (Main Page). Clearing active app state (React state).");
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
        // localStorage data for the PREVIOUS user is NOT removed here, persistence is handled by UID namespacing.
      }

      setAuthUser(currentUser_auth_main);
      setIsLoadingAuth(false);
      previousAuthUserUidRef.current = currentUid_auth_main;

      if (!currentUser_auth_main && typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
        console.log('No current user (Main Page), redirecting to login.');
        router.push('/auth/login');
      }
    });
    return () => {
      console.log("Unsubscribing from auth state changes (Main Page)");
      unsubscribe_auth_main();
    };
  }, [router]);


  // Effect for Notification Permission
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        setNotificationPermission(Notification.permission); // Store the initial 'default' state
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
      console.log("Auth loading (Main Page), skipping data load.");
      return;
    }
    if (!authUser) {
      console.log("No authenticated user (Main Page), ensuring app state is clear. Data will not be loaded from localStorage.");
      if (habits.length > 0 || earnedBadges.length > 0 || totalPoints > 0) {
        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
      }
      setIsLoadingHabits(false);
      return;
    }

    setIsLoadingHabits(true);
    const userUid_load_main = authUser.uid;
    console.log(`Loading data for user (Main Page): ${userUid_load_main}`);

    const userHabitsKey_load_main = `${LS_KEY_PREFIX_HABITS}${userUid_load_main}`;
    const storedHabits_load_main = typeof window !== 'undefined' ? localStorage.getItem(userHabitsKey_load_main) : null;
    let parsedHabits_load_main: Habit[] = [];
    if (storedHabits_load_main) {
      try {
        const rawHabits_load_main: any[] = JSON.parse(storedHabits_load_main);
        parsedHabits_load_main = rawHabits_load_main.map((h_item_map_load_main: any): Habit => {
          const id_val_load_main = String(h_item_map_load_main.id || Date.now().toString() + Math.random().toString(36).substring(2, 7));
          const name_val_load_main = String(h_item_map_load_main.name || 'Unnamed Habit');
          const description_val_load_main = typeof h_item_map_load_main.description === 'string' ? h_item_map_load_main.description : undefined;
          const category_val_check_load_main = h_item_map_load_main.category as HabitCategory;
          const category_val_load_main = HABIT_CATEGORIES.includes(category_val_check_load_main) ? category_val_check_load_main : 'Other';

          let daysOfWeek_val_load_main: WeekDay[] = Array.isArray(h_item_map_load_main.daysOfWeek) ? h_item_map_load_main.daysOfWeek.filter((d_val_load_main: any) => weekDays.includes(d_val_load_main as WeekDay)) : [];
          if (!Array.isArray(h_item_map_load_main.daysOfWeek) && typeof h_item_map_load_main.frequency === 'string') {
            const freqLower_val_load_main = h_item_map_load_main.frequency.toLowerCase();
            if (freqLower_val_load_main === 'daily') daysOfWeek_val_load_main = [...weekDays];
            else {
              const dayMap_val_load_main: { [key_val_load_main: string]: WeekDay } = {
                'sun': 'Sun', 'sunday': 'Sun', 'mon': 'Mon', 'monday': 'Mon',
                'tue': 'Tue', 'tuesday': 'Tue', 'wed': 'Wed', 'wednesday': 'Wed',
                'thu': 'Thu', 'thursday': 'Thu', 'fri': 'Fri', 'friday': 'Fri',
                'sat': 'Sat', 'saturday': 'Sat',
              };
              daysOfWeek_val_load_main = freqLower_val_load_main.split(/[\s,]+/).map((d_str_load_main: string) => dayMap_val_load_main[d_str_load_main.trim().toLowerCase() as keyof typeof dayMap_val_load_main]).filter(Boolean) as WeekDay[];
            }
          }

          const optimalTiming_val_load_main = typeof h_item_map_load_main.optimalTiming === 'string' ? h_item_map_load_main.optimalTiming : undefined;
          let migratedDurationHours_val_load_main: number | undefined = typeof h_item_map_load_main.durationHours === 'number' ? h_item_map_load_main.durationHours : undefined;
          let migratedDurationMinutes_val_load_main: number | undefined = typeof h_item_map_load_main.durationMinutes === 'number' ? h_item_map_load_main.durationMinutes : undefined;

          if (typeof h_item_map_load_main.duration === 'string' && migratedDurationHours_val_load_main === undefined && migratedDurationMinutes_val_load_main === undefined) {
            const durationStr_val_load_main = h_item_map_load_main.duration.toLowerCase();
            const hourMatch_val_load_main = durationStr_val_load_main.match(/(\d+)\s*h/);
            const minMatch_val_load_main = durationStr_val_load_main.match(/(\d+)\s*m/);
            if (hourMatch_val_load_main) migratedDurationHours_val_load_main = parseInt(hourMatch_val_load_main[1]);
            if (minMatch_val_load_main) migratedDurationMinutes_val_load_main = parseInt(minMatch_val_load_main[1]);
          }

          let migratedSpecificTime_val_load_main = typeof h_item_map_load_main.specificTime === 'string' ? h_item_map_load_main.specificTime : undefined;
          if (migratedSpecificTime_val_load_main && migratedSpecificTime_val_load_main.match(/^\d{1,2}:\d{2}\s*(am|pm)$/i)) {
            try {
              const [timePart_map_load_main, modifierPart_map_load_main] = migratedSpecificTime_val_load_main.split(/\s+/);
              let [hours_map_str_load_main, minutes_map_str_load_main] = timePart_map_load_main.split(':');
              let hours_map_val_load_main = parseInt(hours_map_str_load_main, 10);
              const minutes_map_val_load_main = parseInt(minutes_map_str_load_main, 10);
              if (modifierPart_map_load_main.toLowerCase() === 'pm' && hours_map_val_load_main < 12) hours_map_val_load_main += 12;
              if (modifierPart_map_load_main.toLowerCase() === 'am' && hours_map_val_load_main === 12) hours_map_val_load_main = 0;
              migratedSpecificTime_val_load_main = `${String(hours_map_val_load_main).padStart(2, '0')}:${String(minutes_map_val_load_main).padStart(2, '0')}`;
            } catch (e_map_time_load_main) { console.warn("Error parsing specificTime for migration (Main Page)", h_item_map_load_main.specificTime, e_map_time_load_main) }
          } else if (migratedSpecificTime_val_load_main && migratedSpecificTime_val_load_main.match(/^\d{1,2}:\d{2}$/)) {
             const [hours_val_t_load_main, minutes_val_t_load_main] = migratedSpecificTime_val_load_main.split(':').map(Number);
             migratedSpecificTime_val_load_main = `${String(hours_val_t_load_main).padStart(2, '0')}:${String(minutes_val_t_load_main).padStart(2, '0')}`;
          }

          const migratedCompletionLog_val_load_main = (Array.isArray(h_item_map_load_main.completionLog) ? h_item_map_load_main.completionLog : (Array.isArray(h_item_map_load_main.completedDates) ? h_item_map_load_main.completedDates.map((d_map_log_load_main: string) => ({ date: d_map_log_load_main, time: 'N/A', note: undefined, status: 'completed' })) : []))
            .map((log_map_item_load_main: any): HabitCompletionLogEntry | null => {
              if (typeof log_map_item_load_main.date !== 'string' || !log_map_item_load_main.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.warn("Sanitizing: Invalid or missing date in log entry for habit id (Main Page)", id_val_load_main, log_map_item_load_main);
                return null;
              }
              const status_val_log_load_main = ['completed', 'pending_makeup', 'skipped'].includes(log_map_item_load_main.status) ? log_map_item_load_main.status : 'completed';
              const originalMissedDate_val_log_load_main = typeof log_map_item_load_main.originalMissedDate === 'string' && log_map_item_load_main.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? log_map_item_load_main.originalMissedDate : undefined;

              return {
                date: log_map_item_load_main.date,
                time: log_map_item_load_main.time || 'N/A',
                note: typeof log_map_item_load_main.note === 'string' ? log_map_item_load_main.note : undefined,
                status: status_val_log_load_main,
                originalMissedDate: originalMissedDate_val_log_load_main,
              };
            })
            .filter((log_item_filter_load_main): log_item_filter_load_main is HabitCompletionLogEntry => log_item_filter_load_main !== null)
            .sort((a_log_sort_load_main,b_log_sort_load_main) => b_log_sort_load_main.date.localeCompare(a_log_sort_load_main.date));

          const reminderEnabled_val_load_main = typeof h_item_map_load_main.reminderEnabled === 'boolean' ? h_item_map_load_main.reminderEnabled : false;

          return {
            id: id_val_load_main, name: name_val_load_main, description: description_val_load_main, category: category_val_load_main, daysOfWeek: daysOfWeek_val_load_main,
            optimalTiming: optimalTiming_val_load_main, durationHours: migratedDurationHours_val_load_main, durationMinutes: migratedDurationMinutes_val_load_main,
            specificTime: migratedSpecificTime_val_load_main, completionLog: migratedCompletionLog_val_load_main, reminderEnabled: reminderEnabled_val_load_main,
          };
        });
        setHabits(parsedHabits_load_main);
      } catch (e_parse_habits_load_main) {
        console.error(`Error parsing habits for user ${userUid_load_main} from localStorage (Main Page):`, e_parse_habits_load_main);
        setHabits([]);
      }
    } else {
      setHabits([]);
    }

    if (authUser && parsedHabits_load_main.length === 0 && !commonSuggestionsFetched) {
      console.log(`Fetching common suggestions for new user or user with no habits (Main Page): ${userUid_load_main}`);
      setIsLoadingCommonSuggestions(true);
      getCommonHabitSuggestions({ count: 5 })
        .then(response_common_sugg_main => {
          if (response_common_sugg_main && Array.isArray(response_common_sugg_main.suggestions)) {
            setCommonHabitSuggestions(response_common_sugg_main.suggestions);
          } else {
            setCommonHabitSuggestions([]);
          }
        })
        .catch(err_common_sugg_main => {
          console.error("Failed to fetch common habit suggestions (Main Page):", err_common_sugg_main);
          setCommonHabitSuggestions([]);
        })
        .finally(() => {
          setIsLoadingCommonSuggestions(false);
          setCommonSuggestionsFetched(true);
          const dailyQuestKey_load_main = `${LS_KEY_PREFIX_DAILY_QUEST}${userUid_load_main}`;
          const hasSeenDailyQuest_load_main = typeof window !== 'undefined' ? localStorage.getItem(dailyQuestKey_load_main) : null;
          if (!hasSeenDailyQuest_load_main) {
            setIsDailyQuestDialogOpen(true);
          }
        });
    } else if (parsedHabits_load_main.length > 0) {
      setCommonSuggestionsFetched(true); // Mark as fetched if habits exist
    }


    const userBadgesKey_load_main = `${LS_KEY_PREFIX_BADGES}${userUid_load_main}`;
    const storedBadges_load_main = typeof window !== 'undefined' ? localStorage.getItem(userBadgesKey_load_main) : null;
    if (storedBadges_load_main) { try { setEarnedBadges(JSON.parse(storedBadges_load_main)); } catch (e_parse_badge_main) { console.error("Error parsing badges (Main Page):", e_parse_badge_main); setEarnedBadges([]); } }
    else { setEarnedBadges([]); }

    const userPointsKey_load_main = `${LS_KEY_PREFIX_POINTS}${userUid_load_main}`;
    const storedPoints_load_main = typeof window !== 'undefined' ? localStorage.getItem(userPointsKey_load_main) : null;
    if (storedPoints_load_main) { try { setTotalPoints(parseInt(storedPoints_load_main, 10) || 0); } catch (e_parse_points_main) { console.error("Error parsing points (Main Page):", e_parse_points_main); setTotalPoints(0); } }
    else { setTotalPoints(0); }

    setIsLoadingHabits(false);
    console.log(`Data loading complete for user ${userUid_load_main} (Main Page). Habits: ${parsedHabits_load_main.length}`);

  }, [authUser, isLoadingAuth]);


  // Save habits to localStorage & check for badges
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userHabitsKey_save_main = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    localStorage.setItem(userHabitsKey_save_main, JSON.stringify(habits));
    console.log(`Saved habits for user ${authUser.uid} to localStorage (Main Page).`);

    const newlyEarned_badges_save_main = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarned_badges_save_main.length > 0) {
      const updatedBadges_save_main = [...earnedBadges];
      let newBadgeAwarded_save_main = false;
      newlyEarned_badges_save_main.forEach(async newBadge_item_save_main => {
        if (!earnedBadges.some(eb_find_save_main => eb_find_save_main.id === newBadge_item_save_main.id)) {
            updatedBadges_save_main.push(newBadge_item_save_main);
            newBadgeAwarded_save_main = true;
            console.log(`New Badge Unlocked (Main Page): ${newBadge_item_save_main.name} - ${newBadge_item_save_main.description}`);
            if (newBadge_item_save_main.id === THREE_DAY_SQL_STREAK_BADGE_ID) {
              try {
                const sqlTipResult_save_main = await getSqlTip();
                console.log(`Bonus SQL Tip Unlocked (Main Page): ${sqlTipResult_save_main.tip}`);
              } catch (tipError_save_main) {
                console.error("Failed to fetch SQL tip (Main Page):", tipError_save_main);
              }
            }
        }
      });
      if (newBadgeAwarded_save_main) {
        setEarnedBadges(updatedBadges_save_main);
      }
    }
  }, [habits, authUser, isLoadingAuth, isLoadingHabits, earnedBadges]);

  // Save badges to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userBadgesKey_save_main = `${LS_KEY_PREFIX_BADGES}${authUser.uid}`;
    localStorage.setItem(userBadgesKey_save_main, JSON.stringify(earnedBadges));
    console.log(`Saved badges for user ${authUser.uid} to localStorage (Main Page).`);
  }, [earnedBadges, authUser, isLoadingAuth, isLoadingHabits]);

  // Save points to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userPointsKey_save_main = `${LS_KEY_PREFIX_POINTS}${authUser.uid}`;
    localStorage.setItem(userPointsKey_save_main, totalPoints.toString());
    console.log(`Saved points for user ${authUser.uid} to localStorage (Main Page).`);
  }, [totalPoints, authUser, isLoadingAuth, isLoadingHabits]);

  // Placeholder Reminder Scheduling Logic
  React.useEffect(() => {
    reminderTimeouts.current.forEach(clearTimeout);
    reminderTimeouts.current = [];

    if (notificationPermission === 'granted' && authUser) {
      console.log("Checking habits for reminders (Main Page)...");
      habits.forEach(habit_reminder_check_main => {
        if (habit_reminder_check_main.reminderEnabled) {
          let reminderDateTime_val_main: Date | null = null;
          const now_reminder_main = new Date();

          const todayDayAbbr_reminder_main = dayIndexToWeekDayConstant[getDay(now_reminder_main)];
          if (!habit_reminder_check_main.daysOfWeek.includes(todayDayAbbr_reminder_main)) {
            return; // Not scheduled for today
          }

          if (habit_reminder_check_main.specificTime && habit_reminder_check_main.specificTime.toLowerCase() !== 'anytime' && habit_reminder_check_main.specificTime.toLowerCase() !== 'flexible') {
            try {
              const [hours_reminder_time_main, minutes_reminder_time_main] = habit_reminder_check_main.specificTime.split(':').map(Number);
              if (isNaN(hours_reminder_time_main) || isNaN(minutes_reminder_time_main)) throw new Error("Invalid time format for reminder");

              let specificEventTime_reminder_main = new Date(now_reminder_main.getFullYear(), now_reminder_main.getMonth(), now_reminder_main.getDate(), hours_reminder_time_main, minutes_reminder_time_main, 0, 0);
              let potentialReminderTime_reminder_main = new Date(specificEventTime_reminder_main.getTime() - 30 * 60 * 1000); // 30 minutes before

              // Check if the reminder time is in the future today
              if (potentialReminderTime_reminder_main <= now_reminder_main && specificEventTime_reminder_main > now_reminder_main) {
                // If 30 mins before has passed but event time hasn't, remind at event time
                reminderDateTime_val_main = specificEventTime_reminder_main;
              } else if (potentialReminderTime_reminder_main > now_reminder_main) {
                // If 30 mins before is still in the future
                reminderDateTime_val_main = potentialReminderTime_reminder_main;
              }
            } catch (e_reminder_time_main) {
              console.error(`Error parsing specificTime "${habit_reminder_check_main.specificTime}" for habit "${habit_reminder_check_main.name}" (Main Page)`, e_reminder_time_main);
            }
          } else { // No specific time, use optimal timing for "event of the day" reminder
            let baseHour_reminder_main = 10; // Default if no optimal timing
            const timingLower_reminder_main = habit_reminder_check_main.optimalTiming?.toLowerCase();
            if (timingLower_reminder_main?.includes('morning')) baseHour_reminder_main = 9;
            else if (timingLower_reminder_main?.includes('afternoon')) baseHour_reminder_main = 13;
            else if (timingLower_reminder_main?.includes('evening')) baseHour_reminder_main = 18;

            const potentialReminderTime_opt_main = new Date(now_reminder_main.getFullYear(), now_reminder_main.getMonth(), now_reminder_main.getDate(), baseHour_reminder_main, 0, 0, 0);
            if (potentialReminderTime_opt_main > now_reminder_main) {
                reminderDateTime_val_main = potentialReminderTime_opt_main;
            }
          }

          if (reminderDateTime_val_main && reminderDateTime_val_main > now_reminder_main) {
            const delay_reminder_main = reminderDateTime_val_main.getTime() - now_reminder_main.getTime();
            console.log(`REMINDER LOG (Main Page - Placeholder): "${habit_reminder_check_main.name}" would be at ${reminderDateTime_val_main.toLocaleString()} (in ${Math.round(delay_reminder_main/60000)} mins)`);
            // Actual setTimeout logic for new Notification(...) would go here, e.g.:
            // const timeoutId = setTimeout(() => {
            //   new Notification("Habitual Reminder", { body: `Time for your habit: ${habit.name}!` });
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

  React.useEffect(() => {
    if (todayString && todayAbbr && habits.length > 0 && !isLoadingHabits) {
      const tasksScheduledToday_check_all_done_main = habits.filter(h_check_all_done_main => h_check_all_done_main.daysOfWeek.includes(todayAbbr));
      if (tasksScheduledToday_check_all_done_main.length === 0) {
        setAllTodayTasksDone(true);
        return;
      }
      const allDone_check_main = tasksScheduledToday_check_all_done_main.every(h_check_all_done_inner_main =>
        h_check_all_done_inner_main.completionLog.some(log_check_all_done_main => log_check_all_done_main.date === todayString && log_check_all_done_main.status === 'completed')
      );
      setAllTodayTasksDone(allDone_check_main);
    } else if (habits.length === 0 && !isLoadingHabits && todayString) {
      setAllTodayTasksDone(true); // No habits, so all "tasks for today" are technically done
    }
  }, [habits, todayString, todayAbbr, isLoadingHabits]);


  const handleSaveHabit = (habitData_save_habit_main: CreateHabitFormData & { id?: string }) => {
    if (!authUser) return;
    const isEditingMode_save_habit_main = !!(habitData_save_habit_main.id && editingHabit && editingHabit.id === habitData_save_habit_main.id);

    if (isEditingMode_save_habit_main) {
      setHabits(prevHabits_save_habit_main => prevHabits_save_habit_main.map(h_map_edit_save_main => h_map_edit_save_main.id === habitData_save_habit_main.id ? {
        ...h_map_edit_save_main,
        name: habitData_save_habit_main.name,
        description: habitData_save_habit_main.description,
        category: habitData_save_habit_main.category || 'Other',
        daysOfWeek: habitData_save_habit_main.daysOfWeek,
        optimalTiming: habitData_save_habit_main.optimalTiming,
        durationHours: habitData_save_habit_main.durationHours === null ? undefined : habitData_save_habit_main.durationHours,
        durationMinutes: habitData_save_habit_main.durationMinutes === null ? undefined : habitData_save_habit_main.durationMinutes,
        specificTime: habitData_save_habit_main.specificTime,
      } : h_map_edit_save_main));
      console.log(`Habit Updated (Main Page): ${habitData_save_habit_main.name}`);
    } else {
      const newHabit_save_habit_main: Habit = {
        id: String(Date.now() + Math.random()),
        name: habitData_save_habit_main.name,
        description: habitData_save_habit_main.description,
        category: habitData_save_habit_main.category || 'Other',
        daysOfWeek: habitData_save_habit_main.daysOfWeek,
        optimalTiming: habitData_save_habit_main.optimalTiming,
        durationHours: habitData_save_habit_main.durationHours === null ? undefined : habitData_save_habit_main.durationHours,
        durationMinutes: habitData_save_habit_main.durationMinutes === null ? undefined : habitData_save_habit_main.durationMinutes,
        specificTime: habitData_save_habit_main.specificTime,
        completionLog: [],
        reminderEnabled: false,
      };
      setHabits(prevHabits_new_save_main => [...prevHabits_new_save_main, newHabit_save_habit_main]);
      console.log(`Habit Added (Main Page): ${newHabit_save_habit_main.name}`);
      // If suggestions were shown, clear them now that a habit is added
      if (habits.length === 0 && commonHabitSuggestions.length > 0) {
        setCommonHabitSuggestions([]);
      }
    }
    if(isCreateHabitDialogOpen) setIsCreateHabitDialogOpen(false);

    setInitialFormDataForDialog(null);
    setEditingHabit(null);
  };

  const handleOpenEditDialog = (habitToEdit_open_edit_main: Habit) => {
    setEditingHabit(habitToEdit_open_edit_main);
    setInitialFormDataForDialog({
      id: habitToEdit_open_edit_main.id,
      name: habitToEdit_open_edit_main.name,
      description: habitToEdit_open_edit_main.description || '',
      category: habitToEdit_open_edit_main.category || 'Other',
      daysOfWeek: habitToEdit_open_edit_main.daysOfWeek,
      optimalTiming: habitToEdit_open_edit_main.optimalTiming || '',
      durationHours: habitToEdit_open_edit_main.durationHours === undefined ? null : habitToEdit_open_edit_main.durationHours,
      durationMinutes: habitToEdit_open_edit_main.durationMinutes === undefined ? null : habitToEdit_open_edit_main.durationMinutes,
      specificTime: habitToEdit_open_edit_main.specificTime || '',
    });
    setIsCreateHabitDialogOpen(true);
  };


  const handleToggleComplete = async (habitId_toggle_comp_main: string, date_toggle_comp_main: string, completed_toggle_comp_main: boolean) => {
    if (!authUser) return;
    let habitNameForQuote_toggle_comp_main: string | undefined = undefined;
    let pointsChange_toggle_comp_main = 0;
    let justCompletedANewTask_toggle_comp_main = false;

    setHabits(prevHabits_toggle_comp_main =>
      prevHabits_toggle_comp_main.map(h_toggle_map_comp_main => {
        if (h_toggle_map_comp_main.id === habitId_toggle_comp_main) {
          habitNameForQuote_toggle_comp_main = h_toggle_map_comp_main.name;
          let newCompletionLog_toggle_comp_main = [...h_toggle_map_comp_main.completionLog];
          const existingLogIndex_toggle_comp_main = newCompletionLog_toggle_comp_main.findIndex(log_toggle_find_comp_main => log_toggle_find_comp_main.date === date_toggle_comp_main);
          const currentTime_toggle_comp_main = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          if (completed_toggle_comp_main) {
            if (existingLogIndex_toggle_comp_main > -1) {
              const existingLog_toggle_comp_main = newCompletionLog_toggle_comp_main[existingLogIndex_toggle_comp_main];
              if (existingLog_toggle_comp_main.status !== 'completed') {
                pointsChange_toggle_comp_main = POINTS_PER_COMPLETION;
                justCompletedANewTask_toggle_comp_main = true;
              }
              newCompletionLog_toggle_comp_main[existingLogIndex_toggle_comp_main] = { ...existingLog_toggle_comp_main, status: 'completed', time: currentTime_toggle_comp_main };
            } else {
              pointsChange_toggle_comp_main = POINTS_PER_COMPLETION;
              justCompletedANewTask_toggle_comp_main = true;
              newCompletionLog_toggle_comp_main.push({ date: date_toggle_comp_main, time: currentTime_toggle_comp_main, status: 'completed', note: undefined });
            }
          } else { // Un-completing
            if (existingLogIndex_toggle_comp_main > -1) {
              const logEntry_toggle_comp_main = newCompletionLog_toggle_comp_main[existingLogIndex_toggle_comp_main];
              if (logEntry_toggle_comp_main.status === 'completed') { // Only remove points if it was truly completed
                 pointsChange_toggle_comp_main = -POINTS_PER_COMPLETION;
              }
              // Logic for reverting status or removing log
              if (logEntry_toggle_comp_main.status === 'completed' && logEntry_toggle_comp_main.originalMissedDate) {
                // If it was a completed makeup task, revert to pending_makeup
                newCompletionLog_toggle_comp_main[existingLogIndex_toggle_comp_main] = { ...logEntry_toggle_comp_main, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry_toggle_comp_main.note) { // If there's a note, mark as skipped instead of removing
                newCompletionLog_toggle_comp_main[existingLogIndex_toggle_comp_main] = { ...logEntry_toggle_comp_main, status: 'skipped', time: 'N/A' };
              }
              else { // Otherwise (no note, not a makeup), remove the log
                newCompletionLog_toggle_comp_main.splice(existingLogIndex_toggle_comp_main, 1);
              }
            }
          }
          return { ...h_toggle_map_comp_main, completionLog: newCompletionLog_toggle_comp_main.sort((a_sort_toggle_comp_main, b_sort_toggle_comp_main) => b_sort_toggle_comp_main.date.localeCompare(a_sort_toggle_comp_main.date)) };
        }
        return h_toggle_map_comp_main;
      })
    );

    if (justCompletedANewTask_toggle_comp_main && habitNameForQuote_toggle_comp_main && authUser) {
      try {
        const quoteResult_toggle_comp_main = await getMotivationalQuote({ habitName: habitNameForQuote_toggle_comp_main });
        console.log(`Motivational Quote for ${habitNameForQuote_toggle_comp_main} (Main Page): ${quoteResult_toggle_comp_main.quote}`);
      } catch (error_quote_toggle_comp_main) {
        console.error("Failed to fetch motivational quote (Main Page):", error_quote_toggle_comp_main);
      }
    }

    if (pointsChange_toggle_comp_main !== 0) {
      setTotalPoints(prevPoints_toggle_comp_main => Math.max(0, prevPoints_toggle_comp_main + pointsChange_toggle_comp_main));
    }
  };

  const handleToggleReminder = (habitId_reminder_toggle_main: string, currentReminderState_reminder_toggle_main: boolean) => {
    if(!authUser) return;
    setHabits(prevHabits_reminder_toggle_main =>
      prevHabits_reminder_toggle_main.map(h_reminder_map_toggle_main =>
        h_reminder_map_toggle_main.id === habitId_reminder_toggle_main ? { ...h_reminder_map_toggle_main, reminderEnabled: !currentReminderState_reminder_toggle_main } : h_reminder_map_toggle_main
      )
    );
    const habit_reminder_toggle_log_main = habits.find(h_find_reminder_toggle_main => h_find_reminder_toggle_main.id === habitId_reminder_toggle_main);
    console.log(`Reminder for habit "${habit_reminder_toggle_log_main?.name}" ${!currentReminderState_reminder_toggle_main ? 'enabled' : 'disabled'} (Main Page)`);
    if (!currentReminderState_reminder_toggle_main && notificationPermission !== 'granted') {
       console.log('Please enable notifications in your browser settings or allow permission when prompted to receive reminders (Main Page).');
    }
  };


  const handleOpenAISuggestionDialog = async (habit_param_ai_sugg_open_main: Habit) => {
    setSelectedHabitForAISuggestion(habit_param_ai_sugg_open_main);
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habit_param_ai_sugg_open_main.id, suggestionText: '', isLoading: true });

    try {
      const completionEntries_ai_sugg_open_main = habit_param_ai_sugg_open_main.completionLog.map(log_ai_sugg_open_main => {
        let entry_ai_sugg_open_main = `${log_ai_sugg_open_main.date} at ${log_ai_sugg_open_main.time || 'N/A'}`;
        if (log_ai_sugg_open_main.status === 'skipped') entry_ai_sugg_open_main += ` (Skipped)`;
        else if (log_ai_sugg_open_main.status === 'pending_makeup') entry_ai_sugg_open_main += ` (Makeup Pending for ${log_ai_sugg_open_main.originalMissedDate})`;
        else if (log_ai_sugg_open_main.status === 'completed' || log_ai_sugg_open_main.status === undefined) entry_ai_sugg_open_main += ` (Completed)`;

        if (log_ai_sugg_open_main.note && log_ai_sugg_open_main.note.trim() !== "") entry_ai_sugg_open_main += ` (Note: ${log_ai_sugg_open_main.note.trim()})`;
        return entry_ai_sugg_open_main;
      });
      const trackingData_ai_sugg_open_main = `Completions & Status: ${completionEntries_ai_sugg_open_main.join('; ') || 'None yet'}.`;

      const inputForAI_ai_sugg_open_main = {
        habitName: habit_param_ai_sugg_open_main.name,
        habitDescription: habit_param_ai_sugg_open_main.description,
        daysOfWeek: habit_param_ai_sugg_open_main.daysOfWeek,
        optimalTiming: habit_param_ai_sugg_open_main.optimalTiming,
        durationHours: habit_param_ai_sugg_open_main.durationHours,
        durationMinutes: habit_param_ai_sugg_open_main.durationMinutes,
        specificTime: habit_param_ai_sugg_open_main.specificTime,
        trackingData: trackingData_ai_sugg_open_main,
      };

      const result_ai_sugg_open_main = await getHabitSuggestion(inputForAI_ai_sugg_open_main);
      setAISuggestion({ habitId: habit_param_ai_sugg_open_main.id, suggestionText: result_ai_sugg_open_main.suggestion, isLoading: false });
    } catch (error_ai_sugg_open_main) {
      console.error("Error fetching AI suggestion (Main Page):", error_ai_sugg_open_main);
      setAISuggestion({
        habitId: habit_param_ai_sugg_open_main.id,
        suggestionText: '',
        isLoading: false,
        error: 'Failed to get suggestion.'
      });
    }
  };

  const handleOpenReflectionDialog = (habitId_reflection_open_main: string, date_reflection_open_main: string, habitName_reflection_open_main: string) => {
    const habit_for_reflection_open_main = habits.find(h_find_refl_main => h_find_refl_main.id === habitId_reflection_open_main);
    const logEntry_for_reflection_open_main = habit_for_reflection_open_main?.completionLog.find(log_find_refl_entry_main => log_find_refl_entry_main.date === date_reflection_open_main);
    setReflectionDialogData({
      habitId: habitId_reflection_open_main,
      date: date_reflection_open_main,
      initialNote: logEntry_for_reflection_open_main?.note || '',
      habitName: habitName_reflection_open_main,
    });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (note_to_save_reflection_main: string) => {
    if (!reflectionDialogData || !authUser) return;
    const { habitId: habitId_reflection_save_main, date: date_reflection_save_note_main } = reflectionDialogData;

    setHabits(prevHabits_reflection_save_main =>
      prevHabits_reflection_save_main.map(h_for_note_save_reflection_main => {
        if (h_for_note_save_reflection_main.id === habitId_reflection_save_main) {
          let logEntryExists_for_note_save_reflection_main = false;
          const newCompletionLog_for_note_save_reflection_main = h_for_note_save_reflection_main.completionLog.map(log_item_for_note_save_reflection_main => {
            if (log_item_for_note_save_reflection_main.date === date_reflection_save_note_main) {
              logEntryExists_for_note_save_reflection_main = true;
              return { ...log_item_for_note_save_reflection_main, note: note_to_save_reflection_main.trim() === "" ? undefined : note_to_save_reflection_main.trim() };
            }
            return log_item_for_note_save_reflection_main;
          });
          if (!logEntryExists_for_note_save_reflection_main) {
             const existingStatus_reflection_save_main = h_for_note_save_reflection_main.completionLog.find(l_note_reflection_main => l_note_reflection_main.date === date_reflection_save_note_main)?.status;
             newCompletionLog_for_note_save_reflection_main.push({
                date: date_reflection_save_note_main,
                time: 'N/A',
                note: note_to_save_reflection_main.trim() === "" ? undefined : note_to_save_reflection_main.trim(),
                status: existingStatus_reflection_save_main || 'skipped'
             });
             newCompletionLog_for_note_save_reflection_main.sort((a_sort_reflection_main,b_sort_reflection_main) => b_sort_reflection_main.date.localeCompare(a_sort_reflection_main.date));
          }
          return { ...h_for_note_save_reflection_main, completionLog: newCompletionLog_for_note_save_reflection_main };
        }
        return h_for_note_save_reflection_main;
      })
    );
    console.log(`Reflection Saved for ${reflectionDialogData.habitName} on ${reflectionDialogData.date} (Main Page)`);
    setReflectionDialogData(null);
    setIsReflectionDialogOpen(false);
  };

  const handleOpenRescheduleDialog = (habit_param_reschedule_open_main: Habit, missedDate_param_reschedule_open_main: string) => {
    setRescheduleDialogData({ habit: habit_param_reschedule_open_main, missedDate: missedDate_param_reschedule_open_main });
  };

  const handleSaveRescheduledHabit = (habitId_rescheduled_save_main: string, originalMissedDate_rescheduled_save_main: string, newDate_rescheduled_save_main: string) => {
    if(!authUser) return;
    setHabits(prevHabits_rescheduled_save_main => prevHabits_rescheduled_save_main.map(h_rescheduled_save_main => {
      if (h_rescheduled_save_main.id === habitId_rescheduled_save_main) {
        let newCompletionLog_rescheduled_save_main = [...h_rescheduled_save_main.completionLog];
        const existingMissedLogIndex_rescheduled_save_main = newCompletionLog_rescheduled_save_main.findIndex(log_reschedule_find_save_main => log_reschedule_find_save_main.date === originalMissedDate_rescheduled_save_main);

        // Update or add a 'skipped' entry for the original missed date
        if(existingMissedLogIndex_rescheduled_save_main > -1) {
            // If the original missed day was completed or pending makeup, we don't want to overwrite its note (if any)
            // but we do want to mark it as skipped if it wasn't already completed.
            if (newCompletionLog_rescheduled_save_main[existingMissedLogIndex_rescheduled_save_main].status !== 'completed') {
                newCompletionLog_rescheduled_save_main[existingMissedLogIndex_rescheduled_save_main].status = 'skipped';
                newCompletionLog_rescheduled_save_main[existingMissedLogIndex_rescheduled_save_main].time = 'N/A'; // Reset time for skipped
            }
        } else { // If no log entry exists for the original missed date, add a skipped one
            newCompletionLog_rescheduled_save_main.push({
                date: originalMissedDate_rescheduled_save_main,
                time: 'N/A',
                status: 'skipped'
            });
        }

        newCompletionLog_rescheduled_save_main.push({
          date: newDate_rescheduled_save_main,
          time: 'N/A',
          status: 'pending_makeup',
          originalMissedDate: originalMissedDate_rescheduled_save_main,
        });
        newCompletionLog_rescheduled_save_main.sort((a_sort_reschedule_main,b_sort_reschedule_main) => b_sort_reschedule_main.date.localeCompare(a_sort_reschedule_main.date));
        return { ...h_rescheduled_save_main, completionLog: newCompletionLog_rescheduled_save_main };
      }
      return h_rescheduled_save_main;
    }));
    const habitName_rescheduled_main = habits.find(h_find_rescheduled_name_main => h_find_rescheduled_name_main.id === habitId_rescheduled_save_main)?.name || "Habit";
    console.log(`Habit Rescheduled (Main Page): ${habitName_rescheduled_main} from ${originalMissedDate_rescheduled_save_main} to ${newDate_rescheduled_save_main}`);
  };

  const handleSaveMarkAsSkipped = (habitId_skipped_save_main: string, missedDate_skipped_save_main: string) => {
    if(!authUser) return;
     setHabits(prevHabits_skipped_save_main => prevHabits_skipped_save_main.map(h_skipped_save_main => {
      if (h_skipped_save_main.id === habitId_skipped_save_main) {
        let newCompletionLog_skipped_save_main = [...h_skipped_save_main.completionLog];
        const existingLogIndex_skipped_save_main = newCompletionLog_skipped_save_main.findIndex(log_skipped_find_main => log_skipped_find_main.date === missedDate_skipped_save_main);
        if (existingLogIndex_skipped_save_main > -1) {
          // Don't overwrite if it was completed
          if (newCompletionLog_skipped_save_main[existingLogIndex_skipped_save_main].status !== 'completed') {
            newCompletionLog_skipped_save_main[existingLogIndex_skipped_save_main] = { ...newCompletionLog_skipped_save_main[existingLogIndex_skipped_save_main], status: 'skipped', time: 'N/A' };
          }
        } else {
          newCompletionLog_skipped_save_main.push({ date: missedDate_skipped_save_main, time: 'N/A', status: 'skipped' });
        }
        newCompletionLog_skipped_save_main.sort((a_sort_skipped_main,b_sort_skipped_main) => b_sort_skipped_main.date.localeCompare(a_sort_skipped_main.date));
        return { ...h_skipped_save_main, completionLog: newCompletionLog_skipped_save_main };
      }
      return h_skipped_save_main;
    }));
    const habitName_skipped_main = habits.find(h_find_skipped_name_main => h_find_skipped_name_main.id === habitId_skipped_save_main)?.name || "Habit";
    console.log(`Habit Skipped (Main Page): ${habitName_skipped_main} on ${missedDate_skipped_save_main}`);
  };

  const handleRequestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') { // Only request if not already granted
            Notification.requestPermission().then(permission_req_main => {
                setNotificationPermission(permission_req_main);
                if (permission_req_main === 'granted') {
                    console.log('Notification permission granted (Main Page).');
                } else {
                    console.log('Notification permission denied or dismissed (Main Page).');
                }
            });
        } else {
           setNotificationPermission('granted'); // Already granted
           console.log('Notification permission was already granted (Main Page).');
        }
    }
  };

  const handleOpenDeleteHabitConfirm = (habitId_delete_confirm_open_main: string, habitName_delete_confirm_open_main: string) => {
    setHabitToDelete({ id: habitId_delete_confirm_open_main, name: habitName_delete_confirm_open_main });
    setIsDeleteHabitConfirmOpen(true);
  };

  const handleConfirmDeleteSingleHabit = () => {
    if (habitToDelete && authUser) {
      setHabits(prevHabits_delete_single_main => prevHabits_delete_single_main.filter(h_delete_single_main => h_delete_single_main.id !== habitToDelete.id));
      console.log(`Habit "${habitToDelete.name}" deleted (Main Page).`);
      setHabitToDelete(null);
    }
    setIsDeleteHabitConfirmOpen(false);
  };

  const handleCustomizeSuggestedHabit = (suggestion_customize_main: SuggestedHabit) => {
    const formData_customize_main: Partial<CreateHabitFormData> = {
      name: suggestion_customize_main.name,
      category: suggestion_customize_main.category || 'Other',
      description: '', // Suggested habits from AI don't have descriptions currently
      daysOfWeek: [] as WeekDay[], // User will set this
    };
    setEditingHabit(null); // Ensure we are not in edit mode
    setInitialFormDataForDialog(formData_customize_main);
    setIsCreateHabitDialogOpen(true);
  };

  const handleCloseDailyQuestDialog = () => {
    setIsDailyQuestDialogOpen(false);
    if (authUser && typeof window !== 'undefined') {
      const dailyQuestKey_close_main = `${LS_KEY_PREFIX_DAILY_QUEST}${authUser.uid}`;
      localStorage.setItem(dailyQuestKey_close_main, 'true');
    }
  };

  const handleMarkAllTodayDone = () => {
    if (!todayString || !todayAbbr || isLoadingHabits || !authUser) return;
    let tasksMarked_all_done_main = 0;
    habits.forEach(habit_mark_all_done_main => {
      const isScheduled_mark_all_done_main = habit_mark_all_done_main.daysOfWeek.includes(todayAbbr);
      const isCompleted_mark_all_done_main = habit_mark_all_done_main.completionLog.some(log_mark_all_done_main => log_mark_all_done_main.date === todayString && log_mark_all_done_main.status === 'completed');
      if (isScheduled_mark_all_done_main && !isCompleted_mark_all_done_main) {
        handleToggleComplete(habit_mark_all_done_main.id, todayString, true); // Await is not needed as handleToggleComplete is async but updates state
        tasksMarked_all_done_main++;
      }
    });
    if (tasksMarked_all_done_main > 0) {
      console.log(`Marked ${tasksMarked_all_done_main} tasks as done for today (Main Page).`);
    } else {
      console.log("No pending tasks to mark as done for today (Main Page).");
    }
  };

  const calendarDialogModifiers = React.useMemo(() => {
     // This is the ULTRA-MINIMAL version for debugging the "cDate is not defined" error.
     // It will only highlight the selected date and not process habits for custom styling.
     console.log("DEBUG: Using ULTRA-MINIMAL calendarDialogModifiers. Habits length:", habits?.length, "Selected Date:", selectedCalendarDate);
     return {
       selected: selectedCalendarDate ? [selectedCalendarDate] : [],
       // All other modifiers are intentionally left out for this debugging step
       completed: [],
       missed: [],
       scheduled: [],
       makeup: [],
     };
   }, [selectedCalendarDate, habits]); // Kept habits here for now to see if its mere presence as dep is an issue

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
      const dateStr_for_list_cal_main = format(selectedCalendarDate, 'yyyy-MM-dd');
      const dayOfWeek_for_list_cal_main = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

      return habits.filter(habit_for_list_cal_main => {
        const isScheduled_for_list_cal_main = habit_for_list_cal_main.daysOfWeek.includes(dayOfWeek_for_list_cal_main);
        const logEntry_for_list_cal_main = habit_for_list_cal_main.completionLog.find(log_for_list_cal_main => log_for_list_cal_main.date === dateStr_for_list_cal_main);
        return isScheduled_for_list_cal_main || logEntry_for_list_cal_main; // Show if scheduled OR if there's any log entry (e.g. makeup)
      });
    } catch (e_habits_for_date_main) {
      console.error("Error in habitsForSelectedCalendarDate calculation (Main Page):", e_habits_for_date_main);
      return []; // Return empty array on error
    }
  }, [selectedCalendarDate, habits, authUser]);


  const sheetMenuItems = [
    { href: '/', label: 'Home', icon: Home, action: () => setIsSettingsSheetOpen(false) },
    { href: '/profile', label: 'Profile', icon: UserCircle, action: () => setIsSettingsSheetOpen(false) },
    {
      label: 'Reminders',
      icon: BellRing,
      action: () => {
        // Logic to show notification status / request permission is now handled inside the SheetContent render
        console.log('Reminder Settings: Current Notification Permission (Main Page) -', notificationPermission);
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
      <div className="min-h-screen p-2 sm:p-4 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!authUser) { // Should be caught by redirect in useEffect, but as a fallback
    return (
       <div className="min-h-screen p-2 sm:p-4 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // This isLoadingHabits check is crucial to prevent rendering parts of the UI
  // that depend on habits before they are loaded, especially for new users.
  if (isLoadingHabits && authUser) {
     return (
      <div className="min-h-screen p-2 sm:p-4 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your habits...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen p-2 sm:p-4 flex items-center justify-center"> {/* Outer wrapper for centering */}
      <div
        className={cn(
          "bg-card text-foreground shadow-xl rounded-xl flex flex-col overflow-hidden",
          // Mobile:
          "w-full max-w-md",
          "h-full max-h-[90vh] sm:max-h-[850px]", // Use sm:max-h for a slightly different cap on small viewports if needed
          // Tablet:
          "md:max-w-lg md:max-h-[85vh]",
          // Desktop:
          "lg:max-w-2xl lg:max-h-[80vh]"
        )}
      >
        <AppHeader onOpenCalendar={() => setIsCalendarDialogOpen(true)} />

        <ScrollArea className="flex-grow"> {/* This ScrollArea wraps the main content */}
          <main className="px-3 sm:px-4 py-4">
            <HabitOverview habits={habits} totalPoints={totalPoints} />

            {habits.length > 0 && ( // Show only if there are habits
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
                     <Lightbulb className="mr-2 h-5 w-5"/> Welcome to Habitual!
                  </h3>
                  <p className="text-xs text-muted-foreground mb-1.5">Start by picking a common habit or add your own:</p>
                </div>
                <div className="p-1">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {commonHabitSuggestions.map((sugg_item_map_main, idx_sugg_map_main) => (
                      <Button key={idx_sugg_map_main} variant="outline"
                        className="p-2.5 h-auto flex flex-col items-center justify-center space-y-0.5 min-w-[90px] text-center shadow-sm hover:shadow-md transition-shadow text-xs"
                        onClick={() => handleCustomizeSuggestedHabit(sugg_item_map_main)}
                      >
                        <span className="font-medium">{sugg_item_map_main.name}</span>
                        {sugg_item_map_main.category && <span className="text-primary/80 opacity-80">{sugg_item_map_main.category}</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
             {isLoadingCommonSuggestions && habits.length === 0 && ( // Show loading state for suggestions
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

      {/* FAB for Add New Habit */}
       <Button
          className="fixed bottom-[calc(4rem+1.5rem)] right-6 sm:right-10 h-14 w-14 p-0 rounded-full shadow-xl z-30 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
          onClick={() => {
            setEditingHabit(null); // Ensure not in edit mode
            setInitialFormDataForDialog(null); // Clear any pre-fill from common suggestions
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
        initialData={initialFormDataForDialog} // Pass possibly pre-filled data
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
          onReschedule={(newDate_reschedule_cb_main) => {
            handleSaveRescheduledHabit(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate, newDate_reschedule_cb_main);
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
                    View your habit activity. Select a day to see details.
                </DialogDescription>
            </DialogHeader>
            <div className="py-2 max-h-[65vh] overflow-y-auto pr-2 flex flex-col items-center">
                 <Calendar
                    mode="single"
                    selected={selectedCalendarDate}
                    onSelect={setSelectedCalendarDate}
                    modifiers={undefined} // Using undefined to disable custom styling for now
                    modifiersStyles={undefined} // Using undefined to disable custom styling for now
                    className="rounded-md border p-0 sm:p-2"
                    month={selectedCalendarDate || new Date()} // Control the displayed month
                    onMonthChange={setSelectedCalendarDate} // Allow month navigation
                 />
                {selectedCalendarDate && (
                <div className="mt-4 w-full">
                    <h3 className="text-md font-semibold mb-2 text-center">
                    Habits for {format(selectedCalendarDate, 'MMMM d, yyyy')}
                    </h3>
                    {habitsForSelectedCalendarDate.length > 0 ? (
                       <ul className="space-y-1.5 text-sm max-h-40 overflow-y-auto">
                        {habitsForSelectedCalendarDate.map(h_item_cal_list_map_item_main => {
                        const log_item_cal_list_map_item_main = h_item_cal_list_map_item_main.completionLog.find(l_cal_list_map_item_main => l_cal_list_map_item_main.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                        const dayOfWeekForSelected_list_map_item_main = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                        const isScheduledToday_list_map_item_main = h_item_cal_list_map_item_main.daysOfWeek.includes(dayOfWeekForSelected_list_map_item_main);

                        let statusText_list_map_item_main = "Scheduled";
                        let StatusIcon_list_map_item_main = CircleIcon;
                        let iconColor_list_map_item_main = "text-orange-500"; // Default for scheduled

                        if (log_item_cal_list_map_item_main?.status === 'completed') {
                           statusText_list_map_item_main = `Completed ${log_item_cal_list_map_item_main.time || ''}`;
                           StatusIcon_list_map_item_main = CheckCircle2; iconColor_list_map_item_main = "text-accent";
                        } else if (log_item_cal_list_map_item_main?.status === 'pending_makeup') {
                           statusText_list_map_item_main = `Makeup for ${log_item_cal_list_map_item_main.originalMissedDate}`;
                           StatusIcon_list_map_item_main = MakeupIcon; iconColor_list_map_item_main = "text-blue-500";
                        } else if (log_item_cal_list_map_item_main?.status === 'skipped') {
                           statusText_list_map_item_main = "Skipped";
                           StatusIcon_list_map_item_main = XCircle; iconColor_list_map_item_main = "text-muted-foreground";
                        } else if (isScheduledToday_list_map_item_main && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !log_item_cal_list_map_item_main) {
                            // Missed if scheduled, in the past (not today), and no log entry
                            statusText_list_map_item_main = "Missed"; StatusIcon_list_map_item_main = XCircle; iconColor_list_map_item_main = "text-destructive";
                        } else if (!isScheduledToday_list_map_item_main && !log_item_cal_list_map_item_main) {
                            // Not scheduled and no specific log (like makeup) for this day
                            statusText_list_map_item_main = "Not Scheduled"; StatusIcon_list_map_item_main = CircleIcon; iconColor_list_map_item_main = "text-muted-foreground/50";
                        }
                        // If it's scheduled for today and not yet logged, it remains "Scheduled" with orange icon

                        return (
                            <li key={h_item_cal_list_map_item_main.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                            <span className="font-medium truncate pr-2">{h_item_cal_list_map_item_main.name}</span>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <StatusIcon_list_map_item_main className={cn("h-3.5 w-3.5", iconColor_list_map_item_main)} />
                                <span>{statusText_list_map_item_main}</span>
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
              earnedBadges.map((b_item_main_ach_map_main) => (
                <div key={b_item_main_ach_map_main.id} className="p-3 border rounded-md bg-card shadow-sm">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">{b_item_main_ach_map_main.icon || "🏆"}</span>
                    <h4 className="font-semibold text-primary">{b_item_main_ach_map_main.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{b_item_main_ach_map_main.description}</p>
                  <p className="text-xs text-muted-foreground">Achieved: {format(new Date(b_item_main_ach_map_main.dateAchieved), "MMMM d, yyyy")}</p>
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
            {sheetMenuItems.map((item_menu_sheet_map_main) => (
              item_menu_sheet_map_main.href && item_menu_sheet_map_main.href === "/profile" ? (
                 <SheetClose asChild key={item_menu_sheet_map_main.label}>
                    <Link href={item_menu_sheet_map_main.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet_map_main.action} >
                            <item_menu_sheet_map_main.icon className="mr-3 h-5 w-5" />
                            {item_menu_sheet_map_main.label}
                        </Button>
                    </Link>
                 </SheetClose>
              ) : item_menu_sheet_map_main.href && item_menu_sheet_map_main.href !== "/profile" ? ( // Home link
                <SheetClose asChild key={item_menu_sheet_map_main.label}>
                    <Link href={item_menu_sheet_map_main.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet_map_main.action}>
                        <item_menu_sheet_map_main.icon className="mr-3 h-5 w-5" />
                        {item_menu_sheet_map_main.label}
                        </Button>
                    </Link>
                </SheetClose>
              ) : ( // Other items are buttons triggering actions
                <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => { item_menu_sheet_map_main.action(); if (item_menu_sheet_map_main.label !== 'Reminders') setIsSettingsSheetOpen(false); }} key={item_menu_sheet_map_main.label} >
                  <item_menu_sheet_map_main.icon className="mr-3 h-5 w-5" />
                  {item_menu_sheet_map_main.label}
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
                            notificationPermission === 'denied' ? 'text-red-600' : 'text-yellow-600' // 'default' or null will be yellow
                        )}>
                            {notificationPermission ? notificationPermission.charAt(0).toUpperCase() + notificationPermission.slice(1) : 'Checking...'}
                        </span>
                    </div>
                    {(notificationPermission === 'default' || notificationPermission === 'denied' || notificationPermission === null) && ( // Show button if default, denied, or not yet determined
                         <Button size="sm" variant="outline" onClick={() => { handleRequestNotificationPermission(); setIsSettingsSheetOpen(false); /* Close sheet after attempting */ }}>Enable Notifications</Button>
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
