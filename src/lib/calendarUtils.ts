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


// Helper to map frequency to RRULE
const getRRule = (habit: Habit, eventStartDate: Date): string | undefined => {
    const freqLower = habit.frequency.toLowerCase();

    if (freqLower === 'daily') return 'FREQ=DAILY';
    
    // For weekly, if no specific days, repeat on the same day of week as eventStartDate
    if (freqLower === 'weekly' && !freqLower.match(/(mon|tue|wed|thu|fri|sat|sun)/)) {
      const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      return `FREQ=WEEKLY;BYDAY=${days[eventStartDate.getDay()]}`;
    }

    const dayMap: { [key: string]: string } = {
      'sun': 'SU', 'sunday': 'SU',
      'mon': 'MO', 'monday': 'MO',
      'tue': 'TU', 'tuesday': 'TU',
      'wed': 'WE', 'wednesday': 'WE',
      'thu': 'TH', 'thursday': 'TH',
      'fri': 'FR', 'friday': 'FR',
      'sat': 'SA', 'saturday': 'SA',
    };

    const daysInFrequency = freqLower.split(/[\s,]+/).map(d => d.trim());
    const rruleDays: string[] = [];
    let isWeeklyPattern = false;

    for (const day of daysInFrequency) {
        if (dayMap[day]) {
            rruleDays.push(dayMap[day]);
            isWeeklyPattern = true; // Indicates it's a pattern like "Mon, Wed" or "Weekly on Tuesdays"
        }
    }
    // If it's "weekly" and also specifies days, e.g. "Weekly on Mon, Wed"
    if(freqLower.includes('weekly') && rruleDays.length > 0){
        return `FREQ=WEEKLY;BYDAY=${rruleDays.join(',')}`;
    }
    // If it's just days like "Mon, Wed, Fri"
    if (!freqLower.includes('weekly') && isWeeklyPattern && rruleDays.length > 0) {
        return `FREQ=WEEKLY;BYDAY=${rruleDays.join(',')}`;
    }
    
    // For other cases like "3 times a week" or "monthly", no simple RRULE for now.
    return undefined;
};


export const generateICS = (habit: Habit): string => {
  const uid = `${Date.now()}${Math.random().toString(36).substring(2, 9)}@habitual.app`;
  const now = new Date();
  const todayDateStrForFilename = format(now, 'yyyy-MM-dd');

  let eventStartDate: Date;
  let eventEndDate: Date | undefined;
  let isAllDay = false;

  // Determine the base date for the event (today)
  let baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (habit.specificTime && habit.specificTime.toLowerCase() !== 'anytime' && habit.specificTime.toLowerCase() !== 'flexible') {
    // Try to parse specificTime (e.g., "08:00", "08:00 AM", "14:30")
    // Supports HH:mm, h:mm a, HH:mm a
    let parsedTime: Date | null = null;
    const timeFormatsToTry = ["HH:mm", "h:mm a", "hh:mm a", "H:mm"]; // date-fns parse formats

    for (const fmt of timeFormatsToTry) {
        try {
            const tempDate = parse(habit.specificTime, fmt, new Date());
            // Check if parsing was successful (date-fns returns Invalid Date on failure)
            if (!isNaN(tempDate.getTime())) {
                 parsedTime = tempDate;
                 break;
            }
        } catch (e) { /* ignore and try next format */ }
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
        // Default to 1 hour duration if not specified or unparsable
        eventEndDate = addHours(eventStartDate, 1);
      }
    } else {
      // Fallback if time parsing fails but specificTime is set (treat as all-day)
      isAllDay = true;
      eventStartDate = baseDate;
    }
  } else {
    // "Anytime", "Flexible", or no specificTime provided (treat as all-day)
    isAllDay = true;
    eventStartDate = baseDate;
  }

  // Ensure event date is not in the past for recurring events; if so, move to next valid occurrence
  // For non-recurring, it's fine if it's today even if time passed.
  const rrule = getRRule(habit, eventStartDate);


  // Format for ICS (local time, calendar app handles timezone conversion on import)
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
    `DTSTAMP:${format(now, "yyyyMMdd'T'HHmmss'Z'")}`, // UTC timestamp for event creation
    isAllDay ? `DTSTART;VALUE=DATE:${dtStartFormatted}` : `DTSTART:${dtStartFormatted}`,
    ...(isAllDay ? [] : (isoDurationFormatted ? [`DURATION:${isoDurationFormatted}`] : (dtEndFormatted ? [`DTEND:${dtEndFormatted}`] : []))),
    `SUMMARY:${habit.name}`,
    ...(habit.description ? [`DESCRIPTION:${habit.description.replace(/\n/g, '\\n')}`] : []), // Escape newlines
    ...(rrule ? [`RRULE:${rrule}`] : []),
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE', // OPAQUE means it blocks time, TRANSPARENT means free
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
};

export const downloadICS = (filename: string, content: string) => {
  if (typeof window === "undefined") return; // Ensure this runs client-side

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement("a");

  if (link.download !== undefined) { // Feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Basic fallback
    alert("Your browser doesn't support automatic ICS download. The content will be logged to the console. Please copy it and save as a .ics file.");
    console.log("ICS Content for manual saving:\n", content);
  }
};

