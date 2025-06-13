// src/components/habits/ProgramHabitGroup.tsx

"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import HabitItem from './HabitItem';
import type { Habit, WeekDay } from '@/types';
import { Target, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface ProgramHabitGroupProps {
  programId: string;
  programName: string;
  habitsInProgram: Habit[];
  onOpenDetailView: (habit: Habit) => void;
  todayString: string;
  todayAbbr: WeekDay | undefined;
  onToggleComplete: (habitId: string, date: string) => void;
  onDelete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onReschedule: (habit: Habit, missedDate: string) => void;
}

const ProgramHabitGroup: FC<ProgramHabitGroupProps> = ({
  programId,
  programName,
  habitsInProgram,
  onOpenDetailView,
  todayString,
  todayAbbr,
  onToggleComplete,
  onDelete,
  onEdit,
  onReschedule,
}) => {
  const habitsScheduledToday = todayAbbr
    ? habitsInProgram.filter(habit =>
        habit.daysOfWeek.includes(todayAbbr) ||
        habit.completionLog.some(log => log.date === todayString && log.status === 'pending_makeup')
      )
    : [];

  const completedTodayCount = habitsScheduledToday.filter(habit =>
    habit.completionLog.some(log => log.date === todayString && log.status === 'completed')
  ).length;

  const allProgramTasksForTodayCompleted = habitsScheduledToday.length > 0 && completedTodayCount === habitsScheduledToday.length;
  const progressPercentToday = habitsScheduledToday.length > 0 ? (completedTodayCount / habitsScheduledToday.length) * 100 : 0;

  if (habitsScheduledToday.length === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible className="w-full" defaultValue={`program-${programId}`}>
      <AccordionItem value={`program-${programId}`} className="border border-primary/20 rounded-lg shadow-md overflow-hidden bg-card/80">
        <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 transition-colors w-full">
          <div className="flex flex-col w-full space-y-1.5">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Target className={cn("h-6 w-6", allProgramTasksForTodayCompleted ? "text-accent" : "text-primary")} />
                <span className={cn("font-semibold text-lg text-left", allProgramTasksForTodayCompleted ? "text-accent line-through" : "text-foreground")}>
                  {programName}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs">
                {allProgramTasksForTodayCompleted ?
                  <CheckCircle2 className="h-4 w-4 text-accent" /> :
                  <Circle className={cn("h-3.5 w-3.5", habitsScheduledToday.length > 0 ? "text-orange-500" : "text-muted-foreground/60")} />
                }
                {habitsScheduledToday.length > 0 ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-700/30 dark:text-amber-200">
                    {`${completedTodayCount}/${habitsScheduledToday.length} today`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No tasks today</span>
                )}
              </div>
            </div>
            {habitsScheduledToday.length > 0 && (
              <Progress
                value={progressPercentToday}
                className="h-1.5 w-full mt-1"
                indicatorClassName={allProgramTasksForTodayCompleted ? "bg-accent" : "bg-primary"}
              />
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="bg-muted/20 border-t border-border">
          {/* Container updated to a responsive grid */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {habitsScheduledToday.length > 0 ? (
              habitsScheduledToday.map(habit => (
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
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2 col-span-full">No habits in this program scheduled for today.</p>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ProgramHabitGroup;