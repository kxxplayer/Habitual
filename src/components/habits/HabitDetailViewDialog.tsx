
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, CalendarPlus, Share2, Flame, MoreHorizontal, MessageSquarePlus, Tag, ListChecks, Droplets, Bed, BookOpenText, HeartPulse, Briefcase, Paintbrush, Home as HomeIconLucide, Landmark, Users, Smile as LifestyleIcon, Sparkles as SparklesIcon, CalendarX, CheckCircle2, Circle, Check, Bell, FilePenLine, StickyNote, Trash2, ChevronRightSquare, CalendarClock, CalendarDays, Edit3, Save, Wand2, PlusCircle, Hourglass, Clock, Brain } from 'lucide-react';
import type { Habit, WeekDay, HabitCategory } from '@/types';
import { HABIT_CATEGORIES } from '@/types';
import { generateICS, downloadICS } from '@/lib/calendarUtils';
import { format, parseISO, isSameDay, startOfDay, addDays as dateFnsAddDays } from 'date-fns';
import { getCurrentWeekDays, WeekDayInfo, calculateStreak, getDayAbbreviationFromDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import type { ReflectionStarterInput, ReflectionStarterOutput } from '@/ai/flows/reflection-starter-flow'; // Import types
import AIReflectionPromptDialog from '@/components/popups/AIReflectionPromptDialog';
import { useToast } from "@/hooks/use-toast";


interface HabitDetailViewDialogProps {
  habit: Habit | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleComplete: (habitId: string, date: string, completed: boolean) => void;
  onGetAISuggestion: (habit: Habit) => void;
  onOpenReflectionDialog: (habitId: string, date: string, habitName: string) => void;
  onOpenRescheduleDialog: (habit: Habit, missedDate: string) => void;
  onToggleReminder: (habitId: string, currentReminderState: boolean) => void;
  onOpenEditDialog: (habit: Habit) => void;
  onOpenDeleteConfirm: (habitId: string, habitName: string) => void;
  onGetAIReflectionPrompt: (input: ReflectionStarterInput) => Promise<ReflectionStarterOutput>; // Prop for the flow
}

const formatSpecificTime = (timeStr?: string): string | undefined => {
  if (!timeStr || timeStr.toLowerCase() === "anytime" || timeStr.toLowerCase() === "flexible") return undefined;
  try {
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10)); date.setMinutes(parseInt(minutes, 10));
      return format(date, 'h:mm a');
    }
  } catch (e) { /* Fallback */ }
  return timeStr;
};

const getCategoryColorVariable = (category?: HabitCategory): string => {
  const categoryColorMap: Record<HabitCategory, string> = {
    "Lifestyle": "--chart-1", "Work/Study": "--chart-2", "Health & Wellness": "--chart-3",
    "Creative": "--chart-4", "Chores": "--chart-5", "Finance": "--chart-1",
    "Social": "--chart-2", "Personal Growth": "--chart-3", "Other": "--chart-5",
  };
  return (category && HABIT_CATEGORIES.includes(category) && categoryColorMap[category]) ? categoryColorMap[category] : categoryColorMap["Other"];
};

const getHabitDisplayIcon = (habit: Habit | null): React.ReactNode => {
  if (!habit) return <ListChecks className="h-5 w-5 text-muted-foreground" />;
  const nameLower = habit.name.toLowerCase();
  if (nameLower.includes('gym') || nameLower.includes('workout')) return <span className="text-xl">🏋️</span>;
  if (nameLower.includes('sql') || nameLower.includes('code')) return <span className="text-xl">💻</span>;
  if (nameLower.includes('walk') || nameLower.includes('run')) return <span className="text-xl">🚶</span>;
  if (nameLower.includes('read') || nameLower.includes('book')) return <span className="text-xl">📚</span>;
  if (nameLower.includes('meditate') || nameLower.includes('mindfulness')) return <span className="text-xl">🧘</span>;
  if (nameLower.includes('learn') || nameLower.includes('study')) return <Briefcase className="h-5 w-5 text-blue-600" />;
  if (nameLower.includes('water') || nameLower.includes('hydrate')) return <Droplets className="h-5 w-5 text-blue-500" />;
  if (nameLower.includes('sleep') || nameLower.includes('bed')) return <Bed className="h-5 w-5 text-purple-500" />;
  if (nameLower.includes('journal') || nameLower.includes('write')) return <BookOpenText className="h-5 w-5 text-yellow-600" />;
  if (nameLower.includes('stretch') || nameLower.includes('yoga')) return <HeartPulse className="h-5 w-5 text-red-500" />;

  if (habit.category) {
    switch (habit.category) {
      case 'Health & Wellness': return <HeartPulse className="h-5 w-5 text-red-500" />;
      case 'Work/Study': return <Briefcase className="h-5 w-5 text-blue-600" />;
      case 'Creative': return <Paintbrush className="h-5 w-5 text-orange-500" />;
      case 'Chores': return <HomeIconLucide className="h-5 w-5 text-green-600" />;
      case 'Finance': return <Landmark className="h-5 w-5 text-indigo-500" />;
      case 'Social': return <Users className="h-5 w-5 text-pink-500" />;
      case 'Personal Growth': return <SparklesIcon className="h-5 w-5 text-yellow-500" />;
      case 'Lifestyle': return <LifestyleIcon className="h-5 w-5 text-teal-500" />;
      default: return <ListChecks className="h-5 w-5 text-muted-foreground" />;
    }
  }
  return <ListChecks className="h-5 w-5 text-muted-foreground" />;
};


const HabitDetailViewDialog: FC<HabitDetailViewDialogProps> = ({
  habit, isOpen, onClose, onToggleComplete, onGetAISuggestion, onOpenReflectionDialog,
  onOpenRescheduleDialog, onToggleReminder, onOpenEditDialog, onOpenDeleteConfirm,
  onGetAIReflectionPrompt, // Destructure the new prop
}) => {
  const { toast } = useToast();
  const [todayString, setTodayString] = React.useState('');
  const [currentDate, setCurrentDate] = React.useState<Date | null>(null);
  const [weekViewDays, setWeekViewDays] = React.useState<WeekDayInfo[]>([]);
  const [showSparkles, setShowSparkles] = React.useState(false);
  const [showWeeklyConfetti, setShowWeeklyConfetti] = React.useState(false);
  const prevCompletedCountRef = React.useRef<number>(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = React.useState(false);
  const DESCRIPTION_TRUNCATE_LENGTH = 100;

  // State for AI Reflection Prompt
  const [isAIReflectionPromptDialogOpen, setIsAIReflectionPromptDialogOpen] = React.useState(false);
  const [aiReflectionPromptText, setAIReflectionPromptText] = React.useState<string | null>(null);
  const [isAIReflectionLoading, setIsAIReflectionLoading] = React.useState(false);
  const [aiReflectionError, setAIReflectionError] = React.useState<string | null>(null);


  React.useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setTodayString(format(now, 'yyyy-MM-dd'));
  }, []);

  React.useEffect(() => {
    if (currentDate) {
      setWeekViewDays(getCurrentWeekDays(currentDate));
    }
  }, [currentDate]);

  React.useEffect(() => {
    // Reset AI reflection state when dialog is opened/habit changes
    if (isOpen) {
      setIsAIReflectionPromptDialogOpen(false);
      setAIReflectionPromptText(null);
      setIsAIReflectionLoading(false);
      setAIReflectionError(null);
      setIsDescriptionExpanded(false); // Reset description expansion
    }
  }, [isOpen, habit]);

  const safeHabitDaysOfWeek = React.useMemo(() => {
    return habit?.daysOfWeek || [];
  }, [habit]);

  const isTodayCompleted = React.useMemo(() => {
    if (!habit) return false;
    return habit.completionLog.some(log => log.date === todayString && log.status === 'completed');
  }, [habit, todayString]);

  const streak = React.useMemo(() => {
    if (!habit || !currentDate) return 0;
    return calculateStreak(habit, currentDate);
  }, [habit, currentDate]);

  const { completedCountInCurrentWeek, scheduledDaysInWeek } = React.useMemo(() => {
    if (!habit) return { completedCountInCurrentWeek: 0, scheduledDaysInWeek: 0 };
    let completed = 0;
    let scheduled = 0;
    if (safeHabitDaysOfWeek.length > 0 && weekViewDays.length > 0) {
      const completedOnScheduled = new Set<string>();
      weekViewDays.forEach(dayInfo => {
        if (safeHabitDaysOfWeek.includes(dayInfo.dayAbbrFull)) {
          scheduled++;
          if (habit.completionLog.some(l => l.date === dayInfo.dateStr && l.status === 'completed')) {
            completedOnScheduled.add(dayInfo.dateStr);
          }
        }
      });
      completed = completedOnScheduled.size;
    }
    return { completedCountInCurrentWeek: completed, scheduledDaysInWeek: scheduled };
  }, [habit, safeHabitDaysOfWeek, weekViewDays]);

  React.useEffect(() => {
    if (!habit) return;
    if (scheduledDaysInWeek > 0 && completedCountInCurrentWeek >= scheduledDaysInWeek && prevCompletedCountRef.current < scheduledDaysInWeek) {
      setShowWeeklyConfetti(true);
      setTimeout(() => setShowWeeklyConfetti(false), 2500);
    }
    prevCompletedCountRef.current = completedCountInCurrentWeek;
  }, [completedCountInCurrentWeek, scheduledDaysInWeek, habit]);


  const handleTriggerAIReflection = async () => {
    if (!habit) return;
    setIsAIReflectionLoading(true);
    setAIReflectionError(null);
    setAIReflectionPromptText(null);
    setIsAIReflectionPromptDialogOpen(true);

    try {
      const input: ReflectionStarterInput = {
        habitName: habit.name,
        habitCategory: habit.category,
        currentStreak: streak,
        recentCompletions: completedCountInCurrentWeek,
        scheduledDaysInWeek: scheduledDaysInWeek,
      };
      const result = await onGetAIReflectionPrompt(input); // Use the passed prop
      setAIReflectionPromptText(result.prompt);
    } catch (error: any) {
      console.error("Error getting AI reflection prompt:", error);
      setAIReflectionError(error.message || "Failed to generate reflection prompt.");
      toast({
        title: "AI Reflection Error",
        description: "Could not fetch an AI reflection prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAIReflectionLoading(false);
    }
  };


  if (!isOpen || !habit) return null;

  const weeklyProgressPercent = scheduledDaysInWeek > 0 ? Math.round((completedCountInCurrentWeek / scheduledDaysInWeek) * 100) : 0;

  const handleToggleTodayCompletion = (complete: boolean) => {
    if (!habit) {
      console.log("HABITDETAILVIEWDIALOG.TSX: handleToggleTodayCompletion - habit is null, returning.");
      return;
    }
    console.log(`HABITDETAILVIEWDIALOG.TSX: handleToggleTodayCompletion for habit ${habit.name}, complete: ${complete}`);
    const wasCompletedBefore = isTodayCompleted;
    onToggleComplete(habit.id, todayString, complete);
    if (!wasCompletedBefore && complete) {
      setShowSparkles(true); setTimeout(() => setShowSparkles(false), 800);
    }
  };

  const handleDayToggle = (dateToToggle: string) => {
    if (!habit) return;
    console.log(`HABITDETAILVIEWDIALOG.TSX: handleDayToggle for habit ${habit.name}, date: ${dateToToggle}`);
    const logForDay = habit.completionLog.find(log => log.date === dateToToggle);
    const isCurrentlyCompleted = logForDay?.status === 'completed';
    onToggleComplete(habit.id, dateToToggle, !isCurrentlyCompleted);
    if (!isCurrentlyCompleted && dateToToggle === todayString) { setShowSparkles(true); setTimeout(() => setShowSparkles(false), 800); }
  };

  const handleAddToCalendar = () => {
    if (!habit) return;
    try {
      const icsContent = generateICS(habit);
      downloadICS(`${habit.name.replace(/[^a-zA-Z0-9\\s]/g, '').replace(/\s+/g, '_')}.ics`, icsContent);
    } catch (error) { console.error("ICS Generation Error:", error); }
  };

  const handleShareHabit = async () => {
    if (!habit) return;
    let shareText = streak > 0 ? `I've kept up my habit '${habit.name}' for ${streak} day${streak > 1 ? 's' : ''} straight with Habitual! 💪 #HabitStreak #HabitualApp`
      : `Check out this habit I'm tracking: ${habit.name}! Join me on Habitual.`;
    try {
      if (navigator.share) await navigator.share({ title: `Habit: ${habit.name}`, text: shareText });
      else { await navigator.clipboard.writeText(shareText); console.log("Copied to clipboard."); }
    } catch (err) { console.error("Share/Copy failed:", err); }
  };


  let durationDisplay = '';
  if (habit.durationHours) durationDisplay += `${habit.durationHours} hr${habit.durationHours > 1 ? 's' : ''} `;
  if (habit.durationMinutes) durationDisplay += `${habit.durationMinutes} min`;
  durationDisplay = durationDisplay.trim();

  const cardStyle: React.CSSProperties = {};
  if (isTodayCompleted) {
    cardStyle.borderColor = `hsl(var(--accent))`; cardStyle.borderWidth = '1px';
  } else {
    const categoryColorVar = getCategoryColorVariable(habit.category);
    cardStyle.borderLeftColor = `hsl(var(${categoryColorVar}))`;
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col bg-card shadow-xl rounded-xl">
        <DialogHeader className="p-4 pr-14 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-primary">
              {getHabitDisplayIcon(habit)}
            </div>
            <DialogTitle className="text-2xl font-bold text-primary truncate">{habit.name}</DialogTitle>
          </div>
          {habit.reminderEnabled && <div className="flex items-center text-xs text-yellow-600 mt-1"><Bell className="mr-1 h-3 w-3" />Reminder is ON</div>}
        </DialogHeader>

        <ScrollArea className="flex-grow min-h-0">
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <TooltipProvider>
                <Tooltip><TooltipTrigger asChild>
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-800/30 dark:text-yellow-300 cursor-default">
                    <Flame className={cn("h-3.5 w-3.5 mr-1", streak > 0 ? "text-orange-500 animate-pulse" : "text-yellow-500/70 dark:text-yellow-400/70")} /><span>{`${streak}-Day Streak`}</span>
                  </div></TooltipTrigger><TooltipContent><p>{streak > 0 ? `Keep it up! You're on a ${streak}-day streak!` : "Start a streak!"}</p></TooltipContent></Tooltip>
              </TooltipProvider>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-rose-100 text-rose-700 dark:bg-rose-800/30 dark:text-rose-300">
                <span className="mr-1">🎯</span><span>{`${completedCountInCurrentWeek} / ${scheduledDaysInWeek} Completed`}</span>
              </div>
            </div>
            {scheduledDaysInWeek > 0 && <Progress value={weeklyProgressPercent} indicatorClassName="bg-accent" className="h-1.5 mb-2" />}

            <div className="space-y-1 mt-2 text-sm">
              {habit.category && (<div className="flex items-center text-muted-foreground"><Tag className="mr-1.5 h-4 w-4" /><span className="font-medium mr-1">Category:</span><span>{habit.category}</span></div>)}
              {durationDisplay && (<div className="flex items-center text-muted-foreground"><Hourglass className="mr-1.5 h-4 w-4" /><span className="font-medium mr-1">Duration:</span><span>{durationDisplay}</span></div>)}
              {habit.specificTime && habit.specificTime.toLowerCase() !== 'anytime' && habit.specificTime.toLowerCase() !== 'flexible' && (<div className="flex items-center text-muted-foreground"><Clock className="mr-1.5 h-4 w-4" /><span className="font-medium mr-1">Time:</span><span>{formatSpecificTime(habit.specificTime)}</span></div>)}
              {habit.optimalTiming && (<div className="flex items-center text-muted-foreground"><CalendarClock className="mr-1.5 h-4 w-4" /><span className="font-medium mr-1">Optimal:</span><span>{habit.optimalTiming}</span></div>)}
              {habit.description && (
                <div className="text-muted-foreground">
                  <span className="font-medium mr-1.5 flex items-start"><StickyNote className="mr-1.5 h-4 w-4 mt-0.5 shrink-0" />Desc:</span>
                  <div className={cn(!isDescriptionExpanded && habit.description.length > DESCRIPTION_TRUNCATE_LENGTH ? "line-clamp-3" : "", "inline")}>{isDescriptionExpanded || habit.description.length <= DESCRIPTION_TRUNCATE_LENGTH ? habit.description : `${habit.description.substring(0, DESCRIPTION_TRUNCATE_LENGTH)}...`}</div>
                  {habit.description.length > DESCRIPTION_TRUNCATE_LENGTH && <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="text-xs text-primary hover:underline ml-1">{isDescriptionExpanded ? "(show less)" : "(show more)"}</button>}
                </div>
              )}
            </div>

            {weekViewDays.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center text-sm text-muted-foreground mb-1"><CalendarDays className="mr-1.5 h-4 w-4" /><span className="font-semibold">This Week's Progress:</span></div>
                <div className="flex justify-around items-center space-x-1 py-1.5 bg-input/30 rounded-md">
                  {weekViewDays.map(dayInfo => {
                    const dayLog = habit.completionLog.find(log => log.date === dayInfo.dateStr);
                    const isScheduled = safeHabitDaysOfWeek.includes(dayInfo.dayAbbrFull);
                    let IconC = Circle; let iconClasses = "text-muted-foreground/40"; let dayBoxClasses = "bg-background/30 dark:bg-input/40 text-muted-foreground/60 hover:bg-input/50"; let titleText = `${dayInfo.dayAbbrFull} - ${format(dayInfo.date, 'MMM d')}`;

                    if (dayLog?.status === 'completed') { dayBoxClasses = 'bg-accent/20 hover:bg-accent/30'; IconC = CheckCircle2; iconClasses = 'text-accent'; titleText += ' (Completed)'; }
                    else if (dayLog?.status === 'skipped') { dayBoxClasses = 'bg-muted/40 hover:bg-muted/50'; IconC = CalendarX; iconClasses = 'text-muted-foreground'; titleText += ' (Skipped)'; }
                    else if (dayLog?.status === 'pending_makeup') { dayBoxClasses = 'bg-blue-500/20 hover:bg-blue-500/30'; IconC = CalendarClock; iconClasses = 'text-blue-500'; titleText += ' (Makeup Pending)'; }
                    else if (isScheduled) {
                      if (dayInfo.isPast && !dayInfo.isToday) { dayBoxClasses = 'bg-destructive/20 hover:bg-destructive/30'; IconC = XCircle; iconClasses = 'text-destructive'; titleText += ' (Missed)'; }
                      else { dayBoxClasses = 'ring-1 ring-orange-500/70 ring-offset-1 ring-offset-background bg-orange-500/10 hover:bg-orange-500/20'; IconC = Circle; iconClasses = 'text-orange-500'; titleText += ' (Scheduled)'; }
                    } else { titleText += ' (Not Scheduled)'; }

                    const canToggleDay = isScheduled || dayLog?.status === 'pending_makeup' || dayLog?.status === 'completed';
                    const isMissedAndActionable = isScheduled && dayInfo.isPast && !dayInfo.isToday && !dayLog;

                    return (
                      <TooltipProvider key={dayInfo.dateStr} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => { if (isMissedAndActionable) onOpenRescheduleDialog(habit, dayInfo.dateStr); else if (canToggleDay) handleDayToggle(dayInfo.dateStr); }}
                              className={cn(`flex flex-col items-center justify-center h-10 w-10 rounded-lg text-xs font-medium transition-transform active:scale-95`, dayBoxClasses, (canToggleDay || isMissedAndActionable) ? 'cursor-pointer' : 'cursor-default', dayInfo.isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background shadow-lg' : '')}
                              aria-label={`Status for ${habit.name} on ${dayInfo.dayAbbrFull}, ${format(dayInfo.date, 'MMM d')}`}>
                              <span className={cn("font-semibold", iconClasses === 'text-muted-foreground/40' ? 'text-muted-foreground/80': '')}>{dayInfo.dayAbbrShort}</span>
                              <IconC className={cn("h-4 w-4 mt-0.5", iconClasses)}/>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p>{titleText}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button 
                  onClick={() => handleToggleTodayCompletion(true)} 
                  disabled={isTodayCompleted}
                  className={cn(
                    "rounded-lg py-2.5 px-5 text-sm transition-all active:scale-95 flex-1 relative overflow-hidden",
                    !isTodayCompleted 
                      ? "bg-gradient-to-r from-primary to-destructive text-primary-foreground hover:brightness-95" 
                      : "bg-accent/30 text-accent-foreground/70 cursor-not-allowed",
                    isTodayCompleted && showSparkles && "animate-pulse-glow-accent animate-button-pop",
                    isTodayCompleted && !showSparkles && "shadow-[0_0_8px_hsl(var(--accent))]"
                  )} 
              >
                  {isTodayCompleted && showSparkles && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-full h-full">
                            <div className="sparkle sparkle-1" style={{top: "10%", left: "20%", "--tx": "-10px", "--ty": "-15px"} as React.CSSProperties}></div>
                            <div className="sparkle sparkle-2" style={{top: "20%", right: "15%", "--tx": "10px", "--ty": "-15px"} as React.CSSProperties}></div>
                            <div className="sparkle sparkle-3" style={{bottom: "15%", left: "25%", "--tx": "-10px", "--ty": "10px"} as React.CSSProperties}></div>
                            <div className="sparkle sparkle-4" style={{bottom: "10%", right: "20%", "--tx": "10px", "--ty": "10px"} as React.CSSProperties}></div>
                            <div className="sparkle sparkle-5" style={{top: "40%", left: "45%", "--tx": "0px", "--ty": "-10px"} as React.CSSProperties}></div>
                        </div>
                    </div>
                  )}
                  {!isTodayCompleted ? <><Check className="mr-2 h-4 w-4" /> Mark Today Done</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Done for Today!</>}
              </Button>
              <Button onClick={() => handleToggleTodayCompletion(false)} disabled={!isTodayCompleted} variant={isTodayCompleted ? "destructive" : "outline"}
                  className={cn("rounded-lg py-2.5 px-5 text-sm transition-all active:scale-95 flex-1", !isTodayCompleted ? "border-muted text-muted-foreground cursor-not-allowed" : "")} >
                  <XCircle className="mr-2 h-4 w-4" /> Not Done Today
              </Button>
            </div>
            
            {showWeeklyConfetti && (
              <div className="weekly-goal-animation-container">
                <div className="weekly-goal-text">Weekly Goal Met!</div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t flex flex-col sm:flex-row sm:justify-between items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="w-full sm:w-auto"><MoreHorizontal className="mr-2 h-4 w-4" />More Actions</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                <DropdownMenuItem onClick={() => {onOpenEditDialog(habit); onClose();}}><FilePenLine className="mr-2 h-4 w-4" /><span>Edit Habit</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenReflectionDialog(habit.id, todayString, habit.name)}><MessageSquarePlus className="mr-2 h-4 w-4" /><span>Add/Edit Note</span></DropdownMenuItem>
                 <DropdownMenuItem onClick={handleTriggerAIReflection}><Brain className="mr-2 h-4 w-4" /><span>AI Reflection Starter</span></DropdownMenuItem>
                <DropdownMenuItem className="flex items-center justify-between" onSelect={e => e.preventDefault()}>
                  <Label htmlFor={`reminder-switch-dialog-${habit.id}`} className="flex items-center cursor-pointer text-sm"><Bell className="mr-2 h-4 w-4" />Enable Reminder</Label>
                  <Switch id={`reminder-switch-dialog-${habit.id}`} checked={!!habit.reminderEnabled} onCheckedChange={() => onToggleReminder(habit.id, !!habit.reminderEnabled)} className="ml-auto" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onGetAISuggestion(habit)}><Lightbulb className="mr-2 h-4 w-4" /><span>AI Tip</span></DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddToCalendar}><CalendarPlus className="mr-2 h-4 w-4" /><span>Add to GCal</span></DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareHabit}><Share2 className="mr-2 h-4 w-4" /><span>Share</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const firstMissed = weekViewDays.find(d => safeHabitDaysOfWeek.includes(d.dayAbbrFull) && d.isPast && !d.isToday && !habit.completionLog.some(l => l.date === d.dateStr && (l.status === 'completed' || l.status === 'skipped' || l.status === 'pending_makeup')));
                  if (firstMissed) { onOpenRescheduleDialog(habit, firstMissed.dateStr); }
                  else { 
                    toast({ title: "No Missed Days", description: "No recent scheduled days to reschedule.", variant: "default" });
                    console.log("Reschedule: No past, uncompleted days found in current week view."); 
                  }
                }}><CalendarClock className="mr-2 h-4 w-4" /><span>Reschedule Missed</span></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {onOpenDeleteConfirm(habit.id, habit.name); onClose();}} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete Habit</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          <DialogClose asChild><Button variant="default" size="sm" className="w-full sm:w-auto">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <AIReflectionPromptDialog
        isOpen={isAIReflectionPromptDialogOpen}
        onClose={() => setIsAIReflectionPromptDialogOpen(false)}
        habitName={habit?.name || "Habit"}
        promptText={aiReflectionPromptText}
        isLoading={isAIReflectionLoading}
        error={aiReflectionError}
      />
    </>
  );
};

export default HabitDetailViewDialog;
