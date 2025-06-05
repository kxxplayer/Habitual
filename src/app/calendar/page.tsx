
"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { Habit, WeekDay } from '@/types';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import type { DayPicker } from 'react-day-picker';
import { Loader2, CalendarDays, CheckCircle2, XCircle, Circle as CircleIcon, CalendarClock as MakeupIcon } from 'lucide-react';
import { format, parseISO, isSameDay, getDay, startOfDay, subDays, addDays as dateFnsAddDays, isToday as dateFnsIsToday, isPast as dateFnsIsPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';


const LS_KEY_PREFIX_HABITS = "habits_";
const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CalendarPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date());

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!authUser || isLoadingAuth) return;

    setIsLoadingData(true);
    const userUid = authUser.uid;
    const habitsKey = `${LS_KEY_PREFIX_HABITS}${userUid}`;
    const storedHabits = localStorage.getItem(habitsKey);
    if (storedHabits) {
      try {
        setHabits(JSON.parse(storedHabits));
      } catch (e) {
        console.error("Error parsing habits from localStorage on calendar page:", e);
        setHabits([]);
      }
    } else {
      setHabits([]);
    }
    setIsLoadingData(false);
  }, [authUser, isLoadingAuth]);

  const calendarDialogModifiers = React.useMemo(() => {
    if (!authUser) return { selected: selectedCalendarDate ? [selectedCalendarDate] : [] };
    try {
      const dates_completed_arr: Date[] = [];
      const dates_scheduled_missed_arr: Date[] = [];
      const dates_scheduled_upcoming_arr: Date[] = [];
      const dates_makeup_pending_arr: Date[] = [];
      const today_date_obj = startOfDay(new Date());

      habits.forEach(habit_item_for_modifiers_loop => {
        habit_item_for_modifiers_loop.completionLog.forEach(log_entry_for_modifiers_loop => {
          if (typeof log_entry_for_modifiers_loop.date === 'string' && log_entry_for_modifiers_loop.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            try {
              const logDate_obj = parseISO(log_entry_for_modifiers_loop.date);
              if (log_entry_for_modifiers_loop.status === 'completed') {
                dates_completed_arr.push(logDate_obj);
              } else if (log_entry_for_modifiers_loop.status === 'pending_makeup') {
                dates_makeup_pending_arr.push(logDate_obj);
              }
            } catch (e) {
              console.error("Error parsing log date in calendarDialogModifiers:", log_entry_for_modifiers_loop.date, e);
            }
          } else {
            console.warn("Invalid or missing date in log entry for calendar:", habit_item_for_modifiers_loop.name, log_entry_for_modifiers_loop);
          }
        });

        const iteration_limit = 60;
        for (let day_offset = 0; day_offset < iteration_limit; day_offset++) {
          const pastDateToConsider_obj = subDays(today_date_obj, day_offset);
          const futureDateToConsider_obj = dateFnsAddDays(today_date_obj, day_offset);

          [pastDateToConsider_obj, futureDateToConsider_obj].forEach(current_day_being_checked_obj => {
            if (isSameDay(current_day_being_checked_obj, today_date_obj) && day_offset !== 0 && current_day_being_checked_obj !== pastDateToConsider_obj) return;

            const dateStrToMatch_str = format(current_day_being_checked_obj, 'yyyy-MM-dd');
            const dayOfWeekForDate_val = dayIndexToWeekDayConstant[getDay(current_day_being_checked_obj)];
            const isScheduledOnThisDay_bool = habit_item_for_modifiers_loop.daysOfWeek.includes(dayOfWeekForDate_val);
            const logEntryForThisDay_obj = habit_item_for_modifiers_loop.completionLog.find(log_find_item => log_find_item.date === dateStrToMatch_str);

            if (isScheduledOnThisDay_bool && !logEntryForThisDay_obj) {
              if (current_day_being_checked_obj < today_date_obj && !isSameDay(current_day_being_checked_obj, today_date_obj)) {
                if (!dates_scheduled_missed_arr.some(missed_day_item => isSameDay(missed_day_item, current_day_being_checked_obj))) {
                  dates_scheduled_missed_arr.push(current_day_being_checked_obj);
                }
              } else {
                if (!dates_scheduled_upcoming_arr.some(upcoming_day_item => isSameDay(upcoming_day_item, current_day_being_checked_obj)) &&
                    !dates_completed_arr.some(completed_day_item_for_check => isSameDay(completed_day_item_for_check, current_day_being_checked_obj))) {
                  dates_scheduled_upcoming_arr.push(current_day_being_checked_obj);
                }
              }
            }
          });
        }
      });

      const finalScheduledUpcoming_arr = dates_scheduled_upcoming_arr.filter(s_date_upcoming_for_final_filter =>
        !dates_completed_arr.some(comp_date_for_final_filter => isSameDay(s_date_upcoming_for_final_filter, comp_date_for_final_filter)) &&
        !dates_makeup_pending_arr.some(makeup_date_for_final_filter => isSameDay(s_date_upcoming_for_final_filter, makeup_date_for_final_filter))
      );
      const finalScheduledMissed_arr = dates_scheduled_missed_arr.filter(s_date_missed_for_final_filter =>
        !dates_completed_arr.some(comp_date_for_final_filter_missed => isSameDay(s_date_missed_for_final_filter, comp_date_for_final_filter_missed)) &&
        !dates_makeup_pending_arr.some(makeup_date_for_final_filter_missed => isSameDay(s_date_missed_for_final_filter, makeup_date_for_final_filter_missed))
      );

      return {
        completed: dates_completed_arr,
        missed: finalScheduledMissed_arr,
        scheduled: finalScheduledUpcoming_arr,
        makeup: dates_makeup_pending_arr,
        selected: selectedCalendarDate ? [selectedCalendarDate] : [],
      };
    } catch (error) {
      console.error("CRITICAL ERROR in calendarDialogModifiers calculation on Calendar Page:", error);
      return {
        completed: [], missed: [], scheduled: [], makeup: [],
        selected: selectedCalendarDate ? [selectedCalendarDate] : [],
      };
    }
  }, [habits, selectedCalendarDate, authUser]);

  const calendarDialogModifierStyles: DayPicker['modifiersStyles'] = {
    completed: { backgroundColor: 'hsl(var(--accent)/0.15)', color: 'hsl(var(--accent))', fontWeight: 'bold' },
    missed: { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
    scheduled: { backgroundColor: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' },
    makeup: { backgroundColor: 'hsl(200,100%,50%)/0.15', color: 'hsl(200,100%,50%)' },
    selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
  };

  const habitsForSelectedCalendarDate = React.useMemo(() => {
    if (!selectedCalendarDate || !authUser) return [];
    try {
      const dateStrForListCalMain = format(selectedCalendarDate, 'yyyy-MM-dd');
      const dayOfWeekForListCalMain = dayIndexToWeekDayConstant[getDay(selectedCalendarDate)];

      return habits.filter(habitForListCalMain => {
        const isScheduledForListCalMain = habitForListCalMain.daysOfWeek.includes(dayOfWeekForListCalMain);
        const logEntryForListCalMain = habitForListCalMain.completionLog.find(logForListCalMain => logForListCalMain.date === dateStrForListCalMain);
        return isScheduledForListCalMain || logEntryForListCalMain;
      });
    } catch (eHabitsForDateMain) {
      console.error("Error in habitsForSelectedCalendarDate calculation:", eHabitsForDateMain);
      return [];
    }
  }, [selectedCalendarDate, habits, authUser]);


  if (isLoadingAuth || (authUser && isLoadingData)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading calendar...</p>
      </div>
    );
  }

  if (!authUser) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4">
      <div className={cn(
        "bg-card text-foreground shadow-xl rounded-xl flex flex-col mx-auto",
        "w-full max-w-sm",   
        "max-h-[95vh]",                    
        "md:max-w-md",                    
        "lg:max-w-lg"                    
      )}>
        <AppHeader />
        <ScrollArea className="flex-grow min-h-0">
          <div className="flex flex-col min-h-full">
            <main className="px-3 sm:px-4 py-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-primary flex items-center">
                    <CalendarDays className="mr-2 h-5 w-5" /> Habit Calendar
                  </CardTitle>
                  <CardDescription>View your habit activity across dates.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 flex flex-col items-center">
                  <Calendar
                    mode="single"
                    selected={selectedCalendarDate}
                    onSelect={setSelectedCalendarDate}
                    modifiers={calendarDialogModifiers}
                    modifiersStyles={calendarDialogModifierStyles}
                    className="rounded-md border p-0 sm:p-2"
                    month={selectedCalendarDate || new Date()}
                    onMonthChange={(month) => {
                       if (!selectedCalendarDate || selectedCalendarDate.getMonth() !== month.getMonth() || selectedCalendarDate.getFullYear() !== month.getFullYear()) {
                         setSelectedCalendarDate(startOfDay(month));
                       }
                     }}
                  />
                  {selectedCalendarDate && (
                    <div className="mt-4 w-full">
                      <h3 className="text-md font-semibold mb-2 text-center">
                        Habits for {format(selectedCalendarDate, 'MMMM d, yyyy')}
                      </h3>
                      {habitsForSelectedCalendarDate.length > 0 ? (
                        <ul className="space-y-1.5 text-sm max-h-40 overflow-y-auto">
                          {habitsForSelectedCalendarDate.map(habit => {
                            const logEntry = habit.completionLog.find(log => log.date === format(selectedCalendarDate as Date, 'yyyy-MM-dd'));
                            const dayOfWeekForSelected = dayIndexToWeekDayConstant[getDay(selectedCalendarDate as Date)];
                            const isScheduledToday = habit.daysOfWeek.includes(dayOfWeekForSelected);
                            let statusText = "Scheduled";
                            let StatusIcon = CircleIcon;
                            let iconColor = "text-orange-500";

                            if (logEntry?.status === 'completed') {
                                statusText = `Completed ${logEntry.time || ''}`;
                                StatusIcon = CheckCircle2; iconColor = "text-accent";
                            } else if (logEntry?.status === 'pending_makeup') {
                                statusText = `Makeup for ${logEntry.originalMissedDate || 'earlier'}`;
                                StatusIcon = MakeupIcon; iconColor = "text-blue-500";
                            } else if (logEntry?.status === 'skipped') {
                                statusText = "Skipped";
                                StatusIcon = XCircle; iconColor = "text-muted-foreground";
                            } else if (isScheduledToday && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !logEntry) {
                                statusText = "Missed"; StatusIcon = XCircle; iconColor = "text-destructive";
                            } else if (!isScheduledToday && !logEntry) {
                                statusText = "Not Scheduled"; StatusIcon = CircleIcon; iconColor = "text-muted-foreground/50";
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
                        <p className="text-sm text-muted-foreground text-center py-2">No habits scheduled or logged for this day.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </main>
            <footer className="py-3 text-center text-xs text-muted-foreground border-t shrink-0 mt-auto">
              <p>&copy; {new Date().getFullYear()} Habitual.</p>
            </footer>
          </div>
        </ScrollArea>
        <BottomNavigationBar />
      </div>
    </div>
  );
};

export default CalendarPage;
