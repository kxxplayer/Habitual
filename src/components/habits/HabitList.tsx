// src/components/habits/HabitList.tsx

"use client";

import * as React from 'react';
import { useMemo } from 'react';
import type { FC } from 'react';
import type { Habit, WeekDay } from '@/types';
import HabitItem from './HabitItem';
import ProgramHabitGroup from './ProgramHabitGroup';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ListTodo } from 'lucide-react';

interface HabitListProps {
  habits: Habit[];
  showAllHabits: boolean;
  onOpenDetailView: (habit: Habit) => void;
  todayString: string;
  todayAbbr: WeekDay | undefined;
  onToggleComplete: (habitId: string, date: string) => void;
  onDelete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onReschedule: (habit: Habit, missedDate: string) => void;
  onDeleteProgram?: (programId: string, programName: string) => void;
  selectedHabitIds: string[];
  setSelectedHabitIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const HabitList: FC<HabitListProps> = ({
  habits,
  showAllHabits,
  todayString,
  todayAbbr,
  onOpenDetailView,
  onToggleComplete,
  onDelete,
  onEdit,
  onReschedule,
  onDeleteProgram,
  selectedHabitIds,
  setSelectedHabitIds,
}) => {
  const selectAllRef = React.useRef<HTMLInputElement>(null);

  const handleSelectHabit = (habitId: string, checked: boolean) => {
    setSelectedHabitIds(prev =>
      checked ? [...prev, habitId] : prev.filter(id => id !== habitId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHabitIds(habits.map(h => h.id));
    } else {
      setSelectedHabitIds([]);
    }
  };

  const habitsToDisplay = useMemo(() => {
    if (showAllHabits) {
      return habits;
    }
    return habits.filter(habit =>
      (todayAbbr && habit.daysOfWeek.includes(todayAbbr)) ||
      habit.completionLog.some(log => log.date === todayString && log.status === 'pending_makeup')
    );
  }, [habits, showAllHabits, todayAbbr, todayString]);

  const habitsWithoutPrograms = useMemo(() =>
    habitsToDisplay.filter(habit => !habit.programId),
    [habitsToDisplay]
  );

  const programs = useMemo(() => {
    const programMap: { [key: string]: { name: string; habits: Habit[] } } = {};
    habitsToDisplay.forEach(habit => {
      if (habit.programId && habit.programName) {
        if (!programMap[habit.programId]) {
          programMap[habit.programId] = { name: habit.programName, habits: [] };
        }
        programMap[habit.programId].habits.push(habit);
      }
    });
    return Object.entries(programMap).map(([id, data]) => ({ id, ...data }));
  }, [habitsToDisplay]);

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedHabitIds.length > 0 && selectedHabitIds.length < habitsToDisplay.length;
    }
  }, [selectedHabitIds, habitsToDisplay.length]);

  if (habitsToDisplay.length === 0 && !showAllHabits) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[200px] bg-card/50 border border-dashed rounded-lg">
        <ListTodo className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">All Done for Today!</h3>
        <p className="text-sm text-muted-foreground">
          No more tasks scheduled. Try the 'View All Tasks' button to plan ahead.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Checkbox
          id="select-all-habits"
          ref={selectAllRef}
          checked={selectedHabitIds.length > 0 && selectedHabitIds.length === habitsToDisplay.length}
          onCheckedChange={handleSelectAll}
        />
        <label htmlFor="select-all-habits" className="text-sm font-medium cursor-pointer select-none">Select All</label>
      </div>
      {programs.map(program => (
        <ProgramHabitGroup
          key={program.id}
          showAllHabits={showAllHabits}
          programId={program.id}
          programName={program.name}
          habitsInProgram={program.habits}
          onOpenDetailView={onOpenDetailView}
          todayString={todayString}
          todayAbbr={todayAbbr}
          onToggleComplete={onToggleComplete}
          onDelete={onDelete}
          onEdit={onEdit}
          onReschedule={onReschedule}
          onDeleteProgram={onDeleteProgram}
          selectedHabitIds={selectedHabitIds}
          onSelectHabit={handleSelectHabit}
        />
      ))}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {habitsWithoutPrograms.map(habit => (
          <HabitItem
            key={habit.id}
            habit={habit}
            todayString={todayString}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
            onEdit={onEdit}
            onReschedule={() => onReschedule(habit, todayString)}
            onOpenDetailView={onOpenDetailView}
            isCompleted={habit.completionLog.some(log => log.date === todayString && log.status === 'completed')}
            currentDate={todayString}
            isSelected={selectedHabitIds.includes(habit.id)}
            onSelect={handleSelectHabit}
          />
        ))}
      </div>
    </div>
  );
};

export default HabitList;