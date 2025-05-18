
"use client";

import type { FC } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Wand2, Clock, CalendarClock, Hourglass, PlusCircle, XCircle, Tag } from 'lucide-react';
import { createHabitFromDescription } from '@/ai/flows/habit-creation-from-description';
import type { Habit, CreateHabitFormData, WeekDay, HabitCategory } from '@/types';
import { HABIT_CATEGORIES } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InlineCreateHabitFormProps {
  onAddHabit: (habit: Omit<Habit, 'id' | 'completionLog'>) => void;
  onCloseForm: () => void;
}

const weekDaysArray = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const createHabitFormSchema = z.object({
  description: z.string().optional(),
  name: z.string().min(1, "Habit name is required."),
  category: z.enum(HABIT_CATEGORIES).optional(),
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
  const lowerDay = day.trim().toLowerCase().replace(/,/g, ''); // Remove commas for robustness
  return dayMapFullToAbbr[lowerDay];
};

const InlineCreateHabitForm: FC<InlineCreateHabitFormProps> = ({ onAddHabit, onCloseForm }) => {
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    reset,
    // watch, // Replaced by useWatch for 'description'
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CreateHabitFormData>({
    resolver: zodResolver(createHabitFormSchema),
    defaultValues: {
      description: '',
      name: '',
      category: 'Other',
      daysOfWeek: [],
      optimalTiming: '',
      durationHours: null,
      durationMinutes: null,
      specificTime: '',
    },
  });

  const habitDescriptionForAI = useWatch({
    control,
    name: 'description',
    defaultValue: ''
  });

  const isDescriptionEffectivelyEmpty = useMemo(() => {
    return !habitDescriptionForAI || (typeof habitDescriptionForAI === 'string' && habitDescriptionForAI.trim() === '');
  }, [habitDescriptionForAI]);


  useEffect(() => {
    // This effect is for cleanup on unmount
    return () => {
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
    }
  }, [reset]);


  const handleAISuggestDetails = async () => {
    const currentDescription = habitDescriptionForAI || "";
    if (currentDescription.trim() === "") {
      toast({
        title: "No Description Provided",
        description: "Please enter a description for the AI to suggest habit details.",
        variant: "destructive",
      });
      return;
    }
    setIsAISuggesting(true);
    try {
      const result = await createHabitFromDescription({ description: currentDescription });
      setValue('name', result.habitName || '');
      // AI does not suggest category for now. User selects it manually.

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
        description: "Habit details have been populated by AI (category is manual).",
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
      category: data.category,
      daysOfWeek: data.daysOfWeek,
      optimalTiming: data.optimalTiming,
      durationHours: data.durationHours === null ? undefined : data.durationHours,
      durationMinutes: data.durationMinutes === null ? undefined : data.durationMinutes,
      specificTime: data.specificTime,
    });
    reset();
    onCloseForm();
  };

  return (
    <Card className="bg-card shadow-lg border border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center">
          <PlusCircle className="mr-3 h-6 w-6 text-primary" />
          Add a New Habit
        </CardTitle>
        <CardDescription>
          Describe your new habit. AI can help suggest details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="inline-ai-description" className="text-sm font-medium">Describe habit (for AI)</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <Textarea id="inline-ai-description" placeholder="e.g., I want to read more books every morning for 30 mins" {...field} className="bg-input/50 text-sm" rows={2} />}
            />
            <Button
              type="button"
              onClick={handleAISuggestDetails}
              disabled={isAISuggesting || isDescriptionEffectivelyEmpty}
              variant="outline"
              size="sm"
              className="w-full mt-1"
            >
              {isAISuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Suggest Details with AI
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="inline-habit-name" className="text-sm font-medium">Habit Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input id="inline-habit-name" placeholder="e.g., Read a chapter daily" {...field} className="bg-input/50 text-sm" />}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="inline-habit-category" className="text-sm font-medium flex items-center">
                <Tag className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                Category
              </Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value || "Other"}>
                    <SelectTrigger id="inline-habit-category" className="bg-input/50 text-sm h-9">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {HABIT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-sm">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>
          </div>


          <div className="space-y-1">
            <Label className="text-sm font-medium">Days of the Week</Label>
            <div className="grid grid-cols-4 gap-1 p-1.5 border rounded-md bg-input/20">
              {weekDaysArray.map((day) => (
                <Controller
                  key={day}
                  name="daysOfWeek"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center space-x-1.5 p-1 rounded-md hover:bg-accent/10 transition-colors">
                      <Checkbox
                        id={`inline-day-${day}`}
                        checked={field.value?.includes(day)}
                        onCheckedChange={(checked) => {
                          const currentDays = field.value || [];
                          const newDays = checked
                            ? [...currentDays, day]
                            : currentDays.filter((d) => d !== day);
                          const uniqueDays = Array.from(new Set(newDays)).sort((a, b) => weekDaysArray.indexOf(a) - weekDaysArray.indexOf(b));
                          field.onChange(uniqueDays);
                        }}
                        className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-3.5 w-3.5"
                      />
                      <Label htmlFor={`inline-day-${day}`} className="text-xs font-normal cursor-pointer select-none">{day}</Label>
                    </div>
                  )}
                />
              ))}
            </div>
            {errors.daysOfWeek && <p className="text-xs text-destructive">{errors.daysOfWeek.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center"><Hourglass className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />Duration</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="inline-duration-hours" className="text-xs text-muted-foreground">Hours</Label>
                  <Controller
                    name="durationHours"
                    control={control}
                    render={({ field }) => <Input id="inline-duration-hours" type="number" placeholder="Hr" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} value={field.value ?? ''} className="bg-input/50 w-full text-sm h-9" min="0" />}
                  />
                   {errors.durationHours && <p className="text-xs text-destructive">{errors.durationHours.message}</p>}
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor="inline-duration-minutes" className="text-xs text-muted-foreground">Minutes</Label>
                  <Controller
                    name="durationMinutes"
                    control={control}
                    render={({ field }) => <Input id="inline-duration-minutes" type="number" placeholder="Min" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} value={field.value ?? ''} className="bg-input/50 w-full text-sm h-9" min="0" max="59"/>}
                  />
                   {errors.durationMinutes && <p className="text-xs text-destructive">{errors.durationMinutes.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="inline-habit-specificTime" className="text-sm font-medium flex items-center"><Clock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />Specific Time</Label>
              <Controller
                name="specificTime"
                control={control}
                render={({ field }) => <Input id="inline-habit-specificTime" type="time" {...field} className="bg-input/50 w-full text-sm h-9" />}
              />
              {errors.specificTime && <p className="text-xs text-destructive">{errors.specificTime.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="inline-habit-optimalTiming" className="text-sm font-medium flex items-center"><CalendarClock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />Optimal General Timing</Label>
            <Controller
              name="optimalTiming"
              control={control}
              render={({ field }) => <Input id="inline-habit-optimalTiming" placeholder="e.g., Morning, After work" {...field} className="bg-input/50 text-sm h-9" />}
            />
          </div>
          <CardFooter className="p-0 pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onCloseForm(); }} disabled={isSubmitting || isAISuggesting}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isAISuggesting} >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
              Add This Habit
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default InlineCreateHabitForm;

