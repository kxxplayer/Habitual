// src/components/habits/HabitDetailViewDialog.tsx
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Lightbulb, CalendarPlus, Flame, MoreHorizontal, MessageSquarePlus, Tag, ListChecks, HeartPulse, Briefcase, Paintbrush, Home as HomeIconLucide, Landmark, Users, Smile as LifestyleIcon, Sparkles as SparklesIcon, CheckCircle2, Circle, XCircle, Bell, FilePenLine, StickyNote, Trash2, CalendarClock, Edit3, Brain } from 'lucide-react';
import type { Habit, WeekDay, HabitCategory } from '../../types';
import { HABIT_CATEGORIES } from '../../types';
import { generateICS, downloadICS } from '../../lib/calendarUtils';
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { getCurrentWeekDays, calculateStreak } from '../../lib/dateUtils';
import { cn } from '../../lib/utils';
import type { ReflectionStarterInput, ReflectionStarterOutput } from '../../ai/flows/reflection-starter-flow';
import AIReflectionPromptDialog from '../../components/popups/AIReflectionPromptDialog';
import { useToast } from "../../hooks/use-toast";

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
  onGetAIReflectionPrompt: (input: ReflectionStarterInput) => Promise<ReflectionStarterOutput>;
}

// Helper function to get category icons based on the provided HABIT_CATEGORIES
const getCategoryIcon = (category?: HabitCategory) => {
  const iconProps = { className: "h-4 w-4 text-muted-foreground" };
  switch (category) {
    case 'Health & Fitness': return <HeartPulse {...iconProps} />;
    case 'Work & Study': return <Briefcase {...iconProps} />;
    case 'Personal Development': return <SparklesIcon {...iconProps} />;
    case 'Mindfulness': return <Brain {...iconProps} />;
    case 'Creative': return <Paintbrush {...iconProps} />;
    case 'Home & Environment': return <HomeIconLucide {...iconProps} />;
    case 'Finance': return <Landmark {...iconProps} />;
    case 'Social': return <Users {...iconProps} />;
    case 'Entertainment': return <LifestyleIcon {...iconProps} />;
    case 'Other': return <ListChecks {...iconProps} />;
    default: return <ListChecks {...iconProps} />;
  }
};


const HabitDetailViewDialog: FC<HabitDetailViewDialogProps> = ({
  habit, isOpen, onClose, onToggleComplete, onGetAISuggestion,
  onOpenReflectionDialog, onOpenRescheduleDialog, onToggleReminder,
  onOpenEditDialog, onOpenDeleteConfirm, onGetAIReflectionPrompt
}) => {
  const { toast } = useToast();
  const todayString = React.useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const [isAIReflectionLoading, setIsAIReflectionLoading] = React.useState(false);
  const [aiReflectionPrompt, setAiReflectionPrompt] = React.useState<string | null>(null);
  const [isAIReflectionDialogOpen, setIsAIReflectionDialogOpen] = React.useState(false);

  // If dialog is not open or habit is null, don't render
  if (!isOpen || !habit) return null;

  // Calculate current streak and get week days for progress display
  const currentStreak = calculateStreak(habit, new Date());
  const weekDays = getCurrentWeekDays(new Date());

  // Determine if the habit is completed today
  const today = startOfDay(new Date());
  const isCompletedToday = habit.completionLog.some(log => isSameDay(parseISO(log.date), today) && log.status === 'completed');

  // Determine if the habit is scheduled for today
  const todayInfo = weekDays.find(d => d.isToday);
  const isScheduledToday = todayInfo && habit.daysOfWeek.includes(todayInfo.dayAbbrFull);

  /**
   * Handles toggling the completion status for today.
   * This function will update the habit's completion log and trigger a re-render.
   * @param complete - Boolean indicating whether to mark as complete (true) or not complete (false).
   */
  const handleToggleTodayCompletion = (complete: boolean) => {
    if (!habit) return;
    // Call the parent's onToggleComplete with the desired new state
    onToggleComplete(habit.id, todayString, complete);
  };

  /**
   * Fetches and displays an AI-generated reflection prompt.
   */
  const handleGetAndShowAIReflection = async () => {
    setIsAIReflectionLoading(true);
    setIsAIReflectionDialogOpen(true);
    setAiReflectionPrompt(null); // Clear previous prompt
    try {
      const input: ReflectionStarterInput = {
        habitName: habit.name,
        habitCategory: habit.category,
        currentStreak: currentStreak,
        // Assuming completionLog has enough data to calculate recent completions
        recentCompletions: habit.completionLog.filter(log => log.status === 'completed' && weekDays.some(d => d.dateStr === log.date)).length,
        scheduledDaysInWeek: habit.daysOfWeek.length,
      };
      const result = await onGetAIReflectionPrompt(input);
      setAiReflectionPrompt(result.prompt);
    } catch (error) {
      console.error("Failed to get AI reflection prompt:", error);
      toast({ title: "AI Error", description: "Could not generate a reflection prompt.", variant: "destructive" });
      setIsAIReflectionDialogOpen(false); // Close dialog on error
    } finally {
      setIsAIReflectionLoading(false);
    }
  };

  /**
   * Generates and downloads an ICS file for the habit.
   */
  const handleShare = () => {
    try {
      const icsContent = generateICS(habit);
      downloadICS(`${habit.name}.ics`, icsContent);
      toast({ title: "Calendar Event Created", description: "An .ics file has been downloaded." });
    } catch (error) {
      console.error("Error generating ICS:", error);
      toast({ title: "Error", description: "Could not generate calendar event.", variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card rounded-lg shadow-xl p-0">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{habit.name}</DialogTitle>
                {habit.description && <DialogDescription>{habit.description}</DialogDescription>}
              </DialogHeader>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(habit.category)}
                  <span>{habit.category || 'No Category'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span>{currentStreak} day streak</span>
                </div>
              </div>

              <div className="my-6">
                <Label className="text-xs text-muted-foreground">This Week's Progress</Label>
                <div className="mt-2 flex justify-between gap-1">
                  {weekDays.map(day => {
                    // Find completion log for the specific day, if it exists
                    const logEntry = habit.completionLog.find(l => l.date === day.dateStr);
                    // Check if the habit is scheduled for this specific day of the week
                    const isScheduled = habit.daysOfWeek.includes(day.dayAbbrFull);
                    let status: 'completed' | 'missed' | 'pending' | 'none' = 'none';

                    if (logEntry?.status === 'completed') {
                      status = 'completed';
                    } else if (isScheduled && day.isPast && !logEntry) { // If scheduled, in the past, and no log entry implies missed
                      status = 'missed';
                    } else if (isScheduled) { // If scheduled and not yet completed/missed
                      status = 'pending';
                    }
                    // 'none' if not scheduled and no log entry

                    return (
                      <TooltipProvider key={day.dateStr}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn("flex flex-col items-center gap-2", day.isToday && "font-bold")}>
                              <span className="text-xs text-muted-foreground">{day.dayAbbrShort}</span>
                              {status === 'completed' ? <CheckCircle2 className="h-6 w-6 text-accent" /> :
                               status === 'missed' ? <XCircle className="h-6 w-6 text-destructive" /> :
                               status === 'pending' ? <Circle className={cn("h-6 w-6", day.isToday ? "text-primary" : "text-muted-foreground/30")} /> :
                               <div className="h-6 w-6" />} {/* Placeholder for unscheduled/unlogged days */}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{format(day.date, "MMM d")} - {status === 'completed' ? 'Completed' : status === 'missed' ? 'Missed' : isScheduled ? 'Scheduled' : 'Not Scheduled'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Mark as Done / Not Done? */}
              {isScheduledToday && (
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleToggleTodayCompletion(true)}
                    className={cn(
                      "w-full px-4 py-2 rounded-md font-medium transition-all duration-300 shadow-md",
                      // If habit is completed today, apply green gradient. Otherwise, apply greyed out style.
                      isCompletedToday
                        ? "bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-lg"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 opacity-50"
                    )}
                  >
                    Mark as Done
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleToggleTodayCompletion(false)}
                    className={cn(
                      "w-full px-4 py-2 rounded-md font-medium transition-all duration-300 shadow-md",
                      // If habit is NOT completed today, apply red gradient. Otherwise, apply greyed out style.
                      !isCompletedToday
                        ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 opacity-50"
                    )}
                  >
                    Not Done?
                  </motion.button>
                </div>
              )}

              {/* AI & Reflection Buttons */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => onGetAISuggestion(habit)}>
                  <Lightbulb className="mr-2 h-4 w-4" />AI Tip
                </Button>
                <Button variant="outline" onClick={handleGetAndShowAIReflection}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />AI Reflection
                </Button>
              </div>
            </div>
          </ScrollArea>
          {/* Dialog Footer with Close and More Options */}
          <DialogFooter className="p-3 border-t bg-muted/50 flex-row justify-between">
            <DialogClose asChild>
              <Button variant="ghost">Close</Button>
            </DialogClose>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpenEditDialog(habit)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Habit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenReflectionDialog(habit.id, todayString, habit.name)}>
                  <StickyNote className="mr-2 h-4 w-4" /> Add/Edit Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <CalendarPlus className="mr-2 h-4 w-4" /> Add to Calendar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => onOpenDeleteConfirm(habit.id, habit.name)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Habit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Reflection Dialog */}
      <AIReflectionPromptDialog
        isOpen={isAIReflectionDialogOpen}
        onClose={() => setIsAIReflectionDialogOpen(false)}
        habitName={habit.name}
        promptText={aiReflectionPrompt}
        isLoading={isAIReflectionLoading}
      />
    </>
  );
};

export default HabitDetailViewDialog;
