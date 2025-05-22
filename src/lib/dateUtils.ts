
"use client";

import type { Habit, WeekDay } from '@/types';
import { startOfWeek, endOfWeek, isWithinInterval, format, parseISO, getDay, subDays, eachDayOfInterval, isToday as dateFnsIsToday, isPast as dateFnsIsPast, startOfDay } from 'date-fns';

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

export const calculateStreak = (habit: Habit, referenceDate: Date = new Date()): number => {
  if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) return 0;

  const completionLogMap = new Map(habit.completionLog.map(log => [log.date, log.status]));
  let currentStreak = 0;
  let tempDate = startOfDay(new Date(referenceDate));

  for (let i = 0; i < 365 * 2; i++) {
    const dateStr = format(tempDate, 'yyyy-MM-dd');
    const dayOfWeek = dayIndexToWeekDay[getDay(tempDate)];
    const status = completionLogMap.get(dateStr);

    if (habit.daysOfWeek.includes(dayOfWeek)) {
      if (status === 'completed' || status === undefined) { // Undefined for backward compatibility
        currentStreak++;
      } else {
        // Scheduled but not completed, or explicitly skipped/pending_makeup
        // If it's today (i=0) and not completed, the streak is 0 unless it's a future habit or not yet acted upon.
        // The current logic breaks streak if a scheduled day in the past was not 'completed'.
        // For today, if it's scheduled and not 'completed', it means the streak is broken *unless* it's the very first day being checked.
        if (i === 0 && format(tempDate, 'yyyy-MM-dd') === format(startOfDay(referenceDate), 'yyyy-MM-dd')) {
            if (status !== 'completed' && status !== undefined) { // Not completed today
                 return 0; // Streak effectively becomes 0 as today wasn't completed
            }
        } else { // Past scheduled day not completed
            break;
        }
      }
    } else if (status === 'completed' && habit.completionLog.find(l => l.date === dateStr)?.originalMissedDate) {
        // A completed makeup day for a non-scheduled day.
        currentStreak++;
    }
    tempDate = subDays(tempDate, 1);
  }
  return currentStreak;
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
    // isPast should be true only for days strictly before today
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
