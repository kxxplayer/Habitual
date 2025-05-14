"use client";

import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AppHeader from '@/components/layout/AppHeader';
import HabitList from '@/components/habits/HabitList';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import type { Habit, AISuggestion as AISuggestionType, HabitCompletionLogEntry } from '@/types';
import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { createHabitFromDescription } from '@/ai/flows/habit-creation-from-description';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Wand2, Clock, CalendarClock, Timer, Smile, PlusCircle } from 'lucide-react';


// Form schema for creating habits
const createHabitFormSchema = z.object({
  description: z.string().optional(), // For AI suggestion
  name: z.string().min(1, "Habit name is required."),
  frequency: z.string().min(1, "Frequency is required."),
  optimalTiming: z.string().optional(),
  duration: z.string().optional(),
  specificTime: z.string().optional(),
});

type CreateHabitFormData = z.infer<typeof createHabitFormSchema>;

const HabitualPage: NextPage = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  // State for CreateHabitDialog removed: const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = useState(false);
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = useState<AISuggestionType | null>(null);
  const { toast } = useToast();

  // Form state and handlers for the inline "Add Habit" form
  const [isAISuggestingDetails, setIsAISuggestingDetails] = useState(false);
  const { 
    control: createHabitFormControl, 
    handleSubmit: handleCreateHabitSubmit, 
    reset: resetCreateHabitForm, 
    watch: watchCreateHabitForm, 
    setValue: setCreateHabitFormValue, 
    formState: { errors: createHabitFormErrors, isSubmitting: isSubmittingCreateHabitForm } 
  } = useForm<CreateHabitFormData>({
    resolver: zodResolver(createHabitFormSchema),
    defaultValues: {
      description: '',
      name: '',
      frequency: '',
      optimalTiming: '',
      duration: '',
      specificTime: '',
    },
  });

  const habitDescriptionForAI = watchCreateHabitForm('description');

  // Load habits from local storage
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
        localStorage.removeItem('habits');
      }
    }
  }, []);

  // Save habits to local storage
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

  // AI Suggestion for the inline form
  const handleAISuggestDetailsOnPage = async () => {
    if (!habitDescriptionForAI || habitDescriptionForAI.trim() === "") {
      toast({
        title: "No Description Provided",
        description: "Please enter a description for the AI to suggest habit details.",
        variant: "destructive",
      });
      return;
    }
    setIsAISuggestingDetails(true);
    try {
      const result = await createHabitFromDescription({ description: habitDescriptionForAI });
      setCreateHabitFormValue('name', result.habitName);
      setCreateHabitFormValue('frequency', result.frequency);
      setCreateHabitFormValue('optimalTiming', result.optimalTiming || '');
      setCreateHabitFormValue('duration', result.duration || '');
      setCreateHabitFormValue('specificTime', result.specificTime || '');
      toast({
        title: "AI Suggestion Applied",
        description: "Habit details have been populated by AI.",
      });
    } catch (error) {
      console.error("AI suggestion error:", error);
      toast({
        title: "AI Suggestion Failed",
        description: "Could not get suggestions from AI. Please try again or fill manually.",
        variant: "destructive",
      });
    } finally {
      setIsAISuggestingDetails(false);
    }
  };

  // Form submission for the inline form
  const onSubmitHabitOnPage = (data: CreateHabitFormData) => {
    handleAddHabit({
      name: data.name,
      description: data.description, // Save original description too
      frequency: data.frequency,
      optimalTiming: data.optimalTiming,
      duration: data.duration,
      specificTime: data.specificTime,
    });
    resetCreateHabitForm(); // Reset the form fields
  };


  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader /> {/* onAddHabitClick removed */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Inline Add Habit Form */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold flex items-center">
              <PlusCircle className="mr-3 h-7 w-7 text-primary" />
              Create New Habit
            </CardTitle>
            <CardDescription>
              Define your new habit below. You can describe it and let AI suggest details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateHabitSubmit(onSubmitHabitOnPage)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="ai-description" className="font-medium">Describe your habit (for AI suggestion)</Label>
                <Controller
                  name="description"
                  control={createHabitFormControl}
                  render={({ field }) => <Textarea id="ai-description" placeholder="e.g., I want to read more books every morning for 30 mins" {...field} className="bg-input/50" />}
                />
                 <Button type="button" onClick={handleAISuggestDetailsOnPage} disabled={isAISuggestingDetails || !habitDescriptionForAI} variant="outline" className="w-full mt-2">
                  {isAISuggestingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Suggest Details with AI
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="habit-name" className="font-medium">Habit Name</Label>
                  <Controller
                    name="name"
                    control={createHabitFormControl}
                    render={({ field }) => <Input id="habit-name" placeholder="e.g., Read a chapter daily" {...field} className="bg-input/50" />}
                  />
                  {createHabitFormErrors.name && <p className="text-sm text-destructive">{createHabitFormErrors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="habit-frequency" className="font-medium">Frequency</Label>
                  <Controller
                    name="frequency"
                    control={createHabitFormControl}
                    render={({ field }) => <Input id="habit-frequency" placeholder="e.g., Daily, 3 times a week" {...field} className="bg-input/50" />}
                  />
                  {createHabitFormErrors.frequency && <p className="text-sm text-destructive">{createHabitFormErrors.frequency.message}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="habit-duration" className="font-medium">Duration (Optional)</Label>
                   <div className="relative">
                    <Timer className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Controller
                      name="duration"
                      control={createHabitFormControl}
                      render={({ field }) => <Input id="habit-duration" placeholder="e.g., 30 minutes" {...field} className="bg-input/50 pl-10" />}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="habit-specificTime" className="font-medium">Specific Time (Optional)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Controller
                      name="specificTime"
                      control={createHabitFormControl}
                      render={({ field }) => <Input id="habit-specificTime" placeholder="e.g., 08:00 AM, Anytime" {...field} className="bg-input/50 pl-10" />}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="habit-optimalTiming" className="font-medium">Optimal General Timing (Optional)</Label>
                 <div className="relative">
                    <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Controller
                    name="optimalTiming"
                    control={createHabitFormControl}
                    render={({ field }) => <Input id="habit-optimalTiming" placeholder="e.g., Morning, After work" {...field} className="bg-input/50 pl-10" />}
                  />
                </div>
              </div>
              <Button type="submit" disabled={isSubmittingCreateHabitForm || isAISuggestingDetails} size="lg" className="w-full">
                {isSubmittingCreateHabitForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                Add This Habit
              </Button>
            </form>
          </CardContent>
        </Card>

        <HabitList
          habits={habits}
          onToggleComplete={handleToggleComplete}
          onGetAISuggestion={handleOpenAISuggestionDialog}
        />
      </main>
      
      {/* CreateHabitDialog removed from here */}

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
