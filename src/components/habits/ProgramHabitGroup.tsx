"use client";

import * as React from 'react';
import { useMemo } from 'react';
import type { FC } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import HabitItem from './HabitItem';
import type { Habit, WeekDay } from '@/types';
import { Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface ProgramHabitGroupProps {
  programId: string;
  programName: string;
  habitsInProgram: Habit[];
  showAllHabits: boolean; // Added prop
  onOpenDetailView: (habit: Habit) => void;
  todayString: string;
  todayAbbr: WeekDay | undefined;
  onToggleComplete: (habitId: string, date: string) => void;
  onDelete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onReschedule: (habit: Habit, missedDate: string) => void;
  onDeleteProgram?: (programId: string, programName: string) => void;
  selectedHabitIds?: string[];
  onSelectHabit?: (habitId: string, checked: boolean) => void;
}

const ProgramHabitGroup: FC<ProgramHabitGroupProps> = ({
  programId,
  programName,
  habitsInProgram,
  showAllHabits, // Destructure the new prop
  onOpenDetailView,
  todayString,
  todayAbbr,
  onToggleComplete,
  onDelete,
  onEdit,
  onReschedule,
  onDeleteProgram,
  selectedHabitIds,
  onSelectHabit
}) => {

  // This logic now correctly toggles between showing all habits and only today's habits
  const habitsToRender = useMemo(() => {
    if (showAllHabits) {
      return habitsInProgram;
    }
    return todayAbbr
      ? habitsInProgram.filter(habit =>
          habit.daysOfWeek.includes(todayAbbr as WeekDay) ||
          habit.completionLog.some(log => log.date === todayString && log.status === 'pending_makeup')
        )
      : [];
  }, [habitsInProgram, showAllHabits, todayAbbr, todayString]);

  const completedTodayCount = habitsInProgram.filter(habit =>
    habit.completionLog.some(log => log.date === todayString && log.status === 'completed')
  ).length;

  const allProgramTasksForTodayCompleted = habitsToRender.length > 0 && completedTodayCount >= habitsToRender.length;
  const progressPercentToday = habitsToRender.length > 0 ? (completedTodayCount / habitsToRender.length) * 100 : 0;
  
  // Conditionally render the entire component based on what needs to be shown
  if (!showAllHabits && habitsToRender.length === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible className="w-full" defaultValue={`program-${programId}`}>
      <AccordionItem value={`program-${programId}`} className="border border-primary/20 rounded-lg shadow-md overflow-hidden bg-card/80">
        <div className="flex items-center px-2 py-2">
          {onDeleteProgram && (
            <div className="mr-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Program options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteProgram(programId, programName); }}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Program
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <AccordionTrigger className="flex-grow p-0 !no-underline [&>svg]:hidden">
            <div className="flex flex-col items-start w-full ml-2">
              <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                      <Target className={cn("h-6 w-6", allProgramTasksForTodayCompleted ? "text-accent" : "text-primary")} />
                      <span className={cn("font-semibold text-lg text-left", allProgramTasksForTodayCompleted ? "text-accent line-through" : "text-foreground")}>
                          {programName}
                      </span>
                  </div>
              </div>
               {habitsToRender.length > 0 && (
                  <Progress
                    value={progressPercentToday}
                    className="h-1.5 w-full mt-2"
                    indicatorClassName={allProgramTasksForTodayCompleted ? "bg-accent" : "bg-primary"}
                  />
              )}
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent className="bg-muted/20 border-t border-border">
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {habitsToRender.map(habit => (
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
                isSelected={selectedHabitIds?.includes(habit.id)}
                onSelect={onSelectHabit}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ProgramHabitGroup;