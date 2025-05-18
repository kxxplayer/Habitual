
// src/components/habits/HabitItem.tsx
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Lightbulb, CalendarDays, Clock, Hourglass, CalendarClock, CalendarPlus, Share2, Flame, MoreHorizontal, MessageSquarePlus, StickyNote, Tag,
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
  ChevronRightSquare,
} from 'lucide-react';
import type { Habit, WeekDay, HabitCategory, HabitCompletionLogEntry, EarnedBadge } from '@/types';
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
  isSelected: boolean;
  onSelectToggle: (habitId: string) => void;
  earnedBadges: EarnedBadge[];
}

const weekDaysOrder: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  if (nameLower.includes('gym') || nameLower.includes('workout') || nameLower.includes('exercise')) return <span className="text-xl ml-1.5 rtl:mr-1.5 rtl:ml-0">🏋️</span>;
  if (nameLower.includes('sql') || nameLower.includes('code') || nameLower.includes('programming') || nameLower.includes('develop')) return <span className="text-xl ml-1.5 rtl:mr-1.5 rtl:ml-0">💻</span>;
  if (nameLower.includes('walk') || nameLower.includes('run') || nameLower.includes('jog')) return <span className="text-xl ml-1.5 rtl:mr-1.5 rtl:ml-0">🚶</span>;
  if (nameLower.includes('read') || nameLower.includes('book')) return <span className="text-xl ml-1.5 rtl:mr-1.5 rtl:ml-0">📚</span>;
  if (nameLower.includes('meditate') || nameLower.includes('meditation') || nameLower.includes('mindfulness')) return <span className="text-xl ml-1.5 rtl:mr-1.5 rtl:ml-0">🧘</span>;

  if (nameLower.includes('water') || nameLower.includes('hydrate')) return <Droplets className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-blue-500" />;
  if (nameLower.includes('sleep') || nameLower.includes('bed')) return <Bed className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-purple-500" />;
  if (nameLower.includes('journal') || nameLower.includes('write')) return <BookOpenText className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-yellow-600" />;
  if (nameLower.includes('learn') || nameLower.includes('study')) return <Briefcase className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-blue-600" />;
  if (nameLower.includes('stretch') || nameLower.includes('yoga')) return <HeartPulse className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-red-500" />;

  let iconComponent: React.ReactNode = <ListChecks className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-muted-foreground" />;
  switch (category) {
    case 'Health & Wellness': iconComponent = <HeartPulse className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-red-500" />; break;
    case 'Work/Study': iconComponent = <Briefcase className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-blue-600" />; break;
    case 'Creative': iconComponent = <Paintbrush className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-orange-500" />; break;
    case 'Chores': iconComponent = <HomeIcon className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-green-600" />; break;
    case 'Finance': iconComponent = <Landmark className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-indigo-500" />; break;
    case 'Social': iconComponent = <Users className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-pink-500" />; break;
    case 'Personal Growth': iconComponent = <SparklesIcon className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-yellow-500" />; break;
    case 'Lifestyle': iconComponent = <LifestyleIcon className="ml-1.5 rtl:mr-1.5 rtl:ml-0 h-5 w-5 text-teal-500" />; break;
  }
  return iconComponent;
};


const HabitItem: FC<HabitItemProps> = ({
    habit,
    onToggleComplete,
    onGetAISuggestion,
    onOpenReflectionDialog,
    onOpenRescheduleDialog,
    isSelected,
    onSelectToggle,
    earnedBadges,
}) => {
  const [todayString, setTodayString] = React.useState('');
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [weekViewDays, setWeekViewDays] = React.useState<WeekDayInfo[]>([]);
  const [showSparkles, setShowSparkles] = React.useState(false);
  const [showWeeklyConfetti, setShowWeeklyConfetti] = React.useState(false);
  const prevCompletedCountRef = React.useRef<number>(0);

  React.useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setTodayString(format(now, 'yyyy-MM-dd'));
    setWeekViewDays(getCurrentWeekDays(now));
  }, []); // Runs once on mount

  React.useEffect(() => { // Re-evaluate weekViewDays if todayString changes (e.g. midnight crossing)
     setWeekViewDays(getCurrentWeekDays(new Date()));
  }, [todayString]);


  const streak = calculateStreak(habit, currentDate);

  const { completedCountInCurrentWeek, scheduledDaysInWeek } = React.useMemo(() => {
    let completed = 0;
    let scheduled = 0;
    if (habit.daysOfWeek.length > 0 && weekViewDays.length > 0) {
      const completedOnScheduled = new Set<string>();
      weekViewDays.forEach(dayInfo => {
        if (habit.daysOfWeek.includes(dayInfo.dayAbbrFull)) {
            scheduled++;
            const log = habit.completionLog.find(l => l.date === dayInfo.dateStr && (l.status === 'completed' || l.status === undefined));
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
    let shareText = "";
    const streakCount = streak;

    if (streakCount > 0) {
      shareText = `I've kept up my habit '${habit.name}' for ${streakCount} day${streakCount > 1 ? 's' : ''} straight with Habitual! 💪 #HabitStreak #HabitualApp`;
    } else {
      const sortedDays = habit.daysOfWeek.sort((a, b) => weekDaysOrder.indexOf(a) - weekDaysOrder.indexOf(b));
      const daysText = sortedDays.length === 7 ? "Daily" : sortedDays.join(', ');
      let durationText = '';
      if (habit.durationHours && habit.durationHours > 0) durationText += `${habit.durationHours} hr` + (habit.durationHours > 1 ? 's' : '');
      if (habit.durationMinutes && habit.durationMinutes > 0) {
        if (durationText) durationText += ' ';
        durationText += `${habit.durationMinutes} min`;
      }
      shareText = `Check out this habit I'm tracking with Habitual!\n\nHabit: ${habit.name}${getHabitIcon(habit) ? ` (${(getHabitIcon(habit) as React.ReactElement)?.props?.children || ''})` : ''}\n${habit.description ? `Description: ${habit.description}\n` : ''}${habit.category ? `Category: ${habit.category}\n` : ''}Days: ${daysText}\n${habit.optimalTiming ? `Optimal Timing: ${habit.optimalTiming}\n` : ''}${durationText ? `Duration: ${durationText}\n` : ''}${habit.specificTime ? `Specific Time: ${formatSpecificTime(habit.specificTime)}\n` : ''}Track your habits with Habitual!`;
    }

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
  const formattedSpecificTime = formatSpecificTime(habit.specificTime);

  const cardStyle: React.CSSProperties = {};
  let cardClasses = `relative transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl ${isSelected ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background' : ''}`;

  const isTodayCompleted = habit.completionLog.some(log => log.date === todayString && (log.status === 'completed' || log.status === undefined));

  if (isTodayCompleted) {
    cardClasses = cn(cardClasses, 'border-accent bg-green-50 dark:bg-green-900/30');
  } else {
    const categoryColorVar = getCategoryColorVariable(habit.category);
    cardStyle.borderLeftColor = `hsl(var(${categoryColorVar}))`;
    cardClasses = cn(cardClasses, 'border-l-4');
  }
  cardClasses = cn(cardClasses, 'bg-card');

  const handleTodayCompletionToggle = () => {
    if (!todayString) return;
    const newCompletedState = !isTodayCompleted;
    onToggleComplete(habit.id, todayString, newCompletedState);
    if (newCompletedState) {
      setShowSparkles(true);
      setTimeout(() => setShowSparkles(false), 800);
    }
  };


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

      <CardHeader className="pt-3 pb-1 px-3 sm:px-4 pr-12">
        <div className="flex items-baseline">
          <h2 className="text-lg sm:text-xl font-semibold text-primary min-w-0 break-words">
            {habit.name}
          </h2>
          {getHabitIcon(habit)}
        </div>
        {habit.category && (
          <div className="flex items-center text-xs text-muted-foreground mt-0.5">
            <Tag className="mr-1 h-3 w-3 text-primary/70" />
            <span>{habit.category}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2 px-3 sm:px-4 pb-2 pt-1">
        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
            <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center cursor-default">
                      <Flame className={cn("h-4 w-4 sm:h-5 sm:w-5", streak > 0 ? "text-orange-500 animate-pulse" : "text-muted-foreground opacity-60")} />
                      <span className={cn("ml-0.5 text-xs sm:text-sm font-semibold", streak > 0 ? "text-orange-500" : "text-muted-foreground opacity-60")}>
                          {streak}
                      </span>
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
            <div className="flex items-center">
                <span className="mr-1">🎯</span>
                <span className="text-xs font-medium">{completedCountInCurrentWeek}/{scheduledDaysInWeek} days</span>
            </div>
        </div>
        <Progress
            value={weeklyProgressPercent}
            indicatorClassName="bg-accent"
            className="h-1 mb-1.5"
            aria-label={`Weekly progress: ${completedCountInCurrentWeek} of ${scheduledDaysInWeek} days completed`}
        />

        {(formattedSpecificTime || durationDisplay) && (
             <div className="flex items-center text-xs sm:text-sm text-muted-foreground space-x-3">
                {formattedSpecificTime && (
                    <div className="flex items-center">
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        <span className="font-semibold mr-0.5">Time:</span>
                        <span>{formattedSpecificTime}</span>
                    </div>
                )}
                {durationDisplay && (
                     <div className="flex items-center">
                        <Hourglass className="mr-1 h-3.5 w-3.5" />
                        <span className="font-semibold mr-0.5">Duration:</span>
                        <span>{durationDisplay}</span>
                    </div>
                )}
            </div>
        )}


        {weekViewDays.length > 0 && (
          <div className="mt-1.5">
            <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-1">
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                <span className="font-semibold mr-0.5">Days:</span>
            </div>
            <div className="flex justify-around items-center space-x-0.5 sm:space-x-1">
              {weekViewDays.map((dayInfo) => {
                const dayLog = habit.completionLog.find(log => log.date === dayInfo.dateStr);
                const isScheduled = habit.daysOfWeek.includes(dayInfo.dayAbbrFull);
                const isDayCompleted = dayLog?.status === 'completed' || (dayLog?.status === undefined && !!dayLog);
                const isSkipped = dayLog?.status === 'skipped';
                const isPendingMakeup = dayLog?.status === 'pending_makeup';

                let dayStatus: 'completed' | 'skipped' | 'pending_makeup' | 'missed' | 'pending_scheduled' | 'not_scheduled' = 'not_scheduled';
                let dayBgColor = '';
                let dayTextColor = '';
                let titleText = `${dayInfo.dayAbbrFull} - ${format(dayInfo.date, 'MMM d')}`;
                let IconComponent: React.ElementType = Circle;

                if (isDayCompleted) dayStatus = 'completed';
                else if (isSkipped) dayStatus = 'skipped';
                else if (isPendingMakeup) dayStatus = 'pending_makeup';
                else if (isScheduled) {
                  if (dayInfo.isPast && !dayInfo.isToday) dayStatus = 'missed';
                  else dayStatus = 'pending_scheduled';
                }

                switch(dayStatus) {
                  case 'completed':
                    dayBgColor = 'bg-accent hover:bg-accent/90'; dayTextColor = 'text-accent-foreground'; titleText += ' (Completed)'; IconComponent = CheckCircle2; break;
                  case 'skipped':
                    dayBgColor = 'bg-muted hover:bg-muted/90'; dayTextColor = 'text-muted-foreground'; titleText += ' (Skipped)'; IconComponent = CalendarX; break;
                  case 'pending_makeup':
                    dayBgColor = 'bg-blue-500 hover:bg-blue-600'; dayTextColor = 'text-white'; titleText += ' (Makeup Pending)'; IconComponent = CalendarClock; break;
                  case 'missed':
                    dayBgColor = 'bg-destructive hover:bg-destructive/90'; dayTextColor = 'text-destructive-foreground'; titleText += ' (Missed)'; IconComponent = Circle; break;
                  case 'pending_scheduled':
                    dayBgColor = 'bg-secondary dark:bg-secondary/70 hover:bg-secondary/80 dark:hover:bg-secondary/90'; 
                    dayTextColor = 'text-secondary-foreground dark:text-secondary-foreground/80'; 
                    titleText += ' (Pending)'; 
                    IconComponent = Circle; 
                    break;
                  default: // not_scheduled
                     dayBgColor = 'bg-input/40 dark:bg-input/20 hover:bg-input/50 dark:hover:bg-input/30'; 
                     titleText += ' (Not Scheduled)'; 
                     IconComponent = Circle; 
                     dayTextColor = 'text-muted-foreground/60 dark:text-muted-foreground/50'; 
                     break;
                }
                
                return (
                  <div
                    key={dayInfo.dateStr}
                    title={titleText}
                    className={cn(
                      `flex flex-col items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-md text-[0.6rem] sm:text-xs font-medium transition-all`,
                      dayBgColor, dayTextColor,
                      dayInfo.isToday ? 'ring-2 ring-primary/70 ring-offset-1 ring-offset-background' : '',
                       'cursor-default' // Kept as non-clickable for now, main button handles today's completion
                    )}
                    aria-label={`Status for ${habit.name} on ${dayInfo.dayAbbrFull}, ${format(dayInfo.date, 'MMM d')}: ${dayStatus}`}
                  >
                    <span className="font-semibold text-[0.7rem] sm:text-xs">{dayInfo.dayAbbrShort}</span>
                    <IconComponent className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 mt-0.5", dayStatus === 'completed' || dayStatus === 'pending_makeup' || dayStatus === 'skipped' || dayStatus === 'missed' ? '' : 'opacity-70')}/>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-stretch pt-2 pb-2 px-3 space-y-2">
        <div className="sparkle-container relative w-full">
          <Button
            onClick={handleTodayCompletionToggle}
            variant={isTodayCompleted ? "default" : "outline"}
            className={cn(
              "w-full transition-all active:scale-95 py-2.5 text-sm",
              isTodayCompleted ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "border-primary/50 text-primary hover:bg-primary/10"
            )}
          >
            {isTodayCompleted ? (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            ) : (
              <ChevronRightSquare className="mr-2 h-5 w-5" />
            )}
            {isTodayCompleted ? "Completed Today!" : "Mark as Done"}
          </Button>
          {showSparkles && isTodayCompleted && (
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

        <div className="flex justify-end items-center w-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
               <DropdownMenuItem onClick={() => {
                  const targetDateForReflection = todayString; 
                  // Allow note for any day in the current week, if it has a log or is past/today
                  let allowNote = false;
                  const dayInfoForNote = weekViewDays.find(d => d.dateStr === targetDateForReflection);
                  if (dayInfoForNote) {
                     const logForReflection = habit.completionLog.find(l => l.date === targetDateForReflection);
                     if(logForReflection || dayInfoForNote.isPast || dayInfoForNote.isToday){
                         allowNote = true;
                     }
                  }

                  if(allowNote){
                    onOpenReflectionDialog(habit.id, targetDateForReflection, habit.name);
                  } else {
                     toast({ title: "Reflection Note", description: "Cannot add note for future, non-logged days outside current week scope.", variant: "default"});
                  }
                }}>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                <span>Add/Edit Note</span>
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
                    !habit.completionLog.some(log => log.date === d.dateStr && (log.status === 'completed' || log.status === 'skipped' || log.status === 'pending_makeup' || log.status === undefined))
                 );
                 if (firstMissed) {
                    onOpenRescheduleDialog(habit, firstMissed.dateStr);
                 } else {
                    toast({title: "Reschedule", description: "No past, scheduled, uncompleted days this week to reschedule."})
                 }
              }}>
                <CalendarClock className="mr-2 h-4 w-4" />
                <span>Reschedule Missed</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
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
