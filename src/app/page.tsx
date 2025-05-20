
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
      return;
    }

    if (!authUser) {
      setHabits([]);
      setEarnedBadges([]);
      setTotalPoints(0);
      setCommonHabitSuggestions([]);
      setCommonSuggestionsFetched(false);
      setIsLoadingHabits(false);
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
         // console.log('No authUser after auth check (data loading effect), redirecting to login. Pathname:', window.location.pathname);
         // This redirect might be redundant due to onAuthStateChanged, but acts as a failsafe.
         // router.push('/auth/login');
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
        parsedHabits = JSON.parse(storedHabits).map((habit: any) => {
          let daysOfWeek: WeekDay[] = habit.daysOfWeek || [];
          if (!habit.daysOfWeek && habit.frequency) {
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

          let migratedDurationHours: number | undefined = habit.durationHours;
          let migratedDurationMinutes: number | undefined = habit.durationMinutes;

          if (habit.duration && typeof habit.duration === 'string' && migratedDurationHours === undefined && migratedDurationMinutes === undefined) {
            const durationStr = habit.duration.toLowerCase();
            const hourMatch = durationStr.match(/(\d+)\s*hour/);
            const minMatch = durationStr.match(/(\d+)\s*min/);
            if (hourMatch) migratedDurationHours = parseInt(hourMatch[1]);
            if (minMatch) migratedDurationMinutes = parseInt(minMatch[1]);
            if (!hourMatch && !minMatch && /^\d+$/.test(durationStr)) {
                const numVal = parseInt(durationStr);
                if (numVal <= 120) migratedDurationMinutes = numVal; 
            }
          }

          let migratedSpecificTime = habit.specificTime;
          if (migratedSpecificTime && /\d{1,2}:\d{2}\s*(am|pm)/i.test(migratedSpecificTime)) {
            try {
              const [timePart, modifierPart] = migratedSpecificTime.split(/\s+/);
              const [hoursStr, minutesStr] = timePart.split(':');
              let hours = parseInt(hoursStr, 10);
              const minutes = parseInt(minutesStr, 10);
              const modifier = modifierPart ? modifierPart.toLowerCase() : '';
              if (modifier === 'pm' && hours < 12) hours += 12;
              if (modifier === 'am' && hours === 12) hours = 0;
              migratedSpecificTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            } catch (e) { /* ignore format error, keep original */ }
          } else if (migratedSpecificTime && /^\d{1,2}:\d{2}$/.test(migratedSpecificTime)) {
             const [hoursNum, minutesNum] = migratedSpecificTime.split(':').map(Number);
             migratedSpecificTime = `${String(hoursNum).padStart(2, '0')}:${String(minutesNum).padStart(2, '0')}`;
          }


          const migratedCompletionLog = (habit.completionLog || (habit.completedDates
              ? habit.completedDates.map((d: string) => ({ date: d, time: 'N/A', note: undefined, status: 'completed' }))
              : [])).map((log: any) => ({
                date: log.date,
                time: log.time || 'N/A',
                note: log.note || undefined,
                status: log.status || 'completed',
                originalMissedDate: log.originalMissedDate || undefined,
              }));

          return {
            id: habit.id || Date.now().toString() + Math.random().toString(36).substring(2,7),
            name: habit.name || 'Unnamed Habit',
            description: habit.description || undefined,
            category: habit.category && HABIT_CATEGORIES.includes(habit.category) ? habit.category : 'Other',
            daysOfWeek: daysOfWeek,
            optimalTiming: habit.optimalTiming || undefined,
            durationHours: migratedDurationHours,
            durationMinutes: migratedDurationMinutes,
            specificTime: migratedSpecificTime || undefined,
            completionLog: migratedCompletionLog as HabitCompletionLogEntry[],
            reminderEnabled: habit.reminderEnabled === undefined ? false : habit.reminderEnabled, 
          };
        });
        setHabits(parsedHabits);
      } catch (error) {
        console.error(`Failed to parse habits from localStorage key ${userHabitsKey}:`, error);
        setHabits([]); 
      }
    } else {
        setHabits([]);
    }

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
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(true); 
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
  }, [authUser, isLoadingAuth, commonSuggestionsFetched, router]);

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
              reminderDateTime = new Date(specificEventTime.getTime() - 30 * 60 * 1000); 
            } catch (e) { 
              console.error(`Error parsing specificTime "${habit.specificTime}" for habit "${habit.name}"`, e);
            }
          } else {
            let baseHour = 10; 
            if (habit.optimalTiming?.toLowerCase().includes('morning')) baseHour = 9;
            else if (habit.optimalTiming?.toLowerCase().includes('afternoon')) baseHour = 13;
            else if (habit.optimalTiming?.toLowerCase().includes('evening')) baseHour = 18;
            reminderDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), baseHour, 0, 0, 0);
          }

          if (reminderDateTime && reminderDateTime > now) {
            const delay = reminderDateTime.getTime() - now.getTime();
            console.log(`Reminder for "${habit.name}" would be scheduled at: ${reminderDateTime.toLocaleString()} (in ${Math.round(delay/60000)} mins)`);
            
          } else if (reminderDateTime) {
            // console.log(`Reminder time for "${habit.name}" (${reminderDateTime.toLocaleTimeString()}) has passed for today or is invalid.`);
          }
        }
      });
    }
    return () => {
      reminderTimeouts.current.forEach(clearTimeout);
      reminderTimeouts.current = [];
    };
  }, [habits, notificationPermission]);


  const handleSaveHabit = (habitData: CreateHabitFormData & { id?: string }) => {
    if (editingHabit && habitData.id) {
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
              }
            : h
        )
      );
      console.log(`Habit Updated: ${habitData.name}`);
    } else {
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
        reminderEnabled: false, 
      };
      setHabits(prevHabits => [...prevHabits, newHabit]);
      console.log(`Habit Added: ${newHabit.name}`);
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
          } else { 
            if (existingLogIndex_for_toggle > -1) {
              const logEntry_item_for_toggle = newCompletionLog_for_toggle[existingLogIndex_for_toggle];
              if (logEntry_item_for_toggle.status === 'completed') { 
                 pointsChange = -POINTS_PER_COMPLETION;
              }
              if (logEntry_item_for_toggle.status === 'completed' && logEntry_item_for_toggle.originalMissedDate) {
                newCompletionLog_for_toggle[existingLogIndex_for_toggle] = { ...logEntry_item_for_toggle, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry_item_for_toggle.note) { 
                newCompletionLog_for_toggle[existingLogIndex_for_toggle] = { ...logEntry_item_for_toggle, status: 'skipped', time: 'N/A' };
              }
              else { 
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
        console.log(`Motivational Quote: ${quoteResult.quote}`);
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
             const existingStatus_for_note_save = h_for_note_save.completionLog.find(l_find => l_find.date === date)?.status;
             newCompletionLog_for_note_save.push({
                date,
                time: 'N/A',
                note: note_to_save.trim() === "" ? undefined : note_to_save.trim(),
                status: existingStatus_for_note_save || 'skipped' 
             });
             newCompletionLog_for_note_save.sort((a_sort,b_sort) => b_sort.date.localeCompare(a_sort.date));
          }
          return { ...h_for_note_save, completionLog: newCompletionLog_for_note_save };
        }
        return h_for_note_save;
      })
    );
    console.log(`Reflection Saved for ${reflectionDialogData.habitName}`);
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
        const existingMissedLogIndex_rescheduled = newCompletionLog_rescheduled.findIndex(log_rescheduled_find => log_rescheduled_find.date === originalMissedDate_rescheduled && (log_rescheduled_find.status === 'skipped' || !log_rescheduled_find.status));
        if(existingMissedLogIndex_rescheduled > -1 && !newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].note) {
            newCompletionLog_rescheduled.splice(existingMissedLogIndex_rescheduled, 1);
        } else if (existingMissedLogIndex_rescheduled > -1) {
            newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].status = 'skipped';
        }

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
    console.log(`Habit Rescheduled: ${habitName_rescheduled}`);
  };

  const handleSaveMarkAsSkipped = (habitId_skipped: string, missedDate_skipped: string) => {
     setHabits(prevHabits => prevHabits.map(h_skipped_map => {
      if (h_skipped_map.id === habitId_skipped) {
        let newCompletionLog_skipped = [...h_skipped_map.completionLog];
        const existingLogIndex_skipped = newCompletionLog_skipped.findIndex(log_skipped_find => log_skipped_find.date === missedDate_skipped);
        if (existingLogIndex_skipped > -1) {
          newCompletionLog_skipped[existingLogIndex_skipped] = { ...newCompletionLog_skipped[existingLogIndex_skipped], status: 'skipped', time: 'N/A' };
        } else {
          newCompletionLog_skipped.push({ date: missedDate_skipped, time: 'N/A', status: 'skipped' });
        }
        newCompletionLog_skipped.sort((a_sort_skip,b_sort_skip) => b_sort_skip.date.localeCompare(a_sort_skip.date));
        return { ...h_skipped_map, completionLog: newCompletionLog_skipped };
      }
      return h_skipped_map;
    }));
    const habitName_skipped = habits.find(h_find_name_skip => h_find_name_skip.id === habitId_skipped)?.name || "Habit";
    console.log(`Habit Skipped: ${habitName_skipped}`);
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

  const calendarDialogModifiers = React.useMemo(() => {
    console.log("Recalculating calendarDialogModifiers. Habits:", habits, "Selected Date:", selectedCalendarDate);
    const dates_completed_arr: Date[] = [];
    const dates_scheduled_missed_arr: Date[] = [];
    const dates_scheduled_upcoming_arr: Date[] = [];
    const dates_makeup_pending_arr: Date[] = [];
    const today_date_obj = startOfDay(new Date());

    habits.forEach(habit_item_for_modifiers => {
      habit_item_for_modifiers.completionLog.forEach(log_entry_for_modifiers => {
        if (typeof log_entry_for_modifiers.date === 'string' && log_entry_for_modifiers.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          try {
            const logDate_obj = parseISO(log_entry_for_modifiers.date);
            if (log_entry_for_modifiers.status === 'completed') {
              dates_completed_arr.push(logDate_obj);
            } else if (log_entry_for_modifiers.status === 'pending_makeup') {
              dates_makeup_pending_arr.push(logDate_obj);
            }
          } catch (e) {
            console.error("Error parsing log date for calendar modifiers:", log_entry_for_modifiers.date, e);
          }
        } else {
            console.warn("Invalid or missing date in log entry for habit:", habit_item_for_modifiers.name, log_entry_for_modifiers);
        }
      });

      const iteration_limit = 60; 
      for (let day_offset = 0; day_offset < iteration_limit; day_offset++) {
        const pastDateToConsider_obj = subDays(today_date_obj, day_offset);
        const futureDateToConsider_obj = dateFnsAddDays(today_date_obj, day_offset);

        [pastDateToConsider_obj, futureDateToConsider_obj].forEach(current_day_being_checked_obj => {
          if (isSameDay(current_day_being_checked_obj, today_date_obj) && day_offset !== 0 && current_day_being_checked_obj !== pastDateToConsider_obj) return;

          const dateStrToMatch_str = format(current_day_being_checked_obj, 'yyyy-MM-dd');
          const dayOfWeekForDate_val = dayIndexToWeekDayConstant[getDay(current_day_being_checked_obj)];
          const isScheduledOnThisDay_bool = habit_item_for_modifiers.daysOfWeek.includes(dayOfWeekForDate_val);
          const logEntryForThisDay_obj = habit_item_for_modifiers.completionLog.find(log_find_item => log_find_item.date === dateStrToMatch_str);

          if (isScheduledOnThisDay_bool && !logEntryForThisDay_obj) {
            if (current_day_being_checked_obj < today_date_obj && !isSameDay(current_day_being_checked_obj, today_date_obj)) {
              if (!dates_scheduled_missed_arr.some(missed_day_item => isSameDay(missed_day_item, current_day_being_checked_obj))) {
                dates_scheduled_missed_arr.push(current_day_being_checked_obj);
              }
            } else {
              if (!dates_scheduled_upcoming_arr.some(upcoming_day_item => isSameDay(upcoming_day_item, current_day_being_checked_obj)) &&
                  !dates_completed_arr.some(completed_day_item_for_check => isSameDay(completed_day_item_for_check, current_day_being_checked_obj))) {
                dates_scheduled_upcoming_arr.push(current_day_being_checked_obj);
              }
            }
          }
        });
      }
    });

    const finalScheduledUpcoming_arr = dates_scheduled_upcoming_arr.filter(s_date_upcoming_for_final_filter =>
      !dates_completed_arr.some(comp_date_for_final_filter => isSameDay(s_date_upcoming_for_final_filter, comp_date_for_final_filter)) &&
      !dates_makeup_pending_arr.some(makeup_date_for_final_filter => isSameDay(s_date_upcoming_for_final_filter, makeup_date_for_final_filter))
    );
    const finalScheduledMissed_arr = dates_scheduled_missed_arr.filter(s_date_missed_for_final_filter =>
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
  }, [habits, selectedCalendarDate]);


  const calendarDialogModifierStyles: DayPicker['modifiersStyles'] = {
    completed: { backgroundColor: 'hsl(var(--accent)/0.15)', color: 'hsl(var(--accent))', fontWeight: 'bold' },
    missed: { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
    scheduled: { backgroundColor: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' }, 
    makeup: { backgroundColor: 'hsl(200,100%,50%)/0.15', color: 'hsl(200,100%,50%)' }, 
    selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
  };

  const habitsForSelectedCalendarDate = React.useMemo(() => {
    if (!selectedCalendarDate) return [];
    const dateStrToCompare = format(selectedCalendarDate, 'yyyy-MM-dd');
    const dayOfWeekForDate = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

    return habits.filter(habit_instance_cal => {
      const isScheduledForDay = habit_instance_cal.daysOfWeek.includes(dayOfWeekForDate);
      const logEntryForDay = habit_instance_cal.completionLog.find(log_item_cal => log_item_cal.date === dateStrToCompare);
      return isScheduledForDay || logEntryForDay; 
    });
  }, [selectedCalendarDate, habits]);


  const sheetMenuItems = [
    { href: '/', label: 'Home', icon: Home, action: () => setIsSettingsSheetOpen(false) },
    { href: '/profile', label: 'Profile', icon: UserCircle, action: () => setIsSettingsSheetOpen(false) },
    {
      label: 'Reminders',
      icon: BellRing,
      action: () => {
        if (notificationPermission === 'granted') {
          console.log('Reminder Settings: Notification permission is granted. Reminders can be set per habit.');
        } else if (notificationPermission === 'denied') {
          console.log('Reminder Settings: Notification permission is denied. Please enable it in your browser settings.');
        } else {
          console.log('Reminder Settings: Notification permission not yet set. Requesting...');
          handleRequestNotificationPermission(); 
        }
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
    setEditingHabit(null); 
    setInitialFormDataForDialog({
      name: suggestion.name,
      category: suggestion.category || 'Other',
      description: '', 
      daysOfWeek: [], 
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
                        {habitsForSelectedCalendarDate.map(habit_item_for_cal_date_display => {
                        const logEntryForCalDate_display = habit_item_for_cal_date_display.completionLog.find(log_cal_display => log_cal_display.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                        const dayOfWeekForSelectedDate_display = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                        const isScheduledOnSelectedDate_display = habit_item_for_cal_date_display.daysOfWeek.includes(dayOfWeekForSelectedDate_display);
                        let statusTextForCalDate_display = "Scheduled"; 
                        let StatusIconForCalDate_display = CircleIcon; 
                        let iconColorForCalDate_display = "text-orange-500"; 

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
              item_menu_sheet.href && item_menu_sheet.href === "/" ? ( 
                <SheetClose asChild key={item_menu_sheet.label}>
                    <Link href={item_menu_sheet.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet.action}>
                        <item_menu_sheet.icon className="mr-3 h-5 w-5" />
                        {item_menu_sheet.label}
                        </Button>
                    </Link>
                </SheetClose>
              ) : item_menu_sheet.href === "/profile" ? ( 
                 <SheetClose asChild key={item_menu_sheet.label}>
                    <Link href={item_menu_sheet.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item_menu_sheet.action} >
                            <item_menu_sheet.icon className="mr-3 h-5 w-5" />
                            {item_menu_sheet.label}
                        </Button>
                    </Link>
                 </SheetClose>
              ) : ( 
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
    

