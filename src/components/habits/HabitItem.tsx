
// src/components/habits/HabitItem.tsx
"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, CalendarDays, Clock, Hourglass, CalendarClock, CalendarPlus, Share2, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import type { Habit, WeekDay } from '@/types';
import { generateICS, downloadICS } from '@/lib/calendarUtils';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { isDateInCurrentWeek, getDayAbbreviationFromDate } from '@/lib/dateUtils';


interface HabitItemProps {
  habit: Habit;
  onToggleComplete: (habitId: string, date: string, completed: boolean) => void;
  onGetAISuggestion: (habit: Habit) => void;
  isCompletedToday: boolean;
  isSelected: boolean;
  onSelectToggle: (habitId: string) => void;
}

const weekDaysOrder: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Helper to format HH:mm to h:mm AM/PM or return original if not HH:mm
const formatSpecificTime = (timeStr?: string): string | undefined => {
  if (!timeStr || timeStr.toLowerCase() === "anytime" || timeStr.toLowerCase() === "flexible") return timeStr;
  try {
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, 'h:mm a');
    }
  } catch (e) { /* Fallback to original string if parsing fails */ }
  return timeStr; // Return original if not in HH:mm or if parsing fails
};

const HabitItem: FC<HabitItemProps> = ({ habit, onToggleComplete, onGetAISuggestion, isCompletedToday, isSelected, onSelectToggle }) => {
  const todayString = new Date().toISOString().split('T')[0];
  const { toast } = useToast();

  const handleToggleDailyCompletion = () => {
    onToggleComplete(habit.id, todayString, !isCompletedToday);
  };

  const handleAddToCalendar = () => {
    try {
      const icsContent = generateICS(habit);
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
    const sortedDays = habit.daysOfWeek.sort((a, b) => weekDaysOrder.indexOf(a) - weekDaysOrder.indexOf(b));
    const daysText = sortedDays.length === 7 ? "Daily" : sortedDays.join(', ');

    let durationText = '';
    if (habit.durationHours && habit.durationHours > 0) {
      durationText += `${habit.durationHours} hr` + (habit.durationHours > 1 ? 's' : '');
    }
    if (habit.durationMinutes && habit.durationMinutes > 0) {
      if (durationText) durationText += ' ';
      durationText += `${habit.durationMinutes} min`;
    }

    const shareText = `Check out this habit I'm tracking with Habitual!

Habit: ${habit.name}
${habit.description ? `Description: ${habit.description}\n` : ''}
Days: ${daysText}
${habit.optimalTiming ? `Optimal Timing: ${habit.optimalTiming}\n` : ''}
${durationText ? `Duration: ${durationText}\n` : ''}
${habit.specificTime ? `Specific Time: ${formatSpecificTime(habit.specificTime)}\n` : ''}

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
        });
        toast({ title: "Habit Shared!", description: "The habit details have been shared." });
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') {
          console.log("Share action was cancelled by the user. Copying to clipboard.");
          copyToClipboard(shareText);
        } else {
          console.error("Error sharing habit, falling back to clipboard copy:", error);
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const latestCompletionTimeToday = habit.completionLog
    .filter(log => log.date === todayString)
    .map(log => log.time)
    .sort()
    .pop();

  const displayDays = habit.daysOfWeek.sort((a, b) => weekDaysOrder.indexOf(a) - weekDaysOrder.indexOf(b)).join(', ');

  let durationDisplay = '';
  if (habit.durationHours && habit.durationHours > 0) {
    durationDisplay += `${habit.durationHours} hr` + (habit.durationHours > 1 ? 's' : '');
  }
  if (habit.durationMinutes && habit.durationMinutes > 0) {
    if (durationDisplay) durationDisplay += ' ';
    durationDisplay += `${habit.durationMinutes} min`;
  }
  const formattedSpecificTime = formatSpecificTime(habit.specificTime);

  // Weekly Progress Calculation
  const scheduledDaysInWeek = habit.daysOfWeek.length;
  let completedCountInCurrentWeek = 0;
  if (scheduledDaysInWeek > 0) {
    const completedOnScheduledDaysThisWeek = new Set<string>(); // Tracks 'YYYY-MM-DD' of completions
    habit.completionLog.forEach(log => {
      if (isDateInCurrentWeek(log.date)) {
        try {
            const completionDateObj = parseISO(log.date + 'T00:00:00Z'); // Treat as UTC date part
            const dayOfCompletion = getDayAbbreviationFromDate(completionDateObj);
            if (habit.daysOfWeek.includes(dayOfCompletion)) {
                completedOnScheduledDaysThisWeek.add(log.date);
            }
        } catch (e) {
            console.error("Error parsing log date for weekly progress:", log.date, e);
        }
      }
    });
    completedCountInCurrentWeek = completedOnScheduledDaysThisWeek.size;
  }
  
  const weeklyProgressPercent = scheduledDaysInWeek > 0 ? (completedCountInCurrentWeek / scheduledDaysInWeek) * 100 : 0;

  return (
    <Card className={`relative transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl ${isCompletedToday ? 'border-accent bg-green-50 dark:bg-green-900/30' : 'bg-card'} ${isSelected ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background' : ''}`}>
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          id={`select-${habit.id}`}
          checked={isSelected}
          onCheckedChange={() => onSelectToggle(habit.id)}
          aria-label={`Select habit ${habit.name}`}
          className="transform scale-110 border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>
      <CardHeader className="pt-3 pl-12">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold text-primary">
              {habit.name}
            </CardTitle>
            {habit.description && <CardDescription className="text-sm text-muted-foreground mt-1">{habit.description}</CardDescription>}
          </div>
          <div className="flex flex-col items-center space-y-1 text-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleToggleDailyCompletion} 
              className="rounded-full p-0 h-10 w-10 group"
              aria-label={isCompletedToday ? `Mark ${habit.name} as not done for today` : `Mark ${habit.name} as done for today`}
            >
              {isCompletedToday ? (
                <CheckCircle2 className="h-8 w-8 text-accent group-hover:text-accent/90 transition-colors" />
              ) : (
                <Circle className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </Button>
            {isCompletedToday && latestCompletionTimeToday && latestCompletionTimeToday !== 'N/A' && (
              <p className="text-xs text-muted-foreground">at {latestCompletionTimeToday}</p>
            )}
            <p className={`text-xs font-medium ${isCompletedToday ? 'text-accent' : 'text-muted-foreground'}`}>
              {isCompletedToday ? "Completed!" : "Mark Done"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pl-12 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center col-span-full sm:col-span-1">
            <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0 text-primary/80" />
            <span>Days: {displayDays.length > 0 ? displayDays : 'Not specified'}</span>
          </div>
          {habit.optimalTiming && (
            <div className="flex items-center">
              <CalendarClock className="mr-2 h-4 w-4 flex-shrink-0 text-primary/80" />
              <span>Timing: {habit.optimalTiming}</span>
            </div>
          )}
          {durationDisplay && (
            <div className="flex items-center">
              <Hourglass className="mr-2 h-4 w-4 flex-shrink-0 text-primary/80" />
              <span>Duration: {durationDisplay}</span>
            </div>
          )}
          {formattedSpecificTime && (
             <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 flex-shrink-0 text-primary/80" />
              <span>Time: {formattedSpecificTime}</span>
            </div>
          )}
        </div>

        {habit.daysOfWeek && habit.daysOfWeek.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex justify-between items-center text-xs font-medium text-muted-foreground mb-1">
              <span className="flex items-center"><TrendingUp className="mr-1.5 h-3.5 w-3.5 text-primary/90" />Weekly Goal</span>
              <span>{completedCountInCurrentWeek} / {scheduledDaysInWeek} days</span>
            </div>
            <Progress 
              value={weeklyProgressPercent} 
              indicatorClassName="bg-accent" 
              className="h-2" 
              aria-label={`Weekly progress: ${completedCountInCurrentWeek} of ${scheduledDaysInWeek} days completed`}
            />
          </div>
        )}

      </CardContent>
      <CardFooter className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4 pl-12 pb-4">
        <Button variant="outline" size="sm" onClick={() => onGetAISuggestion(habit)} className="w-full">
          <Lightbulb className="mr-2 h-4 w-4" />
          AI Tip
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddToCalendar} className="w-full">
          <CalendarPlus className="mr-2 h-4 w-4" />
          To Calendar
        </Button>
        <Button variant="outline" size="sm" onClick={handleShareHabit} className="w-full">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </CardFooter>
    </Card>
  );
};

export default HabitItem;
