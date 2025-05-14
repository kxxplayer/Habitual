"use client";

import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import AppHeader from '@/components/layout/AppHeader';
import HabitList from '@/components/habits/HabitList';
import CreateHabitDialog from '@/components/habits/CreateHabitDialog';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import type { Habit, AISuggestion as AISuggestionType } from '@/types';
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
      setHabits(JSON.parse(storedHabits));
    }
  }, []);

  // Save habits to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('habits', JSON.stringify(habits));
  }, [habits]);

  const handleAddHabit = (newHabitData: Omit<Habit, 'id' | 'completedDates'>) => {
    const newHabit: Habit = {
      ...newHabitData,
      id: Date.now().toString(), // Simple ID generation
      completedDates: [],
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
          const completedDates = completed
            ? [...habit.completedDates, date]
            : habit.completedDates.filter((d) => d !== date);
          // Simple animation feedback via toast
          if (completed) {
             toast({
                title: "Great Job!",
                description: `You've completed "${habit.name}" for today!`,
                className: "bg-accent border-green-600 text-accent-foreground",
             });
          }
          return { ...habit, completedDates };
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
      // Format tracking data for AI
      const trackingData = `Habit: ${habit.name}. Completed on: ${habit.completedDates.join(', ') || 'None yet'}.`;
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
    <div className="min-h-screen flex flex-col bg-background">
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
