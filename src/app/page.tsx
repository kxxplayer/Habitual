"use client";

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
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
import type { Habit, AISuggestion as AISuggestionType, WeekDay, HabitCompletionLogEntry, HabitCategory, EarnedBadge } from '@/types';
import { THREE_DAY_SQL_STREAK_BADGE_ID } from '@/types';
import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { getSqlTip } from '@/ai/flows/sql-tip-flow';
import { getMotivationalQuote } from '@/ai/flows/motivational-quote-flow';
import { checkAndAwardBadges } from '@/lib/badgeUtils';
import Link from 'next/link';
import { cn } from "@/lib/utils";

import { Button } from '@/components/ui/button';
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, LayoutDashboard, Home, Settings, StickyNote, CalendarDays, Award, Trophy, BookOpenText, UserCircle, BellRing, Loader2, Bell, Trash2 } from 'lucide-react';
import { format, parseISO, set, subMinutes, isFuture } from 'date-fns';


const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const POINTS_PER_COMPLETION = 10;


const HabitualPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = useState<AISuggestionType | null>(null);

  const [showInlineHabitForm, setShowInlineHabitForm] = useState(false);

  const [isDashboardDialogOpen, setIsDashboardDialogOpen] = useState(false);
  const [isAchievementsDialogOpen, setIsAchievementsDialogOpen] = useState(false);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const reminderTimeouts = React.useRef<NodeJS.Timeout[]>([]);


  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = useState(false);
  const [reflectionDialogData, setReflectionDialogData] = useState<{
    habitId: string;
    date: string;
    initialNote?: string;
    habitName: string;
  } | null>(null);

  const [rescheduleDialogData, setRescheduleDialogData] = useState<{
    habit: Habit;
    missedDate: string;
  } | null>(null);

  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        router.push('/auth/login'); 
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe(); 
  }, [router]);

  // Effect for Notification Permission
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
      setNotificationPermission('denied'); // Treat as denied if not supported
    }
  }, []);


  useEffect(() => {
    if (!authUser || isLoadingAuth) return; 

    const storedHabits = localStorage.getItem('habits');
    if (storedHabits) {
      try {
        const parsedHabits: Habit[] = JSON.parse(storedHabits).map((habit: any) => {
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
            reminderEnabled: habit.reminderEnabled || false, // Migration for reminderEnabled
          };
        });
        setHabits(parsedHabits);
      } catch (error) {
        console.error("Failed to parse habits from localStorage:", error);
      }
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
  }, [authUser, isLoadingAuth]); 

  useEffect(() => {
    if (!authUser || isLoadingAuth) return; 
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
  }, [habits, earnedBadges, authUser, isLoadingAuth]);

  useEffect(() => {
    if (!authUser || isLoadingAuth) return;
    localStorage.setItem('earnedBadges', JSON.stringify(earnedBadges));
  }, [earnedBadges, authUser, isLoadingAuth]);

  useEffect(() => {
    if (!authUser || isLoadingAuth) return;
    localStorage.setItem('totalPoints', totalPoints.toString());
  }, [totalPoints, authUser, isLoadingAuth]);

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
              let specificEventTime = set(now, { hours, minutes, seconds: 0, milliseconds: 0 });
              reminderDateTime = subMinutes(specificEventTime, 30);
            } catch (e) { 
              console.error(`Error parsing specificTime "${habit.specificTime}" for habit "${habit.name}"`, e);
            }
          } else {
            let baseHour = 10; // Default if no optimal timing
            if (habit.optimalTiming?.toLowerCase().includes('morning')) baseHour = 9;
            else if (habit.optimalTiming?.toLowerCase().includes('afternoon')) baseHour = 13;
            else if (habit.optimalTiming?.toLowerCase().includes('evening')) baseHour = 18;
            reminderDateTime = set(now, { hours: baseHour, minutes: 0, seconds: 0, milliseconds: 0 });
          }

          if (reminderDateTime && isFuture(reminderDateTime)) {
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


  const handleAddHabit = (newHabitData: Omit<Habit, 'id' | 'completionLog'>) => {
    const newHabit: Habit = {
      ...newHabitData,
      id: Date.now().toString() + Math.random().toString(36).substring(2,7),
      completionLog: [],
      category: newHabitData.category || 'Other',
      reminderEnabled: false, // Default reminder state
    };
    setHabits((prevHabits) => [...prevHabits, newHabit]);
    console.log(`Habit Added: ${newHabit.name}`);
    setShowInlineHabitForm(false);
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
              } else if (logEntry.note) { // If there's a note, mark as skipped instead of removing
                newCompletionLog[existingLogIndex] = { ...logEntry, status: 'skipped', time: 'N/A' };
              }
              else { // Otherwise, remove the log
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

  const toggleHabitSelection = (habitId: string) => {
    setSelectedHabitIds((prevSelected) =>
      prevSelected.includes(habitId)
        ? prevSelected.filter((id) => id !== habitId)
        : [...prevSelected, habitId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHabitIds(habits.map((habit) => habit.id));
    } else {
      setSelectedHabitIds([]);
    }
  };

  const handleDeleteSelectedHabits = () => {
    setHabits((prevHabits) =>
      prevHabits.filter((habit) => !selectedHabitIds.includes(habit.id))
    );
    const numDeleted = selectedHabitIds.length;
    console.log(`${numDeleted} habit(s) deleted.`);
    setSelectedHabitIds([]);
    setIsDeleteConfirmOpen(false);
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

  const sheetMenuItems = [
    { href: '/', label: 'Home', icon: Home, action: () => setIsSettingsSheetOpen(false) },
    { href: '/profile', label: 'Profile', icon: UserCircle, action: () => setIsSettingsSheetOpen(false) },
    {
      label: 'Reminders',
      icon: BellRing,
      action: () => {
        setIsSettingsSheetOpen(false);
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
    { href: '/calendar', label: 'Calendar', icon: CalendarDays, action: () => { setIsSettingsSheetOpen(false); } },
  ];

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
          height: 'clamp(600px, 90vh, 800px)',
          overflow: 'hidden',
        }}
      >
        <AppHeader />

        <div className="flex-grow overflow-y-auto">
           {/* Selection Toolbar - Conditionally Rendered */}
           {/*
          {selectedHabitIds.length > 0 && (
            <div className="p-2 sm:p-3 border-b bg-muted/50 sticky top-0 z-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-habits"
                    checked={selectedHabitIds.length === habits.length && habits.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    aria-label="Select all habits"
                  />
                  <label htmlFor="select-all-habits" className="text-sm font-medium">
                    {selectedHabitIds.length} selected
                  </label>
                </div>
                <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={selectedHabitIds.length === 0}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the selected habit(s).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteSelectedHabits}>
                        Yes, delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
            */}
          <main className="px-3 sm:px-4 py-6">
            {showInlineHabitForm && (
              <div className="my-4">
                <InlineCreateHabitForm
                  onAddHabit={handleAddHabit}
                  onCloseForm={() => setShowInlineHabitForm(false)}
                />
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
                  // selectedHabitIds={selectedHabitIds} // Removed as multi-select is disabled from card header
                  // onSelectHabit={toggleHabitSelection} // Removed
                />
            )}
          </main>
          <footer className="py-3 text-center text-xs text-muted-foreground border-t mt-auto">
            <p>&copy; {new Date().getFullYear()} Habitual.</p>
          </footer>
        </div>


        <div className="shrink-0 bg-card border-t border-border p-1 flex justify-around items-center h-16">
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
          onClick={() => setShowInlineHabitForm(true)}
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
              ) : item.href === "/profile" || item.href === "/calendar" ? ( 
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

