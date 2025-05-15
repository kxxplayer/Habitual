
// src/components/habits/HabitItem.tsx
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Lightbulb, CalendarDays, Clock, Hourglass, CalendarClock, CalendarPlus, Share2, CheckCircle2, Circle, TrendingUp, Flame, MoreHorizontal, MessageSquarePlus, StickyNote } from 'lucide-react';
import type { Habit, WeekDay } from '@/types';
import { generateICS, downloadICS } from '@/lib/calendarUtils';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { isDateInCurrentWeek, getDayAbbreviationFromDate, calculateStreak } from '@/lib/dateUtils';


interface HabitItemProps {
  habit: Habit;
  onToggleComplete: (habitId: string, date: string, completed: boolean) => void;
  onGetAISuggestion: (habit: Habit) => void;
  onOpenReflectionDialog: (habitId: string, date: string, habitName: string) => void;
  isCompletedToday: boolean;
  isSelected: boolean;
  onSelectToggle: (habitId: string) => void;
}

const weekDaysOrder: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  } catch (e) { /* Fallback */ }
  return timeStr;
};

const HabitItem: FC<HabitItemProps> = ({ 
    habit, 
    onToggleComplete, 
    onGetAISuggestion, 
    onOpenReflectionDialog,
    isCompletedToday, 
    isSelected, 
    onSelectToggle 
}) => {
  const todayString = new Date().toISOString().split('T')[0];
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = React.useState(new Date()); 

  React.useEffect(() => {
    setCurrentDate(new Date());
  }, [todayString]);

  const streak = calculateStreak(habit, currentDate);

  const handleToggleDailyCompletion = () => {
    onToggleComplete(habit.id, todayString, !isCompletedToday);
  };

  const handleAddToCalendar = () => {
    try {
      const icsContent = generateICS(habit);
      const filename = `${habit.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_habit.ics`;
      downloadICS(filename, icsContent);
      toast({
        title: "Added to calendar!",
        description: `The .ics file for "${habit.name}" has been generated. You can import it into Google Calendar or your preferred calendar app.`,
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
    if (habit.durationHours && habit.durationHours > 0) durationText += `${habit.durationHours} hr` + (habit.durationHours > 1 ? 's' : '');
    if (habit.durationMinutes && habit.durationMinutes > 0) {
      if (durationText) durationText += ' ';
      durationText += `${habit.durationMinutes} min`;
    }
    const shareText = `Check out this habit I'm tracking with Habitual!\n\nHabit: ${habit.name}\n${habit.description ? `Description: ${habit.description}\n` : ''}Days: ${daysText}\n${habit.optimalTiming ? `Optimal Timing: ${habit.optimalTiming}\n` : ''}${durationText ? `Duration: ${durationText}\n` : ''}${habit.specificTime ? `Specific Time: ${formatSpecificTime(habit.specificTime)}\n` : ''}${streak > 0 ? `Current Streak: ${streak} day(s)!\n` : ''}Track your habits with Habitual!`;
    const copyToClipboard = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied to Clipboard", description: "Habit details copied to clipboard." });
      } catch (err) {
        toast({ title: "Copy Failed", description: "Could not copy habit details.", variant: "destructive" });
      }
    };
    if (navigator.share) {
      try {
        await navigator.share({ title: `Habit: ${habit.name}`, text: shareText });
        toast({ title: "Habit Shared!", description: "The habit details have been shared." });
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') copyToClipboard(shareText);
        else copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const todaysCompletionLog = habit.completionLog.find(log => log.date === todayString);
  const latestCompletionTimeToday = todaysCompletionLog?.time;
  const hasNoteToday = !!todaysCompletionLog?.note;

  const displayDays = habit.daysOfWeek.sort((a, b) => weekDaysOrder.indexOf(a) - weekDaysOrder.indexOf(b)).join(', ');
  let durationDisplay = '';
  if (habit.durationHours && habit.durationHours > 0) durationDisplay += `${habit.durationHours} hr` + (habit.durationHours > 1 ? 's' : '');
  if (habit.durationMinutes && habit.durationMinutes > 0) {
    if (durationDisplay) durationDisplay += ' ';
    durationDisplay += `${habit.durationMinutes} min`;
  }
  const formattedSpecificTime = formatSpecificTime(habit.specificTime);

  const scheduledDaysInWeek = habit.daysOfWeek.length;
  let completedCountInCurrentWeek = 0;
  if (scheduledDaysInWeek > 0) {
    const completedOnScheduledDaysThisWeek = new Set<string>();
    habit.completionLog.forEach(log => {
      if (isDateInCurrentWeek(log.date, currentDate)) {
        try {
            const completionDateObj = parseISO(log.date + 'T00:00:00Z');
            const dayOfCompletion = getDayAbbreviationFromDate(completionDateObj);
            if (habit.daysOfWeek.includes(dayOfCompletion)) completedOnScheduledDaysThisWeek.add(log.date);
        } catch (e) { console.error("Error parsing log date for weekly progress:", log.date, e); }
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
          <div className="flex-grow mr-2">
            <div className="flex items-center gap-2 mb-0.5">
              <CardTitle className="text-xl font-semibold text-primary">
                {habit.name}
              </CardTitle>
              {streak > 0 ? (
                <div className="flex items-center text-orange-500 animate-pulse" title={`Current streak: ${streak} days`}>
                  <Flame className="h-5 w-5" />
                  <span className="ml-1 text-sm font-semibold">{streak}</span>
                </div>
              ) : (
                <div className="flex items-center text-muted-foreground opacity-60" title="No active streak">
                  <Flame className="h-5 w-5" />
                   <span className="ml-1 text-sm font-semibold">0</span>
                </div>
              )}
            </div>
            {habit.description && <CardDescription className="text-sm text-muted-foreground mt-1">{habit.description}</CardDescription>}
          </div>
          <div className="flex flex-col items-center space-y-1 text-center flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleDailyCompletion}
              className="rounded-full p-0 h-10 w-10 group transform transition-transform active:scale-95"
              aria-label={isCompletedToday ? `Mark ${habit.name} as not done for today` : `Mark ${habit.name} as done for today`}
            >
              {isCompletedToday ? (
                <CheckCircle2 className="h-8 w-8 text-accent group-hover:text-accent/90 transition-colors" />
              ) : (
                <Circle className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </Button>
            <div className="flex items-center space-x-1">
              {isCompletedToday && latestCompletionTimeToday && latestCompletionTimeToday !== 'N/A' && (
                <p className="text-xs text-muted-foreground">at {latestCompletionTimeToday}</p>
              )}
              {isCompletedToday && hasNoteToday && (
                <StickyNote className="h-3 w-3 text-blue-500" title="Reflection note added" />
              )}
            </div>
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
      <CardFooter className="flex justify-end pt-3 pb-3 pl-12 pr-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isCompletedToday && (
              <DropdownMenuItem onClick={() => onOpenReflectionDialog(habit.id, todayString, habit.name)}>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                <span>{hasNoteToday ? "Edit Reflection" : "Add Reflection"}</span>
              </DropdownMenuItem>
            )}
            {isCompletedToday && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => onGetAISuggestion(habit)}>
              <Lightbulb className="mr-2 h-4 w-4" />
              <span>AI Tip</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddToCalendar}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              <span>Add to GCal</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareHabit}>
              <Share2 className="mr-2 h-4 w-4" />
              <span>Share</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
};

export default HabitItem;
