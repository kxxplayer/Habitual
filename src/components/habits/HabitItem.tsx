
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
import { isDateInCurrentWeek, getDayAbbreviationFromDate, calculateStreak, getCurrentWeekDays, WeekDayInfo } from '@/lib/dateUtils';


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
  const [weekViewDays, setWeekViewDays] = React.useState<WeekDayInfo[]>([]);
  const [showSparkles, setShowSparkles] = React.useState(false);

  React.useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setWeekViewDays(getCurrentWeekDays(now));
  }, [todayString]); 

  const streak = calculateStreak(habit, currentDate);

  const handleToggleDailyCompletion = () => {
    const newCompletedState = !isCompletedToday;
    onToggleComplete(habit.id, todayString, newCompletedState);
    if (newCompletedState) {
      setShowSparkles(true);
      // Sound playing would also go here if implemented
      // Example: new Audio('/sounds/completion-chime.mp3').play();
      setTimeout(() => {
        setShowSparkles(false);
      }, 1000); 
    }
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
      <div className="absolute top-3 right-3 z-10"> {/* Changed left-3 to right-3 */}
        <Checkbox
          id={`select-${habit.id}`}
          checked={isSelected}
          onCheckedChange={() => onSelectToggle(habit.id)}
          aria-label={`Select habit ${habit.name}`}
          className="transform scale-110 border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>
      <CardHeader className="pt-3 pb-2 px-3 sm:px-4 pr-12"> {/* Changed pl-12 to pr-12 */}
        <div className="flex justify-between items-start">
          <div className="flex-grow"> {/* Removed mr-2 */}
            <div className="flex items-center gap-2 mb-0.5">
              <CardTitle className="text-lg sm:text-xl font-semibold text-primary min-w-0 break-words"> {/* Added min-w-0 break-words */}
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
            {habit.description && <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{habit.description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-4 pb-3 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center col-span-full sm:col-span-1">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-primary/80" />
            <span>Days: {displayDays.length > 0 ? displayDays : 'Not specified'}</span>
          </div>
          {habit.optimalTiming && (
            <div className="flex items-center">
              <CalendarClock className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-primary/80" />
              <span>Timing: {habit.optimalTiming}</span>
            </div>
          )}
          {durationDisplay && (
            <div className="flex items-center">
              <Hourglass className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-primary/80" />
              <span>Duration: {durationDisplay}</span>
            </div>
          )}
          {formattedSpecificTime && (
             <div className="flex items-center">
              <Clock className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-primary/80" />
              <span>Time: {formattedSpecificTime}</span>
            </div>
          )}
        </div>

        {weekViewDays.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">This Week</p>
            <div className="flex justify-around items-center space-x-1">
              {weekViewDays.map((dayInfo) => {
                const isScheduled = habit.daysOfWeek.includes(dayInfo.dayAbbrFull);
                const isCompleted = isScheduled && habit.completionLog.some(log => log.date === dayInfo.dateStr);
                const isMissed = isScheduled && !isCompleted && dayInfo.isPast;

                let bgColor = 'bg-input/30'; 
                let textColor = 'text-muted-foreground/70';

                if (isScheduled) {
                  if (isCompleted) {
                    bgColor = 'bg-accent';
                    textColor = 'text-accent-foreground';
                  } else if (isMissed) {
                    bgColor = 'bg-destructive';
                    textColor = 'text-destructive-foreground';
                  } else { 
                    bgColor = 'bg-muted';
                    textColor = 'text-muted-foreground';
                  }
                }
                
                return (
                  <div
                    key={dayInfo.dateStr}
                    title={`${dayInfo.dayAbbrFull} - ${format(dayInfo.date, 'MMM d')}${isScheduled ? (isCompleted ? ' (Completed)' : (isMissed ? ' (Missed)' : ' (Pending)')) : ' (Not Scheduled)'}`}
                    className={`flex flex-col items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-md text-xs font-medium transition-all ${bgColor} ${textColor} ${dayInfo.isToday ? 'ring-2 ring-primary/70 ring-offset-1 ring-offset-background' : ''}`}
                  >
                    {dayInfo.dayAbbrShort}
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {habit.daysOfWeek && habit.daysOfWeek.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
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
      <CardFooter className="flex flex-col items-stretch pt-2 pb-3 px-3">
        <div className="relative sparkle-container w-full">
          <Button
            variant={isCompletedToday ? "default" : "outline"}
            size="lg"
            onClick={handleToggleDailyCompletion}
            className={`w-full font-semibold text-base h-11 transform transition-transform active:scale-95 ${isCompletedToday ? 'bg-accent hover:bg-accent/90 text-accent-foreground border-accent' : 'border-primary/50 text-primary hover:bg-primary/10'}`}
            aria-label={isCompletedToday ? `Mark ${habit.name} as not done for today` : `Mark ${habit.name} as done for today`}
          >
            {isCompletedToday ? (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            ) : (
              <Circle className="mr-2 h-5 w-5" />
            )}
            {isCompletedToday ? "Completed!" : "Mark as Done"}
          </Button>
          {showSparkles && (
            <>
              <div className="sparkle sparkle-1" style={{ ['--tx' as any]: '-10px', ['--ty' as any]: '-20px' }}></div>
              <div className="sparkle sparkle-2" style={{ ['--tx' as any]: '10px', ['--ty' as any]: '-20px' }}></div>
              <div className="sparkle sparkle-3" style={{ ['--tx' as any]: '-15px', ['--ty' as any]: '0px' }}></div>
              <div className="sparkle sparkle-4" style={{ ['--tx' as any]: '15px', ['--ty' as any]: '0px' }}></div>
              <div className="sparkle sparkle-5" style={{ ['--tx' as any]: '0px', ['--ty' as any]: '-25px' }}></div>
              <div className="sparkle sparkle-6" style={{ ['--tx' as any]: '5px', ['--ty' as any]: '15px', backgroundColor: 'hsl(var(--primary))' }}></div>
            </>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-2 min-h-[20px]">
          <div className="text-xs text-muted-foreground">
            {isCompletedToday && latestCompletionTimeToday && latestCompletionTimeToday !== 'N/A' && (
              <span className="flex items-center">
                <Clock className="mr-1 h-3 w-3" />
                <span>at {latestCompletionTimeToday}</span>
                {hasNoteToday && (
                  <StickyNote className="ml-2 h-3 w-3 text-blue-500" title="Reflection note added" />
                )}
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
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
        </div>
      </CardFooter>
    </Card>
  );
};

export default HabitItem;
