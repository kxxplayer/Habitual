
"use client";

import type { Habit, WeekDay } from '@/types';
import { startOfWeek, endOfWeek, isWithinInterval, format, parseISO, getDay, subDays, eachDayOfInterval, isToday as dateFnsIsToday, isPast as dateFnsIsPast, startOfDay } from 'date-fns';

/**
 * Returns the start (Sunday) and end (Saturday) of the week for a given date.
 * @param date The date for which to get the week span.
 * @returns An object with 'start' and 'end' Date objects.
 */
export const getWeekSpan = (date: Date): { start: Date; end: Date } => {
  const start = startOfWeek(date, { weekStartsOn: 0 }); // 0 for Sunday
  const end = endOfWeek(date, { weekStartsOn: 0 });
  return { start, end };
};

/**
 * Checks if a date string (YYYY-MM-DD) is within the current week.
 * @param dateString The date string to check.
 * @param today The reference date for "current week" (defaults to new Date()).
 * @returns True if the date is in the current week, false otherwise.
 */
export const isDateInCurrentWeek = (dateString: string, today: Date = new Date()): boolean => {
  try {
    // Ensure the dateString is treated as UTC to avoid timezone shifts when parsing just a date
    const dateToTest = parseISO(dateString + 'T00:00:00Z');
    const { start, end } = getWeekSpan(today);

    // Adjust start and end to be at the beginning and end of their respective days for robust comparison
    const weekStartAtMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const weekEndBeforeMidnightNextDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

    return isWithinInterval(dateToTest, { start: weekStartAtMidnight, end: weekEndBeforeMidnightNextDay });
  } catch (e) {
    console.error("Error parsing date string for week check:", dateString, e);
    return false;
  }
};

const dayIndexToWeekDay: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekDayToShort: Record<WeekDay, string> = {
  "Sun": "S", "Mon": "M", "Tue": "T", "Wed": "W", "Thu": "T", "Fri": "F", "Sat": "S",
};


/**
 * Gets the 3-letter day abbreviation (e.g., "Sun", "Mon") for a given date.
 * @param date The date object.
 * @returns The WeekDay abbreviation.
 */
export const getDayAbbreviationFromDate = (date: Date): WeekDay => {
  const dayIndex = getDay(date);
  return dayIndexToWeekDay[dayIndex];
};


/**
 * Calculates the current streak for a habit.
 * A streak is the number of consecutive days (going backward from referenceDate) 
 * that the habit was scheduled AND completed (status 'completed' or undefined).
 * @param habit The habit object.
 * @param referenceDate The date to calculate the streak up to (defaults to today).
 * @returns The current streak count.
 */
export const calculateStreak = (habit: Habit, referenceDate: Date = new Date()): number => {
  if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) {
    return 0; // No streak if not scheduled
  }

  const completionLogMap = new Map(habit.completionLog.map(log => [log.date, log]));
  let currentStreak = 0;
  let tempDate = startOfDay(new Date(referenceDate)); 

  for (let i = 0; i < 365 * 2; i++) { 
    const dateStr = format(tempDate, 'yyyy-MM-dd');
    const dayOfWeek = dayIndexToWeekDay[getDay(tempDate)];
    const logEntry = completionLogMap.get(dateStr);

    if (habit.daysOfWeek.includes(dayOfWeek)) { 
      // If it's a scheduled day
      if (logEntry && (logEntry.status === 'completed' || logEntry.status === undefined)) {
        currentStreak++;
      } else {
        // Scheduled but not completed, or skipped, or pending makeup.
        // If checking today (i === 0) and it's not 'completed', current streak is 0.
        // For past days, if not 'completed', streak is broken.
        if (i === 0 && format(tempDate, 'yyyy-MM-dd') === format(startOfDay(referenceDate), 'yyyy-MM-dd')) {
             if (!logEntry || (logEntry.status !== 'completed' && logEntry.status !== undefined)) {
                 return 0; // Today was scheduled but not truly completed.
             }
        } else {
           break; // Streak broken before this day
        }
      }
    } else if (logEntry && (logEntry.status === 'completed' || logEntry.status === undefined) && logEntry.originalMissedDate) {
        // This is a completed makeup day for a non-scheduled day. It counts towards the streak.
        currentStreak++;
    }
    // If not scheduled (and not a completed makeup day), the streak is not broken, nor incremented.
    // We just continue to the previous day.
    tempDate = subDays(tempDate, 1);
  }
  return currentStreak;
};

export interface WeekDayInfo {
  date: Date;
  dayAbbrShort: string; // S, M, T, W, T, F, S
  dayAbbrFull: WeekDay; // Sun, Mon, Tue...
  dateStr: string; // YYYY-MM-DD
  isToday: boolean;
  isPast: boolean; 
}

/**
 * Gets an array of day information for the current week (Sunday to Saturday).
 * @param referenceDate The date to determine the current week from (defaults to today).
 * @returns An array of WeekDayInfo objects.
 */
export const getCurrentWeekDays = (referenceDate: Date = new Date()): WeekDayInfo[] => {
  const weekSpan = getWeekSpan(referenceDate);
  const days = eachDayOfInterval({ start: weekSpan.start, end: weekSpan.end });
  const todayRef = startOfDay(referenceDate); 

  return days.map(date => {
    const dayAbbrFull = getDayAbbreviationFromDate(date);
    return {
      date: date,
      dayAbbrShort: weekDayToShort[dayAbbrFull],
      dayAbbrFull: dayAbbrFull,
      dateStr: format(date, 'yyyy-MM-dd'),
      isToday: dateFnsIsToday(date),
      isPast: dateFnsIsPast(date) && !dateFnsIsToday(date), 
    };
  });
};

