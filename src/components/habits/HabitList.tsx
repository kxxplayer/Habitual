"use client";

import type { FC } from 'react';
import * as React from 'react'; 
import HabitItem from './HabitItem';
import ProgramHabitGroup from './ProgramHabitGroup';
import type { Habit, WeekDay } from '@/types';
import { ListChecks } from 'lucide-react';

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
  if (!todayAbbr) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">Loading...</h3>
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
  
  if (habits.length === 0) {
     return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Habits Yet</h3>
        <p className="text-sm text-muted-foreground">Tap the '+' button to add habits or create a program!</p>
      </div>
    );
  }
  
  if (habitsRelevantToday.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Habits for Today</h3>
        <p className="text-sm text-muted-foreground">Relax or check your other scheduled habits!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {programGroupsArray.map((group) => (
        <ProgramHabitGroup
          key={group.id}
          programId={group.id}
          programName={group.name}
          habitsInProgram={group.habits}
          onOpenDetailView={onOpenDetailView}
          todayString={todayString}
          todayAbbr={todayAbbr}
 onToggleComplete={(habitId, date) => onToggleComplete(habitId, date, true)} // Assuming toggle means complete from list
 onDelete={onDelete}
 onEdit={onEdit}
 onReschedule={onReschedule}
        />
      ))}
      {standaloneHabits.map((habit) => (
        <div onClick={() => onOpenDetailView(habit)} key={habit.id} className="cursor-pointer">
            <HabitItem
              habit={habit}
              todayString={todayString}
            />
        </div>
      ))}
    </div>
  );
};

export default HabitList;
