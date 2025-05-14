"use client";

import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2, Clock, CalendarClock, Timer } from 'lucide-react';
import { createHabitFromDescription } from '@/ai/flows/habit-creation-from-description';
import type { Habit } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface CreateHabitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddHabit: (habit: Omit<Habit, 'id' | 'completionLog'>) => void;
}

const formSchema = z.object({
  description: z.string().optional(),
  name: z.string().min(1, "Habit name is required."),
  frequency: z.string().min(1, "Frequency is required."),
  optimalTiming: z.string().optional(),
  duration: z.string().optional(),
  specificTime: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const CreateHabitDialog: FC<CreateHabitDialogProps> = ({ isOpen, onClose, onAddHabit }) => {
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const { toast } = useToast();
  
  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      name: '',
      frequency: '',
      optimalTiming: '',
      duration: '',
      specificTime: '',
    },
  });

  const habitDescription = watch('description');

  useEffect(() => {
    if (!isOpen) {
      reset(); 
    }
  }, [isOpen, reset]);

  const handleAISuggest = async () => {
    if (!habitDescription || habitDescription.trim() === "") {
      toast({
        title: "No Description Provided",
        description: "Please enter a description for the AI to suggest habit details.",
        variant: "destructive",
      });
      return;
    }
    setIsAISuggesting(true);
    try {
      const result = await createHabitFromDescription({ description: habitDescription });
      setValue('name', result.habitName);
      setValue('frequency', result.frequency);
      setValue('optimalTiming', result.optimalTiming || '');
      setValue('duration', result.duration || '');
      setValue('specificTime', result.specificTime || '');
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
      setIsAISuggesting(false);
    }
  };

  const onSubmit = (data: FormData) => {
    onAddHabit({
      name: data.name,
      description: data.description,
      frequency: data.frequency,
      optimalTiming: data.optimalTiming,
      duration: data.duration,
      specificTime: data.specificTime,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] bg-card rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Create New Habit</DialogTitle>
          <DialogDescription>
            Define your new habit. You can describe it and let AI suggest details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-2">
          <div className="space-y-2">
            <Label htmlFor="description">Describe your habit (for AI suggestion)</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <Textarea id="description" placeholder="e.g., I want to read more books every morning for 30 mins" {...field} className="bg-background" />}
            />
             <Button type="button" onClick={handleAISuggest} disabled={isAISuggesting || !habitDescription} variant="outline" className="w-full mt-2">
              {isAISuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Suggest Details with AI
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Habit Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input id="name" placeholder="e.g., Read a chapter daily" {...field} className="bg-background" />}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Controller
                name="frequency"
                control={control}
                render={({ field }) => <Input id="frequency" placeholder="e.g., Daily, 3 times a week" {...field} className="bg-background" />}
              />
              {errors.frequency && <p className="text-sm text-destructive">{errors.frequency.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (Optional)</Label>
               <div className="relative">
                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Controller
                  name="duration"
                  control={control}
                  render={({ field }) => <Input id="duration" placeholder="e.g., 30 minutes" {...field} className="bg-background pl-10" />}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specificTime">Specific Time (Optional)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Controller
                  name="specificTime"
                  control={control}
                  render={({ field }) => <Input id="specificTime" placeholder="e.g., 08:00 AM, Anytime" {...field} className="bg-background pl-10" />}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="optimalTiming">Optimal General Timing (Optional, AI can suggest)</Label>
             <div className="relative">
                <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Controller
                name="optimalTiming"
                control={control}
                render={({ field }) => <Input id="optimalTiming" placeholder="e.g., Morning, After work" {...field} className="bg-background pl-10" />}
              />
            </div>
          </div>


          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isAISuggesting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateHabitDialog;
