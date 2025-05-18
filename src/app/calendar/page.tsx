"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { format, parseISO, isSameDay, getDay } from 'date-fns';
import type { DayPicker } from 'react-day-picker';

import type { Habit, WeekDay, HabitCompletionLogEntry } from '@/types';
import { ArrowLeft, CheckCircle2, XCircle, Circle, Loader2, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';

const dayIndexToWeekDay: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CalendarPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoadingHabits, setIsLoadingHabits] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        router.push('/auth/login');
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!authUser || isLoadingAuth) return;

    setIsLoadingHabits(true);
    const storedHabits = localStorage.getItem('habits');
    if (storedHabits) {
      try {
        const parsedHabits: Habit[] = JSON.parse(storedHabits).map((habit: any) => ({
          ...habit,
          completionLog: (habit.completionLog || []).map((log: any) => ({
            ...log,
            status: log.status || 'completed', 
          })),
        }));
        setHabits(parsedHabits);
      } catch (error) {
        console.error("Failed to parse habits from localStorage:", error);
        setHabits([]);
      }
    } else {
      setHabits([]);
    }
    setIsLoadingHabits(false);
  }, [authUser, isLoadingAuth]);

  const habitsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayOfWeek = dayIndexToWeekDay[getDay(selectedDate)];

    return habits.filter(habit => {
      const isScheduled = habit.daysOfWeek.includes(dayOfWeek);
      const logEntry = habit.completionLog.find(log => log.date === dateStr);
      return isScheduled || logEntry; // Show if scheduled OR if there's any log (completed, skipped, makeup)
    });
  }, [selectedDate, habits]);

  const calendarModifiers = useMemo(() => {
    const completedDays: Date[] = [];
    const scheduledMissedDays: Date[] = [];
    const scheduledUpcomingDays: Date[] = [];
    const makeupPendingDays: Date[] = [];

    habits.forEach(habit => {
      habit.completionLog.forEach(log => {
        const logDate = parseISO(log.date);
        if (log.status === 'completed') {
          completedDays.push(logDate);
        } else if (log.status === 'pending_makeup') {
          makeupPendingDays.push(logDate);
        }
      });

      // For scheduled/missed, we need to check days not explicitly in log but were scheduled
      const today = new Date();
      for (let i = 0; i < 60; i++) { // Check a range of days (e.g., last 30 and next 30)
          const pastDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
          const futureDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
          
          [pastDate, futureDate].forEach(checkDate => {
            if (isSameDay(checkDate, today) && i !== 0 && checkDate !== pastDate) return; // Avoid double-checking today

            const dateStr = format(checkDate, 'yyyy-MM-dd');
            const dayOfWeek = dayIndexToWeekDay[getDay(checkDate)];
            const isScheduled = habit.daysOfWeek.includes(dayOfWeek);
            const logEntry = habit.completionLog.find(log => log.date === dateStr);

            if (isScheduled && !logEntry) {
                if (checkDate < today && !isSameDay(checkDate, today)) {
                    if (!scheduledMissedDays.some(d => isSameDay(d, checkDate))) {
                       scheduledMissedDays.push(checkDate);
                    }
                } else {
                    if (!scheduledUpcomingDays.some(d => isSameDay(d, checkDate)) && !completedDays.some(d => isSameDay(d, checkDate))) {
                        scheduledUpcomingDays.push(checkDate);
                    }
                }
            }
          });
      }
    });
    
    // Remove upcoming scheduled if they are already completed or makeup pending
    const finalScheduledUpcoming = scheduledUpcomingDays.filter(sDate => 
        !completedDays.some(cDate => isSameDay(sDate, cDate)) &&
        !makeupPendingDays.some(mDate => isSameDay(sDate, mDate))
    );
    const finalScheduledMissed = scheduledMissedDays.filter(sDate => 
        !completedDays.some(cDate => isSameDay(sDate, cDate)) &&
        !makeupPendingDays.some(mDate => isSameDay(sDate, mDate))
    );


    return {
      completed: completedDays,
      missed: finalScheduledMissed,
      scheduled: finalScheduledUpcoming,
      makeup: makeupPendingDays,
      selected: selectedDate ? [selectedDate] : [],
    };
  }, [habits, selectedDate]);

  const modifierStyles: DayPicker['modifiersStyles'] = {
    completed: { backgroundColor: 'hsl(var(--accent)/0.15)', color: 'hsl(var(--accent))', fontWeight: 'bold' },
    missed: { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
    scheduled: { backgroundColor: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' },
    makeup: { backgroundColor: 'hsl(200,100%,50%)/0.15', color: 'hsl(200,100%,50%)' },
    selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
  };


  if (isLoadingAuth || isLoadingHabits) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading calendar...</p>
      </div>
    );
  }

  if (!authUser) {
     return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 p-2 sm:p-4">
      <div
        className="bg-background text-foreground shadow-xl rounded-xl flex flex-col w-full"
        style={{
          maxWidth: 'clamp(320px, 100%, 500px)', // Slightly wider for calendar
          height: 'clamp(700px, 90vh, 850px)',
          overflow: 'hidden',
        }}
      >
        <header className="bg-card shadow-sm sticky top-0 z-40 shrink-0 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <Link href="/" passHref>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-primary">Habit Calendar</h1>
            <div className="w-9"></div> {/* Spacer for balance */}
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-3 sm:p-4 space-y-4">
          <Card className="shadow-md">
            <CardContent className="p-2 sm:p-3 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={calendarModifiers}
                modifiersStyles={modifierStyles}
                className="rounded-md"
                month={selectedDate || new Date()} // Control current month view
                onMonthChange={setSelectedDate}   // Allow month navigation to update selectedDate contextually
              />
            </CardContent>
          </Card>

          {selectedDate && (
            <Card className="shadow-md">
              <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                <CardTitle className="text-lg">
                  Habits for {format(selectedDate, 'MMMM d, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3">
                {habitsForSelectedDate.length > 0 ? (
                  <ul className="space-y-1.5 text-sm max-h-48 overflow-y-auto">
                    {habitsForSelectedDate.map(habit => {
                      const logEntry = habit.completionLog.find(log => log.date === format(selectedDate as Date, 'yyyy-MM-dd'));
                      const dayOfWeekForSelected = dayIndexToWeekDay[getDay(selectedDate as Date)];
                      const isScheduledToday = habit.daysOfWeek.includes(dayOfWeekForSelected);
                      let statusText = "Scheduled";
                      let StatusIcon = Circle;
                      let iconColor = "text-orange-500";

                      if (logEntry?.status === 'completed') {
                        statusText = `Completed at ${logEntry.time || ''}`;
                        StatusIcon = CheckCircle2;
                        iconColor = "text-accent";
                      } else if (logEntry?.status === 'pending_makeup') {
                        statusText = `Makeup for ${logEntry.originalMissedDate}`;
                        StatusIcon = CalendarClock;
                        iconColor = "text-blue-500";
                      } else if (logEntry?.status === 'skipped') {
                        statusText = "Skipped";
                        StatusIcon = XCircle;
                        iconColor = "text-muted-foreground";
                      } else if (isScheduledToday && parseISO(format(selectedDate as Date, 'yyyy-MM-dd')) < parseISO(format(new Date(), 'yyyy-MM-dd')) && !logEntry) {
                        statusText = "Missed";
                        StatusIcon = XCircle;
                        iconColor = "text-destructive";
                      }
                      
                      return (
                        <li key={habit.id} className="flex items-center justify-between p-1.5 bg-input/30 rounded-md">
                          <span className="font-medium truncate pr-2">{habit.name}</span>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <StatusIcon className={cn("h-3.5 w-3.5", iconColor)} />
                            <span>{statusText}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">No habits for this day.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <footer className="py-3 text-center text-xs text-muted-foreground border-t mt-auto">
          <p>&copy; {new Date().getFullYear()} Habitual.</p>
        </footer>
      </div>
    </div>
  );
};

export default CalendarPage;

