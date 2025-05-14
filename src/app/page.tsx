"use client";

import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AppHeader from '@/components/layout/AppHeader';
import HabitList from '@/components/habits/HabitList';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import type { Habit, AISuggestion as AISuggestionType } from '@/types';
import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
import { createHabitFromDescription } from '@/ai/flows/habit-creation-from-description';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Wand2, Clock, CalendarClock, Timer, Smile, PlusCircle, CheckSquare, Square } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';


// Form schema for creating habits
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
type WeekDay = typeof weekDays[number];

const createHabitFormSchema = z.object({
  description: z.string().optional(), // For AI suggestion
  name: z.string().min(1, "Habit name is required."),
  daysOfWeek: z.array(z.enum(weekDays)).min(1, "Please select at least one day."),
  optimalTiming: z.string().optional(),
  duration: z.string().optional(),
  specificTime: z.string().optional(),
});

type CreateHabitFormData = z.infer<typeof createHabitFormSchema>;

const HabitualPage: NextPage = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = useState<AISuggestionType | null>(null);
  const { toast } = useToast();

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
      daysOfWeek: [],
      optimalTiming: '',
      duration: '',
      specificTime: '',
    },
  });

  const habitDescriptionForAI = watchCreateHabitForm('description');
  const selectedDaysOfWeek = watchCreateHabitForm('daysOfWeek');


  useEffect(() => {
    const storedHabits = localStorage.getItem('habits');
    if (storedHabits) {
      try {
        const parsedHabits: Habit[] = JSON.parse(storedHabits).map((habit: any) => {
          let daysOfWeek: WeekDay[] = habit.daysOfWeek || [];
          // Migration from old 'frequency' field
          if (!habit.daysOfWeek && habit.frequency) {
            const freqLower = habit.frequency.toLowerCase();
            if (freqLower === 'daily') {
              daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            } else {
              const dayMap: { [key: string]: WeekDay } = {
                'sun': 'Sun', 'sunday': 'Sun',
                'mon': 'Mon', 'monday': 'Mon',
                'tue': 'Tue', 'tuesday': 'Tue',
                'wed': 'Wed', 'wednesday': 'Wed',
                'thu': 'Thu', 'thursday': 'Thu',
                'fri': 'Fri', 'friday': 'Fri',
                'sat': 'Sat', 'saturday': 'Sat',
              };
              const potentialDays = freqLower.split(/[\s,]+/)
                .map((d: string) => dayMap[d.trim() as keyof typeof dayMap])
                .filter(Boolean) as WeekDay[];
              if (potentialDays.length > 0) {
                daysOfWeek = potentialDays;
              }
            }
          }

          return {
            id: habit.id || Date.now().toString(),
            name: habit.name || 'Unnamed Habit',
            description: habit.description || undefined,
            daysOfWeek: daysOfWeek,
            optimalTiming: habit.optimalTiming || undefined,
            duration: habit.duration || undefined,
            specificTime: habit.specificTime || undefined,
            completionLog: habit.completionLog || (habit.completedDates 
              ? habit.completedDates.map((d: string) => ({ date: d, time: 'N/A' })) 
              : []),
          };
        });
        setHabits(parsedHabits);
      } catch (error) {
        console.error("Failed to parse habits from localStorage:", error);
        localStorage.removeItem('habits'); // Clear corrupted data
      }
    }
  }, []);

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
      // Ensure AI returns valid 3-letter day codes or map them
      const validSuggestedDays = result.daysOfWeek.filter(day => weekDays.includes(day as WeekDay)) as WeekDay[];
      setCreateHabitFormValue('daysOfWeek', validSuggestedDays);
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

  const onSubmitHabitOnPage = (data: CreateHabitFormData) => {
    handleAddHabit({
      name: data.name,
      description: data.description,
      daysOfWeek: data.daysOfWeek,
      optimalTiming: data.optimalTiming,
      duration: data.duration,
      specificTime: data.specificTime,
    });
    resetCreateHabitForm();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
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
                <Label className="font-medium">Days of the Week</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 p-2 border rounded-md bg-input/20">
                  {weekDays.map((day) => (
                    <Controller
                      key={day}
                      name="daysOfWeek"
                      control={createHabitFormControl}
                      render={({ field }) => (
                        <div className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-accent/10 transition-colors">
                          <Checkbox
                            id={`day-${day}`}
                            checked={field.value?.includes(day)}
                            onCheckedChange={(checked) => {
                              const currentDays = field.value || [];
                              const newDays = checked
                                ? [...currentDays, day]
                                : currentDays.filter((d) => d !== day);
                              // Ensure unique days and maintain original order if possible, or sort
                              const uniqueDays = Array.from(new Set(newDays)).sort((a, b) => weekDays.indexOf(a) - weekDays.indexOf(b));
                              field.onChange(uniqueDays);
                            }}
                            className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                          <Label htmlFor={`day-${day}`} className="text-sm font-normal cursor-pointer select-none">{day}</Label>
                        </div>
                      )}
                    />
                  ))}
                </div>
                {createHabitFormErrors.daysOfWeek && <p className="text-sm text-destructive">{createHabitFormErrors.daysOfWeek.message}</p>}
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
