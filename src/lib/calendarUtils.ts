// src/lib/calendarUtils.ts
"use client";

import type { Habit } from '@/types';
import { format, parse, addMinutes, addHours, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

// Helper to format duration from hours and minutes to ISO 8601 duration format (e.g., PT1H30M, PT30M, PT1H)
const formatDurationToISO = (hours?: number, minutes?: number): string | undefined => {
  if ((!hours || hours <= 0) && (!minutes || minutes <= 0)) return undefined; // No duration if both are zero or undefined
  
  let duration = 'PT';
  if (hours && hours > 0) {
    duration += `${hours}H`;
  }
  if (minutes && minutes > 0) {
    duration += `${minutes}M`;
  }
  
  return duration === 'PT' ? undefined : duration; // Should not happen if check above is correct
};


// Helper to map daysOfWeek to RRULE
const getRRule = (habit: Habit): string | undefined => {
    if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) {
        return undefined; // No recurrence if no days are selected
    }

    const dayMap: { [key: string]: string } = {
      'Sun': 'SU', 'Mon': 'MO', 'Tue': 'TU', 'Wed': 'WE', 
      'Thu': 'TH', 'Fri': 'FR', 'Sat': 'SA',
    };

    const rruleDays = habit.daysOfWeek.map(day => dayMap[day]).filter(Boolean);

    if (rruleDays.length === 0) return undefined;

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

  // Use today as the base for the event's first occurrence. Recurrence rules will handle future dates.
  let baseDate = setSeconds(setMilliseconds(new Date(), 0), 0); // Start with today, clear seconds/ms

  if (habit.specificTime && habit.specificTime.toLowerCase() !== 'anytime' && habit.specificTime.toLowerCase() !== 'flexible' && /^\d{2}:\d{2}$/.test(habit.specificTime)) {
    const [hours, minutes] = habit.specificTime.split(':').map(Number);
    eventStartDate = setMinutes(setHours(baseDate, hours), minutes);
    
    let totalDurationMinutes = 0;
    if (habit.durationHours) totalDurationMinutes += habit.durationHours * 60;
    if (habit.durationMinutes) totalDurationMinutes += habit.durationMinutes;

    if (totalDurationMinutes > 0) {
      eventEndDate = addMinutes(eventStartDate, totalDurationMinutes);
    } else {
      // Default to 1 hour duration if specific time is set but no duration
      eventEndDate = addHours(eventStartDate, 1); 
    }
  } else {
    isAllDay = true;
    // For all-day events, DTSTART should be just the date part.
    eventStartDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    // For all-day events with duration, it's typically better to omit DTEND or DURATION
    // or set DTEND to the next day if it's a multi-day all-day event (not supported here for single habit).
    // Let's omit DURATION/DTEND for simplicity for all-day events.
  }

  const rrule = getRRule(habit);

  const dtStartFormatted = isAllDay ? format(eventStartDate, 'yyyyMMdd') : format(eventStartDate, "yyyyMMdd'T'HHmmss");
  // DTEND is typically not used with RRULE if DURATION is present for timed events.
  // For all-day events, DURATION is also often omitted.
  
  const isoDurationFormatted = !isAllDay ? formatDurationToISO(habit.durationHours, habit.durationMinutes) : undefined;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HabitualApp//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`, // Use current UTC time for DTSTAMP
    isAllDay ? `DTSTART;VALUE=DATE:${dtStartFormatted}` : `DTSTART:${dtStartFormatted}`,
  ];

  if (!isAllDay && isoDurationFormatted) {
    icsLines.push(`DURATION:${isoDurationFormatted}`);
  } else if (!isAllDay && eventEndDate) { 
    // Fallback to DTEND if ISO duration couldn't be formed (e.g. 0 duration but time set)
    // but ideally, duration should be positive.
    icsLines.push(`DTEND:${format(eventEndDate, "yyyyMMdd'T'HHmmss")}`);
  }
  // For all-day events, we might explicitly set DTEND as the next day if it was a single day event
  // DTEND;VALUE=DATE:YYYYMMDD (exclusive end date)
  // For simplicity, we're omitting it if no duration is specified for all-day.

  icsLines.push(`SUMMARY:${habit.name}`);
  if (habit.description) {
    icsLines.push(`DESCRIPTION:${habit.description.replace(/\n/g, '\\n')}`);
  }
  if (rrule) {
    icsLines.push(`RRULE:${rrule}`);
  }
  icsLines.push('STATUS:CONFIRMED');
  icsLines.push('TRANSP:OPAQUE'); // Or TRANSPARENT if it's just a reminder
  icsLines.push('END:VEVENT');
  icsLines.push('END:VCALENDAR');
  
  const icsContent = icsLines.join('\r\n');

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
