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
  initialData?: Partial<CreateHabitFormData> | null;
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
  "sunday": "Sun", "sun": "Sun", "sunday,": "Sun", "sun,": "Sun", "sundays": "Sun",
  "monday": "Mon", "mon": "Mon", "monday,": "Mon", "mon,": "Mon", "mondays": "Mon",
  "tuesday": "Tue", "tue": "Tue", "tuesday,": "Tue", "tue,": "Tue", "tuesdays": "Tue",
  "wednesday": "Wed", "wed": "Wed", "wednesday,": "Wed", "wed,": "Wed", "wednesdays": "Wed",
  "thursday": "Thu", "thu": "Thu", "thursday,": "Thu", "thu,": "Thu", "thursdays": "Thu",
  "friday": "Fri", "fri": "Fri", "friday,": "Fri", "fri,": "Fri", "fridays": "Fri",
  "saturday": "Sat", "sat": "Sat", "saturday,": "Sat", "sat,": "Sat", "saturdays": "Sat",
};

const normalizeDay = (day: string): WeekDay | undefined => {
  if (typeof day !== 'string') return undefined;
  const lowerDay = day.trim().toLowerCase().replace(/,/g, '');
  return dayMapFullToAbbr[lowerDay] || weekDaysArray.find(d => d.toLowerCase() === lowerDay) || undefined;
};

const InlineCreateHabitForm: FC<InlineCreateHabitFormProps> = ({ onAddHabit, onCloseForm, initialData }) => {
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    reset,
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
  });

  const isDescriptionEffectivelyEmpty = useMemo(() => {
    const desc = habitDescriptionForAI || "";
    return desc.trim() === '';
  }, [habitDescriptionForAI]);


  useEffect(() => {
    if (initialData) {
      reset({
        description: initialData.description || '',
        name: initialData.name || '',
        category: initialData.category || 'Other',
        daysOfWeek: initialData.daysOfWeek || [],
        optimalTiming: initialData.optimalTiming || '',
        durationHours: initialData.durationHours === undefined ? null : initialData.durationHours,
        durationMinutes: initialData.durationMinutes === undefined ? null : initialData.durationMinutes,
        specificTime: initialData.specificTime || '',
      });
    } else if (!initialData) {
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
  }, [initialData, reset]);


  const handleAISuggestDetails = async () => {
    const currentDescription = habitDescriptionForAI || "";
    if (currentDescription.trim() === "") {
      toast({ title: "Input Missing", description: "Please describe your habit first.", variant: "destructive" });
      return;
    }
    setIsAISuggesting(true);
    try {
      // Corrected: Use the correct AI flow for creating from description
      // In src/components/habits/InlineCreateHabitForm.tsx inside handleAISuggestDetails
      const result = await createHabitFromDescription({ description: currentDescription });
      setValue('name', result.habitName || '');
      
      if (result.category && HABIT_CATEGORIES.includes(result.category as HabitCategory)) {
        setValue('category', result.category as HabitCategory);
      } else {
         setValue('category', 'Other');
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
      toast({ title: "AI Suggestion Applied!", description: "The details have been filled in for you."});
    } catch (error) {
      console.error("AI suggestion error:", error);
      toast({ title: "AI Suggestion Failed", description: "Could not get suggestions from AI. Please fill manually or try again.", variant: "destructive" });
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
    onCloseForm();
  };

  return (
    <Card className="bg-card shadow-lg border border-primary/20">
      <CardHeader className="p-3">
        <CardTitle className="text-md font-semibold flex items-center">
          <PlusCircle className="mr-2 h-5 w-5 text-primary" />
          Add a New Habit
        </CardTitle>
        <CardDescription className="text-xs">
          Describe your new habit. AI can help suggest details.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-1.5">
          <div className="space-y-1">
            <Label htmlFor="inline-ai-description" className="text-xs font-medium">Describe habit (for AI)</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <Textarea id="inline-ai-description" placeholder="e.g., Read daily for 30 mins" {...field} className="bg-input/50 text-sm" rows={1} />}
            />
            <Button
              type="button"
              onClick={handleAISuggestDetails}
              disabled={isAISuggesting || isDescriptionEffectivelyEmpty}
              variant="outline"
              size="sm"
              className="w-full mt-1 text-xs h-8"
            >
              {isAISuggesting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3 w-3" />}
              Suggest Details with AI
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="inline-habit-name" className="text-xs font-medium">Habit Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input id="inline-habit-name" placeholder="e.g., Read a chapter" {...field} className="bg-input/50 text-sm h-8" />}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label htmlFor="inline-habit-category" className="text-xs font-medium flex items-center">
                <Tag className="mr-1.5 h-3 w-3 text-muted-foreground" />
                Category
              </Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || "Other"}>
                    <SelectTrigger id="inline-habit-category" className="bg-input/50 text-sm h-8">
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


          <div className="space-y-0.5">
            <Label className="text-xs font-medium">Days of the Week</Label>
            <div className="grid grid-cols-4 gap-0.5 p-1 border rounded-md bg-input/20">
              {weekDaysArray.map((day) => (
                <Controller
                  key={day}
                  name="daysOfWeek"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center space-x-1 p-0.5 rounded-md hover:bg-accent/10 transition-colors">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-xs font-medium flex items-center"><Hourglass className="mr-1.5 h-3 w-3 text-muted-foreground" />Duration</Label>
              <div className="grid grid-cols-2 gap-1">
                <div className="space-y-0.5">
                  <Label htmlFor="inline-duration-hours" className="text-xs text-muted-foreground">Hours</Label>
                  <Controller
                    name="durationHours"
                    control={control}
                    render={({ field }) => <Input id="inline-duration-hours" type="number" placeholder="Hr" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} value={field.value ?? ''} className="bg-input/50 w-full text-sm h-8" min="0" />}
                  />
                   {errors.durationHours && <p className="text-xs text-destructive">{errors.durationHours.message}</p>}
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor="inline-duration-minutes" className="text-xs text-muted-foreground">Minutes</Label>
                  <Controller
                    name="durationMinutes"
                    control={control}
                    render={({ field }) => <Input id="inline-duration-minutes" type="number" placeholder="Min" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} value={field.value ?? ''} className="bg-input/50 w-full text-sm h-8" min="0" max="59"/>}
                  />
                   {errors.durationMinutes && <p className="text-xs text-destructive">{errors.durationMinutes.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-0.5">
              <Label htmlFor="inline-habit-specificTime" className="text-xs font-medium flex items-center"><Clock className="mr-1.5 h-3 w-3 text-muted-foreground" />Specific Time</Label>
              <Controller
                name="specificTime"
                control={control}
                render={({ field }) => <Input id="inline-habit-specificTime" type="time" {...field} className="bg-input/50 w-full text-sm h-8" />}
              />
              {errors.specificTime && <p className="text-xs text-destructive">{errors.specificTime.message}</p>}
            </div>
          </div>

          <div className="space-y-0.5">
            <Label htmlFor="inline-habit-optimalTiming" className="text-xs font-medium flex items-center"><CalendarClock className="mr-1.5 h-3 w-3 text-muted-foreground" />Optimal Timing (e.g. Morning)</Label>
            <Controller
              name="optimalTiming"
              control={control}
              render={({ field }) => <Input id="inline-habit-optimalTiming" placeholder="e.g., After work" {...field} className="bg-input/50 text-sm h-8" />}
            />
          </div>
          <CardFooter className="p-0 pt-2 flex justify-end space-x-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { onCloseForm(); }} disabled={isSubmitting || isAISuggesting} className="h-8">
                <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting || isAISuggesting} className="h-8">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Add Habit
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default InlineCreateHabitForm;
