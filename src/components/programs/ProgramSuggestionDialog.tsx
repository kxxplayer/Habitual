
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CheckSquare, Sparkles, Tag, CalendarDays as CalendarIcon, Clock, Hourglass } from 'lucide-react';
import type { GenerateHabitProgramOutput, SuggestedProgramHabit } from '@/ai/flows/generate-habit-program-flow'; // Adjusted import
import { HABIT_CATEGORIES, type HabitCategory, type WeekDay } from '@/types'; // Ensure WeekDay is imported

interface ProgramSuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  programSuggestion: GenerateHabitProgramOutput | null;
  onAddProgramHabits: (habits: SuggestedProgramHabit[]) => void; // Callback to add habits
  isLoading?: boolean;
}

const ProgramSuggestionDialog: FC<ProgramSuggestionDialogProps> = ({
  isOpen,
  onClose,
  programSuggestion,
  onAddProgramHabits,
  isLoading,
}) => {
  if (!isOpen || !programSuggestion) {
    return null;
  }

  const handleAddAll = () => {
    if (programSuggestion && programSuggestion.suggestedHabits) {
      onAddProgramHabits(programSuggestion.suggestedHabits);
    }
    onClose();
  };
  
  const formatDays = (days: WeekDay[] | undefined) => {
    if (!days || days.length === 0) return 'Not specified';
    if (days.length === 7) return 'Daily';
    return days.join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center text-primary">
            <Sparkles className="mr-2 h-5 w-5" /> AI Suggested Program: {programSuggestion.programName}
          </DialogTitle>
          <DialogDescription>
            Here's a set of habits to help you achieve your goal. Review and add them to your list.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1 pr-3">
          <div className="space-y-3 py-2">
            {programSuggestion.suggestedHabits.map((habit, index) => (
              <Card key={index} className="bg-input/30">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-md font-semibold">{habit.name}</CardTitle>
                  {habit.description && <CardDescription className="text-xs">{habit.description}</CardDescription>}
                </CardHeader>
                <CardContent className="text-xs space-y-0.5 px-3 pb-2">
                  {habit.category && (
                    <div className="flex items-center"><Tag className="mr-1.5 h-3 w-3 text-muted-foreground" /> Category: {habit.category}</div>
                  )}
                  <div className="flex items-center"><CalendarIcon className="mr-1.5 h-3 w-3 text-muted-foreground" /> Days: {formatDays(habit.daysOfWeek as WeekDay[])}</div>
                  {habit.optimalTiming && (
                    <div className="flex items-center"><Clock className="mr-1.5 h-3 w-3 text-muted-foreground" /> Timing: {habit.optimalTiming}</div>
                  )}
                  {(habit.durationHours || habit.durationMinutes) && (
                    <div className="flex items-center">
                      <Hourglass className="mr-1.5 h-3 w-3 text-muted-foreground" /> Duration:
                      {habit.durationHours ? ` ${habit.durationHours}h` : ""}
                      {habit.durationMinutes ? ` ${habit.durationMinutes}m` : ""}
                    </div>
                  )}
                  {habit.specificTime && (
                     <div className="flex items-center"><Clock className="mr-1.5 h-3 w-3 text-muted-foreground" /> Specific Time: {habit.specificTime}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleAddAll} disabled={isLoading}>
            <CheckSquare className="mr-2 h-4 w-4" /> Add All Habits to My List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProgramSuggestionDialog;

    