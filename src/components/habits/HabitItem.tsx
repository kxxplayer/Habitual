// src/components/habits/HabitItem.tsx
"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Lightbulb, CalendarDays, Clock, Timer, CalendarClock, CalendarPlus, Share2 } from 'lucide-react';
import type { Habit } from '@/types';
import { generateICS, downloadICS } from '@/lib/calendarUtils';
import { useToast } from '@/hooks/use-toast';

interface HabitItemProps {
  habit: Habit;
  onToggleComplete: (habitId: string, date: string, completed: boolean) => void;
  onGetAISuggestion: (habit: Habit) => void;
  isCompletedToday: boolean;
}

const HabitItem: FC<HabitItemProps> = ({ habit, onToggleComplete, onGetAISuggestion, isCompletedToday }) => {
  const today = new Date().toISOString().split('T')[0];
  const { toast } = useToast();

  const handleCompletionChange = (checked: boolean) => {
    onToggleComplete(habit.id, today, checked);
  };

  const handleAddToCalendar = () => {
    try {
      const icsContent = generateICS(habit);
      // Sanitize habit name for filename
      const filename = `${habit.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_habit.ics`;
      downloadICS(filename, icsContent);
      toast({
        title: "Calendar File Generated",
        description: `"${habit.name}" has been prepared. Import it into your calendar.`,
      });
    } catch (error) {
      console.error("Error generating ICS file:", error);
      toast({
        title: "ICS Generation Error",
        description: "Could not generate calendar file. Please check console for details.",
        variant: "destructive",
      });
    }
  };

  const handleShareHabit = async () => {
    const shareText = `Check out this habit I'm tracking with Habitual!

Habit: ${habit.name}
${habit.description ? `Description: ${habit.description}\n` : ''}
Frequency: ${habit.frequency}
${habit.optimalTiming ? `Optimal Timing: ${habit.optimalTiming}\n` : ''}
${habit.duration ? `Duration: ${habit.duration}\n` : ''}
${habit.specificTime ? `Specific Time: ${habit.specificTime}\n` : ''}

Track your habits with Habitual!`;

    const copyToClipboard = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied to Clipboard", description: "Habit details copied to clipboard." });
      } catch (err) {
        console.error("Failed to copy habit details: ", err);
        toast({ title: "Copy Failed", description: "Could not copy habit details to clipboard.", variant: "destructive" });
      }
    };

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Habit: ${habit.name}`,
          text: shareText,
          // url: window.location.href, // Could be added if app is deployed and has unique URLs per habit
        });
        toast({ title: "Habit Shared!", description: "The habit details have been shared." });
      } catch (error) {
        // Check if error is due to user cancellation (AbortError)
        if ((error as DOMException).name === 'AbortError') {
          console.log("Share action was cancelled by the user.");
          // Optionally, don't toast or copy if user explicitly cancelled.
          // For now, we'll fall back to copy as per original plan for simplicity.
          copyToClipboard(shareText);
        } else {
          console.error("Error sharing habit:", error);
          copyToClipboard(shareText); // Fallback to clipboard on other errors
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const latestCompletionTimeToday = habit.completionLog
    .filter(log => log.date === today)
    .map(log => log.time)
    .sort()
    .pop();

  return (
    <Card className={`transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl ${isCompletedToday ? 'border-accent bg-green-50 dark:bg-green-900/30' : 'bg-card'}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold text-primary">{habit.name}</CardTitle>
            {habit.description && <CardDescription className="text-sm text-muted-foreground mt-1">{habit.description}</CardDescription>}
          </div>
          <div className="flex flex-col items-end space-y-1">
             <div className="flex items-center space-x-2">
                <Checkbox
                  id={`complete-${habit.id}`}
                  checked={isCompletedToday}
                  onCheckedChange={(checked) => handleCompletionChange(Boolean(checked))}
                  className={`transform scale-125 ${isCompletedToday ? 'data-[state=checked]:bg-accent data-[state=checked]:border-accent' : ''}`}
                />
                <Label htmlFor={`complete-${habit.id}`} className={`text-sm font-medium ${isCompletedToday ? 'text-accent-foreground' : 'text-foreground'}`}>
                  Done Today
                </Label>
              </div>
              {isCompletedToday && latestCompletionTimeToday && latestCompletionTimeToday !== 'N/A' && (
                <p className="text-xs text-muted-foreground">Completed at {latestCompletionTimeToday}</p>
              )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>Frequency: {habit.frequency}</span>
          </div>
          {habit.optimalTiming && (
            <div className="flex items-center">
              <CalendarClock className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Optimal Timing: {habit.optimalTiming}</span>
            </div>
          )}
          {habit.duration && (
            <div className="flex items-center">
              <Timer className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Duration: {habit.duration}</span>
            </div>
          )}
          {habit.specificTime && (
             <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Specific Time: {habit.specificTime}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:grid sm:grid-cols-3 gap-2 pt-4">
        <Button variant="outline" size="sm" onClick={() => onGetAISuggestion(habit)} className="w-full">
          <Lightbulb className="mr-2 h-4 w-4" />
          AI Suggestion
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddToCalendar} className="w-full">
          <CalendarPlus className="mr-2 h-4 w-4" />
          Add to Calendar
        </Button>
        <Button variant="outline" size="sm" onClick={handleShareHabit} className="w-full">
          <Share2 className="mr-2 h-4 w-4" />
          Share Habit
        </Button>
      </CardFooter>
    </Card>
  );
};

export default HabitItem;
