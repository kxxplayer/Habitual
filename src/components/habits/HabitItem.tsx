
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
  Lightbulb, CalendarDays, Clock, Hourglass, CalendarClock, CalendarPlus, Share2, TrendingUp, Flame, MoreHorizontal, MessageSquarePlus, StickyNote, Tag,
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
  Circle 
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
  isSelected: boolean;
  onSelectToggle: (habitId: string) => void;
  isCompletedToday?: boolean; // Kept for potential direct use, though weekly view is primary
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
  "Finance": "--chart-1", // Re-using chart colors for more categories
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
    isSelected,
    onSelectToggle,
    isCompletedToday: _isCompletedToday // Prop not directly used for daily completion icon anymore
}) => {
  const todayString = new Date().toISOString().split('T')[0];
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [weekViewDays, setWeekViewDays] = React.useState<WeekDayInfo[]>([]);
  const [showSparkles, setShowSparkles] = React.useState(false); // For daily completion sparkles
  const [showWeeklyConfetti, setShowWeeklyConfetti] = React.useState(false); // For weekly goal met
  const prevCompletedCountRef = React.useRef<number>(0);


  React.useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setWeekViewDays(getCurrentWeekDays(now));
  }, [todayString]); 

  const streak = calculateStreak(habit, currentDate);
  const isHabitCompletedToday = habit.completionLog.some(log => log.date === todayString && log.status === 'completed');

  const { completedCountInCurrentWeek, scheduledDaysInWeek } = React.useMemo(() => {
    let completed = 0;
    let scheduled = 0;
    if (habit.daysOfWeek.length > 0) {
      const completedOnScheduled = new Set<string>();
      weekViewDays.forEach(dayInfo => {
        if (habit.daysOfWeek.includes(dayInfo.dayAbbrFull)) {
            scheduled++;
            const log = habit.completionLog.find(l => l.date === dayInfo.dateStr && l.status === 'completed');
            if (log) {
                completedOnScheduled.add(dayInfo.dateStr);
            }
        }
      });
      completed = completedOnScheduled.size;
    }
    return { completedCountInCurrentWeek: completed, scheduledDaysInWeek: scheduled };
  }, [habit.completionLog, habit.daysOfWeek, weekViewDays]);

  const weeklyProgressPercent = scheduledDaysInWeek > 0 ? (completedCountInCurrentWeek / scheduledDaysInWeek) * 100 : 0;

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
      shareText = `Check out this habit I'm tracking with Habitual!\n\nHabit: ${habit.name}\n${habit.description ? `Description: ${habit.description}\n` : ''}${habit.category ? `Category: ${habit.category}\n` : ''}Days: ${daysText}\n${habit.optimalTiming ? `Optimal Timing: ${habit.optimalTiming}\n` : ''}${durationText ? `Duration: ${durationText}\n` : ''}${habit.specificTime ? `Specific Time: ${formatSpecificTime(habit.specificTime)}\n` : ''}Track your habits with Habitual!`;
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

  const displayDays = habit.daysOfWeek.sort((a, b) => weekDaysOrder.indexOf(a) - weekDaysOrder.indexOf(b)).join(', ');
  let durationDisplay = '';
  if (habit.durationHours && habit.durationHours > 0) durationDisplay += `${habit.durationHours} hr` + (habit.durationHours > 1 ? 's' : '');
  if (habit.durationMinutes && habit.durationMinutes > 0) {
    if (durationDisplay) durationDisplay += ' ';
    durationDisplay += `${habit.durationMinutes} min`;
  }
  const formattedSpecificTime = formatSpecificTime(habit.specificTime);

  const cardStyle: React.CSSProperties = {};
  let cardClasses = `relative transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl ${isSelected ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background' : ''}`;
  
  // Use isHabitCompletedToday for overall card styling related to *today's* specific status
  if (isHabitCompletedToday) { 
    cardClasses = cn(cardClasses, 'border-accent bg-green-50 dark:bg-green-900/30');
  } else {
    const categoryColorVar = getCategoryColorVariable(habit.category);
    cardStyle.borderLeftColor = `hsl(var(${categoryColorVar}))`;
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
      <CardHeader className="pt-3 pb-2 px-3 sm:px-4 pr-12"> {/* Added pr-12 for checkbox */}
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
            <div className="flex justify-between items-center text-xs font-medium text-muted-foreground mb-1">
                <span className="flex items-center"><TrendingUp className="mr-1.5 h-3.5 w-3.5 text-primary/90" />This Week</span>
                <span>{completedCountInCurrentWeek} / {scheduledDaysInWeek} days</span>
            </div>
            <Progress
                value={weeklyProgressPercent}
                indicatorClassName="bg-accent"
                className="h-1.5 mb-1.5" // Added margin bottom
                aria-label={`Weekly progress: ${completedCountInCurrentWeek} of ${scheduledDaysInWeek} days completed`}
            />
            <div className="flex justify-around items-center space-x-1 mt-2">
              {weekViewDays.map((dayInfo) => {
                const dayLog = habit.completionLog.find(log => log.date === dayInfo.dateStr);
                const isScheduled = habit.daysOfWeek.includes(dayInfo.dayAbbrFull);
                const isDayCompleted = dayLog?.status === 'completed';
                const isSkipped = dayLog?.status === 'skipped';
                const isPendingMakeup = dayLog?.status === 'pending_makeup';

                let dayStatus: 'completed' | 'skipped' | 'pending_makeup' | 'missed' | 'pending_scheduled' | 'not_scheduled' = 'not_scheduled';
                if (isDayCompleted) dayStatus = 'completed';
                else if (isSkipped) dayStatus = 'skipped';
                else if (isPendingMakeup) dayStatus = 'pending_makeup';
                else if (isScheduled) {
                  if (dayInfo.isPast) dayStatus = 'missed';
                  else dayStatus = 'pending_scheduled';
                }

                let dayBgColor = 'bg-input/30 hover:bg-input/50';
                let dayTextColor = 'text-muted-foreground/70';
                let titleText = `${dayInfo.dayAbbrFull} - ${format(dayInfo.date, 'MMM d')}`;
                let IconComponent = Circle;

                switch(dayStatus) {
                  case 'completed':
                    dayBgColor = 'bg-accent hover:bg-accent/90'; dayTextColor = 'text-accent-foreground'; titleText += ' (Completed)'; IconComponent = CheckCircle2; break;
                  case 'skipped':
                    dayBgColor = 'bg-muted hover:bg-muted/90'; dayTextColor = 'text-muted-foreground'; titleText += ' (Skipped)'; IconComponent = CalendarX; break;
                  case 'pending_makeup':
                    dayBgColor = 'bg-blue-500 hover:bg-blue-600'; dayTextColor = 'text-white'; titleText += ' (Makeup Pending)'; IconComponent = CalendarClock; break;
                  case 'missed':
                    // For missed days, we allow rescheduling, so it won't be directly marked here.
                    // It should be clickable to open reschedule dialog if needed.
                    // For now, it is red and clickable if not completed/skipped.
                    dayBgColor = 'bg-destructive hover:bg-destructive/90'; dayTextColor = 'text-destructive-foreground'; titleText += ' (Missed)'; break;
                  case 'pending_scheduled':
                    dayBgColor = 'bg-muted hover:bg-muted/90'; dayTextColor = 'text-muted-foreground'; titleText += ' (Pending)'; break;
                  default: // not_scheduled
                     dayBgColor = 'bg-input/20'; titleText += ' (Not Scheduled)'; break;
                }
                
                const handleDayClick = () => {
                  if (dayStatus === 'not_scheduled' && !isPendingMakeup) return;

                  const newCompletedState = !isDayCompleted;
                  onToggleComplete(habit.id, dayInfo.dateStr, newCompletedState);
                  if (newCompletedState) {
                    setShowSparkles(true);
                    setTimeout(() => setShowSparkles(false), 1000);
                  }
                };
                
                const dayElement = (
                  <button
                    key={dayInfo.dateStr}
                    title={titleText}
                    onClick={handleDayClick}
                    disabled={dayStatus === 'not_scheduled' && !isPendingMakeup && dayStatus !== 'missed'} // Allow clicking missed for reschedule
                    className={cn(
                      `flex flex-col items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-md text-xs font-medium transition-all transform active:scale-90`,
                      dayBgColor, dayTextColor,
                      dayInfo.isToday ? 'ring-2 ring-primary/70 ring-offset-1 ring-offset-background' : '',
                      (dayStatus === 'not_scheduled' && !isPendingMakeup) ? 'cursor-default opacity-50' : 'cursor-pointer'
                    )}
                    aria-label={`Mark habit ${habit.name} for ${dayInfo.dayAbbrFull}, ${format(dayInfo.date, 'MMM d')} as ${isDayCompleted ? 'not done' : 'done'}`}
                  >
                    <span className="font-semibold">{dayInfo.dayAbbrShort}</span>
                    <IconComponent className={cn("h-3 w-3 mt-0.5", dayStatus === 'completed' || dayStatus === 'pending_makeup' || dayStatus === 'skipped' ? '' : 'opacity-70')}/>
                  </button>
                );
                 // If the day is missed, wrap it to trigger reschedule dialog
                if (dayStatus === 'missed') {
                  return (
                    <div key={dayInfo.dateStr} onClick={() => onOpenRescheduleDialog(habit, dayInfo.dateStr)}>
                      {dayElement}
                    </div>
                  );
                }
                return dayElement;
              })}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch pt-2 pb-3 px-3">
        {showSparkles && (
             <div className="sparkle-container absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                <div className="sparkle sparkle-1"></div>
                <div className="sparkle sparkle-2"></div>
                <div className="sparkle sparkle-3"></div>
                <div className="sparkle sparkle-4"></div>
                <div className="sparkle sparkle-5"></div>
                <div className="sparkle sparkle-6" style={{ backgroundColor: 'hsl(var(--primary))' }}></div>
            </div>
        )}
        <div className="flex justify-end items-center min-h-[20px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
               <DropdownMenuItem onClick={() => {
                  const targetDateForReflection = weekViewDays.find(d => d.isToday)?.dateStr || todayString;
                  const logForReflection = habit.completionLog.find(l => l.date === targetDateForReflection);
                  if(logForReflection && (logForReflection.status === 'completed' || logForReflection.status === 'skipped' || logForReflection.status === 'pending_makeup')){
                    onOpenReflectionDialog(habit.id, targetDateForReflection, habit.name);
                  } else {
                     toast({ title: "Reflection Note", description: "Mark a day as complete/skipped to add a note.", variant: "default"});
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
                    d.isPast && 
                    !habit.completionLog.some(log => log.date === d.dateStr && (log.status === 'completed' || log.status === 'skipped' || log.status === 'pending_makeup'))
                 );
                 if (firstMissed) {
                    onOpenRescheduleDialog(habit, firstMissed.dateStr);
                 } else {
                    toast({title: "Reschedule", description: "No missed scheduled days this week to reschedule."})
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

