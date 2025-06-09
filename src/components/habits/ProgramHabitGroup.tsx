
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import HabitItem from './HabitItem';
import type { Habit, WeekDay } from '@/types';
import { Target, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress'; // Import Progress component

interface ProgramHabitGroupProps {
  programId: string;
  programName: string;
  habitsInProgram: Habit[];
  onOpenDetailView: (habit: Habit) => void;
  todayString: string;
  todayAbbr: WeekDay | '';
}

const ProgramHabitGroup: FC<ProgramHabitGroupProps> = ({
  programId,
  programName,
  habitsInProgram,
  onOpenDetailView,
  todayString,
  todayAbbr,
}) => {
  const habitsScheduledToday = habitsInProgram.filter(habit => 
    habit.daysOfWeek.includes(todayAbbr) || 
    habit.completionLog.some(log => log.date === todayString && log.status === 'pending_makeup')
  );

  const completedTodayCount = habitsScheduledToday.filter(habit =>
    habit.completionLog.some(log => log.date === todayString && log.status === 'completed')
  ).length;

  const allProgramTasksForTodayCompleted = habitsScheduledToday.length > 0 && completedTodayCount === habitsScheduledToday.length;
  const progressPercentToday = habitsScheduledToday.length > 0 ? (completedTodayCount / habitsScheduledToday.length) * 100 : 0;

  if (habitsInProgram.length === 0) {
    return null; 
  }

  return (
    <Accordion type="single" collapsible className="w-full" defaultValue={`program-${programId}`}>
      <AccordionItem value={`program-${programId}`} className="border border-border rounded-lg shadow-md overflow-hidden bg-card">
        <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 transition-colors w-full">
          <div className="flex flex-col w-full space-y-1.5"> {/* Outer flex column for title and progress bar */}
            <div className="flex items-center justify-between w-full"> {/* Top row: Icon, Name, Status */}
              <div className="flex items-center space-x-2">
                <Target className={cn("h-5 w-5", allProgramTasksForTodayCompleted ? "text-accent" : "text-primary")} /> 
                <span className={cn("font-semibold text-md text-left", allProgramTasksForTodayCompleted ? "text-accent line-through" : "text-foreground")}>
                  {programName}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                {allProgramTasksForTodayCompleted ? 
                  <CheckCircle2 className="h-4 w-4 text-accent" /> : 
                  <Circle className={cn("h-3.5 w-3.5", habitsScheduledToday.length > 0 ? "text-orange-500" : "text-muted-foreground/60")} />
                }
                <span>
                  {habitsScheduledToday.length > 0 
                    ? `${completedTodayCount}/${habitsScheduledToday.length} today`
                    : "No tasks today"}
                </span>
              </div>
            </div>
            {habitsScheduledToday.length > 0 && ( /* Conditional progress bar row */
              <Progress 
                value={progressPercentToday} 
                className="h-1.5 w-full" 
                indicatorClassName={allProgramTasksForTodayCompleted ? "bg-accent" : "bg-primary"}
              />
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="bg-muted/20 border-t border-border">
          <div className="p-2 sm:p-3 space-y-2">
            {habitsInProgram.length > 0 ? (
              habitsInProgram.map(habit => (
                <HabitItem
                  key={habit.id}
                  habit={habit}
                  onOpenDetailView={onOpenDetailView}
                  todayString={todayString}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">No habits in this program.</p>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ProgramHabitGroup;
