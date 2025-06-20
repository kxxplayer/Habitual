"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { Habit, WeekDay, CreateHabitFormData } from '@/types';
import AppPageLayout from '@/components/layout/AppPageLayout';
import CreateHabitDialog from '@/components/habits/CreateHabitDialog';
import GoalInputProgramDialog from '@/components/programs/GoalInputProgramDialog';
import { Calendar } from '@/components/ui/calendar';
import { type DayPicker } from 'react-day-picker';
import { Loader2, CalendarDays, CheckCircle2, XCircle, Circle as CircleIcon, CalendarClock as MakeupIcon } from 'lucide-react';
import { format, parseISO, isSameDay, getDay, startOfDay, subDays, addDays, addDays as dateFnsAddDays, isToday as dateFnsIsToday, isPast as dateFnsIsPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';


const LS_KEY_PREFIX_HABITS = "habits_";
const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const USER_DATA_COLLECTION = "users";
const USER_APP_DATA_SUBCOLLECTION = "appData";
const USER_MAIN_DOC_ID = "main";

const CalendarPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date());
  
  // Dialog states
  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = React.useState(false);
  const [isGoalInputProgramDialogOpen, setIsGoalInputProgramDialogOpen] = React.useState(false);

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
    const userDocRef = doc(db, USER_DATA_COLLECTION, authUser.uid, USER_APP_DATA_SUBCOLLECTION, USER_MAIN_DOC_ID);
    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHabits(Array.isArray(data.habits) ? data.habits : []);
      } else {
        setHabits([]);
      }
      setIsLoadingData(false);
    }, (error) => {
      console.error("Error fetching calendar data from Firestore:", error);
      setIsLoadingData(false);
    });

    return () => unsubscribeFirestore();
  }, [authUser, isLoadingAuth]);

  const handleOpenCreateHabitDialog = () => {
    setIsCreateHabitDialogOpen(true);
  };

  const handleOpenGoalInputProgramDialog = () => {
    setIsCreateHabitDialogOpen(false);
    setIsGoalInputProgramDialogOpen(true);
  };

  const handleSaveHabit = (habitData: CreateHabitFormData & { id?: string }) => {
    // Handle saving the habit here if needed, or just close dialog and navigate
    setIsCreateHabitDialogOpen(false);
    // Navigate to home page after successful creation
    setTimeout(() => {
      router.push('/');
    }, 1000);
  };

  const calendarDialogModifiers = React.useMemo(() => {
    if (!authUser) {
      return {
        selected: selectedCalendarDate ? [selectedCalendarDate] : [],
        completed: [],
        missed: [],
        scheduled: [],
        makeup: [],
      };
    }
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
        for (let i = 0; i < iteration_limit; i++) {
          const checkDate_obj = addDays(subDays(today_date_obj, 30), i);
          const checkDateStr = format(checkDate_obj, 'yyyy-MM-dd');
          const dayOfWeek = dayIndexToWeekDayConstant[getDay(checkDate_obj)];
          const isScheduled = habit_item_for_modifiers_loop.daysOfWeek.includes(dayOfWeek);
          const logEntry = habit_item_for_modifiers_loop.completionLog.find(l => l.date === checkDateStr);
          const isPastDate = dateFnsIsPast(checkDate_obj) && !dateFnsIsToday(checkDate_obj);

          if (isScheduled) {
            if (logEntry?.status === 'completed') {
              // Already handled above
            } else if (isPastDate && !logEntry) {
              dates_scheduled_missed_arr.push(checkDate_obj);
            } else if (!isPastDate) {
              dates_scheduled_upcoming_arr.push(checkDate_obj);
            }
          }
        }
      });

      return {
        selected: selectedCalendarDate ? [selectedCalendarDate] : [],
        completed: dates_completed_arr,
        missed: dates_scheduled_missed_arr,
        scheduled: dates_scheduled_upcoming_arr,
        makeup: dates_makeup_pending_arr,
      };
    } catch (eCalendarModifiers) {
      console.error("Error in calendarDialogModifiers calculation:", eCalendarModifiers);
      return {
        selected: selectedCalendarDate ? [selectedCalendarDate] : [],
        completed: [],
        missed: [],
        scheduled: [],
        makeup: [],
      };
    }
  }, [habits, selectedCalendarDate, authUser]);

  const calendarDialogModifierStyles: React.ComponentProps<typeof DayPicker>['modifiersStyles'] = {
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
      <AppPageLayout>
        <div className="flex flex-col items-center justify-center pt-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading calendar...</p>
        </div>
      </AppPageLayout>
    );
  }

  if (!authUser) {
     return (
      <AppPageLayout>
        <div className="flex flex-col items-center justify-center pt-20">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </AppPageLayout>
    );
  }

  return (
    <>
      <AppPageLayout onAddNew={handleOpenCreateHabitDialog}>
        <Card className="animate-card-fade-in">
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

                      return (
                        <li key={habit.id} className="flex items-center justify-between p-2 bg-card/50 rounded-lg border border-border/50 hover:bg-card/80 transition-all duration-200">
                          <span className="font-medium truncate pr-2 text-foreground">{habit.name}</span>
                          <div className={cn(
                            "flex items-center space-x-1.5 text-xs font-medium px-2 py-1 rounded-full transition-all duration-200",
                            logEntry?.status === 'completed' && "bg-green-100 text-green-700 border border-green-200",
                            logEntry?.status === 'pending_makeup' && "bg-blue-100 text-blue-700 border border-blue-200",
                            logEntry?.status === 'skipped' && "bg-gray-100 text-gray-600 border border-gray-200",
                            (isScheduledToday && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !logEntry) && "bg-red-100 text-red-700 border border-red-200",
                            (!isScheduledToday && !logEntry) && "bg-muted/50 text-muted-foreground border border-muted-foreground/20",
                            (!logEntry && isScheduledToday && !dateFnsIsPast(startOfDay(selectedCalendarDate as Date))) && "bg-orange-100 text-orange-700 border border-orange-200"
                          )}>
                            {logEntry?.status === 'completed' ? (
                              <>
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span>Completed {logEntry.time || ''}</span>
                              </>
                            ) : logEntry?.status === 'pending_makeup' ? (
                              <>
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                <span>Makeup for {logEntry.originalMissedDate || 'earlier'}</span>
                              </>
                            ) : logEntry?.status === 'skipped' ? (
                              <>
                                <div className="h-2 w-2 rounded-full bg-gray-500" />
                                <span>Skipped</span>
                              </>
                            ) : (isScheduledToday && dateFnsIsPast(startOfDay(selectedCalendarDate as Date)) && !dateFnsIsToday(selectedCalendarDate as Date) && !logEntry) ? (
                              <>
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                <span>Missed</span>
                              </>
                            ) : (!isScheduledToday && !logEntry) ? (
                              <>
                                <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                                <span>Not Scheduled</span>
                              </>
                            ) : (
                              <>
                                <div className="h-2 w-2 rounded-full bg-orange-500" />
                                <span>Scheduled</span>
                              </>
                            )}
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
      </AppPageLayout>

      <CreateHabitDialog
        isOpen={isCreateHabitDialogOpen}
        onClose={() => setIsCreateHabitDialogOpen(false)}
        onSaveHabit={handleSaveHabit}
        initialData={null}
        onOpenGoalProgramDialog={handleOpenGoalInputProgramDialog}
      />

      <GoalInputProgramDialog
        isOpen={isGoalInputProgramDialogOpen}
        onClose={() => setIsGoalInputProgramDialogOpen(false)}
        onSubmit={() => {
          setIsGoalInputProgramDialogOpen(false);
          setTimeout(() => {
            router.push('/');
          }, 1000);
        }}
        isLoading={false}
      />
    </>
  );
};

export default CalendarPage;