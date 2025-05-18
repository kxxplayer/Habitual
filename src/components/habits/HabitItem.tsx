
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
import { 
  Lightbulb, CalendarDays, Clock, Hourglass, CalendarClock, CalendarPlus, Share2, CheckCircle2, Circle, TrendingUp, Flame, MoreHorizontal, MessageSquarePlus, StickyNote, Tag,
  ListChecks, // Generic fallback
  Droplets, // For water/hydrate
  Bed, // For sleep
  BookOpenText, // For journal/reading
  HeartPulse, // For Health & Wellness
  Briefcase, // For Work/Study
  Paintbrush, // For Creative
  Home as HomeIcon, // For Chores (alias as HomeIcon to avoid conflict with Home from main page)
  Landmark, // For Finance
  Users, // For Social
  Smile as LifestyleIcon, // For Lifestyle (aliased)
  Sparkles as SparklesIcon, // for Personal Growth & sparkle animation (alias if needed)
  CalendarX // for skipped
} from 'lucide-react';
import type { Habit, WeekDay, HabitCategory, HabitCompletionLogEntry } from '@/types';
import { HABIT_CATEGORIES } from '@/types';
import { generateICS, downloadICS } from '@/lib/calendarUtils';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { isDateInCurrentWeek, getDayAbbreviationFromDate, calculateStreak, getCurrentWeekDays, WeekDayInfo } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';


interface HabitItemProps {
  habit: Habit;
  onToggleComplete: (habitId: string, date: string, completed: boolean) => void;
  onGetAISuggestion: (habit: Habit) => void;
  onOpenReflectionDialog: (habitId: string, date: string, habitName: string) => void;
  onOpenRescheduleDialog: (habit: Habit, missedDate: string) => void;
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

const categoryColorMap: Record<HabitCategory, string> = {
  "Lifestyle": "--chart-1",
  "Work/Study": "--chart-2",
  "Health & Wellness": "--chart-3",
  "Creative": "--chart-4",
  "Chores": "--chart-5",
  "Finance": "--chart-1", 
  "Social": "--chart-2",
  "Personal Growth": "--chart-3",
  "Other": "--chart-5",
};

const getCategoryColorVariable = (category?: HabitCategory): string => {
  if (category && categoryColorMap[category]) {
    return categoryColorMap[category];
  }
  return categoryColorMap["Other"]; 
};

const getHabitIcon = (habit: Habit): React.ReactNode => {
  const nameLower = habit.name.toLowerCase();
  const category = habit.category;

  if (nameLower.includes('gym') || nameLower.includes('workout') || nameLower.includes('exercise')) return <span className="text-xl mr-1.5 rtl:ml-1.5 rtl:mr-0">🏋️</span>;
  if (nameLower.includes('sql') || nameLower.includes('code') || nameLower.includes('programming') || nameLower.includes('develop')) return <span className="text-xl mr-1.5 rtl:ml-1.5 rtl:mr-0">💻</span>;
  if (nameLower.includes('walk') || nameLower.includes('run') || nameLower.includes('jog')) return <span className="text-xl mr-1.5 rtl:ml-1.5 rtl:mr-0">🚶</span>;
  if (nameLower.includes('read') || nameLower.includes('book')) return <span className="text-xl mr-1.5 rtl:ml-1.5 rtl:mr-0">📚</span>;
  if (nameLower.includes('meditate') || nameLower.includes('meditation') || nameLower.includes('mindfulness')) return <span className="text-xl mr-1.5 rtl:ml-1.5 rtl:mr-0">🧘</span>;
  
  if (nameLower.includes('water') || nameLower.includes('hydrate')) return <Droplets className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-blue-500" />;
  if (nameLower.includes('sleep') || nameLower.includes('bed')) return <Bed className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-purple-500" />;
  if (nameLower.includes('journal') || nameLower.includes('write')) return <BookOpenText className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-yellow-600" />;
  if (nameLower.includes('learn') || nameLower.includes('study')) return <Briefcase className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-blue-600" />;
  if (nameLower.includes('stretch') || nameLower.includes('yoga')) return <HeartPulse className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-red-500" />;

  switch (category) {
    case 'Health & Wellness': return <HeartPulse className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-red-500" />;
    case 'Work/Study': return <Briefcase className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-blue-600" />;
    case 'Creative': return <Paintbrush className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-orange-500" />;
    case 'Chores': return <HomeIcon className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-green-600" />;
    case 'Finance': return <Landmark className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-indigo-500" />;
    case 'Social': return <Users className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-pink-500" />;
    case 'Personal Growth': return <SparklesIcon className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-yellow-500" />;
    case 'Lifestyle': return <LifestyleIcon className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-teal-500" />;
    default: return <ListChecks className="mr-1.5 rtl:ml-1.5 rtl:mr-0 h-5 w-5 text-muted-foreground" />;
  }
};


const HabitItem: FC<HabitItemProps> = ({
    habit,
    onToggleComplete,
    onGetAISuggestion,
    onOpenReflectionDialog,
    onOpenRescheduleDialog,
    isCompletedToday, // This specifically refers to status === 'completed' for today
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
  const todaysLogEntry = habit.completionLog.find(log => log.date === todayString);
  // isCompletedToday prop is based on status='completed'. For button state, check any relevant status.
  const isTodayInteracted = !!todaysLogEntry && (todaysLogEntry.status === 'completed' || todaysLogEntry.status === 'pending_makeup');
  
  const handleToggleDailyCompletion = () => {
    const newCompletedState = !(todaysLogEntry && todaysLogEntry.status === 'completed');
    onToggleComplete(habit.id, todayString, newCompletedState);

    if (newCompletedState) {
      setShowSparkles(true);
      setTimeout(() => setShowSparkles(false), 1000);
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
    const shareText = `Check out this habit I'm tracking with Habitual!\n\nHabit: ${habit.name}\n${habit.description ? `Description: ${habit.description}\n` : ''}${habit.category ? `Category: ${habit.category}\n` : ''}Days: ${daysText}\n${habit.optimalTiming ? `Optimal Timing: ${habit.optimalTiming}\n` : ''}${durationText ? `Duration: ${durationText}\n` : ''}${habit.specificTime ? `Specific Time: ${formatSpecificTime(habit.specificTime)}\n` : ''}${streak > 0 ? `Current Streak: ${streak} day(s)!\n` : ''}Track your habits with Habitual!`;
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

  const latestCompletionTimeToday = todaysLogEntry?.time;
  const hasNoteToday = !!todaysLogEntry?.note;

  const displayDays = habit.daysOfWeek.sort((a, b) => weekDaysOrder.indexOf(a) - weekDaysOrder.indexOf(b)).join(', ');
  let durationDisplay = '';
  if (habit.durationHours && habit.durationHours > 0) durationDisplay += `${habit.durationHours} hr` + (habit.durationHours > 1 ? 's' : '');
  if (habit.durationMinutes && habit.durationMinutes > 0) {
    if (durationDisplay) durationDisplay += ' ';
    durationDisplay += `${habit.durationMinutes} min`;
  }
  const formattedSpecificTime = formatSpecificTime(habit.specificTime);

  let completedCountInCurrentWeek = 0;
  const scheduledDaysInWeek = habit.daysOfWeek.length;
  if (scheduledDaysInWeek > 0) {
    const completedOnScheduledDaysThisWeek = new Set<string>();
    habit.completionLog.forEach(log => {
      if (isDateInCurrentWeek(log.date, currentDate) && log.status === 'completed') {
        try {
            const completionDateObj = parseISO(log.date + 'T00:00:00Z');
            const dayOfCompletion = getDayAbbreviationFromDate(completionDateObj);
            // Count completion if it's a normally scheduled day OR if it was a makeup for a scheduled day.
            if (habit.daysOfWeek.includes(dayOfCompletion) || (log.originalMissedDate && habit.daysOfWeek.includes(getDayAbbreviationFromDate(parseISO(log.originalMissedDate + 'T00:00:00Z'))))) {
              completedOnScheduledDaysThisWeek.add(log.date);
            }
        } catch (e) { console.error("Error parsing log date for weekly progress:", log.date, e); }
      }
    });
    completedCountInCurrentWeek = completedOnScheduledDaysThisWeek.size;
  }
  const weeklyProgressPercent = scheduledDaysInWeek > 0 ? (completedCountInCurrentWeek / scheduledDaysInWeek) * 100 : 0;

  const cardStyle: React.CSSProperties = {};
  let cardClasses = `relative transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl ${isSelected ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background' : ''}`;

  if (isCompletedToday) {
    cardClasses = cn(cardClasses, 'border-accent bg-green-50 dark:bg-green-900/30');
  } else {
    const categoryColorVar = getCategoryColorVariable(habit.category);
    cardStyle.borderLeftColor = `hsl(var(${categoryColorVar}))`;
    cardStyle['--category-color-var' as any] = `var(${categoryColorVar})`;
    cardClasses = cn(cardClasses, 'border-l-4');
  }
  cardClasses = cn(cardClasses, 'bg-card');

  return (
    <Card className={cardClasses} style={cardStyle}>
      <div className="absolute top-3 right-3 z-10">
        <Checkbox
          id={`select-${habit.id}`}
          checked={isSelected}
          onCheckedChange={() => onSelectToggle(habit.id)}
          aria-label={`Select habit ${habit.name}`}
          className="transform scale-110 border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>
      <CardHeader className="pt-3 pb-2 px-3 sm:px-4 pr-12">
        <div className="flex justify-between items-start">
          <div className="flex-grow">
             <div className="flex items-center gap-1 mb-0.5">
              {getHabitIcon(habit)}
              <CardTitle className="text-lg sm:text-xl font-semibold text-primary min-w-0 break-words">
                {habit.name}
              </CardTitle>
              {streak > 0 ? (
                <div className="flex items-center text-orange-500 animate-pulse ml-1" title={`Current streak: ${streak} days`}>
                  <Flame className="h-5 w-5" />
                  <span className="ml-1 text-sm font-semibold">{streak}</span>
                </div>
              ) : (
                <div className="flex items-center text-muted-foreground opacity-60 ml-1" title="No active streak">
                  <Flame className="h-5 w-5" />
                   <span className="ml-1 text-sm font-semibold">0</span>
                </div>
              )}
            </div>
            {habit.description && <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{habit.description}</CardDescription>}
             {habit.category && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Tag className="mr-1 h-3 w-3 text-primary/70" />
                <span>{habit.category}</span>
              </div>
            )}
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
                const dayLog = habit.completionLog.find(log => log.date === dayInfo.dateStr);
                const isScheduled = habit.daysOfWeek.includes(dayInfo.dayAbbrFull);
                
                let dayStatus: 'completed' | 'skipped' | 'pending_makeup' | 'missed' | 'pending_scheduled' | 'not_scheduled' = 'not_scheduled';
                let isClickableForReschedule = false;

                if (dayLog) {
                  if (dayLog.status === 'completed') dayStatus = 'completed';
                  else if (dayLog.status === 'skipped') dayStatus = 'skipped';
                  else if (dayLog.status === 'pending_makeup') dayStatus = 'pending_makeup';
                } else if (isScheduled) {
                  if (dayInfo.isPast) {
                    dayStatus = 'missed';
                    isClickableForReschedule = true; // Only truly missed days can be rescheduled
                  } else {
                    dayStatus = 'pending_scheduled';
                  }
                }

                let dayBgColor = 'bg-input/30';
                let dayTextColor = 'text-muted-foreground/70';
                let titleText = `${dayInfo.dayAbbrFull} - ${format(dayInfo.date, 'MMM d')}`;

                switch(dayStatus) {
                  case 'completed':
                    dayBgColor = 'bg-accent'; dayTextColor = 'text-accent-foreground'; titleText += ' (Completed)'; break;
                  case 'skipped':
                    dayBgColor = 'bg-muted'; dayTextColor = 'text-muted-foreground'; titleText += ' (Skipped)'; break;
                  case 'pending_makeup':
                    dayBgColor = 'bg-blue-500'; dayTextColor = 'text-white'; titleText += ' (Makeup Pending)'; break;
                  case 'missed':
                    dayBgColor = 'bg-destructive'; dayTextColor = 'text-destructive-foreground'; titleText += ' (Missed)'; break;
                  case 'pending_scheduled':
                    dayBgColor = 'bg-muted'; dayTextColor = 'text-muted-foreground'; titleText += ' (Pending)'; break;
                  default: // not_scheduled
                    titleText += ' (Not Scheduled)'; break;
                }
                
                const dayElement = (
                  <div
                    key={dayInfo.dateStr}
                    title={titleText}
                    className={cn(
                      `flex flex-col items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-md text-xs font-medium transition-all ${dayBgColor} ${dayTextColor}`,
                      dayInfo.isToday ? 'ring-2 ring-primary/70 ring-offset-1 ring-offset-background' : '',
                      isClickableForReschedule ? 'cursor-pointer hover:opacity-80' : ''
                    )}
                    onClick={isClickableForReschedule ? () => onOpenRescheduleDialog(habit, dayInfo.dateStr) : undefined}
                  >
                    {dayInfo.dayAbbrShort}
                  </div>
                );
                return dayElement;
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
            className={cn(
                `w-full font-semibold text-base h-11 transform transition-transform active:scale-95`,
                isCompletedToday ? 'bg-accent hover:bg-accent/90 text-accent-foreground border-accent' 
                                 : (todaysLogEntry?.status === 'pending_makeup' ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' 
                                                                               : 'border-primary/50 text-primary hover:bg-primary/10')
            )}
            aria-label={isCompletedToday ? `Mark ${habit.name} as not done for today` : (todaysLogEntry?.status === 'pending_makeup' ? `Complete makeup for ${habit.name}` : `Mark ${habit.name} as done for today`)}
          >
            {isCompletedToday ? <CheckCircle2 className="mr-2 h-5 w-5" /> : (todaysLogEntry?.status === 'pending_makeup' ? <CalendarClock className="mr-2 h-5 w-5" /> : <Circle className="mr-2 h-5 w-5" />)}
            {isCompletedToday ? "Completed!" : (todaysLogEntry?.status === 'pending_makeup' ? "Do Makeup Task" : "Mark as Done")}
          </Button>
          {showSparkles && (
            <>
              <div className="sparkle sparkle-1"></div>
              <div className="sparkle sparkle-2"></div>
              <div className="sparkle sparkle-3"></div>
              <div className="sparkle sparkle-4"></div>
              <div className="sparkle sparkle-5"></div>
              <div className="sparkle sparkle-6" style={{ backgroundColor: 'hsl(var(--primary))' }}></div>
            </>
          )}
        </div>

        <div className="flex justify-between items-center mt-2 min-h-[20px]">
          <div className="text-xs text-muted-foreground">
            {(isCompletedToday && latestCompletionTimeToday && latestCompletionTimeToday !== 'N/A') && (
              <span className="flex items-center">
                <Clock className="mr-1 h-3 w-3" />
                <span>at {latestCompletionTimeToday}</span>
                {hasNoteToday && (
                  <StickyNote className="ml-2 h-3 w-3 text-blue-500" title="Reflection note added" />
                )}
              </span>
            )}
            {todaysLogEntry?.status === 'skipped' && (
                <span className="flex items-center text-destructive">
                    <CalendarX className="mr-1 h-3 w-3" />
                    <span>Skipped Today</span>
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
              {(isCompletedToday || todaysLogEntry?.status === 'skipped' || todaysLogEntry?.status === 'pending_makeup') && (
                <DropdownMenuItem onClick={() => onOpenReflectionDialog(habit.id, todayString, habit.name)}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  <span>{hasNoteToday ? "Edit Reflection" : "Add Reflection"}</span>
                </DropdownMenuItem>
              )}
              {(isCompletedToday || todaysLogEntry?.status === 'skipped' || todaysLogEntry?.status === 'pending_makeup') && <DropdownMenuSeparator />}
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
