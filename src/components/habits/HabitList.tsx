
"use client";

import type { FC } from 'react';
import HabitItem from './HabitItem';
import type { Habit, WeekDay } from '@/types';
import { ListChecks } from 'lucide-react';
// getCurrentWeekDays and WeekDayInfo are no longer needed here as currentWeekDays prop is removed
import * as React from 'react'; 

interface HabitListProps {
  habits: Habit[];
  onOpenDetailView: (habit: Habit) => void;
  todayString: string;
  todayAbbr: WeekDay | '';
}

const HabitList: FC<HabitListProps> = ({ habits, onOpenDetailView, todayString, todayAbbr }) => {
  // currentWeekDays state and useEffect are removed as the prop is no longer used

  if (!todayAbbr) {
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

  if (habits.length > 0 && habitsForToday.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Habits for Today</h3>
        <p className="text-sm text-muted-foreground">Relax or check your other scheduled habits!</p>
      </div>
    );
  }
  
  if (habits.length === 0) {
     return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Habits Yet</h3>
        <p className="text-sm text-muted-foreground">Tap the '+' button to add some habits and get started!</p>
      </div>
    );
  }

  // Always display only habits scheduled for today or pending makeup
  return (
    <div className="flex flex-col space-y-4">
      {habitsForToday.map((habit) => (
        <HabitItem
          key={habit.id}
          habit={habit}
          onOpenDetailView={onOpenDetailView}
          todayString={todayString}
          // currentWeekDays prop removed
        />
      ))}
    </div>
  );
};

export default HabitList;
    
