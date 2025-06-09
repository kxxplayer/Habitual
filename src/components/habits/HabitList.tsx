
"use client";

import type { FC } from 'react';
import HabitItem from './HabitItem';
import type { Habit, WeekDay } from '@/types';
import { ListChecks } from 'lucide-react';
import { getCurrentWeekDays, type WeekDayInfo } from '@/lib/dateUtils'; // Added getCurrentWeekDays and WeekDayInfo
import * as React from 'react'; // Added React import

const HabitList: FC<HabitListProps> = ({ habits, onOpenDetailView, todayString, todayAbbr }) => {
  const [currentWeekDays, setCurrentWeekDays] = React.useState<WeekDayInfo[]>([]);

  React.useEffect(() => {
    setCurrentWeekDays(getCurrentWeekDays(new Date()));
  }, []);

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

  if (habitsForToday.length === 0 && habits.length > 0) { // Show message if there are habits, but none for today
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Habits for Today</h3>
        <p className="text-sm text-muted-foreground">Looks like a day off, or check your other scheduled habits!</p>
      </div>
    );
  }
  
  if (habits.length === 0) { // This covers the case where there are no habits at all
     return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Habits Yet</h3>
        <p className="text-sm text-muted-foreground">Add some habits to get started!</p>
      </div>
    );
  }

  // Display all habits if none are specifically for today but some exist
  const habitsToDisplay = habitsForToday.length > 0 ? habitsForToday : habits;


  return (
    <div className="flex flex-col space-y-4">
      {habitsToDisplay.map((habit) => (
        <HabitItem
          key={habit.id}
          habit={habit}
          onOpenDetailView={onOpenDetailView}
          todayString={todayString}
          currentWeekDays={currentWeekDays} 
        />
      ))}
    </div>
  );
};

interface HabitListProps {
  habits: Habit[];
  onOpenDetailView: (habit: Habit) => void;
  todayString: string;
  todayAbbr: WeekDay | '';
}


export default HabitList;
    
