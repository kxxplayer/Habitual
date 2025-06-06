"use client";

import type { FC } from 'react';
import HabitItem from './HabitItem';
import type { Habit } from '@/types';
import { ListChecks } from 'lucide-react';

interface HabitListProps {
  habits: Habit[];
  onOpenDetailView: (habit: Habit) => void;
  todayString: string;
}

const HabitList: FC<HabitListProps> = ({ habits, onOpenDetailView, todayString }) => {
  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] sm:min-h-[250px]">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">No Habits Yet</h3>
        <p className="text-muted-foreground">Tap the "+" button to add your first habit!</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
      {habits.map((habit) => (
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
    
