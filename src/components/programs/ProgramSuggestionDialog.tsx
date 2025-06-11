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
import { CheckSquare, Sparkles, Tag, CalendarDays as CalendarIcon, Clock, Hourglass, ListChecks, Droplets, Bed, BookOpenText, HeartPulse, Briefcase, Paintbrush, Home as HomeIconLucide, Landmark, Users, Smile as LifestyleIcon, Sparkles as SparklesIconLucide } from 'lucide-react';
import type { GenerateHabitProgramOutput, SuggestedProgramHabit } from '@/ai/flows/generate-habit-program-flow'; 
import { HABIT_CATEGORIES, type HabitCategory, type WeekDay } from '@/types'; 
import { cn } from '@/lib/utils';

interface ProgramSuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  programSuggestion: GenerateHabitProgramOutput | null;
  onAddProgramHabits: (habits: SuggestedProgramHabit[]) => void; 
  isLoading?: boolean;
}

const getSuggestedHabitIcon = (habit: SuggestedProgramHabit): React.ReactNode => {
  const nameLower = habit.name.toLowerCase();
  if (nameLower.includes('gym') || nameLower.includes('workout')) return <span className="text-lg">🏋️</span>;
  if (nameLower.includes('sql') || nameLower.includes('code') || nameLower.includes('python')) return <span className="text-lg">💻</span>;
  if (nameLower.includes('walk') || nameLower.includes('run') || nameLower.includes('jog')) return <span className="text-lg">🚶</span>;
  if (nameLower.includes('read') || nameLower.includes('book')) return <span className="text-lg">📚</span>;
  if (nameLower.includes('meditate') || nameLower.includes('mindfulness')) return <span className="text-lg">🧘</span>;
  if (nameLower.includes('learn') || nameLower.includes('study')) return <Briefcase className="h-4 w-4 text-blue-600" />;
  if (nameLower.includes('water') || nameLower.includes('hydrate')) return <Droplets className="h-4 w-4 text-blue-500" />;
  if (nameLower.includes('sleep') || nameLower.includes('bed')) return <Bed className="h-4 w-4 text-purple-500" />;
  if (nameLower.includes('journal') || nameLower.includes('write')) return <BookOpenText className="h-4 w-4 text-yellow-600" />;
  if (nameLower.includes('stretch') || nameLower.includes('yoga')) return <HeartPulse className="h-4 w-4 text-red-500" />;

  if (habit.category) {
    // FIX: Corrected category names to match the HABIT_CATEGORIES type
    switch (habit.category) {
      case 'Health & Wellness': return <HeartPulse className="h-4 w-4 text-red-500" />;
      case 'Work/Study': return <Briefcase className="h-4 w-4 text-blue-600" />;
      case 'Creative': return <Paintbrush className="h-4 w-4 text-orange-500" />;
      case 'Chores': return <HomeIconLucide className="h-4 w-4 text-green-600" />;
      case 'Finance': return <Landmark className="h-4 w-4 text-indigo-500" />;
      case 'Social': return <Users className="h-4 w-4 text-pink-500" />;
      case 'Personal Growth': return <SparklesIconLucide className="h-4 w-4 text-yellow-500" />;
      case 'Lifestyle': return <LifestyleIcon className="h-4 w-4 text-teal-500" />;
      default: return <ListChecks className="h-4 w-4 text-muted-foreground" />;
    }
  }
  return <ListChecks className="h-4 w-4 text-muted-foreground" />;
};


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
              <Card key={index} className="bg-input/30 shadow-sm">
                <CardHeader className="pb-1.5 pt-2.5 px-3">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
                      {getSuggestedHabitIcon(habit)}
                    </div>
                    <CardTitle className="text-md font-semibold flex-grow">{habit.name}</CardTitle>
                  </div>
                  {habit.description && <CardDescription className="text-xs mt-0.5 ml-7">{habit.description}</CardDescription>}
                </CardHeader>
                <CardContent className="text-xs space-y-0.5 px-3 pb-2.5 ml-7">
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
                  {habit.specificTime && habit.specificTime.toLowerCase() !== "anytime" && habit.specificTime.toLowerCase() !== "flexible" && (
                     <div className="flex items-center"><Clock className="mr-1.5 h-3 w-3 text-muted-foreground" /> Specific Time: {habit.specificTime}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading} onClick={onClose}>
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
