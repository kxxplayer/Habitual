
"use client";

import type { WeekDay } from '@/types';
import { startOfWeek, endOfWeek, isWithinInterval, format, parseISO, getDay } from 'date-fns';

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

/**
 * Gets the 3-letter day abbreviation (e.g., "Sun", "Mon") for a given date.
 * @param date The date object.
 * @returns The WeekDay abbreviation.
 */
export const getDayAbbreviationFromDate = (date: Date): WeekDay => {
  // date-fns getDay: 0 for Sunday, 1 for Monday, etc.
  // WeekDay array: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const dayIndex = getDay(date);
  const weekDaysMap: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return weekDaysMap[dayIndex];
};
