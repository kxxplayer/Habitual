
"use client";

// ==========================================================================
// HABITUAL MAIN PAGE - REGENERATED (2025-05-20)
// This version is a clean regeneration based on all discussed features.
// Calendar dialog has basic styling for stability.
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
import InlineCreateHabitForm from '@/components/habits/InlineCreateHabitForm';


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
  AlertDialogDescription as AlertDialogDescriptionUI,
  AlertDialogFooter as AlertDialogFooterUI,
  AlertDialogHeader as AlertDialogHeaderUI,
  AlertDialogTitle as AlertDialogTitleUI,
} from '@/components/ui/alert-dialog';


import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Plus, LayoutDashboard, Home, Settings, StickyNote, CalendarDays, Award, Trophy, BookOpenText, UserCircle, BellRing, Loader2, Bell, Trash2, CheckCircle2, XCircle, Circle as CircleIcon, CalendarClock as MakeupIcon, MoreHorizontal, PlusCircle, Lightbulb, FilePenLine, Sparkles as SparklesIcon } from 'lucide-react';
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
  const [isLoadingHabits, setIsLoadingHabits] = React.useState(true); // To manage loading state of habits

  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = React.useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = React.useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = React.useState<AISuggestionType | null>(null);

  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = React.useState(false);
  const [editingHabit, setEditingHabit] = React.useState<Habit | null>(null);
  const [initialFormDataForDialog, setInitialFormDataForDialog] = React.useState<Partial<CreateHabitFormData> | null>(null);

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

  const [isDeleteHabitConfirmOpen, setIsDeleteHabitConfirmOpen] = React.useState(false);
  const [habitToDelete, setHabitToDelete] = React.useState<{ id: string; name: string } | null>(null);

  const [isDailyQuestDialogOpen, setIsDailyQuestDialogOpen] = React.useState(false);
  const [showInlineHabitForm, setShowInlineHabitForm] = React.useState(false);

  // Authentication State
  React.useEffect(() => {
    console.log("Auth effect running");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const previousUid = previousAuthUserUidRef.current;
      const currentUid = currentUser?.uid || null;
      console.log(`Auth state changed. Prev UID: ${previousUid}, Curr UID: ${currentUid}`);

      if (previousUid !== currentUid) {
        console.log("User identity changed. Clearing user-specific state and localStorage.");

        // Clear localStorage for the previous user if there was one
        if (previousUid && typeof window !== 'undefined') {
           localStorage.removeItem(`${LS_KEY_PREFIX_HABITS}${previousUid}`);
           localStorage.removeItem(`${LS_KEY_PREFIX_BADGES}${previousUid}`);
           localStorage.removeItem(`${LS_KEY_PREFIX_POINTS}${previousUid}`);
           localStorage.removeItem(`${LS_KEY_PREFIX_DAILY_QUEST}${previousUid}`);
           console.log(`Cleared localStorage for previous user: ${previousUid}`);
        }

        // Reset all React state related to user data
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
        // Also reset dialog states
        setIsDeleteHabitConfirmOpen(false);
        setIsAISuggestionDialogOpen(false);
        setIsCalendarDialogOpen(false); // Keep calendar dialog closed on user change
        setIsCreateHabitDialogOpen(false);
        setIsDailyQuestDialogOpen(false); // Don't show quest immediately on user switch
        setShowInlineHabitForm(false);
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
        // No automatic request; let user trigger via settings.
        setNotificationPermission(Notification.permission); // Usually 'default'
      } else {
        setNotificationPermission(Notification.permission);
      }
    } else {
      console.log('Notifications not supported by this browser.');
      setNotificationPermission('denied'); // Treat as denied if not supported
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
      // Ensure states are clear if user becomes null after being authenticated
      if (habits.length > 0) setHabits([]);
      if (earnedBadges.length > 0) setEarnedBadges([]);
      if (totalPoints > 0) setTotalPoints(0);
      setIsLoadingHabits(false); // Important to stop loading indicator if no user
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
          // Robust habit data sanitization
          const id_val = String(h.id || Date.now().toString() + Math.random().toString(36).substring(2, 7));
          const name_val = String(h.name || 'Unnamed Habit');
          const description_val = typeof h.description === 'string' ? h.description : undefined;
          const category_val = HABIT_CATEGORIES.includes(h.category as HabitCategory) ? h.category : 'Other';

          let daysOfWeek_val: WeekDay[] = Array.isArray(h.daysOfWeek) ? h.daysOfWeek.filter((d_val: any) => weekDays.includes(d_val as WeekDay)) : [];
          if (!Array.isArray(h.daysOfWeek) && typeof h.frequency === 'string') { // Migration for old frequency
            const freqLower_val = h.frequency.toLowerCase();
            if (freqLower_val === 'daily') daysOfWeek_val = [...weekDays];
            else {
              const dayMap_val: { [key_val: string]: WeekDay } = { 'sun': 'Sun', 'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu', 'fri': 'Fri', 'sat': 'Sat' };
              daysOfWeek_val = freqLower_val.split(/[\s,]+/).map((d_str: string) => dayMap_val[d_str.trim() as keyof typeof dayMap_val]).filter(Boolean) as WeekDay[];
            }
          }

          const optimalTiming_val = typeof h.optimalTiming === 'string' ? h.optimalTiming : undefined;
          let migratedDurationHours_val: number | undefined = typeof h.durationHours === 'number' ? h.durationHours : undefined;
          let migratedDurationMinutes_val: number | undefined = typeof h.durationMinutes === 'number' ? h.durationMinutes : undefined;
          if (typeof h.duration === 'string' && migratedDurationHours_val === undefined && migratedDurationMinutes_val === undefined) {
            const durationStr_val = h.duration.toLowerCase();
            const hourMatch_val = durationStr_val.match(/(\d+)\s*h/); // Look for "1h", "2 h"
            const minMatch_val = durationStr_val.match(/(\d+)\s*m/);  // Look for "30m", "15 min"
            if (hourMatch_val) migratedDurationHours_val = parseInt(hourMatch_val[1]);
            if (minMatch_val) migratedDurationMinutes_val = parseInt(minMatch_val[1]);
          }


          let migratedSpecificTime_val = typeof h.specificTime === 'string' ? h.specificTime : undefined;
          if (migratedSpecificTime_val && migratedSpecificTime_val.match(/^\d{1,2}:\d{2}\s*(am|pm)$/i)) { // e.g., 8:00am, 09:30 PM
            try {
              const [timePart_map, modifierPart_map] = migratedSpecificTime_val.split(/\s+/);
              let [hours_map_str, minutes_map_str] = timePart_map.split(':');
              let hours_map_val = parseInt(hours_map_str, 10);
              const minutes_map_val = parseInt(minutes_map_str, 10);
              if (modifierPart_map.toLowerCase() === 'pm' && hours_map_val < 12) hours_map_val += 12;
              if (modifierPart_map.toLowerCase() === 'am' && hours_map_val === 12) hours_map_val = 0; // Midnight case
              migratedSpecificTime_val = `${String(hours_map_val).padStart(2, '0')}:${String(minutes_map_val).padStart(2, '0')}`;
            } catch (e_map_time) { console.warn("Error parsing specificTime for migration", h.specificTime, e_map_time) }
          } else if (migratedSpecificTime_val && migratedSpecificTime_val.match(/^\d{1,2}:\d{2}$/)) { // e.g., 08:00, 17:30
             const [hours_val_t, minutes_val_t] = migratedSpecificTime_val.split(':').map(Number);
             migratedSpecificTime_val = `${String(hours_val_t).padStart(2, '0')}:${String(minutes_val_t).padStart(2, '0')}`;
          }


          const migratedCompletionLog_val = (Array.isArray(h.completionLog) ? h.completionLog : (Array.isArray(h.completedDates) ? h.completedDates.map((d_map_log: string) => ({ date: d_map_log, time: 'N/A', note: undefined, status: 'completed' })) : []))
            .map((log_map_item: any): HabitCompletionLogEntry | null => {
              if (typeof log_map_item.date !== 'string' || !log_map_item.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.warn("Sanitizing: Invalid or missing date in log entry for habit id", id_val, log_map_item);
                return null; // Filter out invalid entries
              }
              const status_val = ['completed', 'pending_makeup', 'skipped'].includes(log_map_item.status) ? log_map_item.status : 'completed'; // Default old to completed
              const originalMissedDate_val = typeof log_map_item.originalMissedDate === 'string' && log_map_item.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? log_map_item.originalMissedDate : undefined;

              return {
                date: log_map_item.date,
                time: log_map_item.time || 'N/A', // Default time if missing
                note: typeof log_map_item.note === 'string' ? log_map_item.note : undefined,
                status: status_val,
                originalMissedDate: originalMissedDate_val,
              };
            })
            .filter((log_item_filter): log_item_filter is HabitCompletionLogEntry => log_item_filter !== null) // Remove nulls
            .sort((a_log_sort,b_log_sort) => b_log_sort.date.localeCompare(a_log_sort.date)); // Sort by date descending

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
        setHabits([]); // Fallback to empty if parsing fails
      }
    } else {
      setHabits([]); // No stored habits for this user
    }

    // Common suggestions and Daily Quest Dialog logic for new users
    if (authUser && parsedHabits.length === 0 && !commonSuggestionsFetched) {
      console.log(`Fetching common suggestions for new user ${userUid}`);
      setIsLoadingCommonSuggestions(true);
      getCommonHabitSuggestions({ count: 5 })
        .then(response => {
          if (response && Array.isArray(response.suggestions)) {
            setCommonHabitSuggestions(response.suggestions);
          } else {
            setCommonHabitSuggestions([]); // Ensure it's an array
          }
        })
        .catch(err => {
          console.error("Failed to fetch common habit suggestions:", err);
          setCommonHabitSuggestions([]); // Fallback
        })
        .finally(() => {
          setIsLoadingCommonSuggestions(false);
          setCommonSuggestionsFetched(true); // Mark as fetched to avoid re-fetching on this session
          // Show Daily Quest Dialog if no habits and not seen before for this user
          const dailyQuestKey = `${LS_KEY_PREFIX_DAILY_QUEST}${userUid}`;
          const hasSeenDailyQuest = typeof window !== 'undefined' ? localStorage.getItem(dailyQuestKey) : null;
          if (!hasSeenDailyQuest) {
            setIsDailyQuestDialogOpen(true);
          }
        });
    } else if (parsedHabits.length > 0) {
      setCommonSuggestionsFetched(true); // User already has habits
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

  }, [authUser, isLoadingAuth, router]); // Removed commonSuggestionsFetched from deps here to allow re-fetch if authUser changes to a new user


  // Save habits to localStorage & check for badges
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return; // Don't save if still loading or no user
    const userHabitsKey = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    localStorage.setItem(userHabitsKey, JSON.stringify(habits));
    console.log(`Saved habits for user ${authUser.uid} to localStorage.`);

    const newlyEarned = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarned.length > 0) {
      const updatedBadges = [...earnedBadges];
      let newBadgeAwarded = false;
      newlyEarned.forEach(async newBadge => {
        if (!earnedBadges.some(eb => eb.id === newBadge.id)) { // Ensure badge isn't already earned
            updatedBadges.push(newBadge);
            newBadgeAwarded = true;
            console.log(`New Badge Unlocked: ${newBadge.name} - ${newBadge.description}`);
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
      if (newBadgeAwarded) {
        setEarnedBadges(updatedBadges);
      }
    }
  }, [habits, authUser, isLoadingAuth, isLoadingHabits, earnedBadges]); // Add earnedBadges to dependency array

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

  // Placeholder Reminder Scheduling Logic
  React.useEffect(() => {
    // Clear existing timeouts
    reminderTimeouts.current.forEach(clearTimeout);
    reminderTimeouts.current = [];

    if (notificationPermission === 'granted' && authUser) { // Only schedule if permission granted and user logged in
      console.log("Checking habits for reminders (placeholder)...");
      habits.forEach(habit => {
        if (habit.reminderEnabled) {
          let reminderDateTime: Date | null = null;
          const now = new Date();

          if (habit.specificTime && habit.specificTime.toLowerCase() !== 'anytime' && habit.specificTime.toLowerCase() !== 'flexible') {
            try {
              const [hours, minutes] = habit.specificTime.split(':').map(Number);
              if (isNaN(hours) || isNaN(minutes)) throw new Error("Invalid time format");
              let specificEventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
              // If the specific time for today is already past, schedule for tomorrow if it's a recurring habit for tomorrow
              // This logic needs to be more robust for multi-day scheduling and actual notifications.
              // For now, just 30 mins before.
              reminderDateTime = new Date(specificEventTime.getTime() - 30 * 60 * 1000); // 30 minutes before
            } catch (e) {
              console.error(`Error parsing specificTime "${habit.specificTime}" for habit "${habit.name}"`, e);
            }
          } else if (habit.optimalTiming) { // If no specific time, but optimal timing exists
            let baseHour = 10; // Default to 10 AM if optimal timing is unclear
            const timingLower = habit.optimalTiming.toLowerCase();
            if (timingLower.includes('morning')) baseHour = 9; // Reminder at 9 AM
            else if (timingLower.includes('afternoon')) baseHour = 13; // Reminder at 1 PM
            else if (timingLower.includes('evening')) baseHour = 18; // Reminder at 6 PM
            reminderDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), baseHour, 0, 0, 0);
          }

          if (reminderDateTime && reminderDateTime > now) {
            const delay = reminderDateTime.getTime() - now.getTime();
            console.log(`Reminder for "${habit.name}" would be scheduled at: ${reminderDateTime.toLocaleString()} (in ${Math.round(delay/60000)} mins)`);
            
            // Actual setTimeout logic for new Notification(...) would go here.
            // const timeoutId = setTimeout(() => {
            //   if (Notification.permission === 'granted') {
            //     new Notification("Habitual Reminder", {
            //       body: `Time for your habit: ${habit.name}!`,
            //       // icon: "/icons/icon-192x192.png" // Optional
            //     });
            //     console.log(`REMINDER FIRED for: ${habit.name}`);
            //   }
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
  }, [habits, notificationPermission, authUser]); // Depend on authUser too


  const handleSaveHabit = (habitData: CreateHabitFormData & { id?: string }) => {
    if (!authUser) return; // Should not happen if UI is disabled, but good check
    const isEditingMode = !!(habitData.id && editingHabit && editingHabit.id === habitData.id);

    if (isEditingMode) {
      setHabits(prevHabits => prevHabits.map(h => h.id === habitData.id ? {
        ...h, // Keep existing completionLog and reminderEnabled status
        name: habitData.name,
        description: habitData.description,
        category: habitData.category || 'Other',
        daysOfWeek: habitData.daysOfWeek,
        optimalTiming: habitData.optimalTiming,
        durationHours: habitData.durationHours === null ? undefined : habitData.durationHours,
        durationMinutes: habitData.durationMinutes === null ? undefined : habitData.durationMinutes,
        specificTime: habitData.specificTime,
      } : h));
      console.log(`Habit Updated: ${habitData.name}`);
    } else {
      const newHabit: Habit = {
        id: String(Date.now() + Math.random()), // Simple unique ID
        name: habitData.name,
        description: habitData.description,
        category: habitData.category || 'Other',
        daysOfWeek: habitData.daysOfWeek,
        optimalTiming: habitData.optimalTiming,
        durationHours: habitData.durationHours === null ? undefined : habitData.durationHours,
        durationMinutes: habitData.durationMinutes === null ? undefined : habitData.durationMinutes,
        specificTime: habitData.specificTime,
        completionLog: [],
        reminderEnabled: false, // Default for new habits
      };
      setHabits(prevHabits => [...prevHabits, newHabit]);
      console.log(`Habit Added: ${newHabit.name}`);
      // If this was the first habit, and it came from a suggestion, clear common suggestions
      if (habits.length === 0 && commonHabitSuggestions.length > 0) {
        setCommonHabitSuggestions([]);
      }
    }
    setIsCreateHabitDialogOpen(false); // Close dialog if it was used
    setShowInlineHabitForm(false);    // Close inline form if it was used
    setInitialFormDataForDialog(null);  // Clear any pre-fill data
    setEditingHabit(null);            // Clear editing state
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
    setShowInlineHabitForm(false); // Close inline form if open
    setIsCreateHabitDialogOpen(true); // Open dialog for editing
  };


  const handleToggleComplete = async (habitId_toggle: string, date_toggle: string, completed_toggle: boolean) => {
    let habitNameForQuote: string | undefined = undefined;
    let pointsChange = 0;
    let justCompletedANewTask = false;

    setHabits(prevHabits =>
      prevHabits.map(h => {
        if (h.id === habitId_toggle) {
          habitNameForQuote = h.name;
          let newCompletionLog = [...h.completionLog];
          const existingLogIndex = newCompletionLog.findIndex(log => log.date === date_toggle);
          const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          if (completed_toggle) { // Marking as complete
            if (existingLogIndex > -1) {
              const existingLog = newCompletionLog[existingLogIndex];
              if (existingLog.status !== 'completed') { // Was skipped or pending_makeup
                pointsChange = POINTS_PER_COMPLETION;
                justCompletedANewTask = true;
              }
              newCompletionLog[existingLogIndex] = { ...existingLog, status: 'completed', time: currentTime };
            } else { // No log entry, new completion
              pointsChange = POINTS_PER_COMPLETION;
              justCompletedANewTask = true;
              newCompletionLog.push({ date: date_toggle, time: currentTime, status: 'completed', note: undefined });
            }
          } else { // Un-marking as complete
            if (existingLogIndex > -1) {
              const logEntry = newCompletionLog[existingLogIndex];
              if (logEntry.status === 'completed') { // Was actually completed, so deduct points
                 pointsChange = -POINTS_PER_COMPLETION;
              }
              // If it was a completed makeup task, revert to pending_makeup
              if (logEntry.status === 'completed' && logEntry.originalMissedDate) {
                newCompletionLog[existingLogIndex] = { ...logEntry, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry.note) { // If there's a note, mark as skipped instead of removing
                newCompletionLog[existingLogIndex] = { ...logEntry, status: 'skipped', time: 'N/A' };
              }
              else { // Otherwise, remove the log entry
                newCompletionLog.splice(existingLogIndex, 1);
              }
            }
          }
          return { ...h, completionLog: newCompletionLog.sort((a, b) => b.date.localeCompare(a.date)) };
        }
        return h;
      })
    );

    if (justCompletedANewTask && habitNameForQuote && authUser) {
      try {
        const quoteResult = await getMotivationalQuote({ habitName: habitNameForQuote });
        console.log(`Motivational Quote: ${quoteResult.quote}`);
      } catch (error_quote) {
        console.error("Failed to fetch motivational quote:", error_quote);
        console.log("Motivational Quote: Well Done! You're making progress!");
      }
    }

    if (pointsChange !== 0) {
      setTotalPoints(prevPoints => Math.max(0, prevPoints + pointsChange));
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


  const handleOpenAISuggestionDialog = async (habit: Habit) => {
    setSelectedHabitForAISuggestion(habit);
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habit.id, suggestionText: '', isLoading: true });

    try {
      const completionEntries = habit.completionLog.map(log => {
        let entry = `${log.date} at ${log.time || 'N/A'}`;
        if (log.status === 'skipped') entry += ` (Skipped)`;
        else if (log.status === 'pending_makeup') entry += ` (Makeup Pending for ${log.originalMissedDate})`;
        else if (log.status === 'completed' || log.status === undefined) entry += ` (Completed)`; // undefined for old data

        if (log.note && log.note.trim() !== "") entry += ` (Note: ${log.note.trim()})`;
        return entry;
      });
      const trackingData = `Completions & Status: ${completionEntries.join('; ') || 'None yet'}.`;

      const inputForAI = {
        habitName: habit.name,
        habitDescription: habit.description,
        daysOfWeek: habit.daysOfWeek,
        optimalTiming: habit.optimalTiming,
        durationHours: habit.durationHours,
        durationMinutes: habit.durationMinutes,
        specificTime: habit.specificTime,
        trackingData: trackingData,
      };

      const result = await getHabitSuggestion(inputForAI);
      setAISuggestion({ habitId: habit.id, suggestionText: result.suggestion, isLoading: false });
    } catch (error) {
      console.error("Error fetching AI suggestion:", error);
      setAISuggestion({
        habitId: habit.id,
        suggestionText: '',
        isLoading: false,
        error: 'Failed to get suggestion.'
      });
      console.log("AI Suggestion Error: Could not fetch suggestion.");
    }
  };

  const handleOpenReflectionDialog = (habitId: string, date: string, habitName: string) => {
    const habit = habits.find(h => h.id === habitId);
    const logEntry = habit?.completionLog.find(log => log.date === date);
    setReflectionDialogData({
      habitId,
      date,
      initialNote: logEntry?.note || '',
      habitName,
    });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (note: string) => {
    if (!reflectionDialogData) return;
    const { habitId, date } = reflectionDialogData;

    setHabits(prevHabits =>
      prevHabits.map(h_for_note_save => {
        if (h_for_note_save.id === habitId) {
          let logEntryExists_for_note_save = false;
          const newCompletionLog_for_note_save = h_for_note_save.completionLog.map(log_item_for_note_save => {
            if (log_item_for_note_save.date === date) {
              logEntryExists_for_note_save = true;
              return { ...log_item_for_note_save, note: note.trim() === "" ? undefined : note.trim() };
            }
            return log_item_for_note_save;
          });
          if (!logEntryExists_for_note_save) { // If no log entry for this date, create one (e.g. adding note to an uncompleted day)
             const existingStatus_reflection_save = h_for_note_save.completionLog.find(l_note_reflection => l_note_reflection.date === date)?.status;
             newCompletionLog_for_note_save.push({
                date,
                time: 'N/A',
                note: note.trim() === "" ? undefined : note.trim(),
                status: existingStatus_reflection_save || 'skipped' // Default to skipped if adding a note to an uncompleted day
             });
             newCompletionLog_for_note_save.sort((a_sort_reflection,b_sort_reflection) => b_sort_reflection.date.localeCompare(a_sort_reflection.date));
          }
          return { ...h_for_note_save, completionLog: newCompletionLog_for_note_save };
        }
        return h_for_note_save;
      })
    );
    console.log(`Reflection Saved for ${reflectionDialogData.habitName} on ${reflectionDialogData.date}`);
    setReflectionDialogData(null);
    setIsReflectionDialogOpen(false);
  };

  const handleOpenRescheduleDialog = (habit: Habit, missedDate: string) => {
    setRescheduleDialogData({ habit, missedDate });
  };

  const handleSaveRescheduledHabit = (habitId_rescheduled: string, originalMissedDate_rescheduled: string, newDate_rescheduled: string) => {
    setHabits(prevHabits_rescheduled => prevHabits_rescheduled.map(h_rescheduled => {
      if (h_rescheduled.id === habitId_rescheduled) {
        let newCompletionLog_rescheduled_save = [...h_rescheduled.completionLog];
        const existingMissedLogIndex_rescheduled_save = newCompletionLog_rescheduled_save.findIndex(log_reschedule => log_reschedule.date === originalMissedDate_rescheduled);

        if(existingMissedLogIndex_rescheduled_save > -1) {
            if (newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].status !== 'completed') {
                newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].status = 'skipped';
                newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].time = 'N/A';
            }
        } else {
            newCompletionLog_rescheduled_save.push({
                date: originalMissedDate_rescheduled,
                time: 'N/A',
                status: 'skipped'
            });
        }

        newCompletionLog_rescheduled_save.push({
          date: newDate_rescheduled,
          time: 'N/A',
          status: 'pending_makeup',
          originalMissedDate: originalMissedDate_rescheduled,
        });
        newCompletionLog_rescheduled_save.sort((a_sort_reschedule,b_sort_reschedule) => b_sort_reschedule.date.localeCompare(a_sort_reschedule.date));
        return { ...h_rescheduled, completionLog: newCompletionLog_rescheduled_save };
      }
      return h_rescheduled;
    }));
    const habitName_rescheduled = habits.find(h_find_rescheduled_name=>h_find_rescheduled_name.id === habitId_rescheduled)?.name || "Habit";
    console.log(`Habit Rescheduled: ${habitName_rescheduled} from ${originalMissedDate_rescheduled} to ${newDate_rescheduled}`);
  };

  const handleSaveMarkAsSkipped = (habitId: string, missedDate: string) => {
     setHabits(prevHabits => prevHabits.map(h => {
      if (h.id === habitId) {
        let newCompletionLog = [...h.completionLog];
        const existingLogIndex = newCompletionLog.findIndex(log => log.date === missedDate);
        if (existingLogIndex > -1) {
          if (newCompletionLog[existingLogIndex].status !== 'completed') {
            newCompletionLog[existingLogIndex] = { ...newCompletionLog[existingLogIndex], status: 'skipped', time: 'N/A' };
          }
        } else {
          newCompletionLog.push({ date: missedDate, time: 'N/A', status: 'skipped' });
        }
        newCompletionLog.sort((a,b) => b.date.localeCompare(a.date));
        return { ...h, completionLog: newCompletionLog };
      }
      return h;
    }));
    const habitName = habits.find(h => h.id === habitId)?.name || "Habit";
    console.log(`Habit Skipped: ${habitName} on ${missedDate}`);
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

  const handleOpenDeleteHabitConfirm = (habitId: string, habitName: string) => {
    setHabitToDelete({ id: habitId, name: habitName });
    setIsDeleteHabitConfirmOpen(true);
  };

  const handleConfirmDeleteSingleHabit = () => {
    if (habitToDelete && authUser) {
      setHabits(prevHabits => prevHabits.filter(h => h.id !== habitToDelete.id));
      console.log(`Habit "${habitToDelete.name}" deleted.`);
      setHabitToDelete(null);
    }
    setIsDeleteHabitConfirmOpen(false);
  };

  const handleCustomizeSuggestedHabit = (suggestion: SuggestedHabit) => {
    setEditingHabit(null); // Ensure not in edit mode
    setInitialFormDataForDialog({ // For dialog
      name: suggestion.name,
      category: suggestion.category || 'Other',
      description: '', // Common suggestions don't have descriptions
      daysOfWeek: [],  // User to customize days
    });
    setShowInlineHabitForm(false); // Close inline form if it was open
    setIsCreateHabitDialogOpen(true); // Open dialog
  };

  const handleCloseDailyQuestDialog = () => {
    setIsDailyQuestDialogOpen(false);
    if (authUser && typeof window !== 'undefined') {
      localStorage.setItem(`${LS_KEY_PREFIX_DAILY_QUEST}${authUser.uid}`, 'true');
    }
  };

  // Calendar Dialog Logic
  // To fix the "cDate is not defined" error, this is now minimal and only styles selected day.
  const calendarDialogModifiers = React.useMemo(() => {
    console.log("HabitualPage: Minimal calendarDialogModifiers running. Selected Date:", selectedCalendarDate);
    // This is the most simplified version to avoid "cDate is not defined" errors.
    // It will only highlight the selected day and not show custom styles for completed/missed/scheduled.
    return {
      selected: selectedCalendarDate ? [selectedCalendarDate] : [],
    };
  }, [selectedCalendarDate]);

  const calendarDialogModifierStyles: DayPicker['modifiersStyles'] = React.useMemo(() => {
    // Styles only for the selected day.
    return {
      selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' },
    };
  }, []);

  const habitsForSelectedCalendarDate = React.useMemo(() => {
    try {
      if (!selectedCalendarDate) return [];
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
      action: () => {
        console.log('Reminder Settings: Current Permission -', notificationPermission);
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

  // Render Logic
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

  // Main app view
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
            <div className="mb-4 sm:mb-6">
                <HabitOverview habits={habits} totalPoints={totalPoints} />
            </div>

            {showInlineHabitForm && (
              <div className="my-4">
                <InlineCreateHabitForm
                  onAddHabit={handleSaveHabit}
                  onCloseForm={() => {
                    setShowInlineHabitForm(false);
                    setInitialFormDataForDialog(null);
                  }}
                  initialData={initialFormDataForDialog}
                />
              </div>
            )}

            {!showInlineHabitForm && habits.length === 0 && !isLoadingCommonSuggestions && commonHabitSuggestions.length > 0 && (
              <div className="my-4 p-3 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
                <div className="px-2 pt-0">
                  <h3 className="text-md font-semibold flex items-center text-primary mb-1">
                     <Lightbulb className="mr-2 h-5 w-5"/> Start with these!
                  </h3>
                  <p className="text-xs text-muted-foreground mb-1.5">Click a tile to customize and add it to your list:</p>
                </div>
                <div className="p-1">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {commonHabitSuggestions.map((sugg_item, idx_sugg) => (
                      <Button key={idx_sugg} variant="outline"
                        className="p-2.5 h-auto flex flex-col items-center justify-center space-y-0.5 min-w-[90px] text-center shadow-sm hover:shadow-md transition-shadow text-xs"
                        onClick={() => handleCustomizeSuggestedHabit(sugg_item)}
                      >
                        <span className="font-medium">{sugg_item.name}</span>
                        {sugg_item.category && <span className="text-primary/80 opacity-80">{sugg_item.category}</span>}
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

            {!showInlineHabitForm && (
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
            )}
          </main>
          <footer className="py-3 text-center text-xs text-muted-foreground border-t mt-auto">
            <p>&copy; {new Date().getFullYear()} Habitual.</p>
          </footer>
        </ScrollArea>

        {/* Bottom Navigation Bar */}
        <div className="shrink-0 bg-card border-t border-border p-1 flex justify-around items-center h-16 sticky bottom-0 z-30">
          <Button variant="ghost" className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/3">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-0.5">Home</span>
          </Button>
          <Button variant="ghost" onClick={() => setIsAchievementsDialogOpen(true)} className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/3">
            <Award className="h-5 w-5" />
            <span className="text-xs mt-0.5">Badges</span>
          </Button>
          <Button variant="ghost" onClick={() => setIsSettingsSheetOpen(true)} className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/3">
            <Settings className="h-5 w-5" />
            <span className="text-xs mt-0.5">Settings</span>
          </Button>
        </div>
      </div>

      {!showInlineHabitForm && (
         <Button
            className="fixed bottom-[calc(4rem+1.5rem)] right-6 sm:right-10 h-14 w-14 p-0 rounded-full shadow-xl z-30 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
            onClick={() => {
            setEditingHabit(null);
            setInitialFormDataForDialog(null);
            setShowInlineHabitForm(true); // Switch to inline form
            }}
            aria-label="Add New Habit"
        >
            <Plus className="h-7 w-7" />
        </Button>
      )}


      {/* Dialogs */}
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
            <AlertDialogTitleUI>Confirm Deletion</AlertDialogTitleUI>
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

      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-full max-w-[calc(100%-2rem)]">
            <DialogHeader>
                <DialogTitle className="flex items-center text-xl">
                    <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                    Habit Calendar
                </DialogTitle>
                 <DialogDescription>
                    View your habit activity. (Basic view)
                </DialogDescription>
            </DialogHeader>
            <div className="py-2 max-h-[65vh] overflow-y-auto pr-2 flex flex-col items-center">
                 <Calendar
                    mode="single"
                    selected={selectedCalendarDate}
                    onSelect={setSelectedCalendarDate}
                    modifiers={calendarDialogModifiers} // Using minimal modifiers
                    modifiersStyles={calendarDialogModifierStyles} // Using minimal styles
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
                        {habitsForSelectedCalendarDate.map(h_item_cal_list_map => {
                        const log_item_cal_list_map = h_item_cal_list_map.completionLog.find(l_cal_list_map => l_cal_list_map.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                        const dayOfWeekForSelected_list_map = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                        const isScheduledToday_list_map = h_item_cal_list_map.daysOfWeek.includes(dayOfWeekForSelected_list_map);

                        let statusText_list_map = "Scheduled";
                        let StatusIcon_list_map = CircleIcon;
                        let iconColor_list_map = "text-orange-500";

                        if (log_item_cal_list_map?.status === 'completed') { statusText_list_map = `Completed ${log_item_cal_list_map.time || ''}`; StatusIcon_list_map = CheckCircle2; iconColor_list_map = "text-accent"; }
                        else if (log_item_cal_list_map?.status === 'pending_makeup') { statusText_list_map = `Makeup for ${log_item_cal_list_map.originalMissedDate}`; StatusIcon_list_map = MakeupIcon; iconColor_list_map = "text-blue-500"; }
                        else if (log_item_cal_list_map?.status === 'skipped') { statusText_list_map = "Skipped"; StatusIcon_list_map = XCircle; iconColor_list_map = "text-muted-foreground"; }
                        else if (isScheduledToday_list_map && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !log_item_cal_list_map) {
                            statusText_list_map = "Missed"; StatusIcon_list_map = XCircle; iconColor_list_map = "text-destructive";
                        }

                        return (
                            <li key={h_item_cal_list_map.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                            <span className="font-medium truncate pr-2">{h_item_cal_list_map.name}</span>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <StatusIcon_list_map className={cn("h-3.5 w-3.5", iconColor_list_map)} />
                                <span>{statusText_list_map}</span>
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
              earnedBadges.map((b_item_page_ach) => (
                <div key={b_item_page_ach.id} className="p-3 border rounded-md bg-card shadow-sm">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">{b_item_page_ach.icon || "🏆"}</span>
                    <h4 className="font-semibold text-primary">{b_item_page_ach.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{b_item_page_ach.description}</p>
                  <p className="text-xs text-muted-foreground">Achieved: {format(new Date(b_item_page_ach.dateAchieved), "MMMM d, yyyy")}</p>
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
            {sheetMenuItems.map((item_menu_sheet) => (
              item_menu_sheet.href && item_menu_sheet.href === "/profile" ? (
                 <SheetClose asChild key={item_menu_sheet.label}><Link href={item_menu_sheet.href}><Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet.action}><item_menu_sheet.icon className="mr-3 h-5 w-5" />{item_menu_sheet.label}</Button></Link></SheetClose>
              ) : item_menu_sheet.href && item_menu_sheet.href !== "/profile" ? (
                <SheetClose asChild key={item_menu_sheet.label}><Link href={item_menu_sheet.href}><Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet.action}><item_menu_sheet.icon className="mr-3 h-5 w-5" />{item_menu_sheet.label}</Button></Link></SheetClose>
              ) : (
                <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => { item_menu_sheet.action(); if (item_menu_sheet.label !== 'Reminders') setIsSettingsSheetOpen(false); }} key={item_menu_sheet.label} >
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
