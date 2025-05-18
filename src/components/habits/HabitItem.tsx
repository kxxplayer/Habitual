
// src/components/habits/HabitItem.tsx
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch"; // Added for reminder toggle
import { Label } from "@/components/ui/label"; // Added for reminder toggle label
import {
  Lightbulb, CalendarDays, CalendarClock as OptimalTimingIcon, CalendarPlus, Share2, Flame, MoreHorizontal, MessageSquarePlus, Tag,
  ListChecks,
  Droplets,
  Bed,
  BookOpenText,
  HeartPulse,
  Briefcase,
  Paintbrush,
  Home as HomeIcon,
  Landmark,
  Users,
  Smile as LifestyleIcon,
  Sparkles as SparklesIcon,
  CalendarX,
  CheckCircle2,
  Circle,
  XCircle,
  Check, // Used for incomplete "Mark as Done" button
  Bell, // For reminder enabled indicator
} from 'lucide-react';
import type { Habit, WeekDay, HabitCategory, HabitCompletionLogEntry } from '@/types';
import { HABIT_CATEGORIES } from '@/types';
import { generateICS, downloadICS } from '@/lib/calendarUtils';
import { format, parseISO } from 'date-fns';
import { getCurrentWeekDays, WeekDayInfo, calculateStreak } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';


interface HabitItemProps {
  habit: Habit;
  onToggleComplete: (habitId: string, date: string, completed: boolean) => void;
  onGetAISuggestion: (habit: Habit) => void;
  onOpenReflectionDialog: (habitId: string, date: string, habitName: string) => void;
  onOpenRescheduleDialog: (habit: Habit, missedDate: string) => void;
  onToggleReminder: (habitId: string, currentReminderState: boolean) => void; // New prop
}

const formatSpecificTime = (timeStr?: string): string | undefined => {
  if (!timeStr || timeStr.toLowerCase() === "anytime" || timeStr.toLowerCase() === "flexible") return undefined;
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

const getCategoryColorVariable = (category?: HabitCategory): string => {
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
  if (category && HABIT_CATEGORIES.includes(category) && categoryColorMap[category]) {
    return categoryColorMap[category];
  }
  return categoryColorMap["Other"];
};

const getHabitIcon = (habit: Habit): React.ReactNode => {
  const nameLower = habit.name.toLowerCase();
  const category = habit.category;

  if (nameLower.includes('gym') || nameLower.includes('workout') || nameLower.includes('exercise')) return <span className="text-xl">🏋️</span>;
  if (nameLower.includes('sql') || nameLower.includes('code') || nameLower.includes('programming') || nameLower.includes('develop')) return <span className="text-xl">💻</span>;
  if (nameLower.includes('walk') || nameLower.includes('run') || nameLower.includes('jog')) return <span className="text-xl">🚶</span>;
  if (nameLower.includes('read') || nameLower.includes('book')) return <span className="text-xl">📚</span>;
  if (nameLower.includes('meditate') || nameLower.includes('meditation') || nameLower.includes('mindfulness')) return <span className="text-xl">🧘</span>;

  let iconComponent: React.ReactNode = <ListChecks className="h-5 w-5 text-muted-foreground" />;
  if(category && HABIT_CATEGORIES.includes(category)) {
    switch (category) {
      case 'Health & Wellness': iconComponent = <HeartPulse className="h-5 w-5 text-red-500" />; break;
      case 'Work/Study': iconComponent = <Briefcase className="h-5 w-5 text-blue-600" />; break;
      case 'Creative': iconComponent = <Paintbrush className="h-5 w-5 text-orange-500" />; break;
      case 'Chores': iconComponent = <HomeIcon className="h-5 w-5 text-green-600" />; break;
      case 'Finance': iconComponent = <Landmark className="h-5 w-5 text-indigo-500" />; break;
      case 'Social': iconComponent = <Users className="h-5 w-5 text-pink-500" />; break;
      case 'Personal Growth': iconComponent = <SparklesIcon className="h-5 w-5 text-yellow-500" />; break;
      case 'Lifestyle': iconComponent = <LifestyleIcon className="h-5 w-5 text-teal-500" />; break;
      default: iconComponent = <ListChecks className="h-5 w-5 text-muted-foreground" />; break;
    }
  } else {
    if (nameLower.includes('water') || nameLower.includes('hydrate')) return <Droplets className="h-5 w-5 text-blue-500" />;
    if (nameLower.includes('sleep') || nameLower.includes('bed')) return <Bed className="h-5 w-5 text-purple-500" />;
    if (nameLower.includes('journal') || nameLower.includes('write')) return <BookOpenText className="h-5 w-5 text-yellow-600" />;
    if (nameLower.includes('learn') || nameLower.includes('study')) return <Briefcase className="h-5 w-5 text-blue-600" />;
    if (nameLower.includes('stretch') || nameLower.includes('yoga')) return <HeartPulse className="h-5 w-5 text-red-500" />;
  }
  return iconComponent;
};


const HabitItem: FC<HabitItemProps> = ({
    habit,
    onToggleComplete,
    onGetAISuggestion,
    onOpenReflectionDialog,
    onOpenRescheduleDialog,
    onToggleReminder,
}) => {
  const [todayString, setTodayString] = React.useState('');
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [weekViewDays, setWeekViewDays] = React.useState<WeekDayInfo[]>([]);
  const [showSparkles, setShowSparkles] = React.useState(false);
  const [showWeeklyConfetti, setShowWeeklyConfetti] = React.useState(false);
  const prevCompletedCountRef = React.useRef<number>(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = React.useState(false);

  const isTodayCompleted = habit.completionLog.some(log => log.date === todayString && (log.status === 'completed' || (log.status === undefined && log.time !== 'N/A' && !(log.status === undefined && log.time === 'N/A' && log.note))));
  const prevIsTodayCompletedRef = React.useRef<boolean>(isTodayCompleted);

  React.useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setTodayString(format(now, 'yyyy-MM-dd'));
  }, []);

  React.useEffect(() => {
    setWeekViewDays(getCurrentWeekDays(currentDate));
  }, [currentDate]);

  React.useEffect(() => {
    if (isTodayCompleted && !prevIsTodayCompletedRef.current) { // Just completed today
      setShowSparkles(true);
      setTimeout(() => setShowSparkles(false), 800); // Duration of sparkle animation
    }
    prevIsTodayCompletedRef.current = isTodayCompleted;
  }, [isTodayCompleted]);


  const streak = calculateStreak(habit, currentDate);

  const { completedCountInCurrentWeek, scheduledDaysInWeek } = React.useMemo(() => {
    let completed = 0;
    let scheduled = 0;
    if (habit.daysOfWeek.length > 0 && weekViewDays.length > 0) {
      const completedOnScheduled = new Set<string>();
      weekViewDays.forEach(dayInfo => {
        if (habit.daysOfWeek.includes(dayInfo.dayAbbrFull)) {
            scheduled++;
            const log = habit.completionLog.find(l => l.date === dayInfo.dateStr && (l.status === 'completed' || (l.status === undefined && l.time !== 'N/A' && !(l.status === undefined && l.time === 'N/A' && l.note))));
            if (log) {
                completedOnScheduled.add(dayInfo.dateStr);
            }
        }
      });
      completed = completedOnScheduled.size;
    }
    return { completedCountInCurrentWeek: completed, scheduledDaysInWeek: scheduled };
  }, [habit.completionLog, habit.daysOfWeek, weekViewDays]);

  const weeklyProgressPercent = scheduledDaysInWeek > 0 ? Math.round((completedCountInCurrentWeek / scheduledDaysInWeek) * 100) : 0;

  React.useEffect(() => {
    if (scheduledDaysInWeek > 0) {
        if (completedCountInCurrentWeek >= scheduledDaysInWeek && prevCompletedCountRef.current < scheduledDaysInWeek) {
            setShowWeeklyConfetti(true);
            setTimeout(() => {
                setShowWeeklyConfetti(false);
            }, 2500);
        }
    }
    prevCompletedCountRef.current = completedCountInCurrentWeek;
  }, [completedCountInCurrentWeek, scheduledDaysInWeek]);


  const handleAddToCalendar = () => {
    try {
      const icsContent = generateICS(habit);
      const filename = `${habit.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_habit.ics`;
      downloadICS(filename, icsContent);
      console.log(`Added to calendar! The .ics file for "${habit.name}" has been generated. You can import it into Google Calendar or your preferred calendar app.`);
    } catch (error) {
      console.error("Error generating ICS file:", error);
      console.error("ICS Generation Error");
    }
  };

  const handleShareHabit = async () => {
    let shareText = "";
    const streakCount = streak;

    if (streakCount > 0) {
      shareText = `I've kept up my habit '${habit.name}' for ${streakCount} day${streakCount > 1 ? 's' : ''} straight with Habitual! 💪 #HabitStreak #HabitualApp`;
    } else {
      const sortedDays = habit.daysOfWeek.sort((a, b) => getCurrentWeekDays()[0].dayAbbrFull.indexOf(a) - getCurrentWeekDays()[0].dayAbbrFull.indexOf(b)); // Assuming weekDaysOrder exists
      const daysText = sortedDays.length === 7 ? "Daily" : sortedDays.join(', ');
      let durationText = '';
      if (habit.durationHours && habit.durationHours > 0) durationText += `${habit.durationHours} hr` + (habit.durationHours > 1 ? 's' : '');
      if (habit.durationMinutes && habit.durationMinutes > 0) {
        if (durationText) durationText += ' ';
        durationText += `${habit.durationMinutes} min`;
      }
      shareText = `Check out this habit I'm tracking with Habitual!\nHabit: ${habit.name}${(getHabitIcon(habit) as React.ReactElement)?.props?.children ? `(${(getHabitIcon(habit) as React.ReactElement)?.props?.children})` : ''}\n${habit.description ? `Description: ${habit.description}\n` : ''}${habit.category ? `Category: ${habit.category}\n` : ''}Days: ${daysText}\n${habit.optimalTiming ? `Optimal Timing: ${habit.optimalTiming}\n` : ''}${durationText ? `Duration: ${durationText}\n` : ''}${habit.specificTime ? `Specific Time: ${formatSpecificTime(habit.specificTime)}\n` : ''}Track your habits with Habitual!`;
    }

    const copyToClipboard = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        console.log("Copied habit details to clipboard.");
      } catch (err) {
        console.error("Copy failed.");
      }
    };

    if (navigator.share) {
      try {
        await navigator.share({ title: `Habit: ${habit.name}`, text: shareText });
        console.log("Habit shared.");
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') {
           console.log("User cancelled sharing.");
        } else {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  let durationDisplay = '';
  if (habit.durationHours && habit.durationHours > 0) durationDisplay += `${habit.durationHours} hr` + (habit.durationHours > 1 ? 's' : '');
  if (habit.durationMinutes && habit.durationMinutes > 0) {
    if (durationDisplay) durationDisplay += ' ';
    durationDisplay += `${habit.durationMinutes} min`;
  }
  
  let cardClasses = `relative transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl rounded-[1.25rem]`;
  const cardStyle: React.CSSProperties = {};

  if (isTodayCompleted) {
    cardClasses = cn(cardClasses, 'bg-green-50 dark:bg-green-900/30');
    cardStyle.borderColor = `hsl(var(--accent))`;
    cardStyle.borderWidth = '1px';
  } else {
    const categoryColorVar = getCategoryColorVariable(habit.category);
    cardStyle.borderLeftColor = `hsl(var(${categoryColorVar}))`;
    cardClasses = cn(cardClasses, 'border-l-4 bg-gradient-to-br from-primary/10 dark:from-primary/20 via-card/10 to-card');
  }
  cardClasses = cn(cardClasses, 'bg-card');

  const handleToggleDailyCompletion = (dateToToggle: string) => {
    if (!dateToToggle) return;
    const logEntryForDate = habit.completionLog.find(log => log.date === dateToToggle);
    const currentCompletionState = logEntryForDate?.status === 'completed' || (logEntryForDate?.status === undefined && !!logEntryForDate && logEntryForDate.time !== 'N/A' && !(logEntryForDate?.status === undefined && logEntryForDate?.time === 'N/A' && logEntryForDate.note));
    
    if (!currentCompletionState) { // Only show sparkles if marking as newly complete
        setShowSparkles(true);
        setTimeout(() => setShowSparkles(false), 800);
    }
    onToggleComplete(habit.id, dateToToggle, !currentCompletionState);
  };

  const DESCRIPTION_TRUNCATE_LENGTH = 100;

  return (
    <Card className={cardClasses} style={cardStyle}>
      <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4">
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
          {getHabitIcon(habit)}
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-primary text-center flex-grow mx-2 truncate min-w-0 break-words">
          {habit.name}
        </h2>
        {habit.reminderEnabled && <Bell className="h-4 w-4 text-primary/70 flex-shrink-0 mr-1" />}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
               <DropdownMenuItem onClick={() => {
                  onOpenReflectionDialog(habit.id, todayString, habit.name);
                }}>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                <span>Add/Edit Note</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center justify-between"
                onSelect={(e) => e.preventDefault()} // Prevent menu from closing on switch click
              >
                <Label htmlFor={`reminder-switch-${habit.id}`} className="flex items-center cursor-pointer">
                    <Bell className="mr-2 h-4 w-4" />
                    Enable Reminder
                </Label>
                <Switch
                    id={`reminder-switch-${habit.id}`}
                    checked={!!habit.reminderEnabled}
                    onCheckedChange={() => onToggleReminder(habit.id, !!habit.reminderEnabled)}
                    className="ml-auto"
                />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
               <DropdownMenuItem onClick={() => {
                 const firstMissed = weekViewDays.find(d =>
                    habit.daysOfWeek.includes(d.dayAbbrFull) &&
                    d.isPast && !d.isToday &&
                    !habit.completionLog.some(log => log.date === d.dateStr && (log.status === 'completed' || log.status === 'skipped' || log.status === 'pending_makeup' || (log.status === undefined && log.time !== 'N/A' && !(log.status === undefined && log.time === 'N/A' && log.note))))
                 );
                 if (firstMissed) {
                    onOpenRescheduleDialog(habit, firstMissed.dateStr);
                 } else {
                    console.log("Reschedule: No past, scheduled, uncompleted days this week to reschedule.");
                 }
              }}>
                <OptimalTimingIcon className="mr-2 h-4 w-4" />
                <span>Reschedule Missed</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-3 sm:px-4 pb-2 pt-1">
        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-800/30 dark:text-yellow-300 cursor-default">
                            <Flame className={cn("h-3.5 w-3.5 mr-1", streak > 0 ? "text-orange-500 animate-pulse" : "text-yellow-500/70 dark:text-yellow-400/70")} />
                            <span>{`${streak}-Day Streak`}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                         <p>
                          {streak > 0
                            ? `Keep it up! You're on a ${streak}-day streak!`
                            : "Start a streak by completing this habit on its scheduled days!"}
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-rose-100 text-rose-700 dark:bg-rose-800/30 dark:text-rose-300">
                <span className="mr-1">🎯</span>
                <span>{`${completedCountInCurrentWeek} / ${scheduledDaysInWeek} Completed`}</span>
            </div>
        </div>
        {scheduledDaysInWeek > 0 && <Progress value={weeklyProgressPercent} indicatorClassName="bg-accent" className="h-1.5 mb-2" />}
        
        <div className="space-y-1 mt-2">
          {habit.category && (
            <div className="flex items-center text-xs text-muted-foreground">
              <span role="img" aria-label="Category" className="mr-1.5 text-sm">📌</span>
              <span className="font-medium mr-1">Category:</span>
              <span>{habit.category}</span>
            </div>
          )}
          {durationDisplay && (
            <div className="flex items-center text-xs text-muted-foreground">
              <span role="img" aria-label="Duration" className="mr-1.5 text-sm">⏱️</span>
              <span className="font-medium mr-1">Duration:</span>
              <span>{durationDisplay}</span>
            </div>
          )}
          {habit.description && (
            <div className="text-xs text-muted-foreground">
              <p className={cn("inline",!isDescriptionExpanded && habit.description.length > DESCRIPTION_TRUNCATE_LENGTH ? "line-clamp-2" : "")}>
                <span className="font-medium mr-1">📝 Desc:</span>
                {isDescriptionExpanded || habit.description.length <= DESCRIPTION_TRUNCATE_LENGTH 
                  ? habit.description 
                  : `${habit.description.substring(0, DESCRIPTION_TRUNCATE_LENGTH)}...`}
              </p>
              {habit.description.length > DESCRIPTION_TRUNCATE_LENGTH && (
                <button 
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} 
                  className="text-xs text-primary hover:underline ml-1"
                >
                  {isDescriptionExpanded ? "(less)" : "(more)"}
                </button>
              )}
            </div>
          )}
        </div>
        
        {weekViewDays.length > 0 && (
          <div className="mt-2.5">
            <div className="flex items-center text-xs text-muted-foreground mb-1.5">
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                <span className="font-semibold mr-0.5">Days:</span>
            </div>
            <div className="flex justify-around items-center space-x-0.5 sm:space-x-1">
              {weekViewDays.map((dayInfo) => {
                const dayLog = habit.completionLog.find(log => log.date === dayInfo.dateStr);
                const isScheduled = habit.daysOfWeek.includes(dayInfo.dayAbbrFull);
                let isDayCompleted = dayLog?.status === 'completed' || (dayLog?.status === undefined && !!dayLog && dayLog.time !== 'N/A' && !(dayLog.status === undefined && dayLog.time === 'N/A' && dayLog.note));

                const isSkipped = dayLog?.status === 'skipped';
                const isPendingMakeup = dayLog?.status === 'pending_makeup';

                let dayStatus: 'completed' | 'skipped' | 'pending_makeup' | 'missed' | 'pending_scheduled' | 'not_scheduled' = 'not_scheduled';
                let IconComponent: React.ElementType = Circle;
                let iconClasses = "text-muted-foreground/40";
                let dayBoxClasses = "bg-input/10 text-muted-foreground/40";
                let titleText = `${dayInfo.dayAbbrFull} - ${format(dayInfo.date, 'MMM d')}`;

                if (isDayCompleted) dayStatus = 'completed';
                else if (isSkipped) dayStatus = 'skipped';
                else if (isPendingMakeup) dayStatus = 'pending_makeup';
                else if (isScheduled) {
                  if (dayInfo.isPast && !dayInfo.isToday) dayStatus = 'missed';
                  else dayStatus = 'pending_scheduled';
                }

                switch(dayStatus) {
                    case 'completed': dayBoxClasses = 'bg-accent/10'; IconComponent = CheckCircle2; iconClasses = 'text-accent'; titleText += ' (Completed)'; break;
                    case 'skipped': dayBoxClasses = 'bg-muted/30'; IconComponent = CalendarX; iconClasses = 'text-muted-foreground'; titleText += ' (Skipped)'; break;
                    case 'pending_makeup': dayBoxClasses = 'bg-blue-500/10'; IconComponent = OptimalTimingIcon; iconClasses = 'text-blue-500'; titleText += ' (Makeup Pending)'; break;
                    case 'missed': dayBoxClasses = 'bg-destructive/10'; IconComponent = XCircle; iconClasses = 'text-destructive'; titleText += ' (Missed)'; break;
                    case 'pending_scheduled': dayBoxClasses = 'ring-1 ring-orange-500 ring-offset-1 ring-offset-background bg-orange-500/5'; IconComponent = Circle; iconClasses = 'text-orange-500'; titleText += ' (Scheduled)'; break;
                    default: dayBoxClasses = 'bg-input/40 dark:bg-input/20 text-muted-foreground/60 dark:text-muted-foreground/50 hover:bg-input/50 dark:hover:bg-input/30'; iconClasses = 'text-muted-foreground/40'; titleText += ' (Not Scheduled)'; break;
                }
                
                const canToggleDay = isScheduled || isPendingMakeup || (isDayCompleted && isScheduled);
                const isMissedAndActionable = dayStatus === 'missed';
                                
                return (
                  <div
                    key={dayInfo.dateStr}
                    title={titleText}
                    onClick={() => {
                        if (isMissedAndActionable) {
                           onOpenRescheduleDialog(habit, dayInfo.dateStr);
                        } else if (canToggleDay) {
                            handleToggleDailyCompletion(dayInfo.dateStr);
                        }
                    }}
                    className={cn(
                      `flex flex-col items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-md text-[0.6rem] sm:text-xs font-medium transition-all`,
                      dayBoxClasses,
                      (canToggleDay || isMissedAndActionable) ? 'cursor-pointer active:scale-95 transform transition-transform' : 'cursor-default',
                      dayInfo.isToday ? 'ring-2 ring-primary/70 ring-offset-1 ring-offset-background' : '',
                       dayStatus === 'pending_scheduled' ? 'hover:bg-orange-500/10' :
                       dayStatus === 'completed' ? 'hover:bg-accent/20' :
                       dayStatus === 'missed' ? 'hover:bg-destructive/20' :
                       dayStatus === 'skipped' ? 'hover:bg-muted/40' :
                       dayStatus === 'pending_makeup' ? 'hover:bg-blue-500/20' :
                       '' 
                    )}
                    aria-label={`Status for ${habit.name} on ${dayInfo.dayAbbrFull}, ${format(dayInfo.date, 'MMM d')}: ${dayStatus}`}
                  >
                    <span className={cn("font-semibold text-[0.7rem] sm:text-xs", iconClasses === 'text-muted-foreground/40' ? 'text-muted-foreground/80': '')}>{dayInfo.dayAbbrShort}</span>
                    <IconComponent className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 mt-0.5", iconClasses)}/>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <div className="flex flex-col items-stretch pt-6 pb-3 px-3 space-y-2"> {/* Changed from CardFooter to div to avoid default CardFooter padding */}
        <div className="relative flex justify-center sparkle-container">
          <Button
            onClick={() => onToggleComplete(habit.id, todayString, true)}
            disabled={isTodayCompleted}
            className={cn(
              "rounded-full py-2.5 px-6 text-sm transition-all active:scale-95",
              !isTodayCompleted
                ? "bg-gradient-to-r from-primary to-destructive text-primary-foreground hover:brightness-95"
                : "bg-accent/30 text-accent-foreground/70 cursor-not-allowed",
                 isTodayCompleted && (showSparkles ? "animate-pulse-glow-accent" : "shadow-[0_0_8px_hsl(var(--accent))]")
            )}
          >
            {isTodayCompleted ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Done!
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Mark as Done
              </>
            )}
          </Button>
        </div>
         <div className="relative flex justify-center sparkle-container">
             <Button
                onClick={() => onToggleComplete(habit.id, todayString, false)}
                disabled={!isTodayCompleted}
                variant={isTodayCompleted ? "destructive" : "outline"}
                className={cn(
                "rounded-full py-2.5 px-6 text-sm transition-all active:scale-95",
                !isTodayCompleted ? "border-muted text-muted-foreground cursor-not-allowed" : ""
                )}
            >
                <XCircle className="mr-2 h-5 w-5" />
                Not Done
            </Button>
        </div>
        
        {showSparkles && isTodayCompleted && ( // Only show sparkles if it's marked completed for today
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
      {showWeeklyConfetti && (
        <div className="weekly-goal-animation-container">
            <div className="weekly-goal-text">Weekly Goal Met!</div>
            <div className="sparkle sparkle-1" style={{top: '15%', left: '10%', '--tx': '-20px', '--ty': '-25px'} as React.CSSProperties}></div>
            <div className="sparkle sparkle-2" style={{top: '25%', right: '5%', '--tx': '20px', '--ty': '-30px'} as React.CSSProperties}></div>
            <div className="sparkle sparkle-3" style={{bottom: '30%', left: '20%', '--tx': '-25px', '--ty': '10px'} as React.CSSProperties}></div>
            <div className="sparkle sparkle-4" style={{bottom: '20%', right: '15%', '--tx': '25px', '--ty': '15px'} as React.CSSProperties}></div>
            <div className="sparkle sparkle-5" style={{top: '45%', left: '45%', '--tx': '0px', '--ty': '-35px'} as React.CSSProperties}></div>
            <div className="sparkle sparkle-6" style={{top: '65%', left: '65%', backgroundColor: 'hsl(var(--primary))', '--tx': '10px', '--ty': '-20px'} as React.CSSProperties}></div>
            <div className="sparkle sparkle-1" style={{top: '55%', left: '15%', '--tx': '-15px', '--ty': '20px', animationDelay: '0.2s'} as React.CSSProperties}></div>
            <div className="sparkle sparkle-2" style={{top: '70%', right: '20%', '--tx': '15px', '--ty': '25px', animationDelay: '0.3s', backgroundColor: 'hsl(var(--primary))'} as React.CSSProperties}></div>
        </div>
      )}
    </Card>
  );
};

export default HabitItem;
