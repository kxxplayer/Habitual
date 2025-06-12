
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
  if (!habit.completionLog || habit.completionLog.length === 0) return 0;

  const completionLogMap = new Map(habit.completionLog.map(log => [log.date, log.status]));
  let currentStreak = 0;
  let tempDate = startOfDay(new Date(referenceDate));
  let foundFirstScheduledDay = false;

  // Only look back for a reasonable time period (e.g., 365 days)
  for (let i = 0; i < 365; i++) {
    const dateStr = format(tempDate, 'yyyy-MM-dd');
    const dayOfWeek = dayIndexToWeekDay[getDay(tempDate)];
    const status = completionLogMap.get(dateStr);

    if (habit.daysOfWeek.includes(dayOfWeek)) {
      foundFirstScheduledDay = true;
      
      if (status === 'completed') {
        currentStreak++;
      } else if (status === 'pending_makeup') {
        // Pending makeup doesn't break the streak but doesn't count
        // Continue checking previous days
      } else {
        // This includes 'skipped', undefined, or any other status
        // If it's today and not yet acted upon, give benefit of doubt
        if (i === 0 && !status) {
          // Today is scheduled but not yet marked - don't break streak yet
          // But also don't count it
          tempDate = subDays(tempDate, 1);
          continue;
        }
        // Scheduled day that wasn't completed - streak is broken
        break;
      }
    } else if (status === 'completed' && habit.completionLog.find(l => l.date === dateStr)?.originalMissedDate) {
      // A makeup day - completed on a non-scheduled day
      currentStreak++;
    }
    
    tempDate = subDays(tempDate, 1);
  }
  
  // If we never found a scheduled day, return 0
  if (!foundFirstScheduledDay) return 0;
  
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
