"use client";

import * as React from 'react';
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
import InlineCreateHabitForm from '@/components/habits/InlineCreateHabitForm';
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

import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { DayPicker, DayModifiers } from 'react-day-picker';
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDescriptionEl, // Renamed
  DialogFooter,
  DialogHeader,
  DialogTitle as DialogTitleEl, // Renamed
} from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionUI, // Distinct name
  AlertDialogFooter as AlertDialogFooterUI, // Distinct name
  AlertDialogHeader as AlertDialogHeaderUI, // Distinct name
  AlertDialogTitle as AlertDialogTitleUI, // Distinct name
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  console.log("HabitualPage RENDER - Initializing page logic");

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

  const [showInlineHabitForm, setShowInlineHabitForm] = React.useState(false);


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


  React.useEffect(() => {
    console.log("Auth effect running");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const previousUid_auth_effect = previousAuthUserUidRef.current;
      const currentUid_auth_effect = currentUser?.uid || null;
      console.log(`Auth state changed. Prev UID: ${previousUid_auth_effect}, Curr UID: ${currentUid_auth_effect}`);

      if (previousUid_auth_effect !== currentUid_auth_effect) {
        console.log("User identity changed. Clearing user-specific state and localStorage.");

        const userHabitsKey_clear = previousUid_auth_effect ? `${LS_KEY_PREFIX_HABITS}${previousUid_auth_effect}` : null;
        const userBadgesKey_clear = previousUid_auth_effect ? `${LS_KEY_PREFIX_BADGES}${previousUid_auth_effect}` : null;
        const userPointsKey_clear = previousUid_auth_effect ? `${LS_KEY_PREFIX_POINTS}${previousUid_auth_effect}` : null;

        if (userHabitsKey_clear && typeof window !== 'undefined') localStorage.removeItem(userHabitsKey_clear);
        if (userBadgesKey_clear && typeof window !== 'undefined') localStorage.removeItem(userBadgesKey_clear);
        if (userPointsKey_clear && typeof window !== 'undefined') localStorage.removeItem(userPointsKey_clear);
        console.log(`Cleared localStorage for previous user: ${previousUid_auth_effect}`);

        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(false);
        setShowInlineHabitForm(false);
        setEditingHabit(null);
        setInitialFormDataForDialog(null);
        setReflectionDialogData(null);
        setRescheduleDialogData(null);
        setHabitToDelete(null);
        setIsDeleteHabitConfirmOpen(false);
        setIsAISuggestionDialogOpen(false);
        setIsCalendarDialogOpen(false);
        setIsCreateHabitDialogOpen(false);
      }

      setAuthUser(currentUser);
      setIsLoadingAuth(false);
      previousAuthUserUidRef.current = currentUid_auth_effect;

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


  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      console.log('Notifications not supported by this browser.');
      setNotificationPermission('denied');
    }
  }, []);


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
          let daysOfWeek_val_map: WeekDay[] = Array.isArray(h.daysOfWeek) ? h.daysOfWeek.filter((d_val_map: any) => weekDays.includes(d_val_map as WeekDay)) : [];
          if (!Array.isArray(h.daysOfWeek) && typeof h.frequency === 'string') { // Migration for old frequency
            const freqLower_val_map = h.frequency.toLowerCase();
            if (freqLower_val_map === 'daily') daysOfWeek_val_map = [...weekDays];
            else {
              const dayMap_val_map: { [key_val_map: string]: WeekDay } = { 'sun': 'Sun', 'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu', 'fri': 'Fri', 'sat': 'Sat' };
              daysOfWeek_val_map = freqLower_val_map.split(/[\s,]+/).map((d_str_map: string) => dayMap_val_map[d_str_map.trim() as keyof typeof dayMap_val_map]).filter(Boolean) as WeekDay[];
            }
          }

          let migratedDurationHours_val_map: number | undefined = typeof h.durationHours === 'number' ? h.durationHours : undefined;
          let migratedDurationMinutes_val_map: number | undefined = typeof h.durationMinutes === 'number' ? h.durationMinutes : undefined;
          if (typeof h.duration === 'string' && migratedDurationHours_val_map === undefined && migratedDurationMinutes_val_map === undefined) {
            const durationStr_val_map = h.duration.toLowerCase();
            const hourMatch_val_map = durationStr_val_map.match(/(\d+)\s*h/);
            const minMatch_val_map = durationStr_val_map.match(/(\d+)\s*m/);
            if (hourMatch_val_map) migratedDurationHours_val_map = parseInt(hourMatch_val_map[1]);
            if (minMatch_val_map) migratedDurationMinutes_val_map = parseInt(minMatch_val_map[1]);
          }

          let migratedSpecificTime_val_map = typeof h.specificTime === 'string' ? h.specificTime : undefined;
          if (migratedSpecificTime_val_map && migratedSpecificTime_val_map.match(/^\d{1,2}:\d{2}\s*(am|pm)$/i)) { // HH:MM AM/PM to HH:mm
            try {
              const [timePart_map, modifierPart_map] = migratedSpecificTime_val_map.split(/\s+/);
              let [hours_map_str, minutes_map_str] = timePart_map.split(':');
              let hours_map_val = parseInt(hours_map_str, 10);
              const minutes_map_val = parseInt(minutes_map_str, 10);
              if (modifierPart_map.toLowerCase() === 'pm' && hours_map_val < 12) hours_map_val += 12;
              if (modifierPart_map.toLowerCase() === 'am' && hours_map_val === 12) hours_map_val = 0; // Midnight
              migratedSpecificTime_val_map = `${String(hours_map_val).padStart(2, '0')}:${String(minutes_map_val).padStart(2, '0')}`;
            } catch (e_map_time) { /* ignore, keep original if parse fails */ }
          } else if (migratedSpecificTime_val_map && migratedSpecificTime_val_map.match(/^\d{1,2}:\d{2}$/)) { // Ensure HH:mm
             const [hours_val_map_t, minutes_val_map_t] = migratedSpecificTime_val_map.split(':').map(Number);
             migratedSpecificTime_val_map = `${String(hours_val_map_t).padStart(2, '0')}:${String(minutes_val_map_t).padStart(2, '0')}`;
          }


          const migratedCompletionLog_val_map = (Array.isArray(h.completionLog) ? h.completionLog : (Array.isArray(h.completedDates) ? h.completedDates.map((d_map_log: string) => ({ date: d_map_log, time: 'N/A', note: undefined, status: 'completed' })) : [])).map((log_map_item: any): HabitCompletionLogEntry => ({
            date: typeof log_map_item.date === 'string' && log_map_item.date.match(/^\d{4}-\d{2}-\d{2}$/) ? log_map_item.date : '1970-01-01', // Fallback for invalid date
            time: log_map_item.time || 'N/A',
            note: log_map_item.note || undefined,
            status: ['completed', 'pending_makeup', 'skipped'].includes(log_map_item.status) ? log_map_item.status : 'completed',
            originalMissedDate: typeof log_map_item.originalMissedDate === 'string' && log_map_item.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? log_map_item.originalMissedDate : undefined,
          })).sort((a_log_sort_map,b_log_sort_map) => b_log_sort_map.date.localeCompare(a_log_sort_map.date));


          return {
            id: String(h.id || Date.now().toString() + Math.random().toString(36).substring(2,7)),
            name: String(h.name || 'Unnamed Habit'),
            description: typeof h.description === 'string' ? h.description : undefined,
            category: HABIT_CATEGORIES.includes(h.category as HabitCategory) ? h.category : 'Other',
            daysOfWeek: daysOfWeek_val_map,
            optimalTiming: typeof h.optimalTiming === 'string' ? h.optimalTiming : undefined,
            durationHours: migratedDurationHours_val_map,
            durationMinutes: migratedDurationMinutes_val_map,
            specificTime: migratedSpecificTime_val_map,
            completionLog: migratedCompletionLog_val_map,
            reminderEnabled: typeof h.reminderEnabled === 'boolean' ? h.reminderEnabled : false,
          };
        });
        setHabits(parsedHabits);
      } catch (e) {
        console.error(`Error parsing habits for user ${userUid}:`, e);
        setHabits([]);
      }
    } else {
      setHabits([]);
    }

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
          setCommonSuggestionsFetched(true);
        });
    } else if (parsedHabits.length > 0) {
      setCommonSuggestionsFetched(true);
    }

    const userBadgesKey = `${LS_KEY_PREFIX_BADGES}${userUid}`;
    const storedBadges = typeof window !== 'undefined' ? localStorage.getItem(userBadgesKey) : null;
    setEarnedBadges(storedBadges ? JSON.parse(storedBadges) : []);

    const userPointsKey = `${LS_KEY_PREFIX_POINTS}${userUid}`;
    const storedPoints = typeof window !== 'undefined' ? localStorage.getItem(userPointsKey) : null;
    setTotalPoints(storedPoints ? parseInt(storedPoints, 10) : 0);

    setIsLoadingHabits(false);
    console.log(`Data loading complete for user ${userUid}. Habits: ${parsedHabits.length}`);

  }, [authUser, isLoadingAuth, commonSuggestionsFetched, router]); // Added commonSuggestionsFetched

  // Save habits to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userHabitsKey = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    localStorage.setItem(userHabitsKey, JSON.stringify(habits));
    console.log(`Saved habits for user ${authUser.uid}`);

    const newlyEarned = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarned.length > 0) {
      const updatedBadges = [...earnedBadges];
      newlyEarned.forEach(async newBadge => {
        if (!earnedBadges.some(eb => eb.id === newBadge.id)) {
            updatedBadges.push(newBadge);
            console.log(`New Badge Unlocked: ${newBadge.name}`);
            if (newBadge.id === THREE_DAY_SQL_STREAK_BADGE_ID) {
              try {
                const sqlTipResult = await getSqlTip();
                console.log(`💡 Bonus SQL Tip: ${sqlTipResult.tip}`);
              } catch (tipError) {
                console.error("Failed to fetch SQL tip:", tipError);
              }
            }
        }
      });
      setEarnedBadges(updatedBadges);
    }
  }, [habits, authUser, isLoadingAuth, isLoadingHabits, earnedBadges]);

  // Save badges to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userBadgesKey = `${LS_KEY_PREFIX_BADGES}${authUser.uid}`;
    localStorage.setItem(userBadgesKey, JSON.stringify(earnedBadges));
    console.log(`Saved badges for user ${authUser.uid}`);
  }, [earnedBadges, authUser, isLoadingAuth, isLoadingHabits]);

  // Save points to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userPointsKey = `${LS_KEY_PREFIX_POINTS}${authUser.uid}`;
    localStorage.setItem(userPointsKey, totalPoints.toString());
    console.log(`Saved points for user ${authUser.uid}`);
  }, [totalPoints, authUser, isLoadingAuth, isLoadingHabits]);

  // Placeholder Reminder Logic
  React.useEffect(() => {
    reminderTimeouts.current.forEach(clearTimeout);
    reminderTimeouts.current = [];

    if (notificationPermission === 'granted' && authUser) {
      habits.forEach(habit_reminder_item_effect => {
        if (habit_reminder_item_effect.reminderEnabled) {
          let reminderDateTime_effect: Date | null = null;
          const now_effect_reminder = new Date();
          try {
            if (habit_reminder_item_effect.specificTime) {
              const [hours_effect_reminder, minutes_effect_reminder] = habit_reminder_item_effect.specificTime.split(':').map(Number);
              if (isNaN(hours_effect_reminder) || isNaN(minutes_effect_reminder)) throw new Error("Invalid time");
              reminderDateTime_effect = new Date(now_effect_reminder.getFullYear(), now_effect_reminder.getMonth(), now_effect_reminder.getDate(), hours_effect_reminder, minutes_effect_reminder - 30, 0, 0);
            } else {
              let baseHour_effect_reminder = 10;
              if (habit_reminder_item_effect.optimalTiming?.toLowerCase().includes('morning')) baseHour_effect_reminder = 9;
              else if (habit_reminder_item_effect.optimalTiming?.toLowerCase().includes('afternoon')) baseHour_effect_reminder = 13;
              else if (habit_reminder_item_effect.optimalTiming?.toLowerCase().includes('evening')) baseHour_effect_reminder = 18;
              reminderDateTime_effect = new Date(now_effect_reminder.getFullYear(), now_effect_reminder.getMonth(), now_effect_reminder.getDate(), baseHour_effect_reminder, 0, 0, 0);
            }

            if (reminderDateTime_effect && reminderDateTime_effect > now_effect_reminder) {
              const delay_effect_reminder = reminderDateTime_effect.getTime() - now_effect_reminder.getTime();
              console.log(`Reminder for "${habit_reminder_item_effect.name}" would be set for ${reminderDateTime_effect.toLocaleString()} (in ${Math.round(delay_effect_reminder/60000)} mins)`);
            }
          } catch (e_effect_reminder) {
            console.error(`Error setting reminder for ${habit_reminder_item_effect.name}:`, e_effect_reminder);
          }
        }
      });
    }
    return () => reminderTimeouts.current.forEach(clearTimeout);
  }, [habits, notificationPermission, authUser]);


  const handleSaveHabit = (habitData: CreateHabitFormData & { id?: string }) => {
    if (!authUser) return;
    const isEditingMode = !!(habitData.id && editingHabit && editingHabit.id === habitData.id);

    if (isEditingMode) {
      setHabits(prevHabits_edit => prevHabits_edit.map(h_edit => h_edit.id === habitData.id ? {
        ...h_edit,
        name: habitData.name,
        description: habitData.description,
        category: habitData.category || 'Other',
        daysOfWeek: habitData.daysOfWeek,
        optimalTiming: habitData.optimalTiming,
        durationHours: habitData.durationHours === null ? undefined : habitData.durationHours,
        durationMinutes: habitData.durationMinutes === null ? undefined : habitData.durationMinutes,
        specificTime: habitData.specificTime,
      } : h_edit));
      console.log(`Habit Updated: ${habitData.name}`);
    } else {
      const newHabit_add: Habit = {
        id: String(Date.now() + Math.random()),
        name: habitData.name,
        description: habitData.description,
        category: habitData.category || 'Other',
        daysOfWeek: habitData.daysOfWeek,
        optimalTiming: habitData.optimalTiming,
        durationHours: habitData.durationHours === null ? undefined : habitData.durationHours,
        durationMinutes: habitData.durationMinutes === null ? undefined : habitData.durationMinutes,
        specificTime: habitData.specificTime,
        completionLog: [],
        reminderEnabled: false,
      };
      setHabits(prevHabits_add => [...prevHabits_add, newHabit_add]);
      console.log(`Habit Added: ${newHabit_add.name}`);
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

  const handleAddHabitFromInline = (newHabitData: Omit<Habit, 'id' | 'completionLog'>) => {
    if (!authUser) return;
    const newHabit: Habit = {
      ...newHabitData,
      id: Date.now().toString() + Math.random().toString(36).substring(2,7),
      completionLog: [],
      category: newHabitData.category || 'Other',
      reminderEnabled: false,
    };
    setHabits((prevHabits) => [...prevHabits, newHabit]);
    console.log(`Habit Added: ${newHabit.name}`);
    setShowInlineHabitForm(false);
  };


  const handleToggleComplete = async (habitId_toggle_complete: string, date_toggle_complete: string, completed_toggle_complete: boolean) => {
    let habitNameForQuote_toggle: string | undefined = undefined;
    let pointsChange_toggle = 0;
    let justCompleted_toggle = false;

    setHabits(prevHabits_toggle =>
      prevHabits_toggle.map(h_toggle => {
        if (h_toggle.id === habitId_toggle_complete) {
          habitNameForQuote_toggle = h_toggle.name;
          let newCompletionLog_toggle = [...h_toggle.completionLog];
          const existingLogIndex_toggle = newCompletionLog_toggle.findIndex(log_toggle => log_toggle.date === date_toggle_complete);
          const currentTime_toggle = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          if (completed_toggle_complete) {
            if (existingLogIndex_toggle > -1) {
              const existingLog_toggle_item = newCompletionLog_toggle[existingLogIndex_toggle];
              if (existingLog_toggle_item.status !== 'completed') {
                pointsChange_toggle = POINTS_PER_COMPLETION;
                justCompleted_toggle = true;
              }
              newCompletionLog_toggle[existingLogIndex_toggle] = { ...existingLog_toggle_item, status: 'completed', time: currentTime_toggle };
            } else {
              pointsChange_toggle = POINTS_PER_COMPLETION;
              justCompleted_toggle = true;
              newCompletionLog_toggle.push({ date: date_toggle_complete, time: currentTime_toggle, status: 'completed', note: undefined });
            }
          } else {
            if (existingLogIndex_toggle > -1) {
              const logEntry_toggle_item = newCompletionLog_toggle[existingLogIndex_toggle];
              if (logEntry_toggle_item.status === 'completed') pointsChange_toggle = -POINTS_PER_COMPLETION;

              if (logEntry_toggle_item.status === 'completed' && logEntry_toggle_item.originalMissedDate) {
                newCompletionLog_toggle[existingLogIndex_toggle] = { ...logEntry_toggle_item, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry_toggle_item.note) {
                newCompletionLog_toggle[existingLogIndex_toggle] = { ...logEntry_toggle_item, status: 'skipped', time: 'N/A' };
              } else {
                newCompletionLog_toggle.splice(existingLogIndex_toggle, 1);
              }
            }
          }
          return { ...h_toggle, completionLog: newCompletionLog_toggle.sort((a_log_sort,b_log_sort) => b_log_sort.date.localeCompare(a_log_sort.date)) };
        }
        return h_toggle;
      })
    );

    if (justCompleted_toggle && habitNameForQuote_toggle && authUser) {
      try {
        const quoteResult_toggle = await getMotivationalQuote({ habitName: habitNameForQuote_toggle });
        console.log(`Motivational Quote: ${quoteResult_toggle.quote}`);
      } catch (error_toggle_quote) {
        console.error("Failed to fetch motivational quote:", error_toggle_quote);
      }
    }
    if (pointsChange_toggle !== 0) {
      setTotalPoints(prevPoints_toggle => Math.max(0, prevPoints_toggle + pointsChange_toggle));
    }
  };

  const handleToggleReminder = (habitId_reminder_toggle: string, currentReminderState_reminder_toggle: boolean) => {
    setHabits(prevHabits_reminder =>
      prevHabits_reminder.map(h_reminder => h_reminder.id === habitId_reminder_toggle ? { ...h_reminder, reminderEnabled: !currentReminderState_reminder_toggle } : h_reminder)
    );
    const habit_reminder_item = habits.find(h_find_reminder => h_find_reminder.id === habitId_reminder_toggle);
    console.log(`Reminder for "${habit_reminder_item?.name}" ${!currentReminderState_reminder_toggle ? 'enabled' : 'disabled'}`);
    if (!currentReminderState_reminder_toggle && notificationPermission !== 'granted') {
       console.log('Please enable notifications in your browser settings or allow permission when prompted to receive reminders.');
    }
  };

  const handleOpenAISuggestionDialog = async (habit_ai_suggestion: Habit) => {
    setSelectedHabitForAISuggestion(habit_ai_suggestion);
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habit_ai_suggestion.id, suggestionText: '', isLoading: true });
    try {
      const completionEntries_ai_suggestion = habit_ai_suggestion.completionLog.map(log_ai_suggestion => {
        let entry_ai_suggestion = `${log_ai_suggestion.date} at ${log_ai_suggestion.time || 'N/A'}`;
        if (log_ai_suggestion.status === 'skipped') entry_ai_suggestion += ` (Skipped)`;
        else if (log_ai_suggestion.status === 'pending_makeup') entry_ai_suggestion += ` (Makeup Pending for ${log_ai_suggestion.originalMissedDate})`;
        else if (log_ai_suggestion.status === 'completed' || log_ai_suggestion.status === undefined) entry_ai_suggestion += ` (Completed)`;
        if (log_ai_suggestion.note) entry_ai_suggestion += ` (Note: ${log_ai_suggestion.note})`;
        return entry_ai_suggestion;
      });
      const trackingData_ai_suggestion = `Completions & Status: ${completionEntries_ai_suggestion.join('; ') || 'None yet'}.`;
      const inputForAI_suggestion = {
        habitName: habit_ai_suggestion.name, habitDescription: habit_ai_suggestion.description, daysOfWeek: habit_ai_suggestion.daysOfWeek,
        optimalTiming: habit_ai_suggestion.optimalTiming, durationHours: habit_ai_suggestion.durationHours,
        durationMinutes: habit_ai_suggestion.durationMinutes, specificTime: habit_ai_suggestion.specificTime, trackingData: trackingData_ai_suggestion,
      };
      const result_ai_suggestion = await getHabitSuggestion(inputForAI_suggestion);
      setAISuggestion({ habitId: habit_ai_suggestion.id, suggestionText: result_ai_suggestion.suggestion, isLoading: false });
    } catch (error_ai_suggestion) {
      console.error("Error fetching AI suggestion:", error_ai_suggestion);
      setAISuggestion({ habitId: habit_ai_suggestion.id, suggestionText: '', isLoading: false, error: 'Failed to get AI suggestion.' });
    }
  };

  const handleOpenReflectionDialog = (habitId_reflection_open: string, date_reflection_open: string, habitName_reflection_open: string) => {
    const habit_for_reflection_open = habits.find(h_reflection_find => h_reflection_find.id === habitId_reflection_open);
    const logEntry_for_reflection_open = habit_for_reflection_open?.completionLog.find(log_reflection_find => log_reflection_find.date === date_reflection_open);
    setReflectionDialogData({ habitId: habitId_reflection_open, date: date_reflection_open, initialNote: logEntry_for_reflection_open?.note || '', habitName: habitName_reflection_open });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (note_to_save_reflection: string) => {
    if (!reflectionDialogData) return;
    const { habitId: habitId_reflection_save_note, date: date_reflection_save_note } = reflectionDialogData;
    setHabits(prevHabits_reflection_save =>
      prevHabits_reflection_save.map(h_for_note_save_reflection => {
        if (h_for_note_save_reflection.id === habitId_reflection_save_note) {
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
                status: existingStatus_reflection_save || 'skipped'
             });
             newCompletionLog_for_note_save_reflection.sort((a_sort_reflection,b_sort_reflection) => b_sort_reflection.date.localeCompare(a_sort_reflection.date));
          }
          return { ...h_for_note_save_reflection, completionLog: newCompletionLog_for_note_save_reflection };
        }
        return h_for_note_save_reflection;
      })
    );
    console.log(`Reflection Saved for ${reflectionDialogData.habitName}`);
    setReflectionDialogData(null);
    setIsReflectionDialogOpen(false);
  };

  const handleOpenRescheduleDialog = (habit_reschedule_open: Habit, missedDate_reschedule_open: string) => {
    setRescheduleDialogData({ habit: habit_reschedule_open, missedDate: missedDate_reschedule_open });
  };

  const handleSaveRescheduledHabit = (habitId_rescheduled_save: string, originalMissedDate_rescheduled_save: string, newDate_rescheduled_save: string) => {
    setHabits(prevHabits_rescheduled_save => prevHabits_rescheduled_save.map(h_rescheduled_save => {
      if (h_rescheduled_save.id === habitId_rescheduled_save) {
        let newCompletionLog_rescheduled_save = [...h_rescheduled_save.completionLog];
        const existingMissedLogIndex_rescheduled_save = newCompletionLog_rescheduled_save.findIndex(log_reschedule => log_reschedule.date === originalMissedDate_rescheduled_save);

        if(existingMissedLogIndex_rescheduled_save > -1 && newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].status !== 'completed') {
            newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].status = 'skipped';
            newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].time = 'N/A';
        } else if (existingMissedLogIndex_rescheduled_save === -1) {
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
        newCompletionLog_rescheduled_save.sort((a_sort_reschedule,b_sort_reschedule) => b_sort_reschedule.date.localeCompare(a_sort_reschedule.date));
        return { ...h_rescheduled_save, completionLog: newCompletionLog_rescheduled_save };
      }
      return h_rescheduled_save;
    }));
    const habitName_rescheduled_save = habits.find(h_find_rescheduled_name=>h_find_rescheduled_name.id === habitId_rescheduled_save)?.name || "Habit";
    console.log(`Habit Rescheduled: ${habitName_rescheduled_save}`);
  };

  const handleSaveMarkAsSkipped = (habitId_skipped_save: string, missedDate_skipped_save: string) => {
     setHabits(prevHabits_skipped_save => prevHabits_skipped_save.map(h_skipped_save => {
      if (h_skipped_save.id === habitId_skipped_save) {
        let newCompletionLog_skipped_save = [...h_skipped_save.completionLog];
        const existingLogIndex_skipped_save = newCompletionLog_skipped_save.findIndex(log_skipped => log_skipped.date === missedDate_skipped_save);
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
    const habitName_skipped_save = habits.find(h_find_skipped_name=>h_find_skipped_name.id === habitId_skipped_save)?.name || "Habit";
    console.log(`Habit Skipped: ${habitName_skipped_save}`);
  };

  const handleRequestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission().then(permission => {
            setNotificationPermission(permission);
            if (permission === 'granted') console.log('Notification permission granted.');
            else console.log('Notification permission denied/dismissed.');
        });
    }
  };

  const handleOpenDeleteHabitConfirm = (habitId_delete_open: string, habitName_delete_open: string) => {
    setHabitToDelete({ id: habitId_delete_open, name: habitName_delete_open });
    setIsDeleteHabitConfirmOpen(true);
  };

  const handleConfirmDeleteSingleHabit = () => {
    if (habitToDelete && authUser) {
      setHabits(prevHabits_delete_confirm => prevHabits_delete_confirm.filter(h_delete_confirm => h_delete_confirm.id !== habitToDelete.id));
      console.log(`Habit "${habitToDelete.name}" deleted.`);
      setHabitToDelete(null);
    }
    setIsDeleteHabitConfirmOpen(false);
  };

  const handleCustomizeSuggestedHabit = (suggestion_customize: SuggestedHabit) => {
    setEditingHabit(null);
    setInitialFormDataForDialog({
      name: suggestion_customize.name,
      category: suggestion_customize.category || 'Other',
      description: '',
      daysOfWeek: [],
    });
    setShowInlineHabitForm(false); // Close inline form if open
    setIsCreateHabitDialogOpen(true); // Open dialog
  };

  const calendarDialogModifiers = React.useMemo(() => {
    try {
      console.log("Recalculating calendarDialogModifiers - STEP 1: MINIMAL. Habits:", habits, "Selected Date:", selectedCalendarDate);
      return {
        selected: selectedCalendarDate ? [selectedCalendarDate] : [],
        completed: [],
        missed: [],
        scheduled: [],
        makeup: [],
      };
    } catch (error_cal_mod) {
      console.error("CRITICAL ERROR in calendarDialogModifiers calculation:", error_cal_mod);
      return {
        completed: [],
        missed: [],
        scheduled: [],
        makeup: [],
        selected: selectedCalendarDate ? [selectedCalendarDate] : [],
      };
    }
  }, [selectedCalendarDate]);


  const calendarDialogModifierStyles = React.useMemo(() => {
    return {
      selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
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
    { label: 'Reminders', icon: BellRing, action: () => { /* Stays in sheet for now */ } },
    { label: 'Achievements', icon: Award, action: () => { setIsSettingsSheetOpen(false); setIsAchievementsDialogOpen(true); } },
    { label: 'Calendar', icon: CalendarDays, action: () => { setIsSettingsSheetOpen(false); setIsCalendarDialogOpen(true); } },
  ];

  if (isLoadingAuth || isLoadingHabits) {
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

  console.log("HabitualPage render. AuthUser:", authUser ? authUser.uid : "null", "Habits count:", habits.length);


  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 p-2 sm:p-4">
      <div
        className="bg-background text-foreground shadow-xl rounded-xl flex flex-col w-full"
        style={{ maxWidth: 'clamp(320px, 100%, 450px)', height: 'clamp(700px, 90vh, 850px)', overflow: 'hidden' }}
      >
        <AppHeader onOpenCalendar={() => setIsCalendarDialogOpen(true)} />
        <ScrollArea className="flex-grow">
          <main className="px-3 sm:px-4 py-4">
            {authUser && (
                 <div className="mb-4 sm:mb-6">
                    <HabitOverview habits={habits} totalPoints={totalPoints} />
                 </div>
            )}
            {authUser && habits.length === 0 && !isLoadingCommonSuggestions && commonHabitSuggestions.length > 0 && !showInlineHabitForm && (
              <div className="my-4 p-3 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
                <div className="px-2 pt-0">
                  <h3 className="text-md font-semibold flex items-center text-primary mb-1">
                     <Lightbulb className="mr-2 h-5 w-5"/> Start with these!
                  </h3>
                  <p className="text-xs text-muted-foreground">Click a tile to customize and add:</p>
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
            {showInlineHabitForm && (
              <div className="my-4">
                <InlineCreateHabitForm
                  onAddHabit={handleAddHabitFromInline}
                  onCloseForm={() => {
                    setShowInlineHabitForm(false);
                    setInitialFormDataForDialog(null); // Clear initial data if form is closed
                  }}
                  initialData={initialFormDataForDialog}
                />
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
          <Button variant="ghost" className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/3">
            <Home className="h-5 w-5" /> <span className="text-xs mt-0.5">Home</span>
          </Button>
          <Button variant="ghost" onClick={() => setIsAchievementsDialogOpen(true)} className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/3">
            <Award className="h-5 w-5" /> <span className="text-xs mt-0.5">Badges</span>
          </Button>
          <Button variant="ghost" onClick={() => setIsSettingsSheetOpen(true)} className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/3">
            <Settings className="h-5 w-5" /> <span className="text-xs mt-0.5">Settings</span>
          </Button>
        </div>
      </div>

      {!showInlineHabitForm && (
         <Button
            className="fixed bottom-[calc(4rem+1.5rem)] right-6 sm:right-10 h-14 w-14 p-0 rounded-full shadow-xl z-30 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
            onClick={() => {
              setEditingHabit(null);
              setInitialFormDataForDialog(null);
              setIsCreateHabitDialogOpen(true); // Open dialog for new habit
            }}
            aria-label="Add New Habit"
          > <Plus className="h-7 w-7" /> </Button>
      )}


      <CreateHabitDialog
        isOpen={isCreateHabitDialogOpen}
        onClose={() => { setIsCreateHabitDialogOpen(false); setInitialFormDataForDialog(null); setEditingHabit(null); }}
        onSaveHabit={handleSaveHabit}
        initialData={initialFormDataForDialog}
      />

      {selectedHabitForAISuggestion && aiSuggestion && (
        <AISuggestionDialog
          isOpen={isAISuggestionDialogOpen} onClose={() => setIsAISuggestionDialogOpen(false)}
          habitName={selectedHabitForAISuggestion.name} suggestion={aiSuggestion.suggestionText}
          isLoading={aiSuggestion.isLoading} error={aiSuggestion.error}
        />
      )}
      {reflectionDialogData && (
        <AddReflectionNoteDialog
          isOpen={isReflectionDialogOpen} onClose={() => { setIsReflectionDialogOpen(false); setReflectionDialogData(null); }}
          onSaveNote={handleSaveReflectionNote} initialNote={reflectionDialogData.initialNote}
          habitName={reflectionDialogData.habitName} completionDate={reflectionDialogData.date}
        />
      )}
      {rescheduleDialogData && (
        <RescheduleMissedHabitDialog
          isOpen={!!rescheduleDialogData} onClose={() => setRescheduleDialogData(null)}
          habitName={rescheduleDialogData.habit.name} originalMissedDate={rescheduleDialogData.missedDate}
          onReschedule={(newDate_reschedule_cb) => { handleSaveRescheduledHabit(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate, newDate_reschedule_cb); setRescheduleDialogData(null); }}
          onMarkAsSkipped={() => { handleSaveMarkAsSkipped(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate); setRescheduleDialogData(null); }}
        />
      )}
       <AlertDialog open={isDeleteHabitConfirmOpen} onOpenChange={setIsDeleteHabitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeaderUI> <AlertDialogTitleUI>Confirm Deletion</AlertDialogTitleUI>
            <AlertDialogDescriptionUI> Are you sure you want to delete "{habitToDelete?.name || ''}"? This cannot be undone. </AlertDialogDescriptionUI>
          </AlertDialogHeaderUI>
          <AlertDialogFooterUI>
            <AlertDialogCancel onClick={() => setHabitToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteSingleHabit} className={buttonVariants({ variant: "destructive" })}> Delete </AlertDialogAction>
          </AlertDialogFooterUI>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-full max-w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitleEl className="flex items-center text-xl"> <CalendarDays className="mr-2 h-5 w-5 text-primary" /> Habit Calendar </DialogTitleEl>
            <DialogDescriptionEl> View your habit activity. (Custom day styling is minimal for stability)</DialogDescriptionEl>
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
              <h3 className="text-md font-semibold mb-2 text-center"> Habits for {format(selectedCalendarDate, 'MMMM d, yyyy')} </h3>
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
                    else if (isScheduledToday_list_map && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !log_item_cal_list_map) { statusText_list_map = "Missed"; StatusIcon_list_map = XCircle; iconColor_list_map = "text-destructive"; }

                    return (
                      <li key={h_item_cal_list_map.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                        <span className="font-medium truncate pr-2">{h_item_cal_list_map.name}</span>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <StatusIcon_list_map className={cn("h-3.5 w-3.5", iconColor_list_map)} /> <span>{statusText_list_map}</span>
                        </div>
                      </li> );
                  })}
                </ul>
              ) : ( <p className="text-sm text-muted-foreground text-center py-2">No habits for this day.</p> )}
            </div> )}
          </div>
          <DialogFooter> <Button variant="outline" onClick={() => setIsCalendarDialogOpen(false)}>Close</Button> </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAchievementsDialogOpen} onOpenChange={setIsAchievementsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader> <DialogTitleEl className="flex items-center text-xl"> <Trophy className="mr-2 h-5 w-5 text-yellow-500" /> Achievements </DialogTitleEl>
            <DialogDescriptionEl> All badges unlocked so far! </DialogDescriptionEl>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto pr-2 space-y-3">
            {earnedBadges.length === 0 ? ( <p className="text-muted-foreground text-center py-4">No badges yet. Keep going!</p> ) : (
              earnedBadges.map(b_item_page_ach => (
                <div key={b_item_page_ach.id} className="p-3 border rounded-md bg-card shadow-sm">
                  <div className="flex items-center mb-1"> <span className="text-2xl mr-2">{b_item_page_ach.icon || "🏆"}</span> <h4 className="font-semibold text-primary">{b_item_page_ach.name}</h4> </div>
                  <p className="text-xs text-muted-foreground mb-1">{b_item_page_ach.description}</p>
                  <p className="text-xs text-muted-foreground">Achieved: {format(new Date(b_item_page_ach.dateAchieved), "MMMM d, yyyy")}</p>
                </div> )) )}
          </div>
          <DialogFooter> <Button variant="outline" onClick={() => setIsAchievementsDialogOpen(false)}>Close</Button> </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isSettingsSheetOpen} onOpenChange={setIsSettingsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader className="mb-4"> <SheetTitle>Menu</SheetTitle> <SheetDescription> Navigate different sections. </SheetDescription> </SheetHeader>
          <div className="grid gap-2">
            {sheetMenuItems.map((item_menu_sheet) => (
              item_menu_sheet.href && item_menu_sheet.href === "/profile" ? (
                 <SheetClose asChild key={item_menu_sheet.label}>
                    <Link href={item_menu_sheet.href}> <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet.action}> <item_menu_sheet.icon className="mr-3 h-5 w-5" /> {item_menu_sheet.label} </Button> </Link>
                 </SheetClose>
              ) : item_menu_sheet.href && item_menu_sheet.href !== "/profile" ? (
                <SheetClose asChild key={item_menu_sheet.label}>
                    <Link href={item_menu_sheet.href}> <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet.action}> <item_menu_sheet.icon className="mr-3 h-5 w-5" /> {item_menu_sheet.label} </Button> </Link>
                </SheetClose>
              ) : (
                <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => { item_menu_sheet.action(); if (item_menu_sheet.label !== 'Reminders') setIsSettingsSheetOpen(false); }} key={item_menu_sheet.label} >
                  <item_menu_sheet.icon className="mr-3 h-5 w-5" /> {item_menu_sheet.label}
                </Button>
              )
            ))}
          </div>
           <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center text-sm"> <Bell className="mr-2 h-4 w-4 text-muted-foreground" /> <span>Notification Status:</span>
                <span className={cn("ml-1 font-semibold", notificationPermission === 'granted' ? 'text-green-600' : notificationPermission === 'denied' ? 'text-red-600' : 'text-yellow-600')}>
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