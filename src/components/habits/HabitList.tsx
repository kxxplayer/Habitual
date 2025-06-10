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
  onReschedule: (habit: Habit, missedDate: string) => void;
  todayString: string;
  todayAbbr: WeekDay | '';
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

  const handleRescheduleWrapper = (habit: Habit) => {
    // Default to today for the missed date
    onReschedule(habit, todayString);
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
 onToggleComplete={handleToggleCompleteWrapper} // Use wrapper
 onDelete={handleDeleteWrapper} // Use wrapper
 onEdit={onEdit} // Pass directly
 onReschedule={onReschedule}
        />
      ))}
      {standaloneHabits.map((habit) => (
        <HabitItem
          key={habit.id}
          habit={habit}
          onToggleComplete={handleToggleCompleteWrapper}
          onDelete={handleDeleteWrapper}
          onEdit={onEdit}
          onReschedule={handleRescheduleWrapper}
          onOpenDetailView={onOpenDetailView}
          isCompleted={habit.completionLog.some(log => log.date === todayString && log.status === 'completed')}
          currentDate={todayString}
        />
      ))}
    </div>
  );
};

export default HabitList;