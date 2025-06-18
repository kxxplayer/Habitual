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
  const { toast } = useToast();
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
      toast({ title: "AI Error", description: "Could not generate a reflection prompt.", variant: "destructive" });
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
                          "flex flex-col items-center px-2 py-1 rounded-md transition-all duration-200",
                          isCompleted ? "bg-green-100 text-green-700" : isMissed ? "bg-red-100 text-red-700" : "hover:bg-muted"
                        )}
                      >
                        <span className="text-xs font-medium">{day.dayAbbrShort}</span>
                        {isCompleted
                          ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                          : <Circle className="h-5 w-5 text-muted-foreground" />}
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
                        "w-full h-full px-4 py-3 rounded-lg font-semibold text-lg text-white shadow-lg",
                        "inline-flex items-center justify-center",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        localCompleted ? "bg-gradient-to-r from-pink-500 to-red-500" : "bg-gradient-to-r from-green-400 to-blue-500"
                      )}
                    >
                      {localCompleted ? "Not Done?" : "Mark as Done"}
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