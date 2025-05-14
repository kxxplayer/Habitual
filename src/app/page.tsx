
"use client";

import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import AppHeader from '@/components/layout/AppHeader';
import HabitList from '@/components/habits/HabitList';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import InlineCreateHabitForm from '@/components/habits/InlineCreateHabitForm'; // New import
import HabitOverview from '@/components/overview/HabitOverview';
import type { Habit, AISuggestion as AISuggestionType, WeekDay } from '@/types';
import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusCircle, Smile, Trash2, AlertTriangle, LayoutDashboard } from 'lucide-react';


const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;


const HabitualPage: NextPage = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = useState<AISuggestionType | null>(null);
  const { toast } = useToast();

  const [showInlineHabitForm, setShowInlineHabitForm] = useState(false); // New state for inline form
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDashboardDialogOpen, setIsDashboardDialogOpen] = useState(false);


  useEffect(() => {
    const storedHabits = localStorage.getItem('habits');
    if (storedHabits) {
      try {
        const parsedHabits: Habit[] = JSON.parse(storedHabits).map((habit: any) => {
          let daysOfWeek: WeekDay[] = habit.daysOfWeek || [];
          if (!habit.daysOfWeek && habit.frequency) {
            const freqLower = habit.frequency.toLowerCase();
            if (freqLower === 'daily') daysOfWeek = [...weekDays];
            else {
              const dayMap: { [key: string]: WeekDay } = {
                'sun': 'Sun', 'sunday': 'Sun', 'mon': 'Mon', 'monday': 'Mon',
                'tue': 'Tue', 'tuesday': 'Tue', 'wed': 'Wed', 'wednesday': 'Wed',
                'thu': 'Thu', 'thursday': 'Thu', 'fri': 'Fri', 'friday': 'Fri',
                'sat': 'Sat', 'saturday': 'Sat',
              };
              daysOfWeek = freqLower.split(/[\s,]+/).map((d: string) => dayMap[d.trim() as keyof typeof dayMap]).filter(Boolean) as WeekDay[];
            }
          }

          let migratedDurationHours: number | undefined = habit.durationHours;
          let migratedDurationMinutes: number | undefined = habit.durationMinutes;

          if (habit.duration && typeof habit.duration === 'string' && migratedDurationHours === undefined && migratedDurationMinutes === undefined) {
            const durationStr = habit.duration.toLowerCase();
            const hourMatch = durationStr.match(/(\d+)\s*hour/);
            const minMatch = durationStr.match(/(\d+)\s*min/);
            if (hourMatch) migratedDurationHours = parseInt(hourMatch[1]);
            if (minMatch) migratedDurationMinutes = parseInt(minMatch[1]);

            if (!hourMatch && !minMatch && /^\d+$/.test(durationStr)) {
                const numVal = parseInt(durationStr);
                if (numVal <= 120) migratedDurationMinutes = numVal;
            }
          }

          let migratedSpecificTime = habit.specificTime;
          if (migratedSpecificTime && /\d{1,2}:\d{2}\s*(am|pm)/i.test(migratedSpecificTime)) {
            try {
              const [timePart, modifier] = migratedSpecificTime.split(/\s+/);
              let [hours, minutes] = timePart.split(':').map(Number);
              if (modifier && modifier.toLowerCase() === 'pm' && hours < 12) hours += 12;
              if (modifier && modifier.toLowerCase() === 'am' && hours === 12) hours = 0;
              migratedSpecificTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            } catch (e) { /* ignore conversion error, keep original */ }
          } else if (migratedSpecificTime && /^\d{1,2}:\d{2}$/.test(migratedSpecificTime)) {
             const [hours, minutes] = migratedSpecificTime.split(':').map(Number);
             migratedSpecificTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          }


          return {
            id: habit.id || Date.now().toString(),
            name: habit.name || 'Unnamed Habit',
            description: habit.description || undefined,
            daysOfWeek: daysOfWeek,
            optimalTiming: habit.optimalTiming || undefined,
            durationHours: migratedDurationHours,
            durationMinutes: migratedDurationMinutes,
            specificTime: migratedSpecificTime || undefined,
            completionLog: habit.completionLog || (habit.completedDates
              ? habit.completedDates.map((d: string) => ({ date: d, time: 'N/A' }))
              : []),
          };
        });
        setHabits(parsedHabits);
      } catch (error) {
        console.error("Failed to parse habits from localStorage:", error);
        localStorage.removeItem('habits');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('habits', JSON.stringify(habits));
  }, [habits]);

  const handleAddHabit = (newHabitData: Omit<Habit, 'id' | 'completionLog'>) => {
    const newHabit: Habit = {
      ...newHabitData,
      id: Date.now().toString() + Math.random().toString(36).substring(2,7),
      completionLog: [],
    };
    setHabits((prevHabits) => [...prevHabits, newHabit]);
    toast({
      title: "Habit Added!",
      description: `"${newHabit.name}" is now ready to be tracked.`,
      action: <Smile className="h-5 w-5 text-accent" />,
    });
    setShowInlineHabitForm(false); // Close inline form after adding
  };

  const handleToggleComplete = (habitId: string, date: string, completed: boolean) => {
    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.id === habitId) {
          let newCompletionLog = [...habit.completionLog];
          if (completed) {
            const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            newCompletionLog = newCompletionLog.filter(log => log.date !== date); // Remove previous entries for the same date
            newCompletionLog.push({ date, time: currentTime });
            toast({
                title: "Great Job!",
                description: `You've completed "${habit.name}" for today!`,
                className: "bg-accent border-green-600 text-accent-foreground",
            });
            // Example:
            // const audio = new Audio('/sounds/completion-chime.mp3');
            // audio.play().catch(e => console.error("Error playing sound:", e));
          } else {
            newCompletionLog = newCompletionLog.filter(log => log.date !== date);
          }
          return { ...habit, completionLog: newCompletionLog };
        }
        return habit;
      })
    );
  };

  const handleOpenAISuggestionDialog = async (habit: Habit) => {
    setSelectedHabitForAISuggestion(habit);
    setIsAISuggestionDialogOpen(true);
    setAISuggestion({ habitId: habit.id, suggestionText: '', isLoading: true });

    try {
      const completionEntries = habit.completionLog.map(log => `${log.date} at ${log.time}`);
      const trackingData = `Habit: ${habit.name}. Completions: ${completionEntries.join(', ') || 'None yet'}.`;
      const result = await getHabitSuggestion({ habitName: habit.name, trackingData });
      setAISuggestion({ habitId: habit.id, suggestionText: result.suggestion, isLoading: false });
    } catch (error) {
      console.error("Error fetching AI suggestion:", error);
      setAISuggestion({
        habitId: habit.id,
        suggestionText: '',
        isLoading: false,
        error: 'Failed to get suggestion.'
      });
      toast({
        title: "AI Suggestion Error",
        description: "Could not fetch suggestion. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const toggleHabitSelection = (habitId: string) => {
    setSelectedHabitIds(prevSelected =>
      prevSelected.includes(habitId)
        ? prevSelected.filter(id => id !== habitId)
        : [...prevSelected, habitId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHabitIds(habits.map(h => h.id));
    } else {
      setSelectedHabitIds([]);
    }
  };

  const handleDeleteSelectedHabits = () => {
    setHabits(prevHabits => prevHabits.filter(habit => !selectedHabitIds.includes(habit.id)));
    toast({
      title: "Habits Deleted",
      description: `${selectedHabitIds.length} habit(s) have been removed.`,
    });
    setSelectedHabitIds([]);
    setIsDeleteConfirmOpen(false);
  };

  const allHabitsSelected = habits.length > 0 && selectedHabitIds.length === habits.length;


  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 p-2 sm:p-4">
      <div
        className="bg-background text-foreground shadow-xl rounded-xl flex flex-col w-full"
        style={{
          maxWidth: 'clamp(320px, 100%, 450px)',
          aspectRatio: '9 / 16',
          overflow: 'hidden',
        }}
      >
        <AppHeader />

        <div className="flex-grow overflow-y-auto">
          <main className="px-3 sm:px-4 py-6">
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Button size="lg" onClick={() => setShowInlineHabitForm(true)} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-5 w-5" />
                Add New Habit
              </Button>
              <Button size="lg" variant="outline" onClick={() => setIsDashboardDialogOpen(true)} className="w-full sm:w-auto">
                <LayoutDashboard className="mr-2 h-5 w-5" />
                View Dashboard
              </Button>
            </div>

            {showInlineHabitForm && (
              <div className="my-4">
                <InlineCreateHabitForm
                  onAddHabit={handleAddHabit}
                  onCloseForm={() => setShowInlineHabitForm(false)}
                />
              </div>
            )}
            
            {selectedHabitIds.length > 0 && habits.length > 0 && !showInlineHabitForm && (
              <div className="my-4 flex items-center gap-2 sm:gap-4 p-2 border rounded-md bg-card shadow-sm w-full justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-habits"
                    checked={allHabitsSelected}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    disabled={habits.length === 0}
                    aria-label="Select all habits"
                  />
                  <Label htmlFor="select-all-habits" className="text-xs sm:text-sm font-medium">
                    {allHabitsSelected ? "Deselect All" : "Select All"}
                  </Label>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {`${selectedHabitIds.length} sel.`}
                </span>
                <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="px-2 sm:px-3"
                    >
                      <Trash2 className="mr-0 sm:mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                        Confirm Deletion
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedHabitIds.length} selected habit(s)? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteSelectedHabits} className="bg-destructive hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            <HabitList
              habits={habits}
              onToggleComplete={handleToggleComplete}
              onGetAISuggestion={handleOpenAISuggestionDialog}
              selectedHabitIds={selectedHabitIds}
              onSelectHabit={toggleHabitSelection}
            />
          </main>
        </div>

        <footer className="py-3 text-center text-xs text-muted-foreground border-t shrink-0">
          <p>&copy; {new Date().getFullYear()} Habitual.</p>
        </footer>
      </div>

      {/* CreateHabitDialog is no longer used for the primary "Add New Habit" button */}
      {/* It could be repurposed or removed if not needed elsewhere */}

      {selectedHabitForAISuggestion && aiSuggestion && (
        <AISuggestionDialog
          isOpen={isAISuggestionDialogOpen}
          onClose={() => setIsAISuggestionDialogOpen(false)}
          habitName={selectedHabitForAISuggestion.name}
          suggestion={aiSuggestion.suggestionText}
          isLoading={aiSuggestion.isLoading}
          error={aiSuggestion.error}
        />
      )}

      <Dialog open={isDashboardDialogOpen} onOpenChange={setIsDashboardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <LayoutDashboard className="mr-2 h-5 w-5 text-primary" />
              Your Habit Dashboard
            </DialogTitle>
            <DialogDescription>
              A snapshot of your progress and today's checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-[65vh] overflow-y-auto pr-2"> {/* Added pr-2 for scrollbar spacing */}
            <HabitOverview habits={habits} />
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsDashboardDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default HabitualPage;

