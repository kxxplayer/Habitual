
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
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Wand2, Clock, CalendarClock, Hourglass, PlusCircle, Tag } from 'lucide-react';
import { createHabitFromDescription } from '@/ai/flows/habit-creation-from-description';
import type { Habit, CreateHabitFormData, WeekDay, HabitCategory } from '@/types';
import { HABIT_CATEGORIES } from '@/types'; // Import categories
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


interface CreateHabitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddHabit: (habit: Omit<Habit, 'id' | 'completionLog'>) => void;
}

const weekDaysArray = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const createHabitFormSchema = z.object({
  description: z.string().optional(),
  name: z.string().min(1, "Habit name is required."),
  category: z.enum(HABIT_CATEGORIES).optional(), // Add category to schema
  daysOfWeek: z.array(z.enum(weekDaysArray)).min(1, "Please select at least one day."),
  optimalTiming: z.string().optional(),
  durationHours: z.coerce.number().min(0).optional().nullable(),
  durationMinutes: z.coerce.number().min(0).max(59).optional().nullable(),
  specificTime: z.string().optional(),
}).refine(data => data.durationHours || data.durationMinutes || (!data.durationHours && !data.durationMinutes), {});

const dayMapFullToAbbr: { [key: string]: WeekDay } = {
  "sunday": "Sun", "sun": "Sun", "sunday,": "Sun", "sun,": "Sun",
  "monday": "Mon", "mon": "Mon", "monday,": "Mon", "mon,": "Mon",
  "tuesday": "Tue", "tue": "Tue", "tuesday,": "Tue", "tue,": "Tue",
  "wednesday": "Wed", "wed": "Wed", "wednesday,": "Wed", "wed,": "Wed",
  "thursday": "Thu", "thu": "Thu", "thursday,": "Thu", "thu,": "Thu",
  "friday": "Fri", "fri": "Fri", "friday,": "Fri", "fri,": "Fri",
  "saturday": "Sat", "sat": "Sat", "saturday,": "Sat", "sat,": "Sat",
};

const normalizeDay = (day: string): WeekDay | undefined => {
  if (typeof day !== 'string') return undefined;
  const lowerDay = day.trim().toLowerCase().replace(/,/g, '');
  return dayMapFullToAbbr[lowerDay];
};

const CreateHabitDialog: FC<CreateHabitDialogProps> = ({ isOpen, onClose, onAddHabit }) => {
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CreateHabitFormData>({
    resolver: zodResolver(createHabitFormSchema),
    defaultValues: {
      description: '',
      name: '',
      category: 'Other', // Default category
      daysOfWeek: [],
      optimalTiming: '',
      durationHours: null,
      durationMinutes: null,
      specificTime: '',
    },
  });

  const habitDescriptionForAI = watch('description');

  useEffect(() => {
    if (!isOpen) {
      reset({
        description: '',
        name: '',
        category: 'Other',
        daysOfWeek: [],
        optimalTiming: '',
        durationHours: null,
        durationMinutes: null,
        specificTime: '',
      });
      setIsAISuggesting(false);
    }
  }, [isOpen, reset]);

  const handleAISuggestDetails = async () => {
    if (!habitDescriptionForAI || habitDescriptionForAI.trim() === "") {
      toast({
        title: "No Description Provided",
        description: "Please enter a description for the AI to suggest habit details.",
        variant: "destructive",
      });
      return;
    }
    setIsAISuggesting(true);
    try {
      const result = await createHabitFromDescription({ description: habitDescriptionForAI });
      setValue('name', result.habitName || '');

      if (result.category && HABIT_CATEGORIES.includes(result.category as HabitCategory)) {
        setValue('category', result.category as HabitCategory);
      }

      let suggestedDays: WeekDay[] = [];
      if (result.daysOfWeek && Array.isArray(result.daysOfWeek)) {
        suggestedDays = result.daysOfWeek
          .map(day => normalizeDay(day as string))
          .filter((d): d is WeekDay => d !== undefined);
      }
      setValue('daysOfWeek', suggestedDays);

      setValue('optimalTiming', result.optimalTiming || '');
      setValue('durationHours', result.durationHours ?? null);
      setValue('durationMinutes', result.durationMinutes ?? null);

      if (result.specificTime && /^\d{2}:\d{2}$/.test(result.specificTime)) {
        setValue('specificTime', result.specificTime);
      } else if (result.specificTime && (result.specificTime.toLowerCase() === "anytime" || result.specificTime.toLowerCase() === "flexible")) {
         setValue('specificTime', '');
      } else {
        setValue('specificTime', result.specificTime || '');
      }

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

  const onSubmit = (data: CreateHabitFormData) => {
    onAddHabit({
      name: data.name,
      description: data.description,
      category: data.category, // Pass category
      daysOfWeek: data.daysOfWeek,
      optimalTiming: data.optimalTiming,
      durationHours: data.durationHours === null ? undefined : data.durationHours,
      durationMinutes: data.durationMinutes === null ? undefined : data.durationMinutes,
      specificTime: data.specificTime,
    });
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] bg-card rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center">
            <PlusCircle className="mr-3 h-7 w-7 text-primary" />
            Create New Habit (Dialog)
          </DialogTitle>
          <DialogDescription>
            Define your new habit below. You can describe it and let AI suggest details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1 pt-4">
          <div className="space-y-2">
            <Label htmlFor="dialog-ai-description" className="font-medium">Describe your habit (for AI suggestion)</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <Textarea id="dialog-ai-description" placeholder="e.g., I want to read more books every morning for 30 mins" {...field} className="bg-input/50" />}
            />
            <Button type="button" onClick={handleAISuggestDetails} disabled={isAISuggesting || !habitDescriptionForAI} variant="outline" className="w-full mt-2">
              {isAISuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Suggest Details with AI
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="dialog-habit-name" className="font-medium">Habit Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input id="dialog-habit-name" placeholder="e.g., Read a chapter daily" {...field} className="bg-input/50" />}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dialog-habit-category" className="font-medium flex items-center">
                <Tag className="mr-1.5 h-4 w-4 text-muted-foreground" />
                Category
              </Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || "Other"}>
                    <SelectTrigger id="dialog-habit-category" className="bg-input/50">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {HABIT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>
          </div>


          <div className="space-y-2">
            <Label className="font-medium">Days of the Week</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 p-2 border rounded-md bg-input/20">
              {weekDaysArray.map((day) => (
                <Controller
                  key={day}
                  name="daysOfWeek"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-accent/10 transition-colors">
                      <Checkbox
                        id={`dialog-day-${day}`}
                        checked={field.value?.includes(day)}
                        onCheckedChange={(checked) => {
                          const currentDays = field.value || [];
                          const newDays = checked
                            ? [...currentDays, day]
                            : currentDays.filter((d) => d !== day);
                          const uniqueDays = Array.from(new Set(newDays)).sort((a, b) => weekDaysArray.indexOf(a) - weekDaysArray.indexOf(b));
                          field.onChange(uniqueDays);
                        }}
                        className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <Label htmlFor={`dialog-day-${day}`} className="text-sm font-normal cursor-pointer select-none">{day}</Label>
                    </div>
                  )}
                />
              ))}
            </div>
            {errors.daysOfWeek && <p className="text-sm text-destructive">{errors.daysOfWeek.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-medium flex items-center"><Hourglass className="mr-2 h-4 w-4 text-muted-foreground" />Duration (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dialog-duration-hours" className="text-xs text-muted-foreground">Hours</Label>
                  <Controller
                    name="durationHours"
                    control={control}
                    render={({ field }) => <Input id="dialog-duration-hours" type="number" placeholder="e.g., 1" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} value={field.value ?? ''} className="bg-input/50 w-full" min="0" />}
                  />
                   {errors.durationHours && <p className="text-sm text-destructive">{errors.durationHours.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dialog-duration-minutes" className="text-xs text-muted-foreground">Minutes</Label>
                  <Controller
                    name="durationMinutes"
                    control={control}
                    render={({ field }) => <Input id="dialog-duration-minutes" type="number" placeholder="e.g., 30" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} value={field.value ?? ''} className="bg-input/50 w-full" min="0" max="59"/>}
                  />
                   {errors.durationMinutes && <p className="text-sm text-destructive">{errors.durationMinutes.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dialog-habit-specificTime" className="font-medium flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground" />Specific Time (Optional)</Label>
              <Controller
                name="specificTime"
                control={control}
                render={({ field }) => <Input id="dialog-habit-specificTime" type="time" {...field} className="bg-input/50 w-full" />}
              />
              {errors.specificTime && <p className="text-sm text-destructive">{errors.specificTime.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dialog-habit-optimalTiming" className="font-medium flex items-center"><CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />Optimal General Timing (Optional)</Label>
            <Controller
              name="optimalTiming"
              control={control}
              render={({ field }) => <Input id="dialog-habit-optimalTiming" placeholder="e.g., Morning, After work" {...field} className="bg-input/50" />}
            />
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
                <Button type="button" variant="outline">
                    Cancel
                </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || isAISuggesting} >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
              Add This Habit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateHabitDialog;

