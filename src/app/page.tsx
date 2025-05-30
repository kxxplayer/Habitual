
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
// Namespace localStorage by UID. Stop clearing localStorage on logout to persist user data.
// Make "Add New Habit" a FAB, add bottom nav with "Dashboard" triggering dialog.
// Removed direct rendering of HabitOverview from main page again.
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


const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const POINTS_PER_COMPLETION = 10;

const LS_KEY_PREFIX_HABITS = "habits_";
const LS_KEY_PREFIX_BADGES = "earnedBadges_";
const LS_KEY_PREFIX_POINTS = "totalPoints_";
const LS_KEY_PREFIX_DAILY_QUEST = "hasSeenDailyQuest_";


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
    const nowEffectToday = new Date();
    setTodayString(format(nowEffectToday, 'yyyy-MM-dd'));
    setTodayAbbr(dayIndexToWeekDayConstant[getDay(nowEffectToday)]);
  }, []);

  // Authentication State
  React.useEffect(() => {
    const unsubscribeAuthMain = onAuthStateChanged(auth, (currentUserAuthMain) => {
      const previousUidAuthMain = previousAuthUserUidRef.current;
      const currentUidAuthMain = currentUserAuthMain?.uid || null;

      if (previousUidAuthMain !== currentUidAuthMain) {
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
        // It remains namespaced by their UID.
      }

      setAuthUser(currentUserAuthMain);
      setIsLoadingAuth(false);
      previousAuthUserUidRef.current = currentUidAuthMain;

      if (!currentUserAuthMain && typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
        router.push('/auth/login');
      }
    });
    return () => unsubscribeAuthMain();
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
    if (isLoadingAuth) return;
    if (!authUser) {
      if (habits.length > 0 || earnedBadges.length > 0 || totalPoints > 0) {
        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
      }
      setIsLoadingHabits(false);
      return;
    }

    setIsLoadingHabits(true);
    const userUidLoadMain = authUser.uid;

    const userHabitsKeyLoadMain = `${LS_KEY_PREFIX_HABITS}${userUidLoadMain}`;
    const storedHabitsLoadMain = typeof window !== 'undefined' ? localStorage.getItem(userHabitsKeyLoadMain) : null;
    let parsedHabitsLoadMain: Habit[] = [];
    if (storedHabitsLoadMain) {
      try {
        const rawHabitsLoadMain: any[] = JSON.parse(storedHabitsLoadMain);
        parsedHabitsLoadMain = rawHabitsLoadMain.map((hItemMapLoadMain: any): Habit => {
          const idValLoadMain = String(hItemMapLoadMain.id || Date.now().toString() + Math.random().toString(36).substring(2, 7));
          const nameValLoadMain = String(hItemMapLoadMain.name || 'Unnamed Habit');
          const descriptionValLoadMain = typeof hItemMapLoadMain.description === 'string' ? hItemMapLoadMain.description : undefined;
          const categoryValCheckLoadMain = hItemMapLoadMain.category as HabitCategory;
          const categoryValLoadMain = HABIT_CATEGORIES.includes(categoryValCheckLoadMain) ? categoryValCheckLoadMain : 'Other';

          let daysOfWeekValLoadMain: WeekDay[] = Array.isArray(hItemMapLoadMain.daysOfWeek) ? hItemMapLoadMain.daysOfWeek.filter((dValLoadMain: any) => weekDays.includes(dValLoadMain as WeekDay)) : [];
          if (!Array.isArray(hItemMapLoadMain.daysOfWeek) && typeof hItemMapLoadMain.frequency === 'string') {
            const freqLowerValLoadMain = hItemMapLoadMain.frequency.toLowerCase();
            if (freqLowerValLoadMain === 'daily') daysOfWeekValLoadMain = [...weekDays];
            else {
              const dayMapValLoadMain: { [keyValLoadMain: string]: WeekDay } = {
                'sun': 'Sun', 'sunday': 'Sun', 'mon': 'Mon', 'monday': 'Mon',
                'tue': 'Tue', 'tuesday': 'Tue', 'wed': 'Wed', 'wednesday': 'Wed',
                'thu': 'Thu', 'thursday': 'Thu', 'fri': 'Fri', 'friday': 'Fri',
                'sat': 'Sat', 'saturday': 'Sat',
              };
              daysOfWeekValLoadMain = freqLowerValLoadMain.split(/[\s,]+/).map((dStrLoadMain: string) => dayMapValLoadMain[dStrLoadMain.trim().toLowerCase() as keyof typeof dayMapValLoadMain]).filter(Boolean) as WeekDay[];
            }
          }

          const optimalTimingValLoadMain = typeof hItemMapLoadMain.optimalTiming === 'string' ? hItemMapLoadMain.optimalTiming : undefined;
          let migratedDurationHoursValLoadMain: number | undefined = typeof hItemMapLoadMain.durationHours === 'number' ? hItemMapLoadMain.durationHours : undefined;
          let migratedDurationMinutesValLoadMain: number | undefined = typeof hItemMapLoadMain.durationMinutes === 'number' ? hItemMapLoadMain.durationMinutes : undefined;

          if (typeof hItemMapLoadMain.duration === 'string' && migratedDurationHoursValLoadMain === undefined && migratedDurationMinutesValLoadMain === undefined) {
            const durationStrValLoadMain = hItemMapLoadMain.duration.toLowerCase();
            const hourMatchValLoadMain = durationStrValLoadMain.match(/(\d+)\s*h/);
            const minMatchValLoadMain = durationStrValLoadMain.match(/(\d+)\s*m/);
            if (hourMatchValLoadMain) migratedDurationHoursValLoadMain = parseInt(hourMatchValLoadMain[1]);
            if (minMatchValLoadMain) migratedDurationMinutesValLoadMain = parseInt(minMatchValLoadMain[1]);
          }

          let migratedSpecificTimeValLoadMain = typeof hItemMapLoadMain.specificTime === 'string' ? hItemMapLoadMain.specificTime : undefined;
          if (migratedSpecificTimeValLoadMain && migratedSpecificTimeValLoadMain.match(/^\d{1,2}:\d{2}\s*(am|pm)$/i)) {
            try {
              const [timePartMapLoadMain, modifierPartMapLoadMain] = migratedSpecificTimeValLoadMain.split(/\s+/);
              let [hoursMapStrLoadMain, minutesMapStrLoadMain] = timePartMapLoadMain.split(':');
              let hoursMapValLoadMain = parseInt(hoursMapStrLoadMain, 10);
              const minutesMapValLoadMain = parseInt(minutesMapStrLoadMain, 10);
              if (modifierPartMapLoadMain.toLowerCase() === 'pm' && hoursMapValLoadMain < 12) hoursMapValLoadMain += 12;
              if (modifierPartMapLoadMain.toLowerCase() === 'am' && hoursMapValLoadMain === 12) hoursMapValLoadMain = 0;
              migratedSpecificTimeValLoadMain = `${String(hoursMapValLoadMain).padStart(2, '0')}:${String(minutesMapValLoadMain).padStart(2, '0')}`;
            } catch (eMapTimeLoadMain) { console.warn("Error parsing specificTime for migration:", hItemMapLoadMain.specificTime, eMapTimeLoadMain) }
          } else if (migratedSpecificTimeValLoadMain && migratedSpecificTimeValLoadMain.match(/^\d{1,2}:\d{2}$/)) {
             const [hoursValTLoadMain, minutesValTLoadMain] = migratedSpecificTimeValLoadMain.split(':').map(Number);
             migratedSpecificTimeValLoadMain = `${String(hoursValTLoadMain).padStart(2, '0')}:${String(minutesValTLoadMain).padStart(2, '0')}`;
          }

          const migratedCompletionLogValLoadMain = (Array.isArray(hItemMapLoadMain.completionLog) ? hItemMapLoadMain.completionLog : (Array.isArray(hItemMapLoadMain.completedDates) ? hItemMapLoadMain.completedDates.map((dMapLogLoadMain: string) => ({ date: dMapLogLoadMain, time: 'N/A', note: undefined, status: 'completed' })) : []))
            .map((logMapItemLoadMain: any): HabitCompletionLogEntry | null => {
              if (typeof logMapItemLoadMain.date !== 'string' || !logMapItemLoadMain.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.warn("Sanitizing: Invalid or missing date in log entry for habit id:", idValLoadMain, logMapItemLoadMain);
                return null;
              }
              const statusValLogLoadMain = ['completed', 'pending_makeup', 'skipped'].includes(logMapItemLoadMain.status) ? logMapItemLoadMain.status : 'completed';
              const originalMissedDateValLogLoadMain = typeof logMapItemLoadMain.originalMissedDate === 'string' && logMapItemLoadMain.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? logMapItemLoadMain.originalMissedDate : undefined;
              const timeValLogLoadMain = typeof logMapItemLoadMain.time === 'string' ? logMapItemLoadMain.time : 'N/A';
              const noteValLogLoadMain = typeof logMapItemLoadMain.note === 'string' ? logMapItemLoadMain.note : undefined;

              return {
                date: logMapItemLoadMain.date,
                time: timeValLogLoadMain,
                note: noteValLogLoadMain,
                status: statusValLogLoadMain,
                originalMissedDate: originalMissedDateValLogLoadMain,
              };
            })
            .filter((logItemFilterLoadMain): logItemFilterLoadMain is HabitCompletionLogEntry => logItemFilterLoadMain !== null)
            .sort((aLogSortLoadMain,bLogSortLoadMain) => bLogSortLoadMain.date.localeCompare(aLogSortLoadMain.date));

          const reminderEnabledValLoadMain = typeof hItemMapLoadMain.reminderEnabled === 'boolean' ? hItemMapLoadMain.reminderEnabled : false;

          return {
            id: idValLoadMain, name: nameValLoadMain, description: descriptionValLoadMain, category: categoryValLoadMain, daysOfWeek: daysOfWeekValLoadMain,
            optimalTiming: optimalTimingValLoadMain, durationHours: migratedDurationHoursValLoadMain, durationMinutes: migratedDurationMinutesValLoadMain,
            specificTime: migratedSpecificTimeValLoadMain, completionLog: migratedCompletionLogValLoadMain, reminderEnabled: reminderEnabledValLoadMain,
          };
        });
        setHabits(parsedHabitsLoadMain);
      } catch (eParseHabitsLoadMain) {
        console.error(`Error parsing habits for user ${userUidLoadMain} from localStorage:`, eParseHabitsLoadMain);
        setHabits([]);
      }
    } else {
      setHabits([]);
    }

    if (authUser && parsedHabitsLoadMain.length === 0 && !commonSuggestionsFetched) {
      setIsLoadingCommonSuggestions(true);
      getCommonHabitSuggestions({ count: 5 })
        .then(responseCommonSuggMain => {
          if (responseCommonSuggMain && Array.isArray(responseCommonSuggMain.suggestions)) {
            setCommonHabitSuggestions(responseCommonSuggMain.suggestions);
          } else {
            setCommonHabitSuggestions([]);
          }
        })
        .catch(errCommonSuggMain => {
          console.error("Failed to fetch common habit suggestions:", errCommonSuggMain);
          setCommonHabitSuggestions([]);
        })
        .finally(() => {
          setIsLoadingCommonSuggestions(false);
          setCommonSuggestionsFetched(true);
          const dailyQuestKeyLoadMain = `${LS_KEY_PREFIX_DAILY_QUEST}${userUidLoadMain}`;
          const hasSeenDailyQuestLoadMain = typeof window !== 'undefined' ? localStorage.getItem(dailyQuestKeyLoadMain) : null;
          if (!hasSeenDailyQuestLoadMain) {
            setIsDailyQuestDialogOpen(true);
          }
        });
    } else if (parsedHabitsLoadMain.length > 0) {
      setCommonSuggestionsFetched(true);
    }


    const userBadgesKeyLoadMain = `${LS_KEY_PREFIX_BADGES}${userUidLoadMain}`;
    const storedBadgesLoadMain = typeof window !== 'undefined' ? localStorage.getItem(userBadgesKeyLoadMain) : null;
    if (storedBadgesLoadMain) { try { setEarnedBadges(JSON.parse(storedBadgesLoadMain)); } catch (eParseBadgeMain) { console.error("Error parsing badges:", eParseBadgeMain); setEarnedBadges([]); } }
    else { setEarnedBadges([]); }

    const userPointsKeyLoadMain = `${LS_KEY_PREFIX_POINTS}${userUidLoadMain}`;
    const storedPointsLoadMain = typeof window !== 'undefined' ? localStorage.getItem(userPointsKeyLoadMain) : null;
    if (storedPointsLoadMain) { try { setTotalPoints(parseInt(storedPointsLoadMain, 10) || 0); } catch (eParsePointsMain) { console.error("Error parsing points:", eParsePointsMain); setTotalPoints(0); } }
    else { setTotalPoints(0); }

    setIsLoadingHabits(false);

  }, [authUser, isLoadingAuth]);


  // Save habits to localStorage & check for badges
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userHabitsKeySaveMain = `${LS_KEY_PREFIX_HABITS}${authUser.uid}`;
    localStorage.setItem(userHabitsKeySaveMain, JSON.stringify(habits));

    const newlyEarnedBadgesSaveMain = checkAndAwardBadges(habits, earnedBadges);
    if (newlyEarnedBadgesSaveMain.length > 0) {
      const updatedBadgesSaveMain = [...earnedBadges];
      let newBadgeAwardedSaveMain = false;
      newlyEarnedBadgesSaveMain.forEach(async newBadgeItemSaveMain => {
        if (!earnedBadges.some(ebFindSaveMain => ebFindSaveMain.id === newBadgeItemSaveMain.id)) {
            updatedBadgesSaveMain.push(newBadgeItemSaveMain);
            newBadgeAwardedSaveMain = true;
            console.log(`New Badge Unlocked: ${newBadgeItemSaveMain.name} - ${newBadgeItemSaveMain.description}`);
            if (newBadgeItemSaveMain.id === THREE_DAY_SQL_STREAK_BADGE_ID) {
              try {
                const sqlTipResultSaveMain = await getSqlTip();
                console.log(`Bonus SQL Tip Unlocked: ${sqlTipResultSaveMain.tip}`);
              } catch (tipErrorSaveMain) {
                console.error("Failed to fetch SQL tip:", tipErrorSaveMain);
              }
            }
        }
      });
      if (newBadgeAwardedSaveMain) {
        setEarnedBadges(updatedBadgesSaveMain);
      }
    }
  }, [habits, authUser, isLoadingAuth, isLoadingHabits, earnedBadges]);

  // Save badges to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userBadgesKeySaveMain = `${LS_KEY_PREFIX_BADGES}${authUser.uid}`;
    localStorage.setItem(userBadgesKeySaveMain, JSON.stringify(earnedBadges));
  }, [earnedBadges, authUser, isLoadingAuth, isLoadingHabits]);

  // Save points to localStorage
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    const userPointsKeySaveMain = `${LS_KEY_PREFIX_POINTS}${authUser.uid}`;
    localStorage.setItem(userPointsKeySaveMain, totalPoints.toString());
  }, [totalPoints, authUser, isLoadingAuth, isLoadingHabits]);

  React.useEffect(() => {
    reminderTimeouts.current.forEach(clearTimeout);
    reminderTimeouts.current = [];

    if (notificationPermission === 'granted' && authUser) {
      habits.forEach(habitReminderCheckMain => {
        if (habitReminderCheckMain.reminderEnabled) {
          let reminderDateTimeValMain: Date | null = null;
          const nowReminderMain = new Date();

          const todayDayAbbrReminderMain = dayIndexToWeekDayConstant[getDay(nowReminderMain)];
          if (!habitReminderCheckMain.daysOfWeek.includes(todayDayAbbrReminderMain)) {
            return;
          }

          if (habitReminderCheckMain.specificTime && habitReminderCheckMain.specificTime.toLowerCase() !== 'anytime' && habitReminderCheckMain.specificTime.toLowerCase() !== 'flexible') {
            try {
              const [hoursReminderTimeMain, minutesReminderTimeMain] = habitReminderCheckMain.specificTime.split(':').map(Number);
              if (isNaN(hoursReminderTimeMain) || isNaN(minutesReminderTimeMain)) throw new Error("Invalid time format for reminder");

              let specificEventTimeReminderMain = new Date(nowReminderMain.getFullYear(), nowReminderMain.getMonth(), nowReminderMain.getDate(), hoursReminderTimeMain, minutesReminderTimeMain, 0, 0);
              let potentialReminderTimeReminderMain = new Date(specificEventTimeReminderMain.getTime() - 30 * 60 * 1000);

              if (potentialReminderTimeReminderMain <= nowReminderMain && specificEventTimeReminderMain > nowReminderMain) {
                reminderDateTimeValMain = specificEventTimeReminderMain;
              } else if (potentialReminderTimeReminderMain > nowReminderMain) {
                reminderDateTimeValMain = potentialReminderTimeReminderMain;
              }
            } catch (eReminderTimeMain) {
              console.error(`Error parsing specificTime "${habitReminderCheckMain.specificTime}" for habit "${habitReminderCheckMain.name}"`, eReminderTimeMain);
            }
          } else {
            let baseHourReminderMain = 10;
            const timingLowerReminderMain = habitReminderCheckMain.optimalTiming?.toLowerCase();
            if (timingLowerReminderMain?.includes('morning')) baseHourReminderMain = 9;
            else if (timingLowerReminderMain?.includes('afternoon')) baseHourReminderMain = 13;
            else if (timingLowerReminderMain?.includes('evening')) baseHourReminderMain = 18;

            const potentialReminderTimeOptMain = new Date(nowReminderMain.getFullYear(), nowReminderMain.getMonth(), nowReminderMain.getDate(), baseHourReminderMain, 0, 0, 0);
            if (potentialReminderTimeOptMain > nowReminderMain) {
                reminderDateTimeValMain = potentialReminderTimeOptMain;
            }
          }

          if (reminderDateTimeValMain && reminderDateTimeValMain > nowReminderMain) {
            const delayReminderMain = reminderDateTimeValMain.getTime() - nowReminderMain.getTime();
            console.log(`REMINDER LOG (Placeholder): "${habitReminderCheckMain.name}" would be at ${reminderDateTimeValMain.toLocaleString()} (in ${Math.round(delayReminderMain/60000)} mins)`);
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
      const tasksScheduledTodayCheckAllDoneMain = habits.filter(hCheckAllDoneMain => hCheckAllDoneMain.daysOfWeek.includes(todayAbbr));
      if (tasksScheduledTodayCheckAllDoneMain.length === 0) {
        setAllTodayTasksDone(true);
        return;
      }
      const allDoneCheckMain = tasksScheduledTodayCheckAllDoneMain.every(hCheckAllDoneInnerMain =>
        hCheckAllDoneInnerMain.completionLog.some(logCheckAllDoneMain => logCheckAllDoneMain.date === todayString && logCheckAllDoneMain.status === 'completed')
      );
      setAllTodayTasksDone(allDoneCheckMain);
    } else if (habits.length === 0 && !isLoadingHabits && todayString) {
      setAllTodayTasksDone(true);
    }
  }, [habits, todayString, todayAbbr, isLoadingHabits]);


  const handleSaveHabit = (habitDataSaveHabitMain: CreateHabitFormData & { id?: string }) => {
    if (!authUser) return;
    const isEditingModeSaveHabitMain = !!(habitDataSaveHabitMain.id && editingHabit && editingHabit.id === habitDataSaveHabitMain.id);

    if (isEditingModeSaveHabitMain) {
      setHabits(prevHabitsSaveHabitMain => prevHabitsSaveHabitMain.map(hMapEditSaveMain => hMapEditSaveMain.id === habitDataSaveHabitMain.id ? {
        ...hMapEditSaveMain,
        name: habitDataSaveHabitMain.name,
        description: habitDataSaveHabitMain.description,
        category: habitDataSaveHabitMain.category || 'Other',
        daysOfWeek: habitDataSaveHabitMain.daysOfWeek,
        optimalTiming: habitDataSaveHabitMain.optimalTiming,
        durationHours: habitDataSaveHabitMain.durationHours === null ? undefined : habitDataSaveHabitMain.durationHours,
        durationMinutes: habitDataSaveHabitMain.durationMinutes === null ? undefined : habitDataSaveHabitMain.durationMinutes,
        specificTime: habitDataSaveHabitMain.specificTime,
      } : hMapEditSaveMain));
      console.log(`Habit Updated: ${habitDataSaveHabitMain.name}`);
    } else {
      const newHabitSaveHabitMain: Habit = {
        id: String(Date.now() + Math.random()),
        name: habitDataSaveHabitMain.name,
        description: habitDataSaveHabitMain.description,
        category: habitDataSaveHabitMain.category || 'Other',
        daysOfWeek: habitDataSaveHabitMain.daysOfWeek,
        optimalTiming: habitDataSaveHabitMain.optimalTiming,
        durationHours: habitDataSaveHabitMain.durationHours === null ? undefined : habitDataSaveHabitMain.durationHours,
        durationMinutes: habitDataSaveHabitMain.durationMinutes === null ? undefined : habitDataSaveHabitMain.durationMinutes,
        specificTime: habitDataSaveHabitMain.specificTime,
        completionLog: [],
        reminderEnabled: false,
      };
      setHabits(prevHabitsNewSaveMain => [...prevHabitsNewSaveMain, newHabitSaveHabitMain]);
      console.log(`Habit Added: ${newHabitSaveHabitMain.name}`);
      if (habits.length === 0 && commonHabitSuggestions.length > 0) {
        setCommonHabitSuggestions([]);
      }
    }
    if(isCreateHabitDialogOpen) setIsCreateHabitDialogOpen(false);

    setInitialFormDataForDialog(null);
    setEditingHabit(null);
  };

  const handleOpenEditDialog = (habitToEditOpenEditMain: Habit) => {
    setEditingHabit(habitToEditOpenEditMain);
    setInitialFormDataForDialog({
      id: habitToEditOpenEditMain.id,
      name: habitToEditOpenEditMain.name,
      description: habitToEditOpenEditMain.description || '',
      category: habitToEditOpenEditMain.category || 'Other',
      daysOfWeek: habitToEditOpenEditMain.daysOfWeek,
      optimalTiming: habitToEditOpenEditMain.optimalTiming || '',
      durationHours: habitToEditOpenEditMain.durationHours === undefined ? null : habitToEditOpenEditMain.durationHours,
      durationMinutes: habitToEditOpenEditMain.durationMinutes === undefined ? null : habitToEditOpenEditMain.durationMinutes,
      specificTime: habitToEditOpenEditMain.specificTime || '',
    });
    setIsCreateHabitDialogOpen(true);
  };


  const handleToggleComplete = async (habitIdToggleCompMain: string, dateToggleCompMain: string, completedToggleCompMain: boolean) => {
    if (!authUser) return;
    let habitNameForQuoteToggleCompMain: string | undefined = undefined;
    let pointsChangeToggleCompMain = 0;
    let justCompletedANewTaskToggleCompMain = false;

    setHabits(prevHabitsToggleCompMain =>
      prevHabitsToggleCompMain.map(hToggleMapCompMain => {
        if (hToggleMapCompMain.id === habitIdToggleCompMain) {
          habitNameForQuoteToggleCompMain = hToggleMapCompMain.name;
          let newCompletionLogToggleCompMain = [...hToggleMapCompMain.completionLog];
          const existingLogIndexToggleCompMain = newCompletionLogToggleCompMain.findIndex(logToggleFindCompMain => logToggleFindCompMain.date === dateToggleCompMain);
          const currentTimeToggleCompMain = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

          if (completedToggleCompMain) {
            if (existingLogIndexToggleCompMain > -1) {
              const existingLogToggleCompMain = newCompletionLogToggleCompMain[existingLogIndexToggleCompMain];
              if (existingLogToggleCompMain.status !== 'completed') {
                pointsChangeToggleCompMain = POINTS_PER_COMPLETION;
                justCompletedANewTaskToggleCompMain = true;
              }
              newCompletionLogToggleCompMain[existingLogIndexToggleCompMain] = { ...existingLogToggleCompMain, status: 'completed', time: currentTimeToggleCompMain };
            } else {
              pointsChangeToggleCompMain = POINTS_PER_COMPLETION;
              justCompletedANewTaskToggleCompMain = true;
              newCompletionLogToggleCompMain.push({ date: dateToggleCompMain, time: currentTimeToggleCompMain, status: 'completed', note: undefined });
            }
          } else {
            if (existingLogIndexToggleCompMain > -1) {
              const logEntryToggleCompMain = newCompletionLogToggleCompMain[existingLogIndexToggleCompMain];
              if (logEntryToggleCompMain.status === 'completed') {
                 pointsChangeToggleCompMain = -POINTS_PER_COMPLETION;
              }
              if (logEntryToggleCompMain.status === 'completed' && logEntryToggleCompMain.originalMissedDate) {
                newCompletionLogToggleCompMain[existingLogIndexToggleCompMain] = { ...logEntryToggleCompMain, status: 'pending_makeup', time: 'N/A' };
              } else if (logEntryToggleCompMain.note) {
                newCompletionLogToggleCompMain[existingLogIndexToggleCompMain] = { ...logEntryToggleCompMain, status: 'skipped', time: 'N/A' };
              }
              else {
                newCompletionLogToggleCompMain.splice(existingLogIndexToggleCompMain, 1);
              }
            }
          }
          return { ...hToggleMapCompMain, completionLog: newCompletionLogToggleCompMain.sort((aSortToggleCompMain, bSortToggleCompMain) => bSortToggleCompMain.date.localeCompare(aSortToggleCompMain.date)) };
        }
        return hToggleMapCompMain;
      })
    );

    if (justCompletedANewTaskToggleCompMain && habitNameForQuoteToggleCompMain && authUser) {
      try {
        const quoteResultToggleCompMain = await getMotivationalQuote({ habitName: habitNameForQuoteToggleCompMain });
        console.log(`Motivational Quote for ${habitNameForQuoteToggleCompMain}: ${quoteResultToggleCompMain.quote}`);
      } catch (errorQuoteToggleCompMain) {
        console.error("Failed to fetch motivational quote:", errorQuoteToggleCompMain);
      }
    }

    if (pointsChangeToggleCompMain !== 0) {
      setTotalPoints(prevPointsToggleCompMain => Math.max(0, prevPointsToggleCompMain + pointsChangeToggleCompMain));
    }
  };

  const handleToggleReminder = (habitIdReminderToggleMain: string, currentReminderStateReminderToggleMain: boolean) => {
    if(!authUser) return;
    setHabits(prevHabitsReminderToggleMain =>
      prevHabitsReminderToggleMain.map(hReminderMapToggleMain =>
        hReminderMapToggleMain.id === habitIdReminderToggleMain ? { ...hReminderMapToggleMain, reminderEnabled: !currentReminderStateReminderToggleMain } : hReminderMapToggleMain
      )
    );
    const habitReminderToggleLogMain = habits.find(hFindReminderToggleMain => hFindReminderToggleMain.id === habitIdReminderToggleMain);
    console.log(`Reminder for habit "${habitReminderToggleLogMain?.name}" ${!currentReminderStateReminderToggleMain ? 'enabled' : 'disabled'}`);
    if (!currentReminderStateReminderToggleMain && notificationPermission !== 'granted') {
       console.log('Please enable notifications in your browser settings or allow permission when prompted to receive reminders.');
    }
  };


  const handleOpenAISuggestionDialog = async (habitParamAiSuggOpenMain: Habit) => {
    setSelectedHabitForAISuggestion(habitParamAiSuggOpenMain);
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habitParamAiSuggOpenMain.id, suggestionText: '', isLoading: true });

    try {
      const completionEntriesAiSuggOpenMain = habitParamAiSuggOpenMain.completionLog.map(logAiSuggOpenMain => {
        let entryAiSuggOpenMain = `${logAiSuggOpenMain.date} at ${logAiSuggOpenMain.time || 'N/A'}`;
        if (logAiSuggOpenMain.status === 'skipped') entryAiSuggOpenMain += ` (Skipped)`;
        else if (logAiSuggOpenMain.status === 'pending_makeup') entryAiSuggOpenMain += ` (Makeup Pending for ${logAiSuggOpenMain.originalMissedDate})`;
        else if (logAiSuggOpenMain.status === 'completed' || logAiSuggOpenMain.status === undefined) entryAiSuggOpenMain += ` (Completed)`;

        if (logAiSuggOpenMain.note && logAiSuggOpenMain.note.trim() !== "") entryAiSuggOpenMain += ` (Note: ${logAiSuggOpenMain.note.trim()})`;
        return entryAiSuggOpenMain;
      });
      const trackingDataAiSuggOpenMain = `Completions & Status: ${completionEntriesAiSuggOpenMain.join('; ') || 'None yet'}.`;

      const inputForAIAiSuggOpenMain = {
        habitName: habitParamAiSuggOpenMain.name,
        habitDescription: habitParamAiSuggOpenMain.description,
        daysOfWeek: habitParamAiSuggOpenMain.daysOfWeek,
        optimalTiming: habitParamAiSuggOpenMain.optimalTiming,
        durationHours: habitParamAiSuggOpenMain.durationHours,
        durationMinutes: habitParamAiSuggOpenMain.durationMinutes,
        specificTime: habitParamAiSuggOpenMain.specificTime,
        trackingData: trackingDataAiSuggOpenMain,
      };

      const resultAiSuggOpenMain = await getHabitSuggestion(inputForAIAiSuggOpenMain);
      setAISuggestion({ habitId: habitParamAiSuggOpenMain.id, suggestionText: resultAiSuggOpenMain.suggestion, isLoading: false });
    } catch (errorAiSuggOpenMain) {
      console.error("Error fetching AI suggestion:", errorAiSuggOpenMain);
      setAISuggestion({
        habitId: habitParamAiSuggOpenMain.id,
        suggestionText: '',
        isLoading: false,
        error: 'Failed to get suggestion.'
      });
    }
  };

  const handleOpenReflectionDialog = (habitIdReflectionOpenMain: string, dateReflectionOpenMain: string, habitNameReflectionOpenMain: string) => {
    const habitForReflectionOpenMain = habits.find(hFindReflMain => hFindReflMain.id === habitIdReflectionOpenMain);
    const logEntryForReflectionOpenMain = habitForReflectionOpenMain?.completionLog.find(logFindReflEntryMain => logFindReflEntryMain.date === dateReflectionOpenMain);
    setReflectionDialogData({
      habitId: habitIdReflectionOpenMain,
      date: dateReflectionOpenMain,
      initialNote: logEntryForReflectionOpenMain?.note || '',
      habitName: habitNameReflectionOpenMain,
    });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (noteToSaveReflectionMain: string) => {
    if (!reflectionDialogData || !authUser) return;
    const { habitId: habitIdReflectionSaveMain, date: dateReflectionSaveNoteMain } = reflectionDialogData;

    setHabits(prevHabitsReflectionSaveMain =>
      prevHabitsReflectionSaveMain.map(hForNoteSaveReflectionMain => {
        if (hForNoteSaveReflectionMain.id === habitIdReflectionSaveMain) {
          let logEntryExistsForNoteSaveReflectionMain = false;
          const newCompletionLogForNoteSaveReflectionMain = hForNoteSaveReflectionMain.completionLog.map(logItemForNoteSaveReflectionMain => {
            if (logItemForNoteSaveReflectionMain.date === dateReflectionSaveNoteMain) {
              logEntryExistsForNoteSaveReflectionMain = true;
              return { ...logItemForNoteSaveReflectionMain, note: noteToSaveReflectionMain.trim() === "" ? undefined : noteToSaveReflectionMain.trim() };
            }
            return logItemForNoteSaveReflectionMain;
          });
          if (!logEntryExistsForNoteSaveReflectionMain) {
             const existingStatusReflectionSaveMain = hForNoteSaveReflectionMain.completionLog.find(lNoteReflectionMain => lNoteReflectionMain.date === dateReflectionSaveNoteMain)?.status;
             newCompletionLogForNoteSaveReflectionMain.push({
                date: dateReflectionSaveNoteMain,
                time: 'N/A',
                note: noteToSaveReflectionMain.trim() === "" ? undefined : noteToSaveReflectionMain.trim(),
                status: existingStatusReflectionSaveMain || 'skipped'
             });
             newCompletionLogForNoteSaveReflectionMain.sort((aSortReflectionMain,bSortReflectionMain) => bSortReflectionMain.date.localeCompare(aSortReflectionMain.date));
          }
          return { ...hForNoteSaveReflectionMain, completionLog: newCompletionLogForNoteSaveReflectionMain };
        }
        return hForNoteSaveReflectionMain;
      })
    );
    console.log(`Reflection Saved for ${reflectionDialogData.habitName} on ${reflectionDialogData.date}`);
    setReflectionDialogData(null);
    setIsReflectionDialogOpen(false);
  };

  const handleOpenRescheduleDialog = (habitParamRescheduleOpenMain: Habit, missedDateParamRescheduleOpenMain: string) => {
    setRescheduleDialogData({ habit: habitParamRescheduleOpenMain, missedDate: missedDateParamRescheduleOpenMain });
  };

  const handleSaveRescheduledHabit = (habitIdRescheduledSaveMain: string, originalMissedDateRescheduledSaveMain: string, newDateRescheduledSaveMain: string) => {
    if(!authUser) return;
    setHabits(prevHabitsRescheduledSaveMain => prevHabitsRescheduledSaveMain.map(hRescheduledSaveMain => {
      if (hRescheduledSaveMain.id === habitIdRescheduledSaveMain) {
        let newCompletionLogRescheduledSave = [...hRescheduledSaveMain.completionLog];
        const existingMissedLogIndexRescheduledSave = newCompletionLogRescheduledSave.findIndex(logRescheduleFindSave => logRescheduleFindSave.date === originalMissedDateRescheduledSaveMain);

        if(existingMissedLogIndexRescheduledSave > -1) {
            if (newCompletionLogRescheduledSave[existingMissedLogIndexRescheduledSave].status !== 'completed') {
                newCompletionLogRescheduledSave[existingMissedLogIndexRescheduledSave].status = 'skipped';
                newCompletionLogRescheduledSave[existingMissedLogIndexRescheduledSave].time = 'N/A';
            }
        } else {
            newCompletionLogRescheduledSave.push({
                date: originalMissedDateRescheduledSaveMain,
                time: 'N/A',
                status: 'skipped'
            });
        }

        newCompletionLogRescheduledSave.push({
          date: newDateRescheduledSaveMain,
          time: 'N/A',
          status: 'pending_makeup',
          originalMissedDate: originalMissedDateRescheduledSaveMain,
        });
        newCompletionLogRescheduledSave.sort((aSortRescheduleMain,bSortRescheduleMain) => bSortRescheduleMain.date.localeCompare(aSortRescheduleMain.date));
        return { ...hRescheduledSaveMain, completionLog: newCompletionLogRescheduledSave };
      }
      return hRescheduledSaveMain;
    }));
    const habitNameRescheduledMain = habits.find(hFindRescheduledNameMain => hFindRescheduledNameMain.id === habitIdRescheduledSaveMain)?.name || "Habit";
    console.log(`Habit Rescheduled: ${habitNameRescheduledMain} from ${originalMissedDateRescheduledSaveMain} to ${newDateRescheduledSaveMain}`);
    setRescheduleDialogData(null);
  };

  const handleSaveMarkAsSkipped = (habitIdSkippedSaveMain: string, missedDateSkippedSaveMain: string) => {
    if(!authUser) return;
     setHabits(prevHabitsSkippedSaveMain => prevHabitsSkippedSaveMain.map(hSkippedSaveMain => {
      if (hSkippedSaveMain.id === habitIdSkippedSaveMain) {
        let newCompletionLogSkippedSaveMain = [...hSkippedSaveMain.completionLog];
        const existingLogIndexSkippedSaveMain = newCompletionLogSkippedSaveMain.findIndex(logSkippedFindMain => logSkippedFindMain.date === missedDateSkippedSaveMain);
        if (existingLogIndexSkippedSaveMain > -1) {
          if (newCompletionLogSkippedSaveMain[existingLogIndexSkippedSaveMain].status !== 'completed') {
            newCompletionLogSkippedSaveMain[existingLogIndexSkippedSaveMain] = { ...newCompletionLogSkippedSaveMain[existingLogIndexSkippedSaveMain], status: 'skipped', time: 'N/A' };
          }
        } else {
          newCompletionLogSkippedSaveMain.push({ date: missedDateSkippedSaveMain, time: 'N/A', status: 'skipped' });
        }
        newCompletionLogSkippedSaveMain.sort((aSortSkippedMain,bSortSkippedMain) => bSortSkippedMain.date.localeCompare(aSortSkippedMain.date));
        return { ...hSkippedSaveMain, completionLog: newCompletionLogSkippedSaveMain };
      }
      return hSkippedSaveMain;
    }));
    const habitNameSkippedMain = habits.find(hFindSkippedNameMain => hFindSkippedNameMain.id === habitIdSkippedSaveMain)?.name || "Habit";
    console.log(`Habit Skipped: ${habitNameSkippedMain} on ${missedDateSkippedSaveMain}`);
    setRescheduleDialogData(null);
  };

  const handleRequestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission().then(permissionReqMain => {
                setNotificationPermission(permissionReqMain);
                if (permissionReqMain === 'granted') {
                    console.log('Notification permission granted.');
                } else {
                    console.log('Notification permission denied or dismissed.');
                }
            });
        } else {
           setNotificationPermission('granted');
           console.log('Notification permission was already granted.');
        }
    }
  };

  const handleOpenDeleteHabitConfirm = (habitIdDeleteConfirmOpenMain: string, habitNameDeleteConfirmOpenMain: string) => {
    setHabitToDelete({ id: habitIdDeleteConfirmOpenMain, name: habitNameDeleteConfirmOpenMain });
    setIsDeleteHabitConfirmOpen(true);
  };

  const handleConfirmDeleteSingleHabit = () => {
    if (habitToDelete && authUser) {
      setHabits(prevHabitsDeleteSingleMain => prevHabitsDeleteSingleMain.filter(hDeleteSingleMain => hDeleteSingleMain.id !== habitToDelete.id));
      console.log(`Habit "${habitToDelete.name}" deleted.`);
      setHabitToDelete(null);
    }
    setIsDeleteHabitConfirmOpen(false);
  };

  const handleCustomizeSuggestedHabit = (suggestionCustomizeMain: SuggestedHabit) => {
    const formDataCustomizeMain: Partial<CreateHabitFormData> = {
      name: suggestionCustomizeMain.name,
      category: suggestionCustomizeMain.category || 'Other',
      description: '',
      daysOfWeek: [] as WeekDay[],
    };
    setEditingHabit(null);
    setInitialFormDataForDialog(formDataCustomizeMain);
    setIsCreateHabitDialogOpen(true);
  };

  const handleCloseDailyQuestDialog = () => {
    setIsDailyQuestDialogOpen(false);
    if (authUser && typeof window !== 'undefined') {
      const dailyQuestKeyCloseMain = `${LS_KEY_PREFIX_DAILY_QUEST}${authUser.uid}`;
      localStorage.setItem(dailyQuestKeyCloseMain, 'true');
    }
  };

  const handleMarkAllTodayDone = () => {
    if (!todayString || !todayAbbr || isLoadingHabits || !authUser) return;
    let tasksMarkedAllDoneMain = 0;
    habits.forEach(habitMarkAllDoneMain => {
      const isScheduledMarkAllDoneMain = habitMarkAllDoneMain.daysOfWeek.includes(todayAbbr);
      const isCompletedMarkAllDoneMain = habitMarkAllDoneMain.completionLog.some(logMarkAllDoneMain => logMarkAllDoneMain.date === todayString && logMarkAllDoneMain.status === 'completed');
      if (isScheduledMarkAllDoneMain && !isCompletedMarkAllDoneMain) {
        handleToggleComplete(habitMarkAllDoneMain.id, todayString, true);
        tasksMarkedAllDoneMain++;
      }
    });
    if (tasksMarkedAllDoneMain > 0) {
      console.log(`Marked ${tasksMarkedAllDoneMain} tasks as done for today.`);
    } else {
      console.log("No pending tasks to mark as done for today.");
    }
  };

  // Completely removed calendarDialogModifiers and calendarDialogModifierStyles
  // The calendar will use its default appearance.

  const habitsForSelectedCalendarDate = React.useMemo(() => {
    if (!selectedCalendarDate || !authUser) return [];
    try {
      const dateStrForListCalMain = format(selectedCalendarDate, 'yyyy-MM-dd');
      const dayOfWeekForListCalMain = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

      return habits.filter(habitForListCalMain => {
        const isScheduledForListCalMain = habitForListCalMain.daysOfWeek.includes(dayOfWeekForListCalMain);
        const logEntryForListCalMain = habitForListCalMain.completionLog.find(logForListCalMain => logForListCalMain.date === dateStrForListCalMain);
        return isScheduledForListCalMain || logEntryForListCalMain;
      });
    } catch (eHabitsForDateMain) {
      console.error("Error in habitsForSelectedCalendarDate calculation:", eHabitsForDateMain);
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
      <div className="min-h-screen p-2 sm:p-4 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
       <div className="min-h-screen p-2 sm:p-4 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen p-2 sm:p-4 flex items-center justify-center">
      <div
        className={cn(
          "bg-card text-foreground shadow-xl rounded-xl flex flex-col overflow-hidden",
          "w-full max-w-md h-full max-h-[90vh] sm:max-h-[850px]",
          "md:max-w-lg md:max-h-[85vh]",
          "lg:max-w-2xl lg:max-h-[80vh]"
        )}
      >
        <AppHeader onOpenCalendar={() => setIsCalendarDialogOpen(true)} />

        <ScrollArea className="flex-grow">
          <main className="px-3 sm:px-4 py-4">
             {/* HabitOverview is removed from direct rendering here */}

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
                     <Lightbulb className="mr-2 h-5 w-5"/> Welcome to Habitual!
                  </h3>
                  <p className="text-xs text-muted-foreground mb-1.5">Start by picking a common habit or add your own:</p>
                </div>
                <div className="p-1">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {commonHabitSuggestions.map((suggItemMapMain, idxSuggMapMain) => (
                      <Button key={idxSuggMapMain} variant="outline"
                        className="p-2.5 h-auto flex flex-col items-center justify-center space-y-0.5 min-w-[90px] text-center shadow-sm hover:shadow-md transition-shadow text-xs"
                        onClick={() => handleCustomizeSuggestedHabit(suggItemMapMain)}
                      >
                        <span className="font-medium">{suggItemMapMain.name}</span>
                        {suggItemMapMain.category && <span className="text-primary/80 opacity-80">{suggItemMapMain.category}</span>}
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
          onReschedule={(newDateRescheduleCbMain) => {
            handleSaveRescheduledHabit(rescheduleDialogData.habit.id, rescheduleDialogData.missedDate, newDateRescheduleCbMain);
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
                    {habitsForSelectedCalendarDate.length > 0 ? (
                       <ul className="space-y-1.5 text-sm max-h-40 overflow-y-auto">
                        {habitsForSelectedCalendarDate.map(hItemCalListMapItemMain => {
                        const logItemCalListMapItemMain = hItemCalListMapItemMain.completionLog.find(lCalListMapItemMain => lCalListMapItemMain.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                        const dayOfWeekForSelectedListMapItemMain = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                        const isScheduledTodayListMapItemMain = hItemCalListMapItemMain.daysOfWeek.includes(dayOfWeekForSelectedListMapItemMain);

                        let statusTextListMapItemMain = "Scheduled";
                        let StatusIconListMapItemMain = CircleIcon;
                        let iconColorListMapItemMain = "text-orange-500";

                        if (logItemCalListMapItemMain?.status === 'completed') {
                           statusTextListMapItemMain = `Completed ${logItemCalListMapItemMain.time || ''}`;
                           StatusIconListMapItemMain = CheckCircle2; iconColorListMapItemMain = "text-accent";
                        } else if (logItemCalListMapItemMain?.status === 'pending_makeup') {
                           statusTextListMapItemMain = `Makeup for ${logItemCalListMapItemMain.originalMissedDate}`;
                           StatusIconListMapItemMain = MakeupIcon; iconColorListMapItemMain = "text-blue-500";
                        } else if (logItemCalListMapItemMain?.status === 'skipped') {
                           statusTextListMapItemMain = "Skipped";
                           StatusIconListMapItemMain = XCircle; iconColorListMapItemMain = "text-muted-foreground";
                        } else if (isScheduledTodayListMapItemMain && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !logItemCalListMapItemMain) {
                            statusTextListMapItemMain = "Missed"; StatusIconListMapItemMain = XCircle; iconColorListMapItemMain = "text-destructive";
                        } else if (!isScheduledTodayListMapItemMain && !logItemCalListMapItemMain) {
                            statusTextListMapItemMain = "Not Scheduled"; StatusIconListMapItemMain = CircleIcon; iconColorListMapItemMain = "text-muted-foreground/50";
                        }
                        
                        return (
                            <li key={hItemCalListMapItemMain.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                            <span className="font-medium truncate pr-2">{hItemCalListMapItemMain.name}</span>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <StatusIconListMapItemMain className={cn("h-3.5 w-3.5", iconColorListMapItemMain)} />
                                <span>{statusTextListMapItemMain}</span>
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
              earnedBadges.map((bItemMainAchMapMain) => (
                <div key={bItemMainAchMapMain.id} className="p-3 border rounded-md bg-card shadow-sm">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">{bItemMainAchMapMain.icon || "🏆"}</span>
                    <h4 className="font-semibold text-primary">{bItemMainAchMapMain.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{bItemMainAchMapMain.description}</p>
                  <p className="text-xs text-muted-foreground">Achieved: {format(new Date(bItemMainAchMapMain.dateAchieved), "MMMM d, yyyy")}</p>
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
            {sheetMenuItems.map((itemMenuSheetMapMain) => (
              itemMenuSheetMapMain.href && itemMenuSheetMapMain.href === "/profile" ? (
                 <SheetClose asChild key={itemMenuSheetMapMain.label}>
                    <Link href={itemMenuSheetMapMain.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={itemMenuSheetMapMain.action} >
                            <itemMenuSheetMapMain.icon className="mr-3 h-5 w-5" />
                            {itemMenuSheetMapMain.label}
                        </Button>
                    </Link>
                 </SheetClose>
              ) : itemMenuSheetMapMain.href && itemMenuSheetMapMain.href !== "/profile" ? ( 
                <SheetClose asChild key={itemMenuSheetMapMain.label}>
                    <Link href={itemMenuSheetMapMain.href}>
                        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={itemMenuSheetMapMain.action}>
                        <itemMenuSheetMapMain.icon className="mr-3 h-5 w-5" />
                        {itemMenuSheetMapMain.label}
                        </Button>
                    </Link>
                </SheetClose>
              ) : ( 
                <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => { itemMenuSheetMapMain.action(); if (itemMenuSheetMapMain.label !== 'Reminders') setIsSettingsSheetOpen(false); }} key={itemMenuSheetMapMain.label} >
                  <itemMenuSheetMapMain.icon className="mr-3 h-5 w-5" />
                  {itemMenuSheetMapMain.label}
                </Button>
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
                    {(notificationPermission === 'default' || notificationPermission === 'denied' || notificationPermission === null) && (
                         <SheetClose asChild><Button size="sm" variant="outline" onClick={handleRequestNotificationPermission}>Enable Notifications</Button></SheetClose>
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
