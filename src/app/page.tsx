
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
  AlertDialogDescription as AlertDialogDescriptionEl,
  AlertDialogFooter as AlertDialogFooterEl,
  AlertDialogHeader as AlertDialogHeaderEl,
  AlertDialogTitle as AlertTitleEl, // Renamed to avoid conflict
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
  const [isLoadingHabits, setIsLoadingHabits] = React.useState(true); // To manage loading state of habits
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = React.useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = React.useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = React.useState<AISuggestionType | null>(null);

  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = React.useState(false);
  const [editingHabit, setEditingHabit] = React.useState<Habit | null>(null);
  const [initialFormDataForDialog, setInitialFormDataForDialog] = React.useState<Partial<CreateHabitFormData> | null>(null);

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

  const [isDeleteHabitConfirmOpen, setIsDeleteHabitConfirmOpen] = React.useState(false);
  const [habitToDelete, setHabitToDelete] = React.useState<{ id: string; name: string } | null>(null);

  // Authentication Listener
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

        if (userHabitsKey_clear) localStorage.removeItem(userHabitsKey_clear);
        if (userBadgesKey_clear) localStorage.removeItem(userBadgesKey_clear);
        if (userPointsKey_clear) localStorage.removeItem(userPointsKey_clear);
        console.log(`Cleared localStorage for previous user: ${previousUid_auth_effect}`);

        // Reset React state
        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
        setCommonHabitSuggestions([]);
        setCommonSuggestionsFetched(false); // Allow fetching for new user
        
        // Reset dialog states
        setEditingHabit(null);
        setInitialFormDataForDialog(null);
        setReflectionDialogData(null);
        setRescheduleDialogData(null);
        setHabitToDelete(null);
        setIsDeleteHabitConfirmOpen(false);
        setIsAISuggestionDialogOpen(false);
        setIsDashboardDialogOpen(false);
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

  // Notification Permission
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      console.log('Notifications not supported by this browser.');
      setNotificationPermission('denied');
    }
  }, []);

  // Load data from localStorage
  React.useEffect(() => {
    if (isLoadingAuth) {
      console.log("Auth loading, skipping data load.");
      return;
    }
    if (!authUser) {
      console.log("No authenticated user, not loading data from localStorage.");
      // Ensure state is clear if authUser becomes null after initial load
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
    const storedHabits = localStorage.getItem(userHabitsKey);
    let parsedHabits: Habit[] = [];
    if (storedHabits) {
      try {
        const rawHabits: any[] = JSON.parse(storedHabits);
        parsedHabits = rawHabits.map((h: any): Habit => ({
          id: String(h.id || Date.now() + Math.random()),
          name: String(h.name || 'Unnamed Habit'),
          description: typeof h.description === 'string' ? h.description : undefined,
          category: HABIT_CATEGORIES.includes(h.category as HabitCategory) ? h.category : 'Other',
          daysOfWeek: Array.isArray(h.daysOfWeek) ? h.daysOfWeek.filter((d: any) => weekDays.includes(d as WeekDay)) : [],
          optimalTiming: typeof h.optimalTiming === 'string' ? h.optimalTiming : undefined,
          durationHours: typeof h.durationHours === 'number' ? h.durationHours : undefined,
          durationMinutes: typeof h.durationMinutes === 'number' ? h.durationMinutes : undefined,
          specificTime: typeof h.specificTime === 'string' ? h.specificTime.match(/^\d{2}:\d{2}$/) ? h.specificTime : undefined : undefined,
          completionLog: Array.isArray(h.completionLog) ? h.completionLog.filter((l: any) => typeof l.date === 'string' && l.date.match(/^\d{4}-\d{2}-\d{2}$/)).map((l: any): HabitCompletionLogEntry => ({
            date: l.date,
            time: l.time || 'N/A',
            note: l.note || undefined,
            status: ['completed', 'pending_makeup', 'skipped'].includes(l.status) ? l.status : 'completed',
            originalMissedDate: typeof l.originalMissedDate === 'string' && l.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? l.originalMissedDate : undefined,
          })).sort((a,b) => b.date.localeCompare(a.date)) : [],
          reminderEnabled: typeof h.reminderEnabled === 'boolean' ? h.reminderEnabled : false,
        }));
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
      setCommonSuggestionsFetched(true); // Already has habits
    }


    const userBadgesKey = `${LS_KEY_PREFIX_BADGES}${userUid}`;
    const storedBadges = localStorage.getItem(userBadgesKey);
    setEarnedBadges(storedBadges ? JSON.parse(storedBadges) : []);

    const userPointsKey = `${LS_KEY_PREFIX_POINTS}${userUid}`;
    const storedPoints = localStorage.getItem(userPointsKey);
    setTotalPoints(storedPoints ? parseInt(storedPoints, 10) : 0);

    setIsLoadingHabits(false);
    console.log(`Data loading complete for user ${userUid}. Habits: ${parsedHabits.length}`);

  }, [authUser, isLoadingAuth]); // commonSuggestionsFetched removed, handled internally

  // Save habits to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
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
  }, [habits, authUser, isLoadingAuth, isLoadingHabits, earnedBadges]); // earnedBadges added

  // Save badges to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
    const userBadgesKey = `${LS_KEY_PREFIX_BADGES}${authUser.uid}`;
    localStorage.setItem(userBadgesKey, JSON.stringify(earnedBadges));
    console.log(`Saved badges for user ${authUser.uid}`);
  }, [earnedBadges, authUser, isLoadingAuth, isLoadingHabits]);

  // Save points to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
    const userPointsKey = `${LS_KEY_PREFIX_POINTS}${authUser.uid}`;
    localStorage.setItem(userPointsKey, totalPoints.toString());
    console.log(`Saved points for user ${authUser.uid}`);
  }, [totalPoints, authUser, isLoadingAuth, isLoadingHabits]);

  // Placeholder Reminder Logic
  React.useEffect(() => {
    reminderTimeouts.current.forEach(clearTimeout);
    reminderTimeouts.current = [];

    if (notificationPermission === 'granted' && authUser) {
      habits.forEach(habit => {
        if (habit.reminderEnabled) {
          let reminderDateTime: Date | null = null;
          const now = new Date();
          try {
            if (habit.specificTime) {
              const [hours, minutes] = habit.specificTime.split(':').map(Number);
              if (isNaN(hours) || isNaN(minutes)) throw new Error("Invalid time");
              reminderDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes - 30, 0, 0);
            } else {
              let baseHour = 10; // Default for no specific time
              if (habit.optimalTiming?.toLowerCase().includes('morning')) baseHour = 9;
              else if (habit.optimalTiming?.toLowerCase().includes('afternoon')) baseHour = 13;
              else if (habit.optimalTiming?.toLowerCase().includes('evening')) baseHour = 18;
              reminderDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), baseHour, 0, 0, 0);
            }

            if (reminderDateTime && reminderDateTime > now) {
              console.log(`Reminder for "${habit.name}" would be set for ${reminderDateTime.toLocaleString()}`);
            }
          } catch (e) {
            console.error(`Error setting reminder for ${habit.name}:`, e);
          }
        }
      });
    }
    return () => reminderTimeouts.current.forEach(clearTimeout);
  }, [habits, notificationPermission, authUser]);


  const handleSaveHabit = (habitData: CreateHabitFormData & { id?: string }) => {
    if (!authUser) return;
    if (editingHabit && habitData.id) {
      setHabits(prev => prev.map(h => h.id === habitData.id ? {
        ...h,
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
      setHabits(prev => [...prev, newHabit]);
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

    setHabits(prevHabits =>
      prevHabits.map(h => {
        if (h.id === habitId) {
          habitNameForQuote = h.name;
          let newCompletionLog = [...h.completionLog];
          const existingLogIndex = newCompletionLog.findIndex(log => log.date === date);
          const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          if (completed) {
            if (existingLogIndex > -1) {
              const existingLog = newCompletionLog[existingLogIndex];
              if (existingLog.status !== 'completed') {
                pointsChange = POINTS_PER_COMPLETION;
                justCompleted = true;
              }
              newCompletionLog[existingLogIndex] = { ...existingLog, status: 'completed', time: currentTime };
            } else {
              pointsChange = POINTS_PER_COMPLETION;
              justCompleted = true;
              newCompletionLog.push({ date, time: currentTime, status: 'completed', note: undefined });
            }
          } else { // Un-completing
            if (existingLogIndex > -1) {
              const logEntry = newCompletionLog[existingLogIndex];
              if (logEntry.status === 'completed') pointsChange = -POINTS_PER_COMPLETION;
              
              if (logEntry.status === 'completed' && logEntry.originalMissedDate) { // Was a completed makeup
                newCompletionLog[existingLogIndex] = { ...logEntry, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry.note) { // Has a note, mark as skipped
                newCompletionLog[existingLogIndex] = { ...logEntry, status: 'skipped', time: 'N/A' };
              } else { // No note, no original missed date, remove log
                newCompletionLog.splice(existingLogIndex, 1);
              }
            }
          }
          return { ...h, completionLog: newCompletionLog.sort((a,b) => b.date.localeCompare(a.date)) };
        }
        return h;
      })
    );

    if (justCompleted && habitNameForQuote && authUser) {
      try {
        const quoteResult = await getMotivationalQuote({ habitName: habitNameForQuote });
        console.log(`Motivational Quote: ${quoteResult.quote}`);
      } catch (error) {
        console.error("Failed to fetch motivational quote:", error);
      }
    }
    if (pointsChange !== 0) {
      setTotalPoints(prevPoints => Math.max(0, prevPoints + pointsChange));
    }
  };

  const handleToggleReminder = (habitId: string, currentReminderState: boolean) => {
    setHabits(prevHabits =>
      prevHabits.map(h => h.id === habitId ? { ...h, reminderEnabled: !currentReminderState } : h)
    );
    const habit = habits.find(h => h.id === habitId);
    console.log(`Reminder for "${habit?.name}" ${!currentReminderState ? 'enabled' : 'disabled'}`);
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
        else if (log.status === 'completed' || log.status === undefined) entry += ` (Completed)`;
        if (log.note) entry += ` (Note: ${log.note})`;
        return entry;
      });
      const trackingData = `Completions & Status: ${completionEntries.join('; ') || 'None yet'}.`;
      const inputForAI = {
        habitName: habit.name, habitDescription: habit.description, daysOfWeek: habit.daysOfWeek,
        optimalTiming: habit.optimalTiming, durationHours: habit.durationHours,
        durationMinutes: habit.durationMinutes, specificTime: habit.specificTime, trackingData,
      };
      const result = await getHabitSuggestion(inputForAI);
      setAISuggestion({ habitId: habit.id, suggestionText: result.suggestion, isLoading: false });
    } catch (error) {
      console.error("Error fetching AI suggestion:", error);
      setAISuggestion({ habitId: habit.id, suggestionText: '', isLoading: false, error: 'Failed to get AI suggestion.' });
    }
  };

  const handleOpenReflectionDialog = (habitId: string, date: string, habitName: string) => {
    const habit = habits.find(h => h.id === habitId);
    const logEntry = habit?.completionLog.find(log => log.date === date);
    setReflectionDialogData({ habitId, date, initialNote: logEntry?.note || '', habitName });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (note_to_save_reflection: string) => {
    if (!reflectionDialogData) return;
    const { habitId: habitId_reflection_save, date: date_reflection_save } = reflectionDialogData;
    setHabits(prevHabits =>
      prevHabits.map(h_for_note_save => {
        if (h_for_note_save.id === habitId_reflection_save) {
          let logEntryExists = false;
          const newCompletionLog = h_for_note_save.completionLog.map(log_item_for_note_save => {
            if (log_item_for_note_save.date === date_reflection_save) {
              logEntryExists = true;
              return { ...log_item_for_note_save, note: note_to_save_reflection.trim() === "" ? undefined : note_to_save_reflection.trim() };
            }
            return log_item_for_note_save;
          });
          if (!logEntryExists) {
             const existingStatus = h_for_note_save.completionLog.find(l => l.date === date_reflection_save)?.status;
             newCompletionLog.push({
                date: date_reflection_save, time: 'N/A',
                note: note_to_save_reflection.trim() === "" ? undefined : note_to_save_reflection.trim(),
                status: existingStatus || 'skipped'
             });
             newCompletionLog.sort((a,b) => b.date.localeCompare(a.date));
          }
          return { ...h_for_note_save, completionLog: newCompletionLog };
        }
        return h_for_note_save;
      })
    );
    console.log(`Reflection Saved for ${reflectionDialogData.habitName}`);
    setReflectionDialogData(null);
    setIsReflectionDialogOpen(false);
  };

  const handleOpenRescheduleDialog = (habit: Habit, missedDate: string) => {
    setRescheduleDialogData({ habit, missedDate });
  };

  const handleSaveRescheduledHabit = (habitId_rescheduled: string, originalMissedDate_rescheduled: string, newDate_rescheduled: string) => {
    setHabits(prevHabits => prevHabits.map(h_rescheduled => {
      if (h_rescheduled.id === habitId_rescheduled) {
        let newCompletionLog_rescheduled = [...h_rescheduled.completionLog];
        const existingMissedLogIndex_rescheduled = newCompletionLog_rescheduled.findIndex(log => log.date === originalMissedDate_rescheduled);
        if(existingMissedLogIndex_rescheduled > -1 && newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].status !== 'completed') {
            newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].status = 'skipped';
            newCompletionLog_rescheduled[existingMissedLogIndex_rescheduled].time = 'N/A';
        } else if (existingMissedLogIndex_rescheduled === -1) {
            newCompletionLog_rescheduled.push({ date: originalMissedDate_rescheduled, time: 'N/A', status: 'skipped' });
        }
        newCompletionLog_rescheduled.push({ date: newDate_rescheduled, time: 'N/A', status: 'pending_makeup', originalMissedDate: originalMissedDate_rescheduled });
        newCompletionLog_rescheduled.sort((a,b) => b.date.localeCompare(a.date));
        return { ...h_rescheduled, completionLog: newCompletionLog_rescheduled };
      }
      return h_rescheduled;
    }));
    console.log(`Habit Rescheduled: ${habits.find(h=>h.id === habitId_rescheduled)?.name}`);
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
    console.log(`Habit Skipped: ${habits.find(h=>h.id === habitId)?.name}`);
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
    setEditingHabit(null);
    setInitialFormDataForDialog({
      name: suggestion.name,
      category: suggestion.category || 'Other',
      description: '',
      daysOfWeek: [],
    });
    setIsCreateHabitDialogOpen(true);
  };

  // Calendar Dialog Logic: Simplified for stability
  const habitsForSelectedCalendarDate = useMemo(() => {
    if (!selectedCalendarDate) return [];
    const dateStr_for_list = format(selectedCalendarDate, 'yyyy-MM-dd');
    const dayOfWeek_for_list = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

    try {
      return habits.filter(habit_for_list => {
        const isScheduled_for_list = habit_for_list.daysOfWeek.includes(dayOfWeek_for_list);
        const logEntry_for_list = habit_for_list.completionLog.find(log_for_list_item => log_for_list_item.date === dateStr_for_list);
        return isScheduled_for_list || logEntry_for_list; // Show if scheduled OR if there's any log entry
      });
    } catch (e) {
      console.error("Error in habitsForSelectedCalendarDate calculation:", e);
      return []; // Return empty array on error
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

  if (!authUser) { // Should be caught by redirect, but as a fallback
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
        style={{ maxWidth: 'clamp(320px, 100%, 450px)', height: 'clamp(700px, 90vh, 850px)', overflow: 'hidden' }}
      >
        <AppHeader onOpenCalendar={() => setIsCalendarDialogOpen(true)} />
        <ScrollArea className="flex-grow">
          <main className="px-3 sm:px-4 py-4">
            {authUser && habits.length === 0 && !isLoadingCommonSuggestions && commonHabitSuggestions.length > 0 && (
              <div className="my-4 p-3 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
                <div className="px-2 pt-0">
                  <h3 className="text-md font-semibold flex items-center text-primary mb-1">
                     <Lightbulb className="mr-2 h-5 w-5"/> Start with these!
                  </h3>
                  <p className="text-xs text-muted-foreground">Click a tile to customize and add:</p>
                </div>
                <div className="p-1">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {commonHabitSuggestions.map((sugg, idx) => (
                      <Button key={idx} variant="outline"
                        className="p-2.5 h-auto flex flex-col items-center justify-center space-y-0.5 min-w-[90px] text-center shadow-sm hover:shadow-md transition-shadow text-xs"
                        onClick={() => handleCustomizeSuggestedHabit(sugg)}
                      >
                        <span className="font-medium">{sugg.name}</span>
                        {sugg.category && <span className="text-primary/80 opacity-80">{sugg.category}</span>}
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
            <Home className="h-5 w-5" /> <span className="text-xs mt-0.5">Home</span>
          </Button>
          <Button variant="ghost" onClick={() => setIsDashboardDialogOpen(true)} className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/4">
            <LayoutDashboard className="h-5 w-5" /> <span className="text-xs mt-0.5">Dashboard</span>
          </Button>
          <Button variant="ghost" onClick={() => setIsAchievementsDialogOpen(true)} className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/4">
            <Award className="h-5 w-5" /> <span className="text-xs mt-0.5">Badges</span>
          </Button>
          <Button variant="ghost" onClick={() => setIsSettingsSheetOpen(true)} className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/4">
            <Settings className="h-5 w-5" /> <span className="text-xs mt-0.5">Settings</span>
          </Button>
        </div>
      </div>

      <Button
        className="fixed bottom-[calc(4rem+1.5rem)] right-6 sm:right-10 h-14 w-14 p-0 rounded-full shadow-xl z-30 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
        onClick={() => {
          setEditingHabit(null); setInitialFormDataForDialog(null); setIsCreateHabitDialogOpen(true);
         }}
        aria-label="Add New Habit"
      > <Plus className="h-7 w-7" /> </Button>

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
          onReschedule={(newDate) => { handleSaveRescheduledHabit(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate, newDate); setRescheduleDialogData(null); }}
          onMarkAsSkipped={() => { handleSaveMarkAsSkipped(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate); setRescheduleDialogData(null); }}
        />
      )}
       <AlertDialog open={isDeleteHabitConfirmOpen} onOpenChange={setIsDeleteHabitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeaderEl> <AlertTitleEl>Confirm Deletion</AlertTitleEl>
            <AlertDialogDescriptionEl> Are you sure you want to delete "{habitToDelete?.name || ''}"? This cannot be undone. </AlertDialogDescriptionEl>
          </AlertDialogHeaderEl>
          <AlertDialogFooterEl>
            <AlertDialogCancel onClick={() => setHabitToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteSingleHabit} className={buttonVariants({ variant: "destructive" })}> Delete </AlertDialogAction>
          </AlertDialogFooterEl>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDashboardDialogOpen} onOpenChange={setIsDashboardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader> <DialogTitle className="flex items-center text-xl"> <LayoutDashboard className="mr-2 h-5 w-5 text-primary" /> Dashboard </DialogTitle>
            <DialogDescription> Progress snapshot and today's checklist. </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-[65vh] overflow-y-auto pr-2"> <HabitOverview habits={habits} totalPoints={totalPoints} /> </div>
          <DialogFooter className="pt-2"> <Button variant="outline" onClick={() => setIsDashboardDialogOpen(false)}>Close</Button> </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-full max-w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl"> <CalendarDays className="mr-2 h-5 w-5 text-primary" /> Habit Calendar </DialogTitle>
            <DialogDescription> View your habit activity. (Custom styling temporarily disabled for stability) </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-[65vh] overflow-y-auto pr-2 flex flex-col items-center">
            <Calendar
              mode="single" selected={selectedCalendarDate} onSelect={setSelectedCalendarDate}
              modifiers={undefined} modifiersStyles={undefined} // All custom styling removed for stability
              className="rounded-md border p-0 sm:p-2"
              month={selectedCalendarDate || new Date()} onMonthChange={setSelectedCalendarDate}
            />
            {selectedCalendarDate && (
            <div className="mt-4 w-full">
              <h3 className="text-md font-semibold mb-2 text-center"> Habits for {format(selectedCalendarDate, 'MMMM d, yyyy')} </h3>
              {habitsForSelectedCalendarDate.length > 0 ? (
                <ul className="space-y-1.5 text-sm max-h-40 overflow-y-auto">
                  {habitsForSelectedCalendarDate.map(h_item_cal_list => {
                    const log_item_cal_list = h_item_cal_list.completionLog.find(l_cal_list => l_cal_list.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                    const dayOfWeekForSelected_list = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                    const isScheduledToday_list = h_item_cal_list.daysOfWeek.includes(dayOfWeekForSelected_list);
                    let statusText_list = "Scheduled"; let StatusIcon_list = CircleIcon; let iconColor_list = "text-orange-500";

                    if (log_item_cal_list?.status === 'completed') { statusText_list = `Completed ${log_item_cal_list.time || ''}`; StatusIcon_list = CheckCircle2; iconColor_list = "text-accent"; }
                    else if (log_item_cal_list?.status === 'pending_makeup') { statusText_list = `Makeup for ${log_item_cal_list.originalMissedDate}`; StatusIcon_list = MakeupIcon; iconColor_list = "text-blue-500"; }
                    else if (log_item_cal_list?.status === 'skipped') { statusText_list = "Skipped"; StatusIcon_list = XCircle; iconColor_list = "text-muted-foreground"; }
                    else if (isScheduledToday_list && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !log_item_cal_list) { statusText_list = "Missed"; StatusIcon_list = XCircle; iconColor_list = "text-destructive"; }
                    
                    return (
                      <li key={h_item_cal_list.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                        <span className="font-medium truncate pr-2">{h_item_cal_list.name}</span>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <StatusIcon_list className={cn("h-3.5 w-3.5", iconColor_list)} /> <span>{statusText_list}</span>
                        </div>
                      </li> );
                  })}
                </ul>
              ) : ( <p className="text-sm text-muted-foreground text-center py-2">No habits for this day.</p> )}
            </div> )}
          </div>
          <DialogFooter className="pt-2"> <Button variant="outline" onClick={() => setIsCalendarDialogOpen(false)}>Close</Button> </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAchievementsDialogOpen} onOpenChange={setIsAchievementsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader> <DialogTitle className="flex items-center text-xl"> <Trophy className="mr-2 h-5 w-5 text-yellow-500" /> Achievements </DialogTitle>
            <DialogDescription> All badges unlocked so far! </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto pr-2 space-y-3">
            {earnedBadges.length === 0 ? ( <p className="text-muted-foreground text-center py-4">No badges yet. Keep going!</p> ) : (
              earnedBadges.map(b_item_page => (
                <div key={b_item_page.id} className="p-3 border rounded-md bg-card shadow-sm">
                  <div className="flex items-center mb-1"> <span className="text-2xl mr-2">{b_item_page.icon || "🏆"}</span> <h4 className="font-semibold text-primary">{b_item_page.name}</h4> </div>
                  <p className="text-xs text-muted-foreground mb-1">{b_item_page.description}</p>
                  <p className="text-xs text-muted-foreground">Achieved: {format(new Date(b_item_page.dateAchieved), "MMMM d, yyyy")}</p>
                </div> )) )}
          </div>
          <DialogFooter className="pt-2"> <Button variant="outline" onClick={() => setIsAchievementsDialogOpen(false)}>Close</Button> </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isSettingsSheetOpen} onOpenChange={setIsSettingsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader className="mb-4"> <SheetTitle>Menu</SheetTitle> <SheetDescription> Navigate different sections. </SheetDescription> </SheetHeader>
          <div className="grid gap-2">
            {sheetMenuItems.map(item => (
              item.href && item.href === "/profile" ? (
                 <SheetClose asChild key={item.label}>
                    <Link href={item.href}> <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item.action}> <item.icon className="mr-3 h-5 w-5" /> {item.label} </Button> </Link>
                 </SheetClose>
              ) : item.href && item.href !== "/profile" ? (
                <SheetClose asChild key={item.label}>
                    <Link href={item.href}> <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item.action}> <item.icon className="mr-3 h-5 w-5" /> {item.label} </Button> </Link>
                </SheetClose>
              ) : (
                <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => { item.action(); if (item.label !== 'Reminders') setIsSettingsSheetOpen(false); }} key={item.label} >
                  <item.icon className="mr-3 h-5 w-5" /> {item.label}
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
                <SheetClose asChild> <Button size="sm" variant="outline" onClick={handleRequestNotificationPermission}> Enable Notifications </Button> </SheetClose>
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
