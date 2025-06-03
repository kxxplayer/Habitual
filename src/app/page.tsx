
"use client";

// ==========================================================================
// HABITUAL MAIN PAGE - REGENERATED FROM SCRATCH (2025-05-20)
// This version aims to be a clean slate incorporating all features
// discussed, with robust error handling and simplified calendar styling
// to address persistent issues.
// ==========================================================================
import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
// HabitOverview is now only in a dialog, not directly on the page
// import HabitOverview from '@/components/overview/HabitOverview'; // No longer directly on page
import { Calendar } from '@/components/ui/calendar';
import type { Habit, AISuggestion as AISuggestionType, WeekDay, HabitCompletionLogEntry, HabitCategory, EarnedBadge, CreateHabitFormData, SuggestedHabit as CommonSuggestedHabitType } from '@/types';
import { HABIT_CATEGORIES, SEVEN_DAY_STREAK_BADGE_ID, THIRTY_DAY_STREAK_BADGE_ID, FIRST_HABIT_COMPLETED_BADGE_ID, THREE_DAY_SQL_STREAK_BADGE_ID } from '@/types';

import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { getSqlTip } from '@/ai/flows/sql-tip-flow';
import { getMotivationalQuote } from '@/ai/flows/motivational-quote-flow';
import { getCommonHabitSuggestions } from '@/ai/flows/common-habit-suggestions-flow';
import { generateHabitProgramFromGoal, type GenerateHabitProgramOutput, type SuggestedProgramHabit } from '@/ai/flows/generate-habit-program-flow';
import GoalInputProgramDialog from '@/components/programs/GoalInputProgramDialog';
import ProgramSuggestionDialog from '@/components/programs/ProgramSuggestionDialog';


import { checkAndAwardBadges } from '@/lib/badgeUtils';
import { cn } from "@/lib/utils";

import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionEl,
  AlertDialogFooter as AlertDialogFooterEl,
  AlertDialogHeader as AlertDialogHeaderEl,
  AlertDialogTitle as AlertTitle,
} from '@/components/ui/alert-dialog';
// Sheet imports removed as settings/calendar are pages
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetTitle as SheetTitleOriginal,
//   SheetClose,
//   SheetDescription as SheetDescriptionOriginal,
// } from "@/components/ui/sheet";


import {
  Plus,
  Loader2,
  ListChecks,
  // LayoutDashboard, // Icon for nav, not direct page use
  // Award, // Icon for nav
  // Settings, // Icon for nav
  CalendarDays,
  // UserCircle, // Icon for nav
  BellRing,
  // BookOpenText,
  Bell,
  Home, // For bottom nav
  Trash2,
  CheckCircle2,
  XCircle,
  Circle, // Added Circle
  CalendarClock as MakeupIcon,
  WandSparkles, // For new program button
 } from 'lucide-react';
import { format, parseISO, getDay, startOfDay, subDays, addDays as dateFnsAddDays, isToday as dateFnsIsToday, isPast as dateFnsIsPast, isSameDay } from 'date-fns';


const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekDaysArrayForForm = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
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
    date: string;
    initialNote?: string;
    habitName: string;
  } | null>(null);

  const [rescheduleDialogData, setRescheduleDialogData] = React.useState<{
    habit: Habit;
    missedDate: string;
  } | null>(null);

  const [commonHabitSuggestions, setCommonHabitSuggestions] = React.useState<CommonSuggestedHabitType[]>([]);
  const [isLoadingCommonSuggestions, setIsLoadingCommonSuggestions] = React.useState(false);
  const [commonSuggestionsFetched, setCommonSuggestionsFetched] = React.useState(false);

  const [isDeleteHabitConfirmOpen, setIsDeleteHabitConfirmOpen] = React.useState(false);
  const [habitToDelete, setHabitToDelete] = React.useState<{ id: string; name: string } | null>(null);

  const [todayString, setTodayString] = React.useState('');
  const [todayAbbr, setTodayAbbr] = React.useState<WeekDay | ''>('');
  const [allTodayTasksDone, setAllTodayTasksDone] = React.useState(false);

  // For Calendar Dialog (kept for potential direct access if needed, though primary nav is page)
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = React.useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date());

  // For Habit Program Generation
  const [isGoalInputProgramDialogOpen, setIsGoalInputProgramDialogOpen] = React.useState(false);
  const [isProgramSuggestionLoading, setIsProgramSuggestionLoading] = React.useState(false);
  const [programSuggestion, setProgramSuggestion] = React.useState<GenerateHabitProgramOutput | null>(null);
  const [isProgramSuggestionDialogOpen, setIsProgramSuggestionDialogOpen] = React.useState(false);


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
        console.log(`User identity changed from ${previousUidAuthMain || 'anonymous'} to ${currentUidAuthMain || 'anonymous'}. Resetting app state.`);
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
        setIsDailyQuestDialogOpen(false);
        setIsCalendarDialogOpen(false); // Calendar is now a page
        setIsGoalInputProgramDialogOpen(false);
        setIsProgramSuggestionDialogOpen(false);
        setProgramSuggestion(null);
        
      }

      setAuthUser(currentUserAuthMain);
      setIsLoadingAuth(false);
      previousAuthUserUidRef.current = currentUidAuthMain;

      if (!currentUserAuthMain && typeof window !== 'undefined' && window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
        console.log("No current user, redirecting to login from main page effect.");
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
      setIsLoadingHabits(false);
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

          let daysOfWeekValLoadMain: WeekDay[] = Array.isArray(hItemMapLoadMain.daysOfWeek) ? hItemMapLoadMain.daysOfWeek.filter((dValLoadMain: any) => weekDaysArrayForForm.includes(dValLoadMain as WeekDay)) : [];
          if (!Array.isArray(hItemMapLoadMain.daysOfWeek) && typeof hItemMapLoadMain.frequency === 'string') {
            const freqLowerValLoadMain = hItemMapLoadMain.frequency.toLowerCase();
            if (freqLowerValLoadMain === 'daily') daysOfWeekValLoadMain = [...weekDaysArrayForForm];
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
            } catch (eMapTimeLoadMain) { console.warn("Error parsing specificTime for migration:", hItemMapLoadMain.specificTime, eMapTimeLoadMain); }
          } else if (migratedSpecificTimeValLoadMain && migratedSpecificTimeValLoadMain.match(/^\d{1,2}:\d{2}$/)) {
             try {
              const [hoursValTLoadMain, minutesValTLoadMain] = migratedSpecificTimeValLoadMain.split(':').map(Number);
              migratedSpecificTimeValLoadMain = `${String(hoursValTLoadMain).padStart(2, '0')}:${String(minutesValTLoadMain).padStart(2, '0')}`;
            } catch(eConvTimeLoadMain) { console.warn("Error converting specificTime format:", migratedSpecificTimeValLoadMain, eConvTimeLoadMain); }
          }


          const migratedCompletionLogValLoadMain = (Array.isArray(hItemMapLoadMain.completionLog) ? hItemMapLoadMain.completionLog : (Array.isArray(hItemMapLoadMain.completedDates) ? hItemMapLoadMain.completedDates.map((dMapLogLoadMain: string) => ({ date: dMapLogLoadMain, time: 'N/A', note: undefined, status: 'completed' })) : []))
            .map((logMapItemLoadMain: any): HabitCompletionLogEntry | null => {
              if (typeof logMapItemLoadMain.date !== 'string' || !logMapItemLoadMain.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.warn("Sanitizing: Invalid or missing date in log entry for habit id:", idValLoadMain, logMapItemLoadMain);
                return null;
              }
              const statusValLogLoadMain = ['completed', 'pending_makeup', 'skipped'].includes(logMapItemLoadMain.status) ? logMapItemLoadMain.status : 'completed';
              const originalMissedDateValLogLoadMain = typeof logMapItemLoadMain.originalMissedDate === 'string' && logMapItemLoadMain.originalMissedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? logMapItemLoadMain.originalMissedDate : undefined;
              const timeValLogLoadMain = typeof logMapItemLoadMain.time === 'string' && logMapItemLoadMain.time.length > 0 ? logMapItemLoadMain.time : 'N/A';
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
          if (typeof window !== 'undefined') {
            const hasSeenDailyQuestLoadMain = localStorage.getItem(dailyQuestKeyLoadMain);
            if (!hasSeenDailyQuestLoadMain) {
              setIsDailyQuestDialogOpen(true);
            }
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
    console.log("Finished loading data for user:", userUidLoadMain);

  }, [authUser, isLoadingAuth]);


  // Save habits to localStorage & check for badges
  React.useEffect(() => {
    if (!authUser || isLoadingAuth || isLoadingHabits || typeof window === 'undefined') return;
    console.log(`Saving habits for user ${authUser.uid} to localStorage.`);
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
            console.log(`New Badge Unlocked: ${newBadgeItemSaveMain.name}`);
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

    if (notificationPermission === 'granted' && authUser && habits.length > 0) {
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
              const [hoursStr, minutesStr] = habitReminderCheckMain.specificTime.split(':');
              const hoursReminderTimeMain = parseInt(hoursStr, 10);
              const minutesReminderTimeMain = parseInt(minutesStr, 10);

              if (isNaN(hoursReminderTimeMain) || isNaN(minutesReminderTimeMain) || hoursReminderTimeMain < 0 || hoursReminderTimeMain > 23 || minutesReminderTimeMain < 0 || minutesReminderTimeMain > 59) {
                throw new Error("Invalid time format for reminder");
              }

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
            console.log(`REMINDER LOG (Placeholder): Task "${habitReminderCheckMain.name}" at ${reminderDateTimeValMain.toLocaleString()} (in ${Math.round(delayReminderMain/60000)} mins)`);
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
        ...hMapEditSaveMain, // Keep existing completionLog and reminderEnabled
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
              } else if (logEntryToggleCompMain.note && logEntryToggleCompMain.note.trim() !== "") {
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

  const handleOpenReflectionDialog = (habitId_reflection_open: string, date_reflection_open: string, habitName_reflection_open: string) => {
    const habitForReflectionOpenMain = habits.find(hFindReflMain => hFindReflMain.id === habitId_reflection_open);
    const logEntryForReflectionOpenMain = habitForReflectionOpenMain?.completionLog.find(logFindReflEntryMain => logFindReflEntryMain.date === date_reflection_open);
    setReflectionDialogData({
      habitId: habitId_reflection_open,
      date: date_reflection_open,
      initialNote: logEntryForReflectionOpenMain?.note || '',
      habitName: habitName_reflection_open,
    });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (habitId_reflection_save: string, date_reflection_save_note: string, note_to_save_reflection: string) => {
    if (!authUser) return;
    setHabits(prevHabitsReflectionSaveMain =>
      prevHabitsReflectionSaveMain.map(h_for_note_save_reflection => {
        if (h_for_note_save_reflection.id === habitId_reflection_save) {
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
    console.log(`Reflection Saved for habit ID ${habitId_reflection_save} on ${date_reflection_save_note}`);
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

  const handleCustomizeSuggestedHabit = (suggestionCustomizeMain: CommonSuggestedHabitType) => {
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

  const [isDailyQuestDialogOpen, setIsDailyQuestDialogOpen] = React.useState(false);
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

  // --- Calendar Dialog Logic Start ---
  const calendarDialogModifiers = React.useMemo(() => {
    try {
      const dates_completed_arr: Date[] = [];
      const dates_scheduled_missed_arr: Date[] = [];
      const dates_scheduled_upcoming_arr: Date[] = [];
      const dates_makeup_pending_arr: Date[] = [];
      const today_date_obj = startOfDay(new Date());

      if (authUser && habits.length > 0) {
        habits.forEach(habit_item_for_modifiers_loop => {
          habit_item_for_modifiers_loop.completionLog.forEach(log_entry_for_modifiers_loop => {
            if (typeof log_entry_for_modifiers_loop.date === 'string' && log_entry_for_modifiers_loop.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              try {
                const logDate_obj = parseISO(log_entry_for_modifiers_loop.date);
                if (log_entry_for_modifiers_loop.status === 'completed') {
                  dates_completed_arr.push(logDate_obj);
                } else if (log_entry_for_modifiers_loop.status === 'pending_makeup') {
                  dates_makeup_pending_arr.push(logDate_obj);
                }
              } catch (e) {
                 console.error("Error parsing log date in calendarDialogModifiers (completion/makeup):", log_entry_for_modifiers_loop.date, e);
              }
            } else {
              console.warn("Invalid or missing date in log entry for calendar (completion/makeup):", habit_item_for_modifiers_loop.name, log_entry_for_modifiers_loop);
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
              const isScheduledOnThisDay_bool = habit_item_for_modifiers_loop.daysOfWeek.includes(dayOfWeekForDate_val);
              const logEntryForThisDay_obj = habit_item_for_modifiers_loop.completionLog.find(log_find_item => log_find_item.date === dateStrToMatch_str);

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
      }
      
      const finalScheduledUpcoming_arr_filtered = dates_scheduled_upcoming_arr.filter(s_date_upcoming_for_final_filter =>
        !dates_completed_arr.some(comp_date_for_final_filter => isSameDay(s_date_upcoming_for_final_filter, comp_date_for_final_filter)) &&
        !dates_makeup_pending_arr.some(makeup_date_for_final_filter => isSameDay(s_date_upcoming_for_final_filter, makeup_date_for_final_filter))
      );
      const finalScheduledMissed_arr_filtered = dates_scheduled_missed_arr.filter(s_date_missed_for_final_filter =>
        !dates_completed_arr.some(comp_date_for_final_filter_missed => isSameDay(s_date_missed_for_final_filter, comp_date_for_final_filter_missed)) &&
        !dates_makeup_pending_arr.some(makeup_date_for_final_filter_missed => isSameDay(s_date_missed_for_final_filter, makeup_date_for_final_filter_missed))
      );
      
      return {
        completed: dates_completed_arr,
        missed: finalScheduledMissed_arr_filtered,
        scheduled: finalScheduledUpcoming_arr_filtered,
        makeup: dates_makeup_pending_arr,
        selected: selectedCalendarDate ? [startOfDay(selectedCalendarDate)] : [],
      };
    } catch (error_in_calendar_modifiers) {
      console.error("CRITICAL ERROR in calendarDialogModifiers calculation:", error_in_calendar_modifiers);
      return { 
        completed: [], missed: [], scheduled: [], makeup: [],
        selected: selectedCalendarDate ? [startOfDay(selectedCalendarDate)] : [],
      };
    }
  }, [habits, selectedCalendarDate, authUser]);


  const calendarDialogModifierStyles: Record<string, React.CSSProperties> = {
    completed: { backgroundColor: 'hsl(var(--accent)/0.15)', color: 'hsl(var(--accent))', fontWeight: 'bold' },
    missed: { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
    scheduled: { backgroundColor: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' },
    makeup: { backgroundColor: 'hsl(200,100%,50%)/0.15)', color: 'hsl(200,100%,50%)' },
    selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
  };

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
  // --- Calendar Dialog Logic End ---

  // --- Habit Program Generation Logic Start ---
  const handleOpenGoalInputProgramDialog = () => {
    setIsGoalInputProgramDialogOpen(true);
  };

  const handleSubmitGoalForProgram = async (goal: string, duration: string) => {
    setIsProgramSuggestionLoading(true);
    setIsGoalInputProgramDialogOpen(false); // Close input dialog
    try {
      const suggestion = await generateHabitProgramFromGoal({ goal, focusDuration: duration });
      setProgramSuggestion(suggestion);
      setIsProgramSuggestionDialogOpen(true);
    } catch (error) {
      console.error("Error generating habit program:", error);
      // TODO: Show toast error to user
    } finally {
      setIsProgramSuggestionLoading(false);
    }
  };

  const handleAddProgramHabits = (suggestedProgramHabits: SuggestedProgramHabit[]) => {
    if (!authUser) return;
    const newHabitsFromProgram: Habit[] = suggestedProgramHabits.map(sph => ({
      id: String(Date.now() + Math.random().toString(36).substring(2,9)), // Ensure unique ID
      name: sph.name,
      description: sph.description,
      category: sph.category || 'Other',
      daysOfWeek: sph.daysOfWeek as WeekDay[], // Already validated in flow
      optimalTiming: sph.optimalTiming,
      durationHours: sph.durationHours,
      durationMinutes: sph.durationMinutes,
      specificTime: sph.specificTime,
      completionLog: [],
      reminderEnabled: false, // Default reminder to off
    }));

    setHabits(prevHabits => [...prevHabits, ...newHabitsFromProgram]);
    console.log(`Added ${newHabitsFromProgram.length} habits from program: ${programSuggestion?.programName}`);
    
    // Clear suggestions if user had no habits before and now has some
    if (habits.length === 0 && commonHabitSuggestions.length > 0 && newHabitsFromProgram.length > 0) {
      setCommonHabitSuggestions([]);
    }
    
    setIsProgramSuggestionDialogOpen(false);
    setProgramSuggestion(null);
  };
  // --- Habit Program Generation Logic End ---


  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!authUser && !isLoadingAuth) { 
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen items-center justify-center p-0 sm:p-4">
      <div
        className={cn(
          "bg-card text-foreground shadow-xl rounded-xl flex flex-col overflow-hidden mx-auto",
          "w-full max-w-md max-h-[90vh] sm:max-h-[850px]", 
          "md:max-w-lg md:max-h-[85vh]",                       
          "lg:max-w-2xl lg:max-h-[80vh]"                         
        )}
      >
        <AppHeader />

        <ScrollArea className="flex-grow min-h-0">
          <main className="px-3 sm:px-4 py-4">
            {habits.length > 0 && !allTodayTasksDone && (
              <div className="mb-4 flex justify-center">
                <Button
                  onClick={handleMarkAllTodayDone}
                  disabled={allTodayTasksDone}
                  variant={"default"}
                  className="w-full max-w-xs"
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  Mark All Today Done
                </Button>
              </div>
            )}
             {habits.length > 0 && allTodayTasksDone && (
              <div className="mb-4 flex justify-center">
                 <Button disabled variant="outline" className="w-full max-w-xs">
                    <ListChecks className="mr-2 h-4 w-4" />
                    All Done for Today!
                </Button>
              </div>
            )}

            {!isLoadingCommonSuggestions && habits.length === 0 && commonHabitSuggestions.length > 0 && (
              <div className="my-4 p-3 bg-card/70 backdrop-blur-sm border border-primary/20 rounded-xl shadow-md">
                <div className="px-2 pt-0">
                  <h3 className="text-md font-semibold flex items-center text-primary mb-1">
                     Welcome to Habitual!
                  </h3>
                  <p className="text-xs text-muted-foreground mb-1.5">Start by picking a common habit, add your own, or create a program from a goal:</p>
                </div>
                <div className="p-1">
                  <div className="flex flex-wrap gap-2 justify-center mb-2">
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
                   <Button
                    onClick={handleOpenGoalInputProgramDialog}
                    variant="default"
                    className="w-full text-sm py-2.5 mt-2"
                  >
                    <WandSparkles className="mr-2 h-4 w-4" /> Create Program from Goal
                  </Button>
                </div>
              </div>
            )}
             {isLoadingCommonSuggestions && habits.length === 0 && (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading suggestions...</p>
                </div>
            )}
             {/* Show "Create Program from Goal" button even if there are habits */}
             {habits.length > 0 && (
                <div className="my-4 flex justify-center">
                    <Button
                        onClick={handleOpenGoalInputProgramDialog}
                        variant="outline"
                        className="w-full max-w-xs"
                    >
                        <WandSparkles className="mr-2 h-4 w-4" /> Create Program from Goal
                    </Button>
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
          onSaveNote={(note) => handleSaveReflectionNote(reflectionDialogData.habitId, reflectionDialogData.date, note)}
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
          <AlertDialogHeaderEl>
            <AlertTitle>Confirm Deletion</AlertTitle>
            <AlertDialogDescriptionEl>
              Are you sure you want to delete the habit "{habitToDelete?.name || ''}"? This action cannot be undone.
            </AlertDialogDescriptionEl>
          </AlertDialogHeaderEl>
          <AlertDialogFooterEl>
            <AlertDialogCancel onClick={() => setHabitToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteSingleHabit} className={buttonVariants({ variant: "destructive" })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooterEl>
        </AlertDialogContent>
      </AlertDialog>

      <DailyQuestDialog isOpen={isDailyQuestDialogOpen} onClose={handleCloseDailyQuestDialog} />

       {/* Calendar Dialog (kept for quick access if linked elsewhere, primary view is /calendar page) */}
      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary"/>Habit Calendar</DialogTitle>
            <DialogDescription>View your habit activity. Days with completed habits are green, missed are red, scheduled are orange.</DialogDescription>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={selectedCalendarDate}
            onSelect={setSelectedCalendarDate}
            month={selectedCalendarDate || new Date()}
            onMonthChange={(month) => {
                if (!selectedCalendarDate || selectedCalendarDate.getMonth() !== month.getMonth() || selectedCalendarDate.getFullYear() !== month.getFullYear()) {
                    setSelectedCalendarDate(startOfDay(month));
                }
            }}
            modifiers={calendarDialogModifiers}
            modifiersStyles={calendarDialogModifierStyles}
            className="rounded-md border p-0 sm:p-2"
          />
          {selectedCalendarDate && (
            <div className="mt-3 w-full">
              <h3 className="text-md font-semibold mb-1.5 text-center text-primary">
                Status for {format(selectedCalendarDate, 'MMMM d, yyyy')}
              </h3>
              {habitsForSelectedCalendarDate.length > 0 ? (
                <ScrollArea className="max-h-40">
                <ul className="space-y-1.5 text-sm pr-2">
                  {habitsForSelectedCalendarDate.map(habit_cal_list_item => {
                    const logEntry_cal_list = habit_cal_list_item.completionLog.find(log_cal_find => log_cal_find.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                    const dayOfWeekForSelected_cal_list = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                    const isScheduledToday_cal_list = habit_cal_list_item.daysOfWeek.includes(dayOfWeekForSelected_cal_list);
                    let statusText_cal_list = "Scheduled";
                    let StatusIcon_cal_list = Circle; 
                    let iconColor_cal_list = "text-orange-500";

                    if (logEntry_cal_list?.status === 'completed') {
                        statusText_cal_list = `Completed ${logEntry_cal_list.time || ''}`;
                        StatusIcon_cal_list = CheckCircle2; iconColor_cal_list = "text-accent";
                    } else if (logEntry_cal_list?.status === 'pending_makeup') {
                        statusText_cal_list = `Makeup for ${logEntry_cal_list.originalMissedDate || 'earlier'}`;
                        StatusIcon_cal_list = MakeupIcon; iconColor_cal_list = "text-blue-500";
                    } else if (logEntry_cal_list?.status === 'skipped') {
                        statusText_cal_list = "Skipped";
                        StatusIcon_cal_list = XCircle; iconColor_cal_list = "text-muted-foreground";
                    } else if (isScheduledToday_cal_list && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !logEntry_cal_list) {
                        statusText_cal_list = "Missed"; StatusIcon_cal_list = XCircle; iconColor_cal_list = "text-destructive";
                    } else if (!isScheduledToday_cal_list && !logEntry_cal_list) {
                        statusText_cal_list = "Not Scheduled"; StatusIcon_cal_list = Circle; iconColor_cal_list = "text-muted-foreground/50";
                    }

                    return (
                      <li key={habit_cal_list_item.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md text-xs">
                        <span className="font-medium truncate pr-2">{habit_cal_list_item.name}</span>
                        <div className="flex items-center space-x-1">
                            <StatusIcon_cal_list className={cn("h-3.5 w-3.5", iconColor_cal_list)} />
                            <span>{statusText_cal_list}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                </ScrollArea>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No habits scheduled or logged for this day.</p>
              )}
            </div>
          )}
          <DialogFooter className="mt-2">
            <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs for Program Generation */}
      <GoalInputProgramDialog
        isOpen={isGoalInputProgramDialogOpen}
        onClose={() => setIsGoalInputProgramDialogOpen(false)}
        onSubmit={handleSubmitGoalForProgram}
        isLoading={isProgramSuggestionLoading}
      />
      <ProgramSuggestionDialog
        isOpen={isProgramSuggestionDialogOpen}
        onClose={() => {
          setIsProgramSuggestionDialogOpen(false);
          setProgramSuggestion(null);
        }}
        programSuggestion={programSuggestion}
        onAddProgramHabits={handleAddProgramHabits}
        isLoading={isProgramSuggestionLoading}
      />

    </div>
  );
};
export default HabitualPage;

    