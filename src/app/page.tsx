
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
import InlineCreateHabitForm from '@/components/habits/InlineCreateHabitForm';
import HabitOverview from '@/components/overview/HabitOverview';
import type { Habit, AISuggestion as AISuggestionType, WeekDay, HabitCompletionLogEntry, HabitCategory, EarnedBadge, CreateHabitFormData } from '@/types'; // Added CreateHabitFormData
import { THREE_DAY_SQL_STREAK_BADGE_ID } from '@/types';
import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { getSqlTip } from '@/ai/flows/sql-tip-flow';
import { getMotivationalQuote } from '@/ai/flows/motivational-quote-flow';
import { getCommonHabitSuggestions, type SuggestedHabit } from '@/ai/flows/common-habit-suggestions-flow'; // Added
import { checkAndAwardBadges } from '@/lib/badgeUtils';
import Link from 'next/link';
import { cn } from "@/lib/utils";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle as DialogCardTitle, CardDescription as DialogCardDescription } from '@/components/ui/card'; // Renamed to avoid conflict
import { Calendar } from '@/components/ui/calendar';
import type { DayPicker } from 'react-day-picker';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  // AlertDialogAction, // No longer used here
  // AlertDialogCancel, // No longer used here
  // AlertDialogContent, // No longer used here
  // AlertDialogDescription, // No longer used here
  // AlertDialogFooter, // No longer used here
  // AlertDialogHeader, // No longer used here
  // AlertDialogTitle as AlertTitle,  // No longer used here
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
// import { Checkbox } from '@/components/ui/checkbox'; // No longer used for top-level selection
import { Plus, LayoutDashboard, Home, Settings, StickyNote, CalendarDays, Award, Trophy, BookOpenText, UserCircle, BellRing, Loader2, Bell, Trash2, CheckCircle2, XCircle, Circle as CircleIcon, CalendarClock as MakeupIcon, MoreHorizontal, PlusCircle } from 'lucide-react';
import { format, parseISO, isSameDay, getDay } from 'date-fns';

const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const POINTS_PER_COMPLETION = 10;


const HabitualPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);

  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [isLoadingHabits, setIsLoadingHabits] = React.useState(true); // For initial load
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = React.useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = React.useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = React.useState<AISuggestionType | null>(null);

  const [showInlineHabitForm, setShowInlineHabitForm] = React.useState(false);

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

  // New states for common habit suggestions
  const [commonHabitSuggestions, setCommonHabitSuggestions] = React.useState<SuggestedHabit[]>([]);
  const [isLoadingCommonSuggestions, setIsLoadingCommonSuggestions] = React.useState(false);
  const [commonSuggestionsFetched, setCommonSuggestionsFetched] = React.useState(false);
  const [initialFormDataForInline, setInitialFormDataForInline] = React.useState<Partial<CreateHabitFormData> | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
           router.push('/auth/login');
        }
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
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


  useEffect(() => {
    if (!authUser || isLoadingAuth) return;
    setIsLoadingHabits(true);
    const storedHabits = localStorage.getItem('habits');
    let parsedHabits: Habit[] = [];
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
             const [hours, minutes] = migratedSpecificTime.split(':').map(Number);
             migratedSpecificTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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
            category: habit.category || 'Other',
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
        console.error("Failed to parse habits from localStorage:", error);
      }
    }
    setIsLoadingHabits(false);

    // Fetch common habit suggestions if user is new and has no habits
    if (authUser && !isLoadingAuth && !commonSuggestionsFetched && parsedHabits.length === 0) {
      setIsLoadingCommonSuggestions(true);
      setCommonSuggestionsFetched(true); // Mark as fetched
      getCommonHabitSuggestions({ count: 4 })
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
        });
    }


    const storedBadges = localStorage.getItem('earnedBadges');
    if (storedBadges) {
      try {
        setEarnedBadges(JSON.parse(storedBadges));
      } catch (error) {
        console.error("Failed to parse badges from localStorage:", error);
      }
    }

    const storedPoints = localStorage.getItem('totalPoints');
    if (storedPoints) {
      try {
        setTotalPoints(parseInt(storedPoints, 10));
      } catch (error) {
        console.error("Failed to parse totalPoints from localStorage:", error);
        setTotalPoints(0);
      }
    }
  }, [authUser, isLoadingAuth, commonSuggestionsFetched]); // Added commonSuggestionsFetched

  useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits) return;
    localStorage.setItem('habits', JSON.stringify(habits));

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

  useEffect(() => {
    if (!authUser || isLoadingAuth) return;
    localStorage.setItem('earnedBadges', JSON.stringify(earnedBadges));
  }, [earnedBadges, authUser, isLoadingAuth]);

  useEffect(() => {
    if (!authUser || isLoadingAuth) return;
    localStorage.setItem('totalPoints', totalPoints.toString());
  }, [totalPoints, authUser, isLoadingAuth]);

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


  const handleAddHabit = (newHabitData: Omit<Habit, 'id' | 'completionLog'>) => {
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
    setInitialFormDataForInline(null); // Clear initial data after adding
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
          } else {
            if (existingLogIndex > -1) {
              const logEntry = newCompletionLog[existingLogIndex];
              if (logEntry.status === 'completed') {
                 pointsChange = -POINTS_PER_COMPLETION;
              }
              if (logEntry.status === 'completed' && logEntry.originalMissedDate) {
                newCompletionLog[existingLogIndex] = { ...logEntry, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntry.note) {
                newCompletionLog[existingLogIndex] = { ...logEntry, status: 'skipped', time: 'N/A' };
              }
              else {
                newCompletionLog.splice(existingLogIndex, 1);
              }
            }
          }
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
        else if (log.status === 'completed' || log.status === undefined) entry += ` (Completed)`;

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
              return { ...log, note: note.trim() === "" ? undefined : note.trim() };
            }
            return log;
          });
          if (!logEntryExists) {
             const existingStatus = h.completionLog.find(l => l.date === date)?.status;
             newCompletionLog.push({
                date,
                time: 'N/A',
                note: note.trim() === "" ? undefined : note.trim(),
                status: existingStatus || 'skipped'
             });
             newCompletionLog.sort((a,b) => b.date.localeCompare(a.date));
          }
          return { ...h, completionLog: newCompletionLog };
        }
        return h;
      })
    );
    console.log(`Reflection Saved for ${reflectionDialogData.habitName}`);
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
        const existingMissedLogIndex = newCompletionLog.findIndex(log => log.date === originalMissedDate && (log.status === 'skipped' || !log.status));
        if(existingMissedLogIndex > -1 && !newCompletionLog[existingMissedLogIndex].note) {
            newCompletionLog.splice(existingMissedLogIndex, 1);
        } else if (existingMissedLogIndex > -1) {
            newCompletionLog[existingMissedLogIndex].status = 'skipped';
        }

        newCompletionLog.push({
          date: newDate,
          time: 'N/A',
          status: 'pending_makeup',
          originalMissedDate: originalMissedDate,
        });
        newCompletionLog.sort((a,b) => b.date.localeCompare(a.date));
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
          newCompletionLog[existingLogIndex] = { ...newCompletionLog[existingLogIndex], status: 'skipped', time: 'N/A' };
        } else {
          newCompletionLog.push({ date: missedDate, time: 'N/A', status: 'skipped' });
        }
        newCompletionLog.sort((a,b) => b.date.localeCompare(a.date));
        return { ...h, completionLog: newCompletionLog };
      }
      return h;
    }));
    const habitName = habits.find(h => h.id === habitId)?.name || "Habit";
    console.log(`Habit Skipped: ${habitName}`);
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

  const habitsForSelectedCalendarDate = useMemo(() => {
    if (!selectedCalendarDate) return [];
    const dateStr = format(selectedCalendarDate, 'yyyy-MM-dd');
    const dayOfWeek = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

    return habits.filter(habit => {
      const isScheduled = habit.daysOfWeek.includes(dayOfWeek);
      const logEntry = habit.completionLog.find(log => log.date === dateStr);
      return isScheduled || logEntry;
    });
  }, [selectedCalendarDate, habits]);

  const calendarDialogModifiers = useMemo(() => {
    const completedDays: Date[] = [];
    const scheduledMissedDays: Date[] = [];
    const scheduledUpcomingDays: Date[] = [];
    const makeupPendingDays: Date[] = [];

    habits.forEach(habit => {
      habit.completionLog.forEach(log => {
        try {
          const logDate = parseISO(log.date);
          if (log.status === 'completed') {
            completedDays.push(logDate);
          } else if (log.status === 'pending_makeup') {
            makeupPendingDays.push(logDate);
          }
        } catch (e) { console.error("Error parsing log date for calendar modifiers:", log.date, e); }
      });

      const today = new Date();
      for (let i = 0; i < 60; i++) {
          const pastDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
          const futureDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);

          [pastDate, futureDate].forEach(checkDate => {
            if (isSameDay(checkDate, today) && i !== 0 && checkDate !== pastDate) return;

            const dateStr = format(checkDate, 'yyyy-MM-dd');
            const dayOfWeek = dayIndexToWeekDayConstant[getDay(checkDate)];
            const isScheduled = habit.daysOfWeek.includes(dayOfWeek);
            const logEntry = habit.completionLog.find(log => log.date === dateStr);

            if (isScheduled && !logEntry) {
                if (checkDate < today && !isSameDay(checkDate, today)) {
                    if (!scheduledMissedDays.some(d => isSameDay(d, checkDate))) {
                       scheduledMissedDays.push(checkDate);
                    }
                } else {
                    if (!scheduledUpcomingDays.some(d => isSameDay(d, checkDate)) && !completedDays.some(d => isSameDay(d, checkDate))) {
                        scheduledUpcomingDays.push(checkDate);
                    }
                }
            }
          });
      }
    });

    const finalScheduledUpcoming = scheduledUpcomingDays.filter(sDate =>
        !completedDays.some(cDate => isSameDay(sDate, cDate)) &&
        !makeupPendingDays.some(mDate => isSameDay(sDate, mDate))
    );
    const finalScheduledMissed = scheduledMissedDays.filter(sDate =>
        !completedDays.some(cDate => isSameDay(sDate, cDate)) &&
        !makeupPendingDays.some(mDate => isSameDay(sDate, mDate))
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
    scheduled: { backgroundColor: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' },
    makeup: { backgroundColor: 'hsl(200,100%,50%)/0.15', color: 'hsl(200,100%,50%)' },
    selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
  };


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
    setInitialFormDataForInline({
      description: suggestion.description || '',
      name: suggestion.name,
      category: suggestion.category || 'Other',
      daysOfWeek: [], // User must set this
    });
    setShowInlineHabitForm(true);
  };


  if (isLoadingAuth || (!authUser && typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading application...</p>
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

        <div className="flex-grow overflow-y-auto">
          <main className="px-3 sm:px-4 py-4">
            {showInlineHabitForm && (
              <div className="my-4">
                <InlineCreateHabitForm
                  onAddHabit={handleAddHabit}
                  onCloseForm={() => {
                    setShowInlineHabitForm(false);
                    setInitialFormDataForInline(null); // Clear initial data when form is closed
                  }}
                  initialData={initialFormDataForInline}
                />
              </div>
            )}

            {/* Suggestions for new users */}
            {authUser && !isLoadingAuth && !isLoadingHabits && habits.length === 0 && commonHabitSuggestions.length > 0 && !showInlineHabitForm && (
              <Card className="my-4 p-4 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
                <CardHeader className="p-2 pt-0">
                  <DialogCardTitle className="text-lg font-semibold flex items-center text-primary">
                     <Lightbulb className="mr-2 h-5 w-5"/>
                     Welcome to Habitual!
                  </DialogCardTitle>
                  <DialogCardDescription className="text-sm text-muted-foreground">
                    Here are a few ideas to get you started:
                  </DialogCardDescription>
                </CardHeader>
                <CardContent className="space-y-2 p-2">
                  {isLoadingCommonSuggestions ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="ml-2 text-sm text-muted-foreground">Loading suggestions...</p>
                    </div>
                  ) : (
                    commonHabitSuggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-center justify-between p-2.5 bg-background rounded-lg shadow-sm border border-border/70">
                        <div>
                          <p className="font-medium text-sm text-foreground">{suggestion.name}</p>
                          {suggestion.description && <p className="text-xs text-muted-foreground mt-0.5">{suggestion.description}</p>}
                          {suggestion.category && <p className="text-xs text-primary/90 mt-0.5 font-medium">{suggestion.category}</p>}
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleCustomizeSuggestedHabit(suggestion)}>
                          <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                          Customize
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}


            {!showInlineHabitForm && (
                <HabitList
                  habits={habits}
                  onToggleComplete={handleToggleComplete}
                  onGetAISuggestion={handleOpenAISuggestionDialog}
                  onOpenReflectionDialog={handleOpenReflectionDialog}
                  onOpenRescheduleDialog={handleOpenRescheduleDialog}
                  onToggleReminder={handleToggleReminder}
                  // onSelectToggle={toggleHabitSelection} // Commented out
                  // selectedHabitIds={selectedHabitIds} // Commented out
                />
            )}
          </main>
          <footer className="py-3 text-center text-xs text-muted-foreground border-t mt-auto">
            <p>&copy; {new Date().getFullYear()} Habitual.</p>
          </footer>
        </div>


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

      {!showInlineHabitForm && (
        <Button
          className="fixed bottom-[calc(4rem+1.5rem)] right-6 sm:right-10 h-14 w-14 p-0 rounded-full shadow-xl z-30 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
          onClick={() => {
            setInitialFormDataForInline(null); // Ensure form is fresh when opened manually
            setShowInlineHabitForm(true);
           }}
          aria-label="Add New Habit"
        >
          <Plus className="h-7 w-7" />
        </Button>
      )}


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
          onReschedule={(newDate) => {
            handleSaveRescheduledHabit(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate, newDate);
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
                        {habitsForSelectedCalendarDate.map(habit => {
                        const logEntry = habit.completionLog.find(log => log.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                        const dayOfWeekForSelected = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                        const isScheduledToday = habit.daysOfWeek.includes(dayOfWeekForSelected);
                        let statusText = "Scheduled";
                        let StatusIcon = CircleIcon;
                        let iconColor = "text-orange-500";

                        if (logEntry?.status === 'completed') {
                            statusText = `Completed at ${logEntry.time || ''}`;
                            StatusIcon = CheckCircle2;
                            iconColor = "text-accent";
                        } else if (logEntry?.status === 'pending_makeup') {
                            statusText = `Makeup for ${logEntry.originalMissedDate}`;
                            StatusIcon = MakeupIcon;
                            iconColor = "text-blue-500";
                        } else if (logEntry?.status === 'skipped') {
                            statusText = "Skipped";
                            StatusIcon = XCircle;
                            iconColor = "text-muted-foreground";
                        } else if (isScheduledToday && parseISO(format(selectedCalendarDate as Date, 'yyyy-MM-dd')) < parseISO(format(new Date(), 'yyyy-MM-dd')) && !logEntry) {
                            statusText = "Missed";
                            StatusIcon = XCircle;
                            iconColor = "text-destructive";
                        }

                        return (
                            <li key={habit.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                            <span className="font-medium truncate pr-2">{habit.name}</span>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <StatusIcon className={cn("h-3.5 w-3.5", iconColor)} />
                                <span>{statusText}</span>
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
              earnedBadges.map((badge) => (
                <div key={badge.id} className="p-3 border rounded-md bg-card shadow-sm">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">{badge.icon || "🏆"}</span>
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

      <Sheet open={isSettingsSheetOpen} onOpenChange={setIsSettingsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader className="mb-4">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Navigate to different sections of the app.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2">
            {sheetMenuItems.map((item) => (
              item.href && item.href !== "/profile" && item.href !== "/calendar" ? (
                <SheetClose asChild key={item.label}>
                    <Link href={item.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item.action}>
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.label}
                        </Button>
                    </Link>
                </SheetClose>
              ) : item.href === "/profile" ? (
                 <SheetClose asChild key={item.label}>
                    <Link href={item.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={item.action} >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.label}
                        </Button>
                    </Link>
                 </SheetClose>
              ) : (
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
