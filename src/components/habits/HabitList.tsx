
"use client";

import type { FC } from 'react';
import HabitItem from './HabitItem';
import type { Habit, WeekDay } from '@/types';
import { ListChecks } from 'lucide-react';
import { getDay, parseISO } from 'date-fns'; // Added for day calculation

const dayIndexToWeekDayConstant: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface HabitListProps {
  habits: Habit[];
  onOpenDetailView: (habit: Habit) => void;
  todayString: string; // YYYY-MM-DD
  todayAbbr: WeekDay | ''; // Abbreviation for today
}

const HabitList: FC<HabitListProps> = ({ habits, onOpenDetailView, todayString, todayAbbr }) => {
  if (!todayAbbr) { // Should ideally not happen if page.tsx sets it
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">Loading...</h3>
        <p className="text-muted-foreground">Determining today's tasks.</p>
      </div>
    );
  }

  const habitsForToday = habits.filter(habit => 
    habit.daysOfWeek.includes(todayAbbr) || 
    habit.completionLog.some(log => log.date === todayString && log.status === 'pending_makeup')
  );

  if (habitsForToday.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Habits for Today</h3>
        <p className="text-sm text-muted-foreground">Looks like a day off, or add some habits scheduled for today!</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {habitsForToday.map((habit) => (
        <HabitItem
          key={habit.id}
          habit={habit}
          onOpenDetailView={onOpenDetailView}
          todayString={todayString}
        />
      ))}
    </div>
  );
};
export default HabitList;
    
