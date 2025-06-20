"use client";

import * as React from 'react';
import type { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Lightbulb, CalendarPlus, Flame, MoreHorizontal,
  MessageSquarePlus, ListChecks, HeartPulse, Briefcase,
  Paintbrush, Home as HomeIconLucide, Landmark, Users,
  Smile as LifestyleIcon, Sparkles as SparklesIcon,
  CheckCircle2, Circle, StickyNote, Trash2, Edit3, Brain
} from 'lucide-react';
import type { Habit, HabitCategory, ReflectionStarterInput, ReflectionStarterOutput } from '../../types';
import { generateICS, downloadICS } from '@/lib/calendarUtils';
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { getCurrentWeekDays, calculateStreak } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import AIReflectionPromptDialog from '@/components/popups/AIReflectionPromptDialog';

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
  const todayString = React.useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const [isAIReflectionLoading, setIsAIReflectionLoading] = React.useState(false);
  const [aiReflectionPrompt, setAiReflectionPrompt] = React.useState<string | null>(null);
  const [isAIReflectionDialogOpen, setIsAIReflectionDialogOpen] = React.useState(false);
  
  const today = startOfDay(new Date());
  
  const isCompletedToday = habit?.completionLog.some(log => isSameDay(parseISO(log.date), today) && log.status === 'completed') ?? false;

  const [localCompleted, setLocalCompleted] = React.useState<boolean>(isCompletedToday);

  React.useEffect(() => {
    if (isOpen && habit) {
      const completedStatus = habit.completionLog.some(log => isSameDay(parseISO(log.date), today) && log.status === 'completed');
      setLocalCompleted(completedStatus);
    }
  }, [isOpen, habit, today]);

  if (!isOpen || !habit) return null;

  const currentStreak = calculateStreak(habit);
  const weekDays = getCurrentWeekDays(new Date());

  const todayInfo = weekDays.find(d => d.isToday);
  const isScheduledToday = todayInfo && habit.daysOfWeek.includes(todayInfo.dayAbbrFull);

  const handleToggleCompletion = () => {
    const newState = !localCompleted;
    setLocalCompleted(newState);
    onToggleComplete(habit.id, todayString, newState);
  };

  const handleGetAndShowAIReflection = async () => {
    setIsAIReflectionLoading(true);
    setIsAIReflectionDialogOpen(true);
    setAiReflectionPrompt(null);
    try {
      const input: ReflectionStarterInput = {
        habitName: habit.name,
      };
      const result = await onGetAIReflectionPrompt(input);
      setAiReflectionPrompt(result.reflectionPrompt);
    } catch (error) {
      console.error("Failed to get AI reflection prompt:", error);
      setIsAIReflectionDialogOpen(false);
    } finally {
      setIsAIReflectionLoading(false);
    }
  };

  const handleShare = () => {
    try {
      if (!habit) return;
      const icsContent = generateICS(habit);
      downloadICS(`${habit.name}.ics`, icsContent);
    } catch (error) {
      console.error("Error generating ICS:", error);
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
                <Label className="text-xs text-muted-foreground">{`This Week's Progress`}</Label>
                <div className="mt-2 flex justify-between gap-1">
                  {weekDays.map(day => {
                    const logEntry = habit.completionLog.find(l => l.date === day.dateStr);
                    const isScheduled = habit.daysOfWeek.includes(day.dayAbbrFull);
                    const isCompleted = logEntry?.status === 'completed';
                    const isMissed = isScheduled && day.isPast && !logEntry;

                    return (
                      <div
                        key={day.dateStr}
                        className={cn(
                          "flex flex-col items-center px-2 py-2 rounded-lg transition-all duration-200 relative",
                          isCompleted ? "bg-green-50 text-green-700 shadow-sm" : isMissed ? "bg-red-50 text-red-700 shadow-sm" : "hover:bg-muted/50"
                        )}
                      >
                        <span className="text-xs font-medium mb-1">{day.dayAbbrShort}</span>
                        <div className="relative">
                          {isCompleted ? (
                            <div className="relative">
                              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md">
                                <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
                            </div>
                          ) : isMissed ? (
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-md">
                              <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          ) : (
                            <div className={cn(
                              "h-6 w-6 rounded-full border-2 transition-all duration-200",
                              isScheduled 
                                ? "border-primary/40 border-dashed hover:border-primary/70 bg-primary/5" 
                                : "border-muted-foreground/20 bg-muted/30"
                            )}>
                              <div className={cn(
                                "h-1.5 w-1.5 rounded-full mx-auto mt-1.5 transition-all duration-200",
                                isScheduled ? "bg-primary/30" : "bg-muted-foreground/20"
                              )} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isScheduledToday && (
                <div className="my-6 h-12">
                  <AnimatePresence mode="wait">
                    <motion.button
                      key={localCompleted ? 'done' : 'not-done'}
                      onClick={handleToggleCompletion}
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -15, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "w-full h-full px-4 py-3 rounded-xl font-semibold text-lg shadow-lg relative overflow-hidden",
                        "inline-flex items-center justify-center gap-3 group",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "transition-all duration-300 ease-in-out active:scale-[0.98]",
                        localCompleted 
                          ? "bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 text-white hover:from-red-600 hover:via-pink-600 hover:to-purple-700 shadow-pink-500/30" 
                          : "bg-gradient-to-r from-blue-500 via-green-500 to-teal-600 text-white hover:from-blue-600 hover:via-green-600 hover:to-teal-700 shadow-blue-500/30"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-full transition-all duration-300",
                        "bg-white/20 backdrop-blur-sm border border-white/30"
                      )}>
                        {localCompleted ? (
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="font-bold tracking-wide">
                        {localCompleted ? "Mark as Not Done" : "Mark as Done"}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 group-hover:translate-x-full transition-transform duration-700" />
                    </motion.button>
                  </AnimatePresence>
                </div>
              )}

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