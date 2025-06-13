// src/lib/dateUtils.ts

"use client";

import type { Habit, WeekDay } from '@/types';
import { startOfWeek, endOfWeek, format, parseISO, getDay, subDays, eachDayOfInterval, isToday as dateFnsIsToday, isPast as dateFnsIsPast, differenceInCalendarDays } from 'date-fns';

export const getWeekSpan = (date: Date): { start: Date; end: Date } => {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  const end = endOfWeek(date, { weekStartsOn: 0 });
  return { start, end };
};

const dayIndexToWeekDay: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekDayToShort: Record<WeekDay, string> = {
  "Sun": "S", "Mon": "M", "Tue": "T", "Wed": "W", "Thu": "T", "Fri": "F", "Sat": "S",
};

export const getDayAbbreviationFromDate = (date: Date): WeekDay => {
  const dayIndex = getDay(date);
  return dayIndexToWeekDay[dayIndex];
};

export const calculateStreak = (habit: Habit): number => {
    const { completionLog, daysOfWeek } = habit;
    if (!daysOfWeek || daysOfWeek.length === 0) {
        return 0;
    }
    const completedDates = new Set(completionLog.filter(log => log.status === 'completed').map(log => log.date));
    let currentStreak = 0;
    for (let i = 0; i < 365 * 2; i++) {
        const dateToCheck = subDays(new Date(), i);
        const dayAbbr = getDayAbbreviationFromDate(dateToCheck);
        if (daysOfWeek.includes(dayAbbr)) {
            if (completedDates.has(format(dateToCheck, 'yyyy-MM-dd'))) {
                currentStreak++;
            } else {
                if (i === 0 && !dateFnsIsPast(dateToCheck)) {
                    continue;
                }
                break;
            }
        }
    }
    return currentStreak;
};

export const calculateLongestOverallStreak = (habits: Habit[]): number => {
  if (!habits || habits.length === 0) return 0;
  return Math.max(0, ...habits.map(calculateStreak));
};

export const calculateCurrentActiveStreak = (habits: Habit[]): number => {
  if (!habits || habits.length === 0) return 0;

  const activeStreaks = habits.map(habit => {
    const lastCompletion = habit.completionLog
      .filter(l => l.status === 'completed')
      .map(l => parseISO(l.date))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (!lastCompletion || differenceInCalendarDays(new Date(), lastCompletion) > 1) {
      return 0;
    }
    return calculateStreak(habit);
  });

  return Math.max(0, ...activeStreaks);
};

export interface WeekDayInfo {
  date: Date;
  dayAbbrShort: string;
  dayAbbrFull: WeekDay;
  dateStr: string;
  isToday: boolean;
  isPast: boolean;
}

export const getCurrentWeekDays = (referenceDate: Date = new Date()): WeekDayInfo[] => {
  const weekSpan = getWeekSpan(referenceDate);
  const days = eachDayOfInterval({ start: weekSpan.start, end: weekSpan.end });
  return days.map(date_item_map => {
    const dayAbbrFull_val = getDayAbbreviationFromDate(date_item_map);
    const isTodayFlag_val = dateFnsIsToday(date_item_map);
    const isPastFlag_val = dateFnsIsPast(date_item_map) && !isTodayFlag_val;
    return {
      date: date_item_map,
      dayAbbrShort: weekDayToShort[dayAbbrFull_val],
      dayAbbrFull: dayAbbrFull_val,
      dateStr: format(date_item_map, 'yyyy-MM-dd'),
      isToday: isTodayFlag_val,
      isPast: isPastFlag_val,
    };
  });
};