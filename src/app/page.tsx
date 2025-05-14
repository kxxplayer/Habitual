"use client";

import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import AppHeader from '@/components/layout/AppHeader';
import HabitList from '@/components/habits/HabitList';
import CreateHabitDialog from '@/components/habits/CreateHabitDialog';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import type { Habit, AISuggestion as AISuggestionType, HabitCompletionLogEntry } from '@/types';
import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { useToast } from '@/hooks/use-toast';
import { Smile } from 'lucide-react';

const HabitualPage: NextPage = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = useState(false);
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = useState<AISuggestionType | null>(null);
  const { toast } = useToast();

  // Load habits from local storage on initial render
  useEffect(() => {
    const storedHabits = localStorage.getItem('habits');
    if (storedHabits) {
      try {
        const parsedHabits: Habit[] = JSON.parse(storedHabits).map((habit: any) => ({
          id: habit.id || Date.now().toString(),
          name: habit.name || 'Unnamed Habit',
          description: habit.description || undefined,
          frequency: habit.frequency || 'Daily',
          optimalTiming: habit.optimalTiming || undefined,
          duration: habit.duration || undefined,
          specificTime: habit.specificTime || undefined,
          completionLog: habit.completionLog || (habit.completedDates 
            ? habit.completedDates.map((d: string) => ({ date: d, time: 'N/A' })) 
            : []),
        }));
        setHabits(parsedHabits);
      } catch (error) {
        console.error("Failed to parse habits from localStorage:", error);
        localStorage.removeItem('habits'); // Clear corrupted data
      }
    }
  }, []);

  // Save habits to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('habits', JSON.stringify(habits));
  }, [habits]);

  const handleAddHabit = (newHabitData: Omit<Habit, 'id' | 'completionLog'>) => {
    const newHabit: Habit = {
      ...newHabitData,
      id: Date.now().toString(), 
      completionLog: [],
    };
    setHabits((prevHabits) => [...prevHabits, newHabit]);
    toast({
      title: "Habit Added!",
      description: `"${newHabit.name}" is now ready to be tracked.`,
      action: <Smile className="h-5 w-5 text-accent" />,
    });
  };

  const handleToggleComplete = (habitId: string, date: string, completed: boolean) => {
    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.id === habitId) {
          let newCompletionLog = [...habit.completionLog];
          if (completed) {
            const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            // Add new entry only if not already completed with the same date and time (prevents duplicates if clicked rapidly)
            // For simplicity, we'll just add. If multiple distinct completions per day are needed, this logic would be more complex.
            // For "Done Today", we assume one primary completion or re-completion.
            // If already completed today, this logic effectively updates the time or adds another entry if multiple are allowed.
            // Current setup: remove all for the day, then add one. Or just add if we want to log multiple times.
            // Let's stick to: if marking complete, ensure there's at least one entry for today with current time.
            // If un-marking, remove all entries for today.
            
            // Remove any existing entries for today to ensure only one "latest" completion for the day if re-checked.
            // Or, if we want to keep all distinct completions, then don't filter here.
            // For a simple "Done Today" checkbox, this approach works:
            newCompletionLog = newCompletionLog.filter(log => log.date !== date); 
            newCompletionLog.push({ date, time: currentTime });
            
            toast({
                title: "Great Job!",
                description: `You've completed "${habit.name}" for today!`,
                className: "bg-accent border-green-600 text-accent-foreground",
            });

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

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader onAddHabitClick={() => setIsCreateHabitDialogOpen(true)} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <HabitList
          habits={habits}
          onToggleComplete={handleToggleComplete}
          onGetAISuggestion={handleOpenAISuggestionDialog}
        />
      </main>
      <CreateHabitDialog
        isOpen={isCreateHabitDialogOpen}
        onClose={() => setIsCreateHabitDialogOpen(false)}
        onAddHabit={handleAddHabit}
      />
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
       <footer className="py-6 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Habitual. Build better habits, one day at a time.</p>
      </footer>
    </div>
  );
};

export default HabitualPage;
