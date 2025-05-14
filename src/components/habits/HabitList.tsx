"use client";

import type { FC } from 'react';
import HabitItem from './HabitItem';
import type { Habit } from '@/types';
import { ListChecks } from 'lucide-react';

interface HabitListProps {
  habits: Habit[];
  onToggleComplete: (habitId: string, date: string, completed: boolean) => void;
  onGetAISuggestion: (habit: Habit) => void;
}

const HabitList: FC<HabitListProps> = ({ habits, onToggleComplete, onGetAISuggestion }) => {
  if (habits.length === 0) {
    return (
      <div className="text-center py-10">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">No Habits Yet</h3>
        <p className="text-muted-foreground">Click "Add Habit" to get started!</p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {habits.map((habit) => (
        <HabitItem
          key={habit.id}
          habit={habit}
          onToggleComplete={onToggleComplete}
          onGetAISuggestion={onGetAISuggestion}
          isCompletedToday={habit.completedDates.includes(today)}
        />
      ))}
    </div>
  );
};

export default HabitList;
