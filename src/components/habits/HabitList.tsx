
"use client";

import type { FC } from 'react';
import HabitItem from './HabitItem';
import type { Habit, EarnedBadge } from '@/types';
import { ListChecks } from 'lucide-react';

interface HabitListProps {
  habits: Habit[];
  onToggleComplete: (habitId: string, date: string, completed: boolean) => void;
  onGetAISuggestion: (habit: Habit) => void;
  onOpenReflectionDialog: (habitId: string, date: string, habitName: string) => void;
  onOpenRescheduleDialog: (habit: Habit, missedDate: string) => void;
  // selectedHabitIds: string[]; // Removed as card checkbox is removed
  // onSelectHabit: (habitId: string) => void; // Removed
  earnedBadges: EarnedBadge[];
}

const HabitList: FC<HabitListProps> = ({
    habits,
    onToggleComplete,
    onGetAISuggestion,
    onOpenReflectionDialog,
    onOpenRescheduleDialog,
    // selectedHabitIds, // Removed
    // onSelectHabit, // Removed
    earnedBadges,
}) => {
  if (habits.length === 0) {
    return (
      <div className="text-center py-10">
        <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">No Habits Yet</h3>
        <p className="text-muted-foreground">Click the "+" button to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {habits.map((habit) => (
        <HabitItem
          key={habit.id}
          habit={habit}
          onToggleComplete={onToggleComplete}
          onGetAISuggestion={onGetAISuggestion}
          onOpenReflectionDialog={onOpenReflectionDialog}
          onOpenRescheduleDialog={onOpenRescheduleDialog}
          // isSelected={selectedHabitIds.includes(habit.id)} // Removed
          // onSelectToggle={onSelectHabit} // Removed
          earnedBadges={earnedBadges}
        />
      ))}
    </div>
  );
};

export default HabitList;
