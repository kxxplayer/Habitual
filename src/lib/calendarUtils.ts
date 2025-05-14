// src/lib/calendarUtils.ts
"use client";

import type { Habit } from '@/types';
import { format, parse, addMinutes, addHours } from 'date-fns';

// Helper to parse duration string like "30 minutes", "1 hour" into an object { value: number, unit: 'minutes' | 'hours' }
const parseDuration = (durationStr?: string): { value: number; unit: 'minutes' | 'hours' } | undefined => {
  if (!durationStr) return undefined;
  const parts = durationStr.toLowerCase().split(' ');
  if (parts.length !== 2) return undefined;

  const value = parseInt(parts[0]);
  const unit = parts[1];

  if (isNaN(value)) return undefined;

  if (unit.startsWith('minute')) return { value, unit: 'minutes' };
  if (unit.startsWith('hour')) return { value, unit: 'hours' };
  return undefined;
};

// Helper to convert parsed duration to ISO 8601 duration format (e.g., PT30M, PT1H)
const formatDurationToISO = (parsedDuration?: { value: number; unit: 'minutes' | 'hours' }): string | undefined => {
  if (!parsedDuration) return undefined;
  if (parsedDuration.unit === 'minutes') return `PT${parsedDuration.value}M`;
  if (parsedDuration.unit === 'hours') return `PT${parsedDuration.value}H`;
  return undefined;
};


// Helper to map daysOfWeek to RRULE
const getRRule = (habit: Habit, eventStartDate: Date): string | undefined => {
    if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) {
        return undefined; // No recurrence if no days are selected
    }

    // Map short day names to iCalendar BYDAY values
    const dayMap: { [key: string]: string } = {
      'Sun': 'SU', 'Mon': 'MO', 'Tue': 'TU', 'Wed': 'WE', 
      'Thu': 'TH', 'Fri': 'FR', 'Sat': 'SA',
    };

    const rruleDays = habit.daysOfWeek.map(day => dayMap[day]).filter(Boolean);

    if (rruleDays.length === 0) return undefined; // Should not happen if form validation is correct

    if (rruleDays.length === 7) {
        return 'FREQ=DAILY';
    }
    
    return `FREQ=WEEKLY;BYDAY=${rruleDays.join(',')}`;
};


export const generateICS = (habit: Habit): string => {
  const uid = `${Date.now()}${Math.random().toString(36).substring(2, 9)}@habitual.app`;
  const now = new Date();

  let eventStartDate: Date;
  let eventEndDate: Date | undefined;
  let isAllDay = false;

  let baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (habit.specificTime && habit.specificTime.toLowerCase() !== 'anytime' && habit.specificTime.toLowerCase() !== 'flexible') {
    let parsedTime: Date | null = null;
    const timeFormatsToTry = ["HH:mm", "h:mm a", "hh:mm a", "H:mm"];

    for (const fmt of timeFormatsToTry) {
        try {
            const tempDate = parse(habit.specificTime, fmt, new Date());
            if (!isNaN(tempDate.getTime())) {
                 parsedTime = tempDate;
                 break;
            }
        } catch (e) { /* ignore */ }
    }
    
    if (parsedTime) {
      eventStartDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), parsedTime.getHours(), parsedTime.getMinutes());
      
      const durationInfo = parseDuration(habit.duration);
      if (durationInfo) {
        if (durationInfo.unit === 'minutes') {
          eventEndDate = addMinutes(eventStartDate, durationInfo.value);
        } else if (durationInfo.unit === 'hours') {
          eventEndDate = addHours(eventStartDate, durationInfo.value);
        }
      } else {
        eventEndDate = addHours(eventStartDate, 1);
      }
    } else {
      isAllDay = true;
      eventStartDate = baseDate;
    }
  } else {
    isAllDay = true;
    eventStartDate = baseDate;
  }

  const rrule = getRRule(habit, eventStartDate);

  const dtStartFormatted = isAllDay ? format(eventStartDate, 'yyyyMMdd') : format(eventStartDate, "yyyyMMdd'T'HHmmss");
  const dtEndFormatted = eventEndDate && !isAllDay ? format(eventEndDate, "yyyyMMdd'T'HHmmss") : undefined;
  const isoDurationFormatted = !isAllDay ? formatDurationToISO(parseDuration(habit.duration)) : undefined;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HabitualApp//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${format(now, "yyyyMMdd'T'HHmmss'Z'")}`,
    isAllDay ? `DTSTART;VALUE=DATE:${dtStartFormatted}` : `DTSTART:${dtStartFormatted}`,
    ...(isAllDay ? [] : (isoDurationFormatted ? [`DURATION:${isoDurationFormatted}`] : (dtEndFormatted ? [`DTEND:${dtEndFormatted}`] : []))),
    `SUMMARY:${habit.name}`,
    ...(habit.description ? [`DESCRIPTION:${habit.description.replace(/\n/g, '\\n')}`] : []),
    ...(rrule ? [`RRULE:${rrule}`] : []),
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
};

export const downloadICS = (filename: string, content: string) => {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    alert("Your browser doesn't support automatic ICS download. The content will be logged to the console. Please copy it and save as a .ics file.");
    console.log("ICS Content for manual saving:\n", content);
  }
};
