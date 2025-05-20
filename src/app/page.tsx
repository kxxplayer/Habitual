
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
  const [isLoadingHabits, setIsLoadingHabits] = React.useState(true); // To manage loading state of habits
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = React.useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = React.useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = React.useState<AISuggestionType | null>(null);

  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = React.useState(false);
  const [editingHabit, setEditingHabit] = React.useState<Habit | null>(null);


  const [isDashboardDialogOpen, setIsDashboardDialogOpen] = React.useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = React.useState(false); // New state for calendar dialog
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date()); // New state for calendar dialog date

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
        // Clear app state
        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(false);
        setInitialFormDataForDialog(null);
        setEditingHabit(null);
        // Close any open dialogs that might hold old user data
        setIsDashboardDialogOpen(false);
        setIsCalendarDialogOpen(false);
        setIsAISuggestionDialogOpen(false);
        setIsReflectionDialogOpen(false);
        setRescheduleDialogData(null);
        
        // Clear localStorage for the previous user if there was one
        if (previousUid) {
          localStorage.removeItem(`${LS_KEY_PREFIX_HABITS}${previousUid}`);
          localStorage.removeItem(`${LS_KEY_PREFIX_BADGES}${previousUid}`);
          localStorage.removeItem(`${LS_KEY_PREFIX_POINTS}${previousUid}`);
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


  // Effect for Notification Permission
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        // Only request if not already granted or denied
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
      setNotificationPermission('denied'); // Treat as denied if not supported
    }
  }, []);


  // Effect for loading user-specific data from localStorage
  React.useEffect(() => {
    if (isLoadingAuth) { // Still waiting for auth state
      return;
    }

    if (!authUser) { // Auth check complete, no user logged in
      // Ensure states are clear if there's no authUser (might be redundant due to onAuthStateChanged logic, but safe)
      setHabits([]);
      setEarnedBadges([]);
      setTotalPoints(0);
      setCommonHabitSuggestions([]);
      setCommonSuggestionsFetched(false); // Reset for potential next login
      setIsLoadingHabits(false);
      // Redirect to login if not on auth pages (already handled by onAuthStateChanged more broadly)
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
        // console.log('No authUser after auth check, redirecting to login from data loading effect.');
        // router.push('/auth/login'); // This redirect might be redundant
      }
      return;
    }

    // AuthUser exists, proceed to load their data
    setIsLoadingHabits(true);
    console.log(`Loading data for user: ${authUser.uid}`);

    let parsedHabits: Habit[] = [];
    const userHabitsKey = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    const storedHabits = localStorage.getItem(userHabitsKey);

    if (storedHabits) {
      try {
        // Ensure data structure migration from older versions
        parsedHabits = JSON.parse(storedHabits).map((habit: any) => {
          // Days of Week Migration (from frequency string to array)
          let daysOfWeek: WeekDay[] = habit.daysOfWeek || [];
          if (!habit.daysOfWeek && habit.frequency) { // Old 'frequency' field
            const freqLower = habit.frequency.toLowerCase();
            if (freqLower === 'daily') daysOfWeek = [...weekDays];
            else {
              const dayMap: { [key: string]: WeekDay } = {
                'sun': 'Sun', 'sunday': 'Sun', 'mon': 'Mon', 'monday': 'Mon',
                'tue': 'Tue', 'tuesday': 'Tue', 'wed': 'Wed', 'wednesday': 'Wed',
                'thu': 'Thu', 'thursday': 'Thu', 'fri': 'Fri', 'friday': 'Fri',
                'sat': 'Sat', 'saturday': 'Sat',
              };
              daysOfWeek = freqLower.split(/[\s,]+/).map((d: string) => dayMap[d.trim() as keyof typeof dayMap]).filter(Boolean) as WeekDay[];
            }
          }

          // Duration Migration (from string to hours/minutes numbers)
          let migratedDurationHours: number | undefined = habit.durationHours;
          let migratedDurationMinutes: number | undefined = habit.durationMinutes;

          if (habit.duration && typeof habit.duration === 'string' && migratedDurationHours === undefined && migratedDurationMinutes === undefined) {
            const durationStr = habit.duration.toLowerCase();
            const hourMatch = durationStr.match(/(\d+)\s*hour/);
            const minMatch = durationStr.match(/(\d+)\s*min/);
            if (hourMatch) migratedDurationHours = parseInt(hourMatch[1]);
            if (minMatch) migratedDurationMinutes = parseInt(minMatch[1]);
            // If only a number was provided, assume minutes if <= 120
            if (!hourMatch && !minMatch && /^\d+$/.test(durationStr)) {
                const numVal = parseInt(durationStr);
                if (numVal <= 120) migratedDurationMinutes = numVal; // e.g. "30" means 30 minutes
            }
          }

          // Specific Time Migration (ensure HH:mm format)
          let migratedSpecificTime = habit.specificTime;
          if (migratedSpecificTime && /\d{1,2}:\d{2}\s*(am|pm)/i.test(migratedSpecificTime)) { // Handles "8:00 AM" or "08:00pm"
            try {
              const [timePart, modifierPart] = migratedSpecificTime.split(/\s+/);
              const [hoursStr, minutesStr] = timePart.split(':');
              let hours = parseInt(hoursStr, 10);
              const minutes = parseInt(minutesStr, 10);
              const modifier = modifierPart ? modifierPart.toLowerCase() : '';
              if (modifier === 'pm' && hours < 12) hours += 12;
              if (modifier === 'am' && hours === 12) hours = 0; // Midnight case
              migratedSpecificTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            } catch (e) { /* ignore format error, keep original */ }
          } else if (migratedSpecificTime && /^\d{1,2}:\d{2}$/.test(migratedSpecificTime)) { // Handles "8:30"
             const [hoursNum, minutesNum] = migratedSpecificTime.split(':').map(Number);
             migratedSpecificTime = `${String(hoursNum).padStart(2, '0')}:${String(minutesNum).padStart(2, '0')}`;
          }


          // Completion Log Migration (ensure status and notes are present)
          const migratedCompletionLog = (habit.completionLog || (habit.completedDates // Old 'completedDates' field
              ? habit.completedDates.map((d: string) => ({ date: d, time: 'N/A', note: undefined, status: 'completed' }))
              : [])).map((log: any) => ({
                date: log.date,
                time: log.time || 'N/A',
                note: log.note || undefined,
                status: log.status || 'completed', // Default old entries to 'completed'
                originalMissedDate: log.originalMissedDate || undefined,
              }));

          return {
            id: habit.id || Date.now().toString() + Math.random().toString(36).substring(2,7), // Ensure ID
            name: habit.name || 'Unnamed Habit',
            description: habit.description || undefined,
            category: habit.category && HABIT_CATEGORIES.includes(habit.category) ? habit.category : 'Other',
            daysOfWeek: daysOfWeek,
            optimalTiming: habit.optimalTiming || undefined,
            durationHours: migratedDurationHours,
            durationMinutes: migratedDurationMinutes,
            specificTime: migratedSpecificTime || undefined,
            completionLog: migratedCompletionLog as HabitCompletionLogEntry[],
            reminderEnabled: habit.reminderEnabled === undefined ? false : habit.reminderEnabled, // Default reminder state
          };
        });
        setHabits(parsedHabits);
      } catch (error) {
        console.error(`Failed to parse habits from localStorage key ${userHabitsKey}:`, error);
        setHabits([]); // Reset to empty if parsing fails
      }
    } else { // No stored habits for this user
        setHabits([]);
    }

    // Fetch common suggestions if it's a new user (no habits) and suggestions haven't been fetched yet
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
          // Potentially set an error state here if needed
        })
        .finally(() => {
          setIsLoadingCommonSuggestions(false);
          setCommonSuggestionsFetched(true); // Mark as fetched even if it fails to avoid retrying
        });
    } else if (parsedHabits.length > 0) { // User has habits, clear any common suggestions
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(true); // Mark as fetched, no need to suggest
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
  }, [authUser, isLoadingAuth, commonSuggestionsFetched, router]); // Added router to dependencies for safety, commonSuggestionsFetched for re-triggering

  // Effect for saving habits to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return; // Don't save if no user or still loading
    const userHabitsKey = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    localStorage.setItem(userHabitsKey, JSON.stringify(habits));

    // Check for newly earned badges
    const newlyEarned = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarned.length > 0) {
      const updatedBadges = [...earnedBadges];
      newlyEarned.forEach(async newBadge => {
        if (!earnedBadges.some(eb => eb.id === newBadge.id)) {
            updatedBadges.push(newBadge);
            console.log(`New Badge Unlocked: ${newBadge.name} - ${newBadge.description}`);

            // Special logic for SQL tip badge
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
  }, [habits, earnedBadges, authUser, isLoadingAuth, isLoadingHabits]); // Dependencies

  // Effect for saving badges to localStorage
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
      habits.forEach(habit => {
        if (habit.reminderEnabled) {
          let reminderDateTime: Date | null = null;
          const now = new Date();

          if (habit.specificTime) {
            try {
              const [hours, minutes] = habit.specificTime.split(':').map(Number);
              let specificEventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
              // Reminder 30 minutes before
              reminderDateTime = new Date(specificEventTime.getTime() - 30 * 60 * 1000);
            } catch (e) { 
              console.error(`Error parsing specificTime "${habit.specificTime}" for habit "${habit.name}"`, e);
            }
          } else {
            // Reminder at the event of the day based on optimalTiming
            let baseHour = 10; // Default if no optimal timing
            if (habit.optimalTiming?.toLowerCase().includes('morning')) baseHour = 9;
            else if (habit.optimalTiming?.toLowerCase().includes('afternoon')) baseHour = 13;
            else if (habit.optimalTiming?.toLowerCase().includes('evening')) baseHour = 18;
            reminderDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), baseHour, 0, 0, 0);
          }

          if (reminderDateTime && reminderDateTime > now) {
            const delay = reminderDateTime.getTime() - now.getTime();
            console.log(`Reminder for "${habit.name}" would be scheduled at: ${reminderDateTime.toLocaleString()} (in ${Math.round(delay/60000)} mins)`);
            
            // Actual setTimeout logic would go here
            // const timeoutId = setTimeout(() => {
            //   new Notification("Habitual Reminder", { 
            //     body: `Time for your habit: ${habit.name}!`,
            //     // icon: "/path/to/icon.png" // Optional icon
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
        prevHabits.map(h =>
          h.id === habitData.id
            ? { // Keep existing completionLog and reminderEnabled, update other details
                ...h, 
                name: habitData.name,
                description: habitData.description,
                category: habitData.category || 'Other',
                daysOfWeek: habitData.daysOfWeek,
                optimalTiming: habitData.optimalTiming,
                durationHours: habitData.durationHours === null ? undefined : habitData.durationHours,
                durationMinutes: habitData.durationMinutes === null ? undefined : habitData.durationMinutes,
                specificTime: habitData.specificTime,
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
        completionLog: [],
        reminderEnabled: false, // Default reminder state for new habits
      };
      setHabits(prevHabits => [...prevHabits, newHabit]);
      console.log(`Habit Added: ${newHabit.name}`);
    }
    // Close dialog and reset states
    setIsCreateHabitDialogOpen(false);
    setInitialFormDataForDialog(null); // Important to clear initial data for next "Add"
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

  const handleToggleComplete = async (habitId: string, date: string, completed: boolean) => {
    let habitNameForQuote: string | undefined = undefined;
    let pointsChange = 0;
    let justCompleted = false;

    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.id === habitId) {
          habitNameForQuote = habit.name;
          let newCompletionLog = [...habit.completionLog];
          const existingLogIndex = newCompletionLog.findIndex(log => log.date === date);
          const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          if (completed) {
            if (existingLogIndex > -1) {
              const existingLog = newCompletionLog[existingLogIndex];
              if (existingLog.status !== 'completed') { // Only add points if not already completed
                pointsChange = POINTS_PER_COMPLETION;
                justCompleted = true;
              }
              newCompletionLog[existingLogIndex] = { ...existingLog, status: 'completed', time: currentTime };
            } else {
              pointsChange = POINTS_PER_COMPLETION;
              justCompleted = true;
              newCompletionLog.push({ date, time: currentTime, status: 'completed', note: undefined });
            }
          } else { // Un-marking completion
            if (existingLogIndex > -1) {
              const logEntry = newCompletionLog[existingLogIndex];
              if (logEntry.status === 'completed') { // Only subtract points if it was completed
                 pointsChange = -POINTS_PER_COMPLETION;
              }
              // Revert based on original status or remove
              if (logEntry.status === 'completed' && logEntry.originalMissedDate) {
                // It was a completed makeup task, revert to pending
                newCompletionLog[existingLogIndex] = { ...logEntry, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry.note) { // If there's a note, mark as skipped instead of removing
                newCompletionLog[existingLogIndex] = { ...logEntry, status: 'skipped', time: 'N/A' };
              }
              else { // Otherwise, remove the log entry if it's not a makeup task being reverted or has no note
                newCompletionLog.splice(existingLogIndex, 1);
              }
            }
          }
          // Ensure completion log is sorted, newest first
          return { ...habit, completionLog: newCompletionLog.sort((a, b) => b.date.localeCompare(a.date)) };
        }
        return habit;
      })
    );

    if (justCompleted && habitNameForQuote) {
      try {
        const quoteResult = await getMotivationalQuote({ habitName: habitNameForQuote });
        console.log(`Motivational Quote: ${quoteResult.quote}`);
      } catch (error) {
        console.error("Failed to fetch motivational quote:", error);
        // Fallback quote
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
    const habit = habits.find(h => h.id === habitId);
    console.log(`Reminder for habit "${habit?.name}" ${!currentReminderState ? 'enabled' : 'disabled'}`);
    // Optionally, prompt user to enable notifications if they haven't yet
    if (!currentReminderState && notificationPermission !== 'granted') {
       console.log('Please enable notifications in your browser settings or allow permission when prompted to receive reminders.');
    }
  };


  const handleOpenAISuggestionDialog = async (habit: Habit) => {
    setSelectedHabitForAISuggestion(habit);
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habit.id, suggestionText: '', isLoading: true }); // Reset suggestion

    try {
      // Prepare tracking data string
      const completionEntries = habit.completionLog.map(log => {
        let entry = `${log.date} at ${log.time || 'N/A'}`;
        if (log.status === 'skipped') entry += ` (Skipped)`;
        else if (log.status === 'pending_makeup') entry += ` (Makeup Pending for ${log.originalMissedDate})`;
        else if (log.status === 'completed' || log.status === undefined) entry += ` (Completed)`; // Treat undefined as completed for old data

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
        suggestionText: '', // No suggestion text on error
        isLoading: false,
        error: 'Failed to get suggestion.'
      });
      console.error("AI Suggestion Error: Could not fetch suggestion.");
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
      prevHabits.map(h => {
        if (h.id === habitId) {
          let logEntryExists = false;
          const newCompletionLog = h.completionLog.map(log => {
            if (log.date === date) {
              logEntryExists = true;
              return { ...log, note: note.trim() === "" ? undefined : note.trim() }; // Set note to undefined if empty
            }
            return log;
          });
          // If no log entry exists for this date (e.g., note added to a day not yet interacted with)
          if (!logEntryExists) {
             // Determine status: if a note is added, but not completed, assume 'skipped' unless otherwise set
             const existingStatus = h.completionLog.find(l => l.date === date)?.status;
             newCompletionLog.push({
                date,
                time: 'N/A',
                note: note.trim() === "" ? undefined : note.trim(),
                status: existingStatus || 'skipped' // Default to skipped if adding a note to an uncompleted day
             });
             newCompletionLog.sort((a,b) => b.date.localeCompare(a.date)); // Re-sort
          }
          return { ...h, completionLog: newCompletionLog };
        }
        return h;
      })
    );
    console.log(`Reflection Saved for ${reflectionDialogData.habitName}`);
    // Close dialog and reset data
    setReflectionDialogData(null);
    setIsReflectionDialogOpen(false);
  };

  const handleOpenRescheduleDialog = (habit: Habit, missedDate: string) => {
    setRescheduleDialogData({ habit, missedDate });
  };

  const handleSaveRescheduledHabit = (habitId: string, originalMissedDate: string, newDate: string) => {
    setHabits(prevHabits => prevHabits.map(h => {
      if (h.id === habitId) {
        const newCompletionLog = [...h.completionLog];
        // Remove the original missed entry if it was just a placeholder (no note, not already skipped)
        const existingMissedLogIndex = newCompletionLog.findIndex(log => log.date === originalMissedDate && (log.status === 'skipped' || !log.status)); // also check undefined status for old data
        if(existingMissedLogIndex > -1 && !newCompletionLog[existingMissedLogIndex].note) {
            newCompletionLog.splice(existingMissedLogIndex, 1);
        } else if (existingMissedLogIndex > -1) {
            // If it had a note, ensure its status is 'skipped' rather than removing it
            newCompletionLog[existingMissedLogIndex].status = 'skipped';
        }

        // Add the new pending makeup entry
        newCompletionLog.push({
          date: newDate,
          time: 'N/A', // Makeup tasks don't have a completion time until actually completed
          status: 'pending_makeup',
          originalMissedDate: originalMissedDate,
        });
        newCompletionLog.sort((a,b) => b.date.localeCompare(a.date)); // Re-sort
        return { ...h, completionLog: newCompletionLog };
      }
      return h;
    }));
    const habitName = habits.find(h => h.id === habitId)?.name || "Habit";
    console.log(`Habit Rescheduled: ${habitName}`);
  };

  const handleSaveMarkAsSkipped = (habitId: string, missedDate: string) => {
     setHabits(prevHabits => prevHabits.map(h => {
      if (h.id === habitId) {
        let newCompletionLog = [...h.completionLog];
        const existingLogIndex = newCompletionLog.findIndex(log => log.date === missedDate);
        if (existingLogIndex > -1) {
          // Update existing log entry to 'skipped'
          newCompletionLog[existingLogIndex] = { ...newCompletionLog[existingLogIndex], status: 'skipped', time: 'N/A' };
        } else {
          // Add new log entry as 'skipped'
          newCompletionLog.push({ date: missedDate, time: 'N/A', status: 'skipped' });
        }
        newCompletionLog.sort((a,b) => b.date.localeCompare(a.date)); // Re-sort
        return { ...h, completionLog: newCompletionLog };
      }
      return h;
    }));
    const habitName = habits.find(h => h.id === habitId)?.name || "Habit";
    console.log(`Habit Skipped: ${habitName}`);
  };

  // Notification Permission Request
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

  // Calendar Dialog Logic
  const calendarDialogModifiers = React.useMemo(() => {
    const completedDays: Date[] = [];
    const scheduledMissedDays: Date[] = [];
    const scheduledUpcomingDays: Date[] = [];
    const makeupPendingDays: Date[] = [];
    const today = startOfDay(new Date()); // Definition of today for comparison

    habits.forEach(habit_item_for_modifiers => { // Parameter: habit_item_for_modifiers
      habit_item_for_modifiers.completionLog.forEach(log_entry_for_modifiers => { // Parameter: log_entry_for_modifiers
        try {
          const logDate = parseISO(log_entry_for_modifiers.date);
          if (log_entry_for_modifiers.status === 'completed') {
            completedDays.push(logDate);
          } else if (log_entry_for_modifiers.status === 'pending_makeup') {
            makeupPendingDays.push(logDate);
          }
        } catch (e) { console.error("Error parsing log date for calendar modifiers:", log_entry_for_modifiers.date, e); }
      });

      for (let i = 0; i < 60; i++) { 
          const pastDateToConsider = subDays(today, i); // Variable: pastDateToConsider
          const futureDateToConsider = dateFnsAddDays(today, i); // Variable: futureDateToConsider
          
          [pastDateToConsider, futureDateToConsider].forEach(current_check_date => { // Parameter: current_check_date
            if (isSameDay(current_check_date, today) && i !== 0 && current_check_date !== pastDateToConsider) return; 

            const dateStrToMatch = format(current_check_date, 'yyyy-MM-dd'); // Variable: dateStrToMatch
            const dayOfWeekForDate = dayIndexToWeekDayConstant[getDay(current_check_date)]; // Variable: dayOfWeekForDate
            const isScheduledOnThisDay = habit_item_for_modifiers.daysOfWeek.includes(dayOfWeekForDate); // Variable: isScheduledOnThisDay
            const logEntryForThisDay = habit_item_for_modifiers.completionLog.find(log => log.date === dateStrToMatch); // Variable: logEntryForThisDay, Parameter: log

            if (isScheduledOnThisDay && !logEntryForThisDay) {
                if (current_check_date < today && !isSameDay(current_check_date, today)) {
                    if (!scheduledMissedDays.some(missed_d_inner_check => isSameDay(missed_d_inner_check, current_check_date))) { // Parameter: missed_d_inner_check
                       scheduledMissedDays.push(current_check_date);
                    }
                } else { 
                    if (!scheduledUpcomingDays.some(upcoming_d_inner_check => isSameDay(upcoming_d_inner_check, current_check_date)) && // Parameter: upcoming_d_inner_check
                        !completedDays.some(completed_d_inner_check => isSameDay(completed_d_inner_check, current_check_date))) { // Parameter: completed_d_inner_check
                        scheduledUpcomingDays.push(current_check_date);
                    }
                }
            }
          });
      }
    });
    
    const finalScheduledUpcoming = scheduledUpcomingDays.filter(s_date_upcoming_for_final_filter => // Parameter: s_date_upcoming_for_final_filter
        !completedDays.some(comp_date_filter_cal_mod => isSameDay(s_date_upcoming_for_final_filter, comp_date_filter_cal_mod)) && // Parameter: comp_date_filter_cal_mod
        !makeupPendingDays.some(makeup_date_filter_cal_mod => isSameDay(s_date_upcoming_for_final_filter, makeup_date_filter_cal_mod)) // Parameter: makeup_date_filter_cal_mod
    );
    const finalScheduledMissed = scheduledMissedDays.filter(s_date_missed_for_final_filter =>  // Parameter: s_date_missed_for_final_filter
        !completedDays.some(comp_date_filter_cal_mod => isSameDay(s_date_missed_for_final_filter, comp_date_filter_cal_mod)) && // Parameter: comp_date_filter_cal_mod (using same name as above is fine due to scope)
        !makeupPendingDays.some(makeup_date_filter_cal_mod => isSameDay(s_date_missed_for_final_filter, makeup_date_filter_cal_mod)) // Parameter: makeup_date_filter_cal_mod
    );

    return {
      completed: completedDays,
      missed: finalScheduledMissed,
      scheduled: finalScheduledUpcoming,
      makeup: makeupPendingDays,
      selected: selectedCalendarDate ? [selectedCalendarDate] : [],
    };
  }, [habits, selectedCalendarDate]);


  const calendarDialogModifierStyles: DayPicker['modifiersStyles'] = {
    completed: { backgroundColor: 'hsl(var(--accent)/0.15)', color: 'hsl(var(--accent))', fontWeight: 'bold' },
    missed: { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
    scheduled: { backgroundColor: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' }, // Using primary for scheduled
    makeup: { backgroundColor: 'hsl(200,100%,50%)/0.15', color: 'hsl(200,100%,50%)' }, // Blue for makeup
    selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
  };

  const habitsForSelectedCalendarDate = React.useMemo(() => {
    if (!selectedCalendarDate) return [];
    const dateStrToCompare = format(selectedCalendarDate, 'yyyy-MM-dd');
    const dayOfWeekForDate = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

    return habits.filter(habit_instance => {
      const isScheduledForDay = habit_instance.daysOfWeek.includes(dayOfWeekForDate);
      const logEntryForDay = habit_instance.completionLog.find(log_item => log_item.date === dateStrToCompare);
      return isScheduledForDay || logEntryForDay; // Show if scheduled OR if there's any log (completed, skipped, makeup)
    });
  }, [selectedCalendarDate, habits]);


  const sheetMenuItems = [
    { href: '/', label: 'Home', icon: Home, action: () => setIsSettingsSheetOpen(false) },
    { href: '/profile', label: 'Profile', icon: UserCircle, action: () => setIsSettingsSheetOpen(false) },
    {
      label: 'Reminders',
      icon: BellRing,
      action: () => {
        // Keep sheet open for this interaction if we want to show status directly in sheet
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
        setIsSettingsSheetOpen(false); // Close sheet first
        setIsAchievementsDialogOpen(true); // Then open dialog
      }
    },
    { label: 'Calendar', icon: CalendarDays, action: () => { setIsSettingsSheetOpen(false); setIsCalendarDialogOpen(true); } },
  ];

  const handleCustomizeSuggestedHabit = (suggestion: SuggestedHabit) => {
    setEditingHabit(null); // Ensure not in edit mode
    setInitialFormDataForDialog({
      name: suggestion.name,
      category: suggestion.category || 'Other',
      description: '', // No description from suggestions now
      daysOfWeek: [], // User will set this
      // Other fields like duration, time can be left for user
    });
    setIsCreateHabitDialogOpen(true);
  };


  // Loading and Auth States
  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!authUser) {
    // This state should ideally be very brief due to the redirect in onAuthStateChanged
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
          maxWidth: 'clamp(320px, 100%, 450px)', // Mobile-like width constraint
          height: 'clamp(700px, 90vh, 850px)', // Mobile-like height constraint
          overflow: 'hidden', // Contains all elements within this "screen"
        }}
      >
        <AppHeader onOpenCalendar={() => setIsCalendarDialogOpen(true)} /> 
        
        <ScrollArea className="flex-grow"> {/* Main content area is scrollable */}
          <main className="px-3 sm:px-4 py-4"> {/* Reduced py */}
            
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
                      {commonHabitSuggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="p-3 h-auto flex flex-col items-center justify-center space-y-1 min-w-[100px] text-center shadow-sm hover:shadow-md transition-shadow"
                          onClick={() => handleCustomizeSuggestedHabit(suggestion)}
                        >
                          <span className="font-medium text-sm">{suggestion.name}</span>
                          {suggestion.category && <span className="text-xs text-primary/80">{suggestion.category}</span>}
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
              onOpenEditDialog={handleOpenEditDialog} // Pass edit handler
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

      {/* Floating Action Button for Add New Habit */}
      <Button
        className="fixed bottom-[calc(4rem+1.5rem)] right-6 sm:right-10 h-14 w-14 p-0 rounded-full shadow-xl z-30 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
        onClick={() => {
          setEditingHabit(null); // Ensure not in edit mode
          setInitialFormDataForDialog(null); // Clear any previous initial data
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
            setInitialFormDataForDialog(null); // Clear initial data on close
            setEditingHabit(null);
        }}
        onSaveHabit={handleSaveHabit}
        initialData={initialFormDataForDialog} // Pass initial data for pre-filling or edit
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
            setReflectionDialogData(null); // Reset data on close
          }}
          onSaveNote={handleSaveReflectionNote}
          initialNote={reflectionDialogData.initialNote}
          habitName={reflectionDialogData.habitName}
          completionDate={reflectionDialogData.date}
        />
      )}

      {/* Reschedule Habit Dialog */}
      {rescheduleDialogData && (
        <RescheduleMissedHabitDialog
          isOpen={!!rescheduleDialogData}
          onClose={() => setRescheduleDialogData(null)} // Reset data on close
          habitName={rescheduleDialogData.habit.name}
          originalMissedDate={rescheduleDialogData.missedDate}
          onReschedule={(newDate) => {
            handleSaveRescheduledHabit(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate, newDate);
            setRescheduleDialogData(null); // Reset data after action
          }}
          onMarkAsSkipped={() => {
            handleSaveMarkAsSkipped(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate);
            setRescheduleDialogData(null); // Reset data after action
          }}
        />
      )}

      {/* Dashboard Dialog */}
      <Dialog open={isDashboardDialogOpen} onOpenChange={setIsDashboardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]"> {/* Adjusted max-width */}
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <LayoutDashboard className="mr-2 h-5 w-5 text-primary" />
              Your Habit Dashboard
            </DialogTitle>
            <DialogDescription>
              A snapshot of your progress and today's checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-[65vh] overflow-y-auto pr-2"> {/* Ensure scrollable content */}
            <HabitOverview habits={habits} totalPoints={totalPoints} />
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsDashboardDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar Dialog */}
      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-full max-w-[calc(100%-2rem)]"> {/* Ensure responsive width */}
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
                        {habitsForSelectedCalendarDate.map(habit_item_for_cal_date => {
                        const logEntryForCalDate = habit_item_for_cal_date.completionLog.find(log => log.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                        const dayOfWeekForSelectedDate = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                        const isScheduledOnSelectedDate = habit_item_for_cal_date.daysOfWeek.includes(dayOfWeekForSelectedDate);
                        let statusTextForCalDate = "Scheduled"; // Default for scheduled, upcoming
                        let StatusIconForCalDate = CircleIcon; // Default icon
                        let iconColorForCalDate = "text-orange-500"; // Default color for scheduled

                        if (logEntryForCalDate?.status === 'completed') {
                            statusTextForCalDate = `Completed at ${logEntryForCalDate.time || ''}`;
                            StatusIconForCalDate = CheckCircle2;
                            iconColorForCalDate = "text-accent";
                        } else if (logEntryForCalDate?.status === 'pending_makeup') {
                            statusTextForCalDate = `Makeup for ${logEntryForCalDate.originalMissedDate}`;
                            StatusIconForCalDate = MakeupIcon;
                            iconColorForCalDate = "text-blue-500";
                        } else if (logEntryForCalDate?.status === 'skipped') {
                            statusTextForCalDate = "Skipped";
                            StatusIconForCalDate = XCircle;
                            iconColorForCalDate = "text-muted-foreground";
                        } else if (isScheduledOnSelectedDate && dateFnsIsPast(selectedCalendarDate as Date) && !dateFnsIsToday(selectedCalendarDate as Date) && !logEntryForCalDate) {
                            // Only mark as missed if it's in the past, scheduled, and has no log entry
                            statusTextForCalDate = "Missed";
                            StatusIconForCalDate = XCircle;
                            iconColorForCalDate = "text-destructive";
                        }
                        
                        return (
                            <li key={habit_item_for_cal_date.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                            <span className="font-medium truncate pr-2">{habit_item_for_cal_date.name}</span>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <StatusIconForCalDate className={cn("h-3.5 w-3.5", iconColorForCalDate)} />
                                <span>{statusTextForCalDate}</span>
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
              earnedBadges.map((badge) => (
                <div key={badge.id} className="p-3 border rounded-md bg-card shadow-sm">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">{badge.icon || "🏆"}</span> {/* Default trophy if no icon */}
                    <h4 className="font-semibold text-primary">{badge.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{badge.description}</p>
                  <p className="text-xs text-muted-foreground">Achieved: {format(new Date(badge.dateAchieved), "MMMM d, yyyy")}</p>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsAchievementsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Sheet (Bottom Menu) */}
      <Sheet open={isSettingsSheetOpen} onOpenChange={setIsSettingsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-lg"> {/* Ensure it opens from bottom */}
          <SheetHeader className="mb-4">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Navigate to different sections of the app.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2"> {/* Simplified grid for menu items */}
            {sheetMenuItems.map((item) => (
              // Handling for Next.js Link component within SheetClose
              item.href && item.href === "/" ? ( // Home link specifically
                <SheetClose asChild key={item.label}>
                    <Link href={item.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item.action}>
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.label}
                        </Button>
                    </Link>
                </SheetClose>
              ) : item.href === "/profile" ? ( // Profile link specifically
                 <SheetClose asChild key={item.label}>
                    <Link href={item.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item.action} >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.label}
                        </Button>
                    </Link>
                 </SheetClose>
              ) : ( // For items that are not Next.js Links (e.g., opening dialogs)
                // Or potentially other links, but structure for non-link actions:
                <SheetClose asChild key={item.label}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-base py-3"
                    onClick={item.action}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
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
    

