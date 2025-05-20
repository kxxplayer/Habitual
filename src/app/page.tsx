
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
import { Card, CardContent, CardHeader, CardTitle as DialogCardTitle, CardDescription as DialogCardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import type { DayPicker } from 'react-day-picker';
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
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle as AlertTitle,
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
        // Clear React state
        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(false);
        setInitialFormDataForDialog(null);
        setEditingHabit(null);
        // Close any open dialogs that might hold old data context
        setIsDashboardDialogOpen(false);
        setIsCalendarDialogOpen(false);
        setIsAISuggestionDialogOpen(false);
        setIsReflectionDialogOpen(false);
        setRescheduleDialogData(null);
        
        // Clear localStorage specific to the previous user
        if (previousUid) {
            console.log(`Clearing localStorage for previous user: ${previousUid}`);
            localStorage.removeItem(`${LS_KEY_PREFIX_HABITS}${previousUid}`);
            localStorage.removeItem(`${LS_KEY_PREFIX_BADGES}${previousUid}`);
            localStorage.removeItem(`${LS_KEY_PREFIX_POINTS}${previousUid}`);
        } else {
            console.log("No previous user UID to clear from localStorage, or user was anonymous.");
        }
      }

      setAuthUser(currentUser);
      setIsLoadingAuth(false);
      previousAuthUserUidRef.current = currentUid; // Update the ref *after* all actions for the change are done

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
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
          if (permission === 'granted') {
             console.log('Notification permission granted.');
          } else {
             console.log('Notification permission denied or dismissed.');
          }
        });
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
      // Ensure React state is clean if somehow not cleared by onAuthStateChanged
      setHabits([]);
      setEarnedBadges([]);
      setTotalPoints(0);
      setCommonHabitSuggestions([]);
      setCommonSuggestionsFetched(false); // Reset this for potential next login
      setIsLoadingHabits(false); // No habits to load

      // Redirect to login if not already on auth pages
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
         console.log('No authUser after auth check (data loading effect), redirecting to login. Pathname:', window.location.pathname);
         router.push('/auth/login');
      }
      return;
    }

    // User is authenticated, proceed to load their data
    setIsLoadingHabits(true);
    console.log(`Loading data for user: ${authUser.uid}`);

    let parsedHabits: Habit[] = [];
    const userHabitsKey = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    const storedHabits = localStorage.getItem(userHabitsKey);

    if (storedHabits) {
      try {
        parsedHabits = JSON.parse(storedHabits).map((habit_data_migration: any) => {
          // Migration logic for daysOfWeek
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

          // Migration for duration
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

          // Migration for specificTime (HH:mm format)
          let migratedSpecificTime_val = habit_data_migration.specificTime;
          if (migratedSpecificTime_val && /\d{1,2}:\d{2}\s*(am|pm)/i.test(migratedSpecificTime_val)) { // Handles 08:00 am/pm
            try {
              const [timePart_migrated, modifierPart_migrated] = migratedSpecificTime_val.split(/\s+/);
              const [hoursStr_migrated, minutesStr_migrated] = timePart_migrated.split(':');
              let hours_migrated = parseInt(hoursStr_migrated, 10);
              const minutes_migrated = parseInt(minutesStr_migrated, 10);
              const modifier_migrated = modifierPart_migrated ? modifierPart_migrated.toLowerCase() : '';
              if (modifier_migrated === 'pm' && hours_migrated < 12) hours_migrated += 12;
              if (modifier_migrated === 'am' && hours_migrated === 12) hours_migrated = 0; // Midnight case
              migratedSpecificTime_val = `${String(hours_migrated).padStart(2, '0')}:${String(minutes_migrated).padStart(2, '0')}`;
            } catch (e_time_parse) { /* ignore format error, keep original */ }
          } else if (migratedSpecificTime_val && /^\d{1,2}:\d{2}$/.test(migratedSpecificTime_val)) { // Ensure HH:mm format (e.g. 8:30 -> 08:30)
             const [hours_num_migrated, minutes_num_migrated] = migratedSpecificTime_val.split(':').map(Number);
             migratedSpecificTime_val = `${String(hours_num_migrated).padStart(2, '0')}:${String(minutes_num_migrated).padStart(2, '0')}`;
          }


          // Migration for completionLog
          const migratedCompletionLog_arr = (habit_data_migration.completionLog || (habit_data_migration.completedDates
              ? habit_data_migration.completedDates.map((d_log: string) => ({ date: d_log, time: 'N/A', note: undefined, status: 'completed' })) // Ensure old completedDates become 'completed'
              : [])).map((log_item_migrated: any) => ({
                date: log_item_migrated.date,
                time: log_item_migrated.time || 'N/A',
                note: log_item_migrated.note || undefined,
                status: log_item_migrated.status || 'completed', // Default old entries to 'completed'
                originalMissedDate: log_item_migrated.originalMissedDate || undefined,
              }));

          return {
            id: habit_data_migration.id || Date.now().toString() + Math.random().toString(36).substring(2,7), // Ensure ID exists
            name: habit_data_migration.name || 'Unnamed Habit',
            description: habit_data_migration.description || undefined,
            category: habit_data_migration.category && HABIT_CATEGORIES.includes(habit_data_migration.category) ? habit_data_migration.category : 'Other',
            daysOfWeek: daysOfWeek_migrated,
            optimalTiming: habit_data_migration.optimalTiming || undefined,
            durationHours: migratedDurationHours_val,
            durationMinutes: migratedDurationMinutes_val,
            specificTime: migratedSpecificTime_val || undefined,
            completionLog: migratedCompletionLog_arr as HabitCompletionLogEntry[],
            reminderEnabled: habit_data_migration.reminderEnabled === undefined ? false : habit_data_migration.reminderEnabled, // Default to false
          };
        });
        setHabits(parsedHabits);
      } catch (error) {
        console.error(`Failed to parse habits from localStorage key ${userHabitsKey}:`, error);
        setHabits([]); // Reset to empty if parsing fails
      }
    } else {
        setHabits([]); // No stored habits for this user
    }

    // Fetch common habit suggestions if this user has no habits and suggestions haven't been fetched yet
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
          setCommonSuggestionsFetched(true); // Mark as fetched even if it failed to prevent re-fetching
        });
    } else if (parsedHabits.length > 0) {
        setCommonHabitSuggestions([]); // Clear any old suggestions if user has habits
        setCommonSuggestionsFetched(true); // Mark as "fetched" because we don't need them
    }


    // Load badges
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

    // Load points
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
  }, [authUser, isLoadingAuth, commonSuggestionsFetched, router]); // Added router to dependencies due to its usage in this effect

  // Effect for saving habits to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return; // Do not save if user not loaded, or habits are loading
    const userHabitsKey = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    localStorage.setItem(userHabitsKey, JSON.stringify(habits));

    // Check for newly earned badges whenever habits change
    const newlyEarned = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarned.length > 0) {
      const updatedBadges = [...earnedBadges];
      newlyEarned.forEach(async newBadge => {
        if (!earnedBadges.some(eb => eb.id === newBadge.id)) {
            updatedBadges.push(newBadge);
            console.log(`New Badge Unlocked: ${newBadge.name} - ${newBadge.description}`);
            // Handle SQL tip for specific badge
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
  }, [habits, earnedBadges, authUser, isLoadingAuth, isLoadingHabits]); // Include all relevant dependencies

  // Effect for saving earnedBadges to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
    const userBadgesKey = `${LS_KEY_PREFIX_BADGES}${authUser.uid}`;
    localStorage.setItem(userBadgesKey, JSON.stringify(earnedBadges));
  }, [earnedBadges, authUser, isLoadingAuth, isLoadingHabits]);

  // Effect for saving totalPoints to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
    const userPointsKey = `${LS_KEY_PREFIX_POINTS}${authUser.uid}`;
    localStorage.setItem(userPointsKey, totalPoints.toString());
  }, [totalPoints, authUser, isLoadingAuth, isLoadingHabits]);

  // Placeholder Reminder Scheduling Logic
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
              let specificEventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
              // Reminder 30 minutes before actual time
              reminderDateTime = new Date(specificEventTime.getTime() - 30 * 60 * 1000); 
            } catch (e) { 
              console.error(`Error parsing specificTime "${habit_for_reminder.specificTime}" for habit "${habit_for_reminder.name}"`, e);
            }
          } else {
            // If no specific time, set reminder based on optimal timing (at the event time itself)
            let baseHour = 10; // Default if no optimal timing
            if (habit_for_reminder.optimalTiming?.toLowerCase().includes('morning')) baseHour = 9; // e.g., 9 AM for Morning
            else if (habit_for_reminder.optimalTiming?.toLowerCase().includes('afternoon')) baseHour = 13; // e.g., 1 PM for Afternoon
            else if (habit_for_reminder.optimalTiming?.toLowerCase().includes('evening')) baseHour = 18; // e.g., 6 PM for Evening
            reminderDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), baseHour, 0, 0, 0);
          }

          if (reminderDateTime && reminderDateTime > now) {
            const delay = reminderDateTime.getTime() - now.getTime();
            console.log(`Reminder for "${habit_for_reminder.name}" would be scheduled at: ${reminderDateTime.toLocaleString()} (in ${Math.round(delay/60000)} mins)`);
            
            // Actual setTimeout logic would go here
            // const timeoutId = setTimeout(() => {
            //   new Notification("Habitual Reminder", { 
            //     body: `Time for your habit: ${habit_for_reminder.name}!`,
            //     // icon: "/path/to/icon.png" // Optional icon
            //   });
            //   console.log(`REMINDER FIRED for: ${habit_for_reminder.name}`);
            // }, delay);
            // reminderTimeouts.current.push(timeoutId);

          } else if (reminderDateTime) {
            // console.log(`Reminder time for "${habit_for_reminder.name}" (${reminderDateTime.toLocaleTimeString()}) has passed for today or is invalid.`);
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
        prevHabits.map(h =>
          h.id === habitData.id
            ? { 
                ...h, 
                name: habitData.name,
                description: habitData.description,
                category: habitData.category || 'Other',
                daysOfWeek: habitData.daysOfWeek,
                optimalTiming: habitData.optimalTiming,
                durationHours: habitData.durationHours === null ? undefined : habitData.durationHours,
                durationMinutes: habitData.durationMinutes === null ? undefined : habitData.durationMinutes,
                specificTime: habitData.specificTime,
                // completionLog and reminderEnabled are preserved from the original habit 'h'
              }
            : h
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
        completionLog: [], // New habits start with an empty log
        reminderEnabled: false, // Default reminder state for new habits
      };
      setHabits(prevHabits => [...prevHabits, newHabit]);
      console.log(`Habit Added: ${newHabit.name}`);
    }
    setIsCreateHabitDialogOpen(false); // Close dialog after save
    setInitialFormDataForDialog(null); // Clear any initial data
    setEditingHabit(null); // Clear editing state
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
              if (existingLog_item_for_toggle.status !== 'completed') { // Only add points if changing state to completed
                pointsChange = POINTS_PER_COMPLETION;
                justCompleted = true;
              }
              newCompletionLog_for_toggle[existingLogIndex_for_toggle] = { ...existingLog_item_for_toggle, status: 'completed', time: currentTime_for_toggle };
            } else {
              pointsChange = POINTS_PER_COMPLETION;
              justCompleted = true;
              newCompletionLog_for_toggle.push({ date, time: currentTime_for_toggle, status: 'completed', note: undefined });
            }
          } else { // Un-completing a habit
            if (existingLogIndex_for_toggle > -1) {
              const logEntry_item_for_toggle = newCompletionLog_for_toggle[existingLogIndex_for_toggle];
              if (logEntry_item_for_toggle.status === 'completed') { // Only subtract points if it was previously completed
                 pointsChange = -POINTS_PER_COMPLETION;
              }
              // If it was a completed makeup task, revert to pending_makeup
              if (logEntry_item_for_toggle.status === 'completed' && logEntry_item_for_toggle.originalMissedDate) {
                newCompletionLog_for_toggle[existingLogIndex_for_toggle] = { ...logEntry_item_for_toggle, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry_item_for_toggle.note) { // If there's a note, mark as skipped instead of removing
                newCompletionLog_for_toggle[existingLogIndex_for_toggle] = { ...logEntry_item_for_toggle, status: 'skipped', time: 'N/A' };
              }
              else { // Otherwise, remove the log
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
        // console.log(`Motivational Quote: ${quoteResult.quote}`); // Toast removed, log instead
        console.log("Motivational Quote:", quoteResult.quote);
      } catch (error) {
        console.error("Failed to fetch motivational quote:", error);
        console.log("Motivational Quote: Well Done! You're making progress!");
      }
    }

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
    const habit_for_reminder_toggle = habits.find(h => h.id === habitId);
    console.log(`Reminder for habit "${habit_for_reminder_toggle?.name}" ${!currentReminderState ? 'enabled' : 'disabled'}`);
    if (!currentReminderState && notificationPermission !== 'granted') {
       console.log('Please enable notifications in your browser settings or allow permission when prompted to receive reminders.');
    }
  };


  const handleOpenAISuggestionDialog = async (habit_for_ai: Habit) => {
    setSelectedHabitForAISuggestion(habit_for_ai);
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habit_for_ai.id, suggestionText: '', isLoading: true }); // Clear previous suggestion

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
        suggestionText: '', // Ensure suggestionText is empty on error
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
             // If no log entry exists for this date, create one.
             // Check if the habit was scheduled for this day to determine default status
             const dayOfWeekForDate = dayIndexToWeekDayConstant[getDay(parseISO(date))];
             const wasScheduled = h_for_note_save.daysOfWeek.includes(dayOfWeekForDate);
             const existingStatus_for_note_save = wasScheduled ? 'skipped' : 'completed'; // Or a more nuanced default

             newCompletionLog_for_note_save.push({
                date,
                time: 'N/A',
                note: note_to_save.trim() === "" ? undefined : note_to_save.trim(),
                status: existingStatus_for_note_save
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
        // Mark the original missed date as 'skipped' if it exists and doesn't have a note
        // If it has a note, keep the note but ensure status is 'skipped'
        const existingMissedLogIndex_rescheduled = newCompletionLog_rescheduled.findIndex(log_rescheduled_find => log_rescheduled_find.date === originalMissedDate_rescheduled);

        if(existingMissedLogIndex_rescheduled > -1) {
            // If it was completed, we should not be rescheduling, this path is for missed/skipped
            if (newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].status !== 'completed') {
                newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].status = 'skipped';
                newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].time = 'N/A';
            }
        } else {
            // If no log entry for original date, add one as skipped
            newCompletionLog_rescheduled.push({
                date: originalMissedDate_rescheduled,
                time: 'N/A',
                status: 'skipped'
            });
        }

        // Add the new pending makeup entry
        newCompletionLog_rescheduled.push({
          date: newDate_rescheduled,
          time: 'N/A', // Makeup tasks start as N/A time
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
          // Update existing entry to skipped, preserve note if any
          newCompletionLog_skipped[existingLogIndex_skipped] = { 
            ...newCompletionLog_skipped[existingLogIndex_skipped], 
            status: 'skipped', 
            time: 'N/A' 
          };
        } else {
          // Add new entry as skipped
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

  
  // MINIMAL VERSION FOR DEBUGGING - STEP 1
  const calendarDialogModifiers = React.useMemo(() => {
    console.log("Recalculating calendarDialogModifiers - STEP 1: MINIMAL. Habits:", habits, "Selected Date:", selectedCalendarDate);
    
    const dates_completed_arr: Date[] = [];
    const dates_scheduled_missed_arr: Date[] = [];
    const dates_scheduled_upcoming_arr: Date[] = [];
    const dates_makeup_pending_arr: Date[] = [];
    
    return {
      completed: dates_completed_arr, 
      missed: dates_scheduled_missed_arr,    
      scheduled: dates_scheduled_upcoming_arr, 
      makeup: dates_makeup_pending_arr,   
      selected: selectedCalendarDate ? [selectedCalendarDate] : [], 
    };
  }, [habits, selectedCalendarDate]); // Keep dependencies minimal for this debugging step


  const calendarDialogModifierStyles: DayPicker['modifiersStyles'] = {
    completed: { backgroundColor: 'hsl(var(--accent)/0.15)', color: 'hsl(var(--accent))', fontWeight: 'bold' },
    missed: { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
    scheduled: { backgroundColor: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' }, 
    makeup: { backgroundColor: 'hsl(200,100%,50%)/0.15)', color: 'hsl(200,100%,50%)' }, 
    selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
  };

  const habitsForSelectedCalendarDate = React.useMemo(() => {
    if (!selectedCalendarDate) return [];
    const dateStrToCompare = format(selectedCalendarDate, 'yyyy-MM-dd');
    const dayOfWeekForDate = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

    return habits.filter(habit_instance_cal => {
      const isScheduledForDay = habit_instance_cal.daysOfWeek.includes(dayOfWeekForDate);
      const logEntryForDay = habit_instance_cal.completionLog.find(log_item_cal => log_item_cal.date === dateStrToCompare);
      return isScheduledForDay || logEntryForDay; // Show if scheduled OR if there's any log entry (completed, skipped, makeup)
    });
  }, [selectedCalendarDate, habits]);


  const sheetMenuItems = [
    { href: '/', label: 'Home', icon: Home, action: () => setIsSettingsSheetOpen(false) },
    { href: '/profile', label: 'Profile', icon: UserCircle, action: () => setIsSettingsSheetOpen(false) },
    {
      label: 'Reminders',
      icon: BellRing,
      action: () => {
        // Keep sheet open for this interaction
        if (notificationPermission === 'granted') {
          console.log('Reminder Settings: Notification permission is granted. Reminders can be set per habit.');
        } else if (notificationPermission === 'denied') {
          console.log('Reminder Settings: Notification permission is denied. Please enable it in your browser settings.');
        } else {
          console.log('Reminder Settings: Notification permission not yet set. Requesting...');
          handleRequestNotificationPermission(); // This will trigger browser prompt if needed
        }
      }
    },
    {
      label: 'Achievements',
      icon: Award,
      action: () => {
        setIsSettingsSheetOpen(false); // Close main settings sheet
        setIsAchievementsDialogOpen(true); // Open achievements dialog
      }
    },
    { label: 'Calendar', icon: CalendarDays, action: () => { setIsSettingsSheetOpen(false); setIsCalendarDialogOpen(true); } },
  ];

  // Handler for when a common suggested habit tile is clicked
  const handleCustomizeSuggestedHabit = (suggestion: SuggestedHabit) => {
    setEditingHabit(null); // Ensure not in edit mode
    setInitialFormDataForDialog({
      name: suggestion.name,
      category: suggestion.category || 'Other',
      description: '', // Start with empty description
      daysOfWeek: [], // User will set this
      // Other fields default or empty
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
    // This should ideally not be reached if redirection in useEffect works,
    // but it's a fallback.
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  // User is authenticated, show the main app UI
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 p-2 sm:p-4">
      <div
        className="bg-background text-foreground shadow-xl rounded-xl flex flex-col w-full"
        style={{
          maxWidth: 'clamp(320px, 100%, 450px)', // Mobile-like width
          height: 'clamp(700px, 90vh, 850px)', // Mobile-like height
          overflow: 'hidden', // Contains elements within the "screen"
        }}
      >
        <AppHeader onOpenCalendar={() => setIsCalendarDialogOpen(true)} /> 
        
        <ScrollArea className="flex-grow"> {/* Make the main content area scrollable */}
          <main className="px-3 sm:px-4 py-4"> {/* Main content padding */}
            
            {/* Common Habit Suggestions for New Users */}
            {authUser && !isLoadingAuth && !isLoadingHabits && habits.length === 0 && commonHabitSuggestions.length > 0 && (
              <Card className="my-4 p-4 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
                <CardHeader className="p-2 pt-0">
                  <DialogCardTitle className="text-lg font-semibold flex items-center text-primary">
                     <Lightbulb className="mr-2 h-5 w-5"/>
                     Start with these habits!
                  </DialogCardTitle>
                  <DialogCardDescription className="text-sm text-muted-foreground">
                    Click a tile to customize and add it:
                  </DialogCardDescription>
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
              onOpenEditDialog={handleOpenEditDialog} // Pass the edit handler
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

      {/* Floating Action Button (FAB) for Adding Habit */}
      <Button
        className="fixed bottom-[calc(4rem+1.5rem)] right-6 sm:right-10 h-14 w-14 p-0 rounded-full shadow-xl z-30 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
        onClick={() => {
          setEditingHabit(null); // Ensure not in edit mode
          setInitialFormDataForDialog(null); // Clear any pre-fill from suggestions
          setIsCreateHabitDialogOpen(true); // Open the dialog
         }}
        aria-label="Add New Habit"
      >
        <Plus className="h-7 w-7" />
      </Button>

      {/* Create/Edit Habit Dialog */}
      <CreateHabitDialog
        isOpen={isCreateHabitDialogOpen}
        onClose={() => {
            setIsCreateHabitDialogOpen(false);
            setInitialFormDataForDialog(null); // Clear pre-fill on close
            setEditingHabit(null);
        }}
        onSaveHabit={handleSaveHabit}
        initialData={initialFormDataForDialog} // Pass pre-fill data for suggestions or editing
      />

      {/* AI Suggestion Dialog */}
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

      {/* Reflection Note Dialog */}
      {reflectionDialogData && (
        <AddReflectionNoteDialog
          isOpen={isReflectionDialogOpen}
          onClose={() => {
            setIsReflectionDialogOpen(false);
            setReflectionDialogData(null); // Clear dialog data on close
          }}
          onSaveNote={handleSaveReflectionNote}
          initialNote={reflectionDialogData.initialNote}
          habitName={reflectionDialogData.habitName}
          completionDate={reflectionDialogData.date}
        />
      )}

      {/* Reschedule Missed Habit Dialog */}
      {rescheduleDialogData && (
        <RescheduleMissedHabitDialog
          isOpen={!!rescheduleDialogData}
          onClose={() => setRescheduleDialogData(null)} // Clear dialog data on close
          habitName={rescheduleDialogData.habit.name}
          originalMissedDate={rescheduleDialogData.missedDate}
          onReschedule={(newDate_reschedule_cb) => {
            handleSaveRescheduledHabit(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate, newDate_reschedule_cb);
            setRescheduleDialogData(null); // Clear dialog data after action
          }}
          onMarkAsSkipped={() => {
            handleSaveMarkAsSkipped(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate);
            setRescheduleDialogData(null); // Clear dialog data after action
          }}
        />
      )}

      {/* Dashboard Dialog */}
      <Dialog open={isDashboardDialogOpen} onOpenChange={setIsDashboardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]"> {/* Max width for the dialog */}
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <LayoutDashboard className="mr-2 h-5 w-5 text-primary" />
              Your Habit Dashboard
            </DialogTitle>
            <DialogDescription>
              A snapshot of your progress and today's checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-[65vh] overflow-y-auto pr-2"> {/* Scrollable content area */}
            <HabitOverview habits={habits} totalPoints={totalPoints} />
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsDashboardDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar Dialog */}
      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-full max-w-[calc(100%-2rem)]"> {/* Responsive width */}
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
                    modifiers={calendarDialogModifiers}
                    modifiersStyles={calendarDialogModifierStyles}
                    className="rounded-md border p-0 sm:p-2" // Adjusted padding
                    month={selectedCalendarDate || new Date()} // Control month view
                    onMonthChange={setSelectedCalendarDate} // Allow month navigation
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
                        let statusTextForCalDate_display = "Scheduled"; // Default for upcoming scheduled
                        let StatusIconForCalDate_display = CircleIcon; // Default icon
                        let iconColorForCalDate_display = "text-orange-500"; // Default color

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
                        } else if (isScheduledOnSelectedDate_display && dateFnsIsPast(selectedCalendarDate as Date) && !dateFnsIsToday(selectedCalendarDate as Date) && !logEntryForCalDate_display) {
                            statusTextForCalDate_display = "Missed";
                            StatusIconForCalDate_display = XCircle;
                            iconColorForCalDate_display = "text-destructive";
                        }
                        // If it's scheduled, today or future, and no log entry, it remains "Scheduled"
                        
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


      {/* Achievements Dialog */}
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
                    <span className="text-2xl mr-2">{badge_item_display.icon || "🏆"}</span> {/* Badge Icon */}
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
        <SheetContent side="bottom" className="rounded-t-lg"> {/* Slide from bottom */}
          <SheetHeader className="mb-4">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Navigate to different sections of the app.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2"> {/* Grid layout for menu items */}
            {sheetMenuItems.map((item_menu_sheet) => (
              // Logic to handle different types of menu items (Link vs. Button action)
              item_menu_sheet.href && item_menu_sheet.href === "/" ? ( // Home Link
                <SheetClose asChild key={item_menu_sheet.label}>
                    <Link href={item_menu_sheet.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet.action}>
                        <item_menu_sheet.icon className="mr-3 h-5 w-5" />
                        {item_menu_sheet.label}
                        </Button>
                    </Link>
                </SheetClose>
              ) : item_menu_sheet.href === "/profile" ? ( // Profile Link
                 <SheetClose asChild key={item_menu_sheet.label}>
                    <Link href={item_menu_sheet.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet.action} >
                            <item_menu_sheet.icon className="mr-3 h-5 w-5" />
                            {item_menu_sheet.label}
                        </Button>
                    </Link>
                 </SheetClose>
              ) : ( // Other actions (Buttons)
                <SheetClose asChild key={item_menu_sheet.label}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-base py-3"
                    onClick={item_menu_sheet.action}
                  >
                    <item_menu_sheet.icon className="mr-3 h-5 w-5" />
                    {item_menu_sheet.label}
                  </Button>
                </SheetClose>
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
                        <Button size="sm" variant="outline" onClick={handleRequestNotificationPermission}>
                            Enable Notifications
                        </Button>
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
    
