// src/components/habits/HabitList.tsx

"use client";

import type { FC } from 'react';
import * as React from 'react';
import HabitItem from './HabitItem';
import ProgramHabitGroup from './ProgramHabitGroup'; // Import new component
import type { Habit, WeekDay } from '@/types';
import { ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitListProps {
  habits: Habit[];
  onOpenDetailView: (habit: Habit) => void;
  onToggleComplete: (habitId: string, date: string, completed: boolean) => void;
  onDelete: (habitId: string, habitName: string) => void;
  onEdit: (habit: Habit) => void;
  onReschedule: (habit: Habit, missedDate: string) => void; // This prop still takes 2 arguments
  todayString: string;
  todayAbbr: WeekDay | undefined;
}

const HabitList: FC<HabitListProps> = ({
  habits,
  onOpenDetailView,
  onToggleComplete,
  onDelete,
  onEdit,
  onReschedule,
  todayString,
  todayAbbr
}) => {
  // Wrapper functions to adapt to HabitItem's expected signatures where needed
  const handleToggleCompleteWrapper = (habitId: string, date: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      const isCompleted = habit.completionLog.some(log => log.date === date && log.status === 'completed');
      onToggleComplete(habitId, date, !isCompleted);
    }
  };

  const handleDeleteWrapper = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      onDelete(habitId, habit.name);
    }
  };

  // This wrapper will now only pass the habit object, conforming to HabitItem's expectation
  // The missedDate will need to be determined within the RescheduleMissedHabitDialog itself,
  // or passed down differently if it's always 'todayString'.
  // Based on HabitItem's signature, it expects `onReschedule: (habit: any) => void;`
  // and the RescheduleMissedHabitDialog expects `onReschedule: (newDate: string) => void;` (which is a callback within that dialog)
  // The issue here is how `onReschedule` is passed to `ProgramHabitGroup` and `HabitItem`.
  // `ProgramHabitGroup` expects `onReschedule: (habit: Habit) => void;`
  // `HabitItem` expects `onReschedule: (habit: any) => void;`
  // The top-level `onReschedule` in HabitList takes `(habit: Habit, missedDate: string) => void;`.
  // We need to make sure the prop passed down matches.

  // Let's assume the `onReschedule` in `ProgramHabitGroup` and `HabitItem` should trigger the top-level
  // `onOpenRescheduleDialog` from `page.tsx` which takes `(habit: Habit, missedDate: string)`.
  // So, the `onReschedule` prop that `HabitList` exposes should be the one to pass through.
  // The error suggests `ProgramHabitGroup`'s `onReschedule` expects only `habit: Habit`, but it needs `missedDate` too.
  // Let's adjust `ProgramHabitGroupProps` or ensure `onReschedule` consistently takes `habit` and `missedDate`.

  // Looking at the original `ProgramHabitGroup.tsx` and `HabitItem.tsx`, the `onReschedule` prop takes `(habit: Habit)`.
  // The `RescheduleMissedHabitDialog` itself takes `habitName` and `originalMissedDate`.
  // The `onOpenRescheduleDialog` in `page.tsx` correctly takes `(habit: Habit, missedDate: string)`.

  // The discrepancy is that `HabitList` is passing a 2-arg `onReschedule` to `ProgramHabitGroup` and `HabitItem`,
  // but those components' `onReschedule` prop definitions only accept 1 argument (`habit`).
  // The fix is to make `onReschedule` in `ProgramHabitGroupProps` and `HabitItemProps` consistently take `(habit: Habit, missedDate: string)`.
  // However, the `HabitItem`'s `handleReschedule` method calls `onReschedule(habit)` (1 arg).
  // The `ProgramHabitGroup` also passes `onReschedule={onReschedule}` directly, implying it passes through its own `onReschedule` prop.

  // The most straightforward fix is to update `ProgramHabitGroupProps` and `HabitItemProps` to accept `missedDate` as well,
  // and then ensure `HabitItem`'s internal `handleReschedule` passes `currentDate` as the `missedDate`.

  // I will update the `onReschedule` signature in `ProgramHabitGroup.tsx` and `HabitItem.tsx`
  // to explicitly accept `missedDate: string`.

  // For `HabitList.tsx` itself, the `onReschedule` prop is `(habit: Habit, missedDate: string) => void;`.
  // This is the correct signature to pass down.

  const handleRescheduleWrapper = (habit: Habit, missedDate: string) => {
    // This wrapper is fine as is, it simply passes through the arguments received by HabitList's prop.
    onReschedule(habit, missedDate);
  };

  if (!todayAbbr) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">Loading...</h3>
        <p className="text-muted-foreground">Determining today's tasks.</p>
      </div>
    );
  }

  const habitsRelevantToday = habits.filter(habit =>
    habit.daysOfWeek.includes(todayAbbr) ||
    habit.completionLog.some(log => log.date === todayString && log.status === 'pending_makeup')
  );

  const standaloneHabits = habitsRelevantToday.filter(h => !h.programId);
  const programHabits = habitsRelevantToday.filter(h => h.programId && h.programName);

  const groupedProgramHabits = programHabits.reduce<Record<string, { name: string; id: string; habits: Habit[] }>>((acc, habit) => {
    if (habit.programId && habit.programName) {
      if (!acc[habit.programId]) {
        acc[habit.programId] = { id: habit.programId, name: habit.programName, habits: [] };
      }
      acc[habit.programId].habits.push(habit);
    }
    return acc;
  }, {});

  const programGroupsArray = Object.values(groupedProgramHabits);

  const noTasksAtAll = habits.length === 0;
  const noTasksForToday = habits.length > 0 && habitsRelevantToday.length === 0;


  if (noTasksAtAll) {
     return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Habits Yet</h3>
        <p className="text-sm text-muted-foreground">Tap the '+' button to add habits or create a program!</p>
      </div>
    );
  }

  if (noTasksForToday) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Habits for Today</h3>
        <p className="text-sm text-muted-foreground">Relax or check your other scheduled habits!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3">
      {programGroupsArray.map((group) => (
        <ProgramHabitGroup
          key={group.id}
          programId={group.id}
          programName={group.name}
          habitsInProgram={group.habits}
          onOpenDetailView={onOpenDetailView}
          todayString={todayString}
          todayAbbr={todayAbbr}
          onToggleComplete={handleToggleCompleteWrapper}
          onDelete={handleDeleteWrapper}
          onEdit={onEdit}
          onReschedule={handleRescheduleWrapper} // Pass the wrapper
        />
      ))}
      {standaloneHabits.map((habit) => (
        <HabitItem
          key={habit.id}
          habit={habit}
          onToggleComplete={handleToggleCompleteWrapper}
          onDelete={handleDeleteWrapper}
          onEdit={onEdit}
          onReschedule={() => handleRescheduleWrapper(habit, todayString)} // Pass specific arguments
          onOpenDetailView={onOpenDetailView}
          isCompleted={habit.completionLog.some(log => log.date === todayString && log.status === 'completed')}
 todayString={todayString} // Add this line
          currentDate={todayString}
        />
      ))}
    </div>
  );
};

export default HabitList;