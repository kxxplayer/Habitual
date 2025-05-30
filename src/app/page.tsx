
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
// Removed direct HabitOverview rendering from main page.
// Made data persistence work correctly for Google accounts too.
// Implemented responsive aspect ratio styling.
// Added User-Specific localStorage Keys.
// Reverted dashboard to inline.
// Implemented responsive max-width/max-height for better screen utilization.
// Namespace localStorage by UID. Stop clearing localStorage on logout to persist user data.
// Make "Add New Habit" a FAB, add bottom nav with "Dashboard" triggering dialog.
// Removed direct rendering of HabitOverview from main page again.
// Made localStorage UID-namespacing more robust.
// Cleared "cDate" error in calendar modifiers by simplifying modifier logic.
// Removed calendar custom styling due to persistent "cDate" error.
// Attempted to fix "cDate" error by robustly sanitizing habit data on load.
// Further attempt to fix "cDate" by simplifying calendarDialogModifiers.
// Attempt to fix "cDate" by removing `habits` from calendarDialogModifiers dep array.
// Attempt to fix "cDate" by completely removing calendarDialogModifiers and its styles props.
// Reverted calendarDialogModifiers to full logic with try-catch.
// Removed multi-select and associated toolbar.
// Reverted dashboard to dialog.
// Moved Calendar to dialog on main page.
// Removed Calendar from AppHeader, added to top action bar (then removed top action bar).
// Added "Mark All Today Done" button.
// Bottom navigation bar to use page navigation instead of dialogs.
// Calendar also moved to its own page.
// Removed dashboard from direct rendering on main page.
// Ensured localStorage data persists for the same user across logout/login.
// ==========================================================================

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import HabitList from '@/components/habits/HabitList';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import AddReflectionNoteDialog from '@/components/habits/AddReflectionNoteDialog';
import RescheduleMissedHabitDialog from '@/components/habits/RescheduleMissedHabitDialog';
import CreateHabitDialog from '@/components/habits/CreateHabitDialog';
import DailyQuestDialog from '@/components/popups/DailyQuestDialog';
import HabitOverview from '@/components/overview/HabitOverview';


import type { Habit, AISuggestion as AISuggestionType, WeekDay, HabitCompletionLogEntry, HabitCategory, EarnedBadge, CreateHabitFormData, SuggestedHabit } from '@/types';
import { HABIT_CATEGORIES, SEVEN_DAY_STREAK_BADGE_ID, THIRTY_DAY_STREAK_BADGE_ID, FIRST_HABIT_COMPLETED_BADGE_ID, THREE_DAY_SQL_STREAK_BADGE_ID } from '@/types';

import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { getSqlTip } from '@/ai/flows/sql-tip-flow';
import { getMotivationalQuote } from '@/ai/flows/motivational-quote-flow';
import { getCommonHabitSuggestions } from '@/ai/flows/common-habit-suggestions-flow';

import { checkAndAwardBadges } from '@/lib/badgeUtils';
import { cn } from "@/lib/utils";

import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


import { Plus, Loader2, ListChecks } from 'lucide-react';
import { format, parseISO, isSameDay, getDay, startOfDay, subDays, addDays as dateFnsAddDays } from 'date-fns';


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

      if (previousUidAuthMain !== undefined && previousUidAuthMain !== currentUidAuthMain) {
        console.log(`User identity changed from ${previousUidAuthMain} to ${currentUidAuthMain}. Clearing app state. UID-namespaced localStorage data will NOT be removed.`);
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
        setIsCreateHabitDialogOpen(false);
        // DO NOT remove localStorage items here to persist data for the same user across sessions.
        // Data is namespaced by UID, so different users won't see each other's data.
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
        setNotificationPermission(Notification.permission);
    } else {
      console.log('Notifications not supported by this browser.');
      setNotificationPermission('denied');
    }
  }, []);


  // Load data from localStorage when authUser changes and auth is not loading
  React.useEffect(() => {
    if (isLoadingAuth) {
      console.log("Auth is loading, skipping data load from localStorage.");
      return;
    }
    if (!authUser) {
      console.log("No authenticated user, ensuring app state is clear and skipping data load.");
      if (habits.length > 0 || earnedBadges.length > 0 || totalPoints > 0) {
        setHabits([]);
        setEarnedBadges([]);
        setTotalPoints(0);
      }
      setIsLoadingHabits(false);
      return;
    }

    console.log("Authenticated user found. Loading data from localStorage for UID:", authUser.uid);
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
                'sun': 'Sun', 'sunday': 'Sun', 'sundays': 'Sun',
                'mon': 'Mon', 'monday': 'Mon', 'mondays': 'Mon',
                'tue': 'Tue', 'tuesday': 'Tue', 'tuesdays': 'Tue',
                'wed': 'Wed', 'wednesday': 'Wed', 'wednesdays': 'Wed',
                'thu': 'Thu', 'thursday': 'Thu', 'thursdays': 'Thu',
                'fri': 'Fri', 'friday': 'Fri', 'fridays': 'Fri',
                'sat': 'Sat', 'saturday': 'Sat', 'saturdays': 'Sat',
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
        console.log("Habits loaded and sanitized for user:", userUidLoadMain, parsedHabitsLoadMain.length);
      } catch (eParseHabitsLoadMain) {
        console.error(`Error parsing habits for user ${userUidLoadMain} from localStorage:`, eParseHabitsLoadMain);
        setHabits([]);
      }
    } else {
      console.log("No stored habits found for user:", userUidLoadMain);
      setHabits([]);
    }

    if (authUser && parsedHabitsLoadMain.length === 0 && !commonSuggestionsFetched) {
      console.log("User has no habits, fetching common suggestions.");
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
            // setIsDailyQuestDialogOpen(true); // Keep commented if not desired for now
          }
        });
    } else if (parsedHabitsLoadMain.length > 0) {
      setCommonSuggestionsFetched(true); // Mark as fetched if habits exist
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
    console.log("Finished loading data for user:", userUidLoadMain);

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
            return; // Not scheduled for today
          }

          if (habitReminderCheckMain.specificTime && habitReminderCheckMain.specificTime.toLowerCase() !== 'anytime' && habitReminderCheckMain.specificTime.toLowerCase() !== 'flexible') {
            try {
              const [hoursReminderTimeMain, minutesReminderTimeMain] = habitReminderCheckMain.specificTime.split(':').map(Number);
              if (isNaN(hoursReminderTimeMain) || isNaN(minutesReminderTimeMain)) throw new Error("Invalid time format for reminder");

              let specificEventTimeReminderMain = new Date(nowReminderMain.getFullYear(), nowReminderMain.getMonth(), nowReminderMain.getDate(), hoursReminderTimeMain, minutesReminderTimeMain, 0, 0);
              let potentialReminderTimeReminderMain = new Date(specificEventTimeReminderMain.getTime() - 30 * 60 * 1000); // 30 minutes before

              if (specificEventTimeReminderMain > nowReminderMain) {
                if (potentialReminderTimeReminderMain <= nowReminderMain) {
                    reminderDateTimeValMain = specificEventTimeReminderMain;
                } else {
                    reminderDateTimeValMain = potentialReminderTimeReminderMain;
                }
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
       handleRequestNotificationPermission();
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
    const { habitId: habitIdReflectionSaveMain, date: date_reflection_save_note } = reflectionDialogData;

    setHabits(prevHabitsReflectionSaveMain =>
      prevHabitsReflectionSaveMain.map(h_for_note_save_reflection => {
        if (h_for_note_save_reflection.id === habitIdReflectionSaveMain) {
          let logEntryExists_for_note_save_reflection = false;
          const newCompletionLog_for_note_save_reflection = h_for_note_save_reflection.completionLog.map(log_item_for_note_save_reflection => {
            if (log_item_for_note_save_reflection.date === date_reflection_save_note) {
              logEntryExists_for_note_save_reflection = true;
              return { ...log_item_for_note_save_reflection, note: noteToSaveReflectionMain.trim() === "" ? undefined : noteToSaveReflectionMain.trim() };
            }
            return log_item_for_note_save_reflection;
          });
          if (!logEntryExists_for_note_save_reflection) {
             const existingStatus_reflection_save = h_for_note_save_reflection.completionLog.find(l_note_reflection => l_note_reflection.date === date_reflection_save_note)?.status;
             newCompletionLog_for_note_save_reflection.push({
                date: date_reflection_save_note,
                time: 'N/A',
                note: noteToSaveReflectionMain.trim() === "" ? undefined : noteToSaveReflectionMain.trim(),
                status: existingStatus_reflection_save || 'skipped'
             });
             newCompletionLog_for_note_save_reflection.sort((a_sort_reflection,b_sort_reflection) => b_sort_reflection.date.localeCompare(a_sort_reflection.date));
          }
          return { ...h_for_note_save_reflection, completionLog: newCompletionLog_for_note_save_reflection };
        }
        return h_for_note_save_reflection;
      })
    );
    console.log(`Reflection Saved for ${reflectionDialogData.habitName} on ${reflectionDialogData.date}`);
    setReflectionDialogData(null);
    setIsReflectionDialogOpen(false);
  };

  const handleOpenRescheduleDialog = (habitParamRescheduleOpenMain: Habit, missedDateParamRescheduleOpenMain: string) => {
    setRescheduleDialogData({ habit: habitParamRescheduleOpenMain, missedDate: missedDateParamRescheduleOpenMain });
  };

  const handleSaveRescheduledHabit = (habitId_rescheduled_save: string, originalMissedDate_rescheduled_save: string, newDate_rescheduled_save: string) => {
    if(!authUser) return;
    setHabits(prevHabits_rescheduled_save => prevHabits_rescheduled_save.map(h_rescheduled_save => {
      if (h_rescheduled_save.id === habitId_rescheduled_save) {
        let newCompletionLog_rescheduled_save = [...h_rescheduled_save.completionLog];
        const existingMissedLogIndex_rescheduled_save = newCompletionLog_rescheduled_save.findIndex(log_reschedule_find_save => log_reschedule_find_save.date === originalMissedDate_rescheduled_save);

        if(existingMissedLogIndex_rescheduled_save > -1) {
            if (newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].status !== 'completed') {
                newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].status = 'skipped';
                newCompletionLog_rescheduled_save[existingMissedLogIndex_rescheduled_save].time = 'N/A';
            }
        } else {
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
    const habitName_rescheduled_save = habits.find(h_find_rescheduled_name => h_find_rescheduled_name.id === habitId_rescheduled_save)?.name || "Habit";
    console.log(`Habit Rescheduled: ${habitName_rescheduled_save} from ${originalMissedDate_rescheduled_save} to ${newDate_rescheduled_save}`);
    setRescheduleDialogData(null);
  };

  const handleSaveMarkAsSkipped = (habitId_skipped_save: string, missedDate_skipped_save: string) => {
    if(!authUser) return;
     setHabits(prevHabits_skipped_save => prevHabits_skipped_save.map(h_skipped_save => {
      if (h_skipped_save.id === habitId_skipped_save) {
        let newCompletionLog_skipped_save = [...h_skipped_save.completionLog];
        const existingLogIndex_skipped_save = newCompletionLog_skipped_save.findIndex(log_skipped_find => log_skipped_find.date === missedDate_skipped_save);
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
    const habitName_skipped_save = habits.find(h_find_skipped_name => h_find_skipped_name.id === habitId_skipped_save)?.name || "Habit";
    console.log(`Habit Skipped: ${habitName_skipped_save} on ${missedDate_skipped_save}`);
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


  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  if (isLoadingHabits && authUser) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your habits...</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4">
      <div
        className={cn(
          "bg-card text-foreground shadow-xl rounded-xl flex flex-col overflow-hidden mx-auto",
          "w-full max-w-md h-full max-h-[90vh] sm:max-h-[850px]",
          "md:max-w-lg md:max-h-[85vh]",
          "lg:max-w-2xl lg:max-h-[80vh]"
        )}
      >
        <AppHeader />

        <ScrollArea className="flex-grow">
          <main className="px-3 sm:px-4 py-4">

            {/* "Mark All Today Done" button - only shown if there are habits */}
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

            {/* Common Habit Suggestions for New Users */}
            {!isLoadingCommonSuggestions && habits.length === 0 && commonHabitSuggestions.length > 0 && (
              <div className="my-4 p-3 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
                <div className="px-2 pt-0">
                  <h3 className="text-md font-semibold flex items-center text-primary mb-1">
                     Welcome to Habitual!
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

        <BottomNavigationBar />
      </div>

      {/* Floating Action Button for Adding Habits */}
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
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the habit "{habitToDelete?.name || ''}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHabitToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteSingleHabit} className={buttonVariants({ variant: "destructive" })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DailyQuestDialog isOpen={false} onClose={handleCloseDailyQuestDialog} />
    </div>
  );
};
export default HabitualPage;

    