
"use client";

import type { Habit, WeekDay } from '@/types';
import { startOfWeek, endOfWeek, isWithinInterval, format, parseISO, getDay, subDays } from 'date-fns';

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
 * that the habit was scheduled AND completed.
 * @param habit The habit object.
 * @param referenceDate The date to calculate the streak up to (defaults to today).
 * @returns The current streak count.
 */
export const calculateStreak = (habit: Habit, referenceDate: Date = new Date()): number => {
  if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) {
    return 0; // No streak if not scheduled
  }

  const completionDates = new Set(habit.completionLog.map(log => log.date));
  let currentStreak = 0;
  let tempDate = new Date(referenceDate);

  for (let i = 0; i < 365 * 2; i++) { // Look back up to 2 years, an arbitrary limit
    const dateStr = format(tempDate, 'yyyy-MM-dd');
    const dayOfWeek = dayIndexToWeekDay[getDay(tempDate)];

    if (habit.daysOfWeek.includes(dayOfWeek)) { // If the habit is scheduled for this day
      if (completionDates.has(dateStr)) { // And it was completed
        currentStreak++;
      } else { // Scheduled but not completed
        // If checking today (i === 0) and it's not completed, the streak is 0.
        // Otherwise, a past scheduled day was missed, so the streak accumulated *before* this miss is broken.
        // Since we are counting backwards, if a scheduled day is missed, the streak effectively ends before this day.
        // So, if we are on the very first day of checking (today, i=0) and it's missed, streak is 0.
        // If we have accumulated some streak from future days (closer to today) and then hit a missed scheduled day,
        // that accumulated streak is the correct one.
        // The loop breaks, and currentStreak holds the count of consecutive completions.
        if (i === 0 && format(tempDate, 'yyyy-MM-dd') === format(referenceDate, 'yyyy-MM-dd')) {
             return 0; // Today was scheduled but not completed.
        }
        break; // Streak broken before this day
      }
    }
    // If not scheduled (rest day), the streak is not broken, nor incremented.
    // We just continue to the previous day.

    tempDate = subDays(tempDate, 1);
  }
  return currentStreak;
};
