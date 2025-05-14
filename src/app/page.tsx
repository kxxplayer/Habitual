
"use client";

import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useForm, Controller } // Removed: zodResolver, z
  from 'react-hook-form'; 

import AppHeader from '@/components/layout/AppHeader';
import HabitList from '@/components/habits/HabitList';
import AISuggestionDialog from '@/components/habits/AISuggestionDialog';
import CreateHabitDialog from '@/components/habits/CreateHabitDialog'; // Added
import type { Habit, AISuggestion as AISuggestionType, WeekDay, CreateHabitFormData } from '@/types'; // Added CreateHabitFormData, WeekDay
import { getHabitSuggestion } from '@/ai/flows/habit-suggestion';
// Removed: createHabitFromDescription (will be used in dialog)
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
// Removed: Input, Textarea, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, Checkbox
// Removed: Loader2, Wand2, Clock, CalendarClock, Timer, CheckSquare, Square, Hourglass
import { PlusCircle, Smile } from 'lucide-react';


const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;


const HabitualPage: NextPage = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isAISuggestionDialogOpen, setIsAISuggestionDialogOpen] = useState(false);
  const [selectedHabitForAISuggestion, setSelectedHabitForAISuggestion] = useState<Habit | null>(null);
  const [aiSuggestion, setAISuggestion] = useState<AISuggestionType | null>(null);
  const { toast } = useToast();

  const [isCreateHabitDialogOpen, setIsCreateHabitDialogOpen] = useState(false); // Added

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

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <Button size="lg" onClick={() => setIsCreateHabitDialogOpen(true)}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Habit
          </Button>
        </div>

        <HabitList
          habits={habits}
          onToggleComplete={handleToggleComplete}
          onGetAISuggestion={handleOpenAISuggestionDialog}
        />
      </main>
      
      <CreateHabitDialog
        isOpen={isCreateHabitDialogOpen}
        onClose={() => setIsCreateHabitDialogOpen(false)}
        onAddHabit={(data) => {
          handleAddHabit(data);
          setIsCreateHabitDialogOpen(false); // Close dialog after adding
        }}
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

    