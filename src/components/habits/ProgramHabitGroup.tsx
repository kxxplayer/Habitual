// src/components/habits/ProgramHabitGroup.tsx

"use client";

import * as React from 'react';
import type { FC } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
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
  onDeleteProgram?: (programId: string, programName: string) => void;
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
  onDeleteProgram
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
      <AccordionItem value={`program-${programId}`} className="border border-primary/20 rounded-lg shadow-md overflow-hidden bg-card/80 relative"> {/* Added 'relative' positioning */}
        <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 transition-colors w-full flex-col items-start !no-underline"> {/* Added flex-col, items-start, and !no-underline */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <Target className={cn("h-6 w-6", allProgramTasksForTodayCompleted ? "text-accent" : "text-primary")} />
              <span className={cn("font-semibold text-lg text-left", allProgramTasksForTodayCompleted ? "text-accent line-through" : "text-foreground")}>
                {programName}
              </span>
            </div>
            {/* The right-side progress indicator remains part of the AccordionTrigger's content */}
            <div className="flex items-center space-x-2 text-xs">
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
        </AccordionTrigger>

        {/* Moved DropdownMenu outside AccordionTrigger and positioned absolutely */}
        {onDeleteProgram && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent AccordionTrigger from toggling
                    e.preventDefault(); // Prevent default button behavior
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Program options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation(); // Ensure click doesn't propagate up
                    onDeleteProgram(programId, programName);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Program
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <AccordionContent className="bg-muted/20 border-t border-border">
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