
"use client";

import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import AppHeader from '@/components/layout/AppHeader';
import HabitList from '@/components/habits/HabitList';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import AddReflectionNoteDialog from '@/components/habits/AddReflectionNoteDialog';
import InlineCreateHabitForm from '@/components/habits/InlineCreateHabitForm';
import HabitOverview from '@/components/overview/HabitOverview';
import type { Habit, AISuggestion as AISuggestionType, WeekDay, HabitCompletionLogEntry } from '@/types';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Smile, Trash2, AlertTriangle, LayoutDashboard, Home, Settings, StickyNote } from 'lucide-react';


const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;


const HabitualPage: NextPage = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = useState<AISuggestionType | null>(null);
  const { toast } = useToast();

  const [showInlineHabitForm, setShowInlineHabitForm] = useState(false);
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDashboardDialogOpen, setIsDashboardDialogOpen] = useState(false);

  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = useState(false);
  const [reflectionDialogData, setReflectionDialogData] = useState<{ 
    habitId: string; 
    date: string; 
    initialNote?: string;
    habitName: string;
  } | null>(null);


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
              const [timePart, modifierPart] = migratedSpecificTime.split(/\s+/);
              const [hoursStr, minutesStr] = timePart.split(':');
              let hours = parseInt(hoursStr, 10);
              const minutes = parseInt(minutesStr, 10);
              const modifier = modifierPart ? modifierPart.toLowerCase() : '';

              if (modifier === 'pm' && hours < 12) hours += 12;
              if (modifier === 'am' && hours === 12) hours = 0; 
              migratedSpecificTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            } catch (e) { /* ignore */ }
          } else if (migratedSpecificTime && /^\d{1,2}:\d{2}$/.test(migratedSpecificTime)) {
             const [hours, minutes] = migratedSpecificTime.split(':').map(Number);
             migratedSpecificTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          }
          
          // Ensure completionLog entries have a note field, even if undefined
          const migratedCompletionLog = (habit.completionLog || (habit.completedDates
              ? habit.completedDates.map((d: string) => ({ date: d, time: 'N/A', note: undefined }))
              : [])).map((log: any) => ({
                date: log.date,
                time: log.time,
                note: log.note || undefined, // Ensure note field exists
              }));


          return {
            id: habit.id || Date.now().toString() + Math.random().toString(36).substring(2,7),
            name: habit.name || 'Unnamed Habit',
            description: habit.description || undefined,
            daysOfWeek: daysOfWeek,
            optimalTiming: habit.optimalTiming || undefined,
            durationHours: migratedDurationHours,
            durationMinutes: migratedDurationMinutes,
            specificTime: migratedSpecificTime || undefined,
            completionLog: migratedCompletionLog as HabitCompletionLogEntry[],
          };
        });
        setHabits(parsedHabits);
      } catch (error) {
        console.error("Failed to parse habits from localStorage:", error);
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
    setShowInlineHabitForm(false); 
  };

  const handleToggleComplete = (habitId: string, date: string, completed: boolean) => {
    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.id === habitId) {
          let newCompletionLog = [...habit.completionLog];
          if (completed) {
            const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            const existingLogIndex = newCompletionLog.findIndex(log => log.date === date);
            if (existingLogIndex > -1) {
              // If log exists, update time, keep note
              newCompletionLog[existingLogIndex] = { ...newCompletionLog[existingLogIndex], time: currentTime };
            } else {
              // Add new log entry without a note initially
              newCompletionLog.push({ date, time: currentTime, note: undefined });
            }
            toast({
                title: "Great Job!",
                description: `You've completed "${habit.name}" for today!`,
                className: "bg-accent border-green-600 text-accent-foreground",
            });
          } else {
            newCompletionLog = newCompletionLog.filter(log => log.date !== date);
          }
          return { ...habit, completionLog: newCompletionLog.sort((a, b) => b.date.localeCompare(a.date)) };
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
      const completionEntries = habit.completionLog.map(log => {
        let entry = `${log.date} at ${log.time}`;
        if (log.note && log.note.trim() !== "") {
          entry += ` (Note: ${log.note.trim()})`;
        }
        return entry;
      });
      const trackingData = `Completions: ${completionEntries.join('; ') || 'None yet'}.`;
      
      const inputForAI = {
        habitName: habit.name,
        habitDescription: habit.description,
        daysOfWeek: habit.daysOfWeek,
        optimalTiming: habit.optimalTiming,
        durationHours: habit.durationHours,
        durationMinutes: habit.durationMinutes,
        specificTime: habit.specificTime,
        trackingData: trackingData,
      };

      const result = await getHabitSuggestion(inputForAI);
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

  const handleOpenReflectionDialog = (habitId: string, date: string, habitName: string) => {
    const habit = habits.find(h => h.id === habitId);
    const logEntry = habit?.completionLog.find(log => log.date === date);
    setReflectionDialogData({
      habitId,
      date,
      initialNote: logEntry?.note || '',
      habitName,
    });
    setIsReflectionDialogOpen(true);
  };

  const handleSaveReflectionNote = (note: string) => {
    if (!reflectionDialogData) return;
    const { habitId, date } = reflectionDialogData;

    setHabits(prevHabits => 
      prevHabits.map(h => {
        if (h.id === habitId) {
          const newCompletionLog = h.completionLog.map(log => {
            if (log.date === date) {
              return { ...log, note: note.trim() === "" ? undefined : note.trim() };
            }
            return log;
          });
          // If no log entry exists for the date (shouldn't happen if dialog opened from completed item)
          // This path is defensive. Typically, a log entry for 'date' should exist.
          if (!newCompletionLog.some(log => log.date === date)) {
             const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
             newCompletionLog.push({date, time: currentTime, note: note.trim() === "" ? undefined : note.trim()});
             newCompletionLog.sort((a,b) => b.date.localeCompare(a.date)); // Keep sorted
          }
          return { ...h, completionLog: newCompletionLog };
        }
        return h;
      })
    );
    toast({
      title: "Reflection Saved",
      description: `Your note for "${reflectionDialogData.habitName}" has been saved.`,
      action: <StickyNote className="h-5 w-5 text-accent" />
    });
    setReflectionDialogData(null);
    setIsReflectionDialogOpen(false);
  };


  const allHabitsSelected = habits.length > 0 && selectedHabitIds.length === habits.length;


  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 p-2 sm:p-4">
      <div
        className="bg-background text-foreground shadow-xl rounded-xl flex flex-col w-full"
        style={{
          maxWidth: 'clamp(320px, 100%, 450px)', 
          height: 'clamp(600px, 90vh, 800px)', 
          overflow: 'hidden', 
        }}
      >
        <AppHeader />

        <div className="flex-grow overflow-y-auto">
          <main className="px-3 sm:px-4 py-6">
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

            {!showInlineHabitForm && (
                <HabitList
                habits={habits}
                onToggleComplete={handleToggleComplete}
                onGetAISuggestion={handleOpenAISuggestionDialog}
                onOpenReflectionDialog={handleOpenReflectionDialog}
                selectedHabitIds={selectedHabitIds}
                onSelectHabit={toggleHabitSelection}
                />
            )}
          </main>
          <footer className="py-3 text-center text-xs text-muted-foreground border-t mt-auto">
            <p>&copy; {new Date().getFullYear()} Habitual.</p>
          </footer>
        </div> 

        <div className="shrink-0 bg-card border-t border-border p-1 flex justify-around items-center h-16">
          <Button variant="ghost" className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/3">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-0.5">Home</span>
          </Button>
          <Button variant="ghost" onClick={() => setIsDashboardDialogOpen(true)} className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/3">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs mt-0.5">Dashboard</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center justify-center h-full p-1 text-muted-foreground hover:text-primary w-1/3">
            <Settings className="h-5 w-5" />
            <span className="text-xs mt-0.5">Settings</span>
          </Button>
        </div> 
      </div> 

      {!showInlineHabitForm && (
        <Button
          className="fixed bottom-[calc(4rem+1.5rem)] right-6 sm:right-10 h-14 w-14 p-0 rounded-full shadow-xl z-30 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
          onClick={() => setShowInlineHabitForm(true)}
          aria-label="Add New Habit"
        >
          <Plus className="h-7 w-7" />
        </Button>
      )}

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

      {reflectionDialogData && (
        <AddReflectionNoteDialog
          isOpen={isReflectionDialogOpen}
          onClose={() => {
            setIsReflectionDialogOpen(false);
            setReflectionDialogData(null);
          }}
          onSaveNote={handleSaveReflectionNote}
          initialNote={reflectionDialogData.initialNote}
          habitName={reflectionDialogData.habitName}
          completionDate={reflectionDialogData.date}
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
          <div className="py-2 max-h-[65vh] overflow-y-auto pr-2">
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
