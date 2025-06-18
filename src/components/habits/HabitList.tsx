"use client";

import * as React from 'react';
import type { FC } from 'react';
import type { Habit, WeekDay } from '@/types';
import HabitItem from './HabitItem';
import ProgramHabitGroup from './ProgramHabitGroup';

interface HabitListProps {
  habits: Habit[];
  onOpenDetailView: (habit: Habit) => void;
  onToggleComplete: (habitId: string, date: string, completed: boolean) => void;
  onDelete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onReschedule: (habit: Habit, missedDate: string) => void;
  onDeleteProgram: (programId: string, programName: string) => void;
  todayString: string;
  todayAbbr: WeekDay;
}

const HabitList: FC<HabitListProps> = ({
  habits,
  onOpenDetailView,
  onToggleComplete,
  onDelete,
  onEdit,
  onReschedule,
  onDeleteProgram,
  todayString,
  todayAbbr,
}) => {

  const groupedByProgram = habits.reduce((acc, habit) => {
    const key = habit.programId || 'individual';
    if (!acc[key]) {
      acc[key] = {
        programId: habit.programId,
        programName: habit.programName,
        habits: [],
      };
    }
    acc[key].habits.push(habit);
    return acc;
  }, {} as Record<string, { programId?: string; programName?: string; habits: Habit[] }>);

  const sortedGroups = Object.values(groupedByProgram).sort((a, b) => {
    if (a.programId && !b.programId) return 1;
    if (!a.programId && b.programId) return -1;
    return 0; 
  });

  return (
    <div className="space-y-4">
      {sortedGroups.map(group => {
        if (group.programId && group.programName) {
          return (
            <ProgramHabitGroup
              key={group.programId}
              programId={group.programId}
              programName={group.programName}
              habits={group.habits}
              onOpenDetailView={onOpenDetailView}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              onEdit={onEdit}
              onReschedule={onReschedule}
              onDeleteProgram={() => onDeleteProgram(group.programId!, group.programName!)}
              todayString={todayString}
              todayAbbr={todayAbbr}
            />
          );
        } else {
          return group.habits.map(habit => (
            <HabitItem
              key={habit.id}
              habit={habit}
              onOpenDetailView={() => onOpenDetailView(habit)}
              onToggleComplete={(completed) => onToggleComplete(habit.id, todayString, completed)}
              onDelete={() => onDelete(habit.id)}
              onEdit={() => onEdit(habit)}
              onReschedule={(missedDate) => onReschedule(habit, missedDate)}
              isTodayScheduled={habit.daysOfWeek.includes(todayAbbr)}
              todayString={todayString}
            />
          ));
        }
      })}
    </div>
  );
};

export default HabitList;