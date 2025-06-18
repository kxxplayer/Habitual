
"use client";

import type { Habit } from '@/types';
import { format, addMinutes, addHours, setHours, setMinutes, setSeconds, setMilliseconds, parse } from 'date-fns';

const formatDurationToISO = (hours?: number, minutes?: number): string | undefined => {
  if ((!hours || hours <= 0) && (!minutes || minutes <= 0)) return undefined;
  let duration = 'PT';
  if (hours && hours > 0) duration += `${hours}H`;
  if (minutes && minutes > 0) duration += `${minutes}M`;
  return duration === 'PT' ? undefined : duration;
};

const getRRule = (habit: Habit): string | undefined => {
    if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) return undefined;
    const dayMap: { [key: string]: string } = {
      'Sun': 'SU', 'Mon': 'MO', 'Tue': 'TU', 'Wed': 'WE',
      'Thu': 'TH', 'Fri': 'FR', 'Sat': 'SA',
    };
    const rruleDays = habit.daysOfWeek.map(day => dayMap[day]).filter(Boolean);
    if (rruleDays.length === 0) return undefined;
    if (rruleDays.length === 7) return 'FREQ=DAILY';
    return `FREQ=WEEKLY;BYDAY=${rruleDays.join(',')}`;
};

export const generateICS = (habit: Habit): string => {
  const uid = `${Date.now()}${Math.random().toString(36).substring(2, 9)}@habitual.app`;
  let eventStartDate: Date;
  let eventEndDate: Date | undefined;
  let isAllDay = false;
  const baseDate = setSeconds(setMilliseconds(new Date(), 0), 0);

  if (habit.specificTime && habit.specificTime.toLowerCase() !== 'anytime' && habit.specificTime.toLowerCase() !== 'flexible' && /^\d{2}:\d{2}$/.test(habit.specificTime)) {
    try {
        const [hoursStr, minutesStr] = habit.specificTime.split(':');
        const hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);
        if (isNaN(hours) || isNaN(minutes)) throw new Error("Invalid time format");
        eventStartDate = setMinutes(setHours(baseDate, hours), minutes);
    } catch (e) {
        console.error("Error parsing specificTime for ICS, defaulting to all day:", habit.specificTime, e);
        isAllDay = true;
        eventStartDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    }

    if (!isAllDay) {
        let totalDurationMinutes = 0;
        if (habit.durationHours) totalDurationMinutes += habit.durationHours * 60;
        if (habit.durationMinutes) totalDurationMinutes += habit.durationMinutes;
        eventEndDate = totalDurationMinutes > 0 ? addMinutes(eventStartDate, totalDurationMinutes) : addHours(eventStartDate, 1);
    }
  } else {
    isAllDay = true;
    eventStartDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  }

  const rrule = getRRule(habit);
  const dtStartFormatted = isAllDay ? format(eventStartDate, 'yyyyMMdd') : format(eventStartDate, "yyyyMMdd'T'HHmmss");
  const isoDurationFormatted = !isAllDay
  ? formatDurationToISO(habit.durationHours ?? undefined, habit.durationMinutes ?? undefined)
  : undefined;


  const icsLines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HabitualApp//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${uid}`,
    `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
    isAllDay ? `DTSTART;VALUE=DATE:${dtStartFormatted}` : `DTSTART:${dtStartFormatted}`,
  ];

  if (!isAllDay && isoDurationFormatted) icsLines.push(`DURATION:${isoDurationFormatted}`);
  else if (!isAllDay && eventEndDate) icsLines.push(`DTEND:${format(eventEndDate, "yyyyMMdd'T'HHmmss")}`);
  
  icsLines.push(`SUMMARY:${habit.name}`);
  if (habit.description) icsLines.push(`DESCRIPTION:${habit.description.replace(/\n/g, '\\n')}`);
  if (rrule) icsLines.push(`RRULE:${rrule}`);
  icsLines.push('STATUS:CONFIRMED', 'TRANSP:OPAQUE', 'END:VEVENT', 'END:VCALENDAR');
  
  return icsLines.join('\r\n');
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
    console.warn("ICS download not supported by browser. ICS content:", content);
  }
};
