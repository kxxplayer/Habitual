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
import type { Habit, CreateHabitFormData, WeekDay, HabitCategory } from '@/types';
import { HABIT_CATEGORIES } from '@/types';

import { genkitService } from '@/lib/genkit-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const weekDaysArray = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const createHabitFormSchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
  name: z.string().min(1, "Habit name is required."),
  category: z.enum(HABIT_CATEGORIES).optional(),
  daysOfWeek: z.array(z.enum(weekDaysArray)).min(1, "Please select at least one day."),
  optimalTiming: z.union([z.string(), z.null()]).optional(),
  durationHours: z.union([z.number(), z.null()]).optional(),
  durationMinutes: z.union([z.number(), z.null()]).optional(),
  specificTime: z.union([z.string(), z.null()]).optional().refine((val) => !val || /^\d{2}:\d{2}$/.test(val), {
    message: "Time should be in HH:mm format or empty",
  }),
});

const InlineCreateHabitForm: FC<{ onAddHabit: (habit: Omit<Habit, 'id' | 'completionLog'>) => void; onCloseForm: () => void; initialData?: Partial<CreateHabitFormData> | null; }> = ({ onAddHabit, onCloseForm, initialData }) => {
  const [isAISuggesting, setIsAISuggesting] = useState(false);

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

  const habitDescriptionForAI = useWatch({ control, name: 'description' });
  const isDescriptionEmpty = useMemo(() => (habitDescriptionForAI || '').trim() === '', [habitDescriptionForAI]);

  useEffect(() => {
    if (initialData) {
      reset({
        description: initialData.description || '',
        name: initialData.name || '',
        category: initialData.category || 'Other',
        daysOfWeek: initialData.daysOfWeek || [],
        optimalTiming: initialData.optimalTiming ?? '',
        durationHours: initialData.durationHours ?? null,
        durationMinutes: initialData.durationMinutes ?? null,
        specificTime: initialData.specificTime ?? '',
      });
    }
  }, [initialData, reset]);

  const onSubmit = (data: CreateHabitFormData) => {
    onAddHabit({
      name: data.name,
      description: data.description,
      category: data.category,
      daysOfWeek: data.daysOfWeek,
      optimalTiming: data.optimalTiming ?? undefined,
      durationHours: data.durationHours ?? undefined,
      durationMinutes: data.durationMinutes ?? undefined,
      specificTime: data.specificTime ?? undefined,
      reminderEnabled: false,
    });
    onCloseForm();
  };

  const handleAISuggestDetails = async () => {
    const description = habitDescriptionForAI || "";
    if (!description.trim()) {
      return;
    }
    setIsAISuggesting(true);
    try {
      const result = await genkitService.generateHabit(description);
      setValue('name', result.habitName || '');
      setValue('category', HABIT_CATEGORIES.includes(result.category as HabitCategory) ? result.category as HabitCategory : 'Other');
      setValue('daysOfWeek', (result.daysOfWeek || []).filter(Boolean));
      setValue('optimalTiming', result.optimalTiming ?? '');
      setValue('durationHours', result.durationHours ?? null);
      setValue('durationMinutes', result.durationMinutes ?? null);
      setValue('specificTime', result.specificTime ?? '');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAISuggesting(false);
    }
  };

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>Create New Habit</CardTitle>
        <CardDescription>Use AI to help fill out habit details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <Textarea {...field} id="description" placeholder="e.g., Read a book before bed" />}
            />
            <Button
              type="button"
              onClick={handleAISuggestDetails}
              disabled={isAISuggesting || isDescriptionEmpty}
              className="mt-2"
            >
              {isAISuggesting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Suggest with AI
            </Button>
          </div>

          <div>
            <Label htmlFor="name">Habit Name</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => <Input {...field} id="name" placeholder="Habit Name" />}
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || 'Other'}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {HABIT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label>Days of the Week</Label>
            <div className="flex gap-2 flex-wrap">
              {weekDaysArray.map((day) => (
                <Controller
                  key={day}
                  name="daysOfWeek"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center space-x-1">
                      <Checkbox
                        checked={field.value?.includes(day)}
                        onCheckedChange={(checked) => {
                          const newDays = checked
                            ? [...(field.value || []), day]
                            : field.value.filter((d) => d !== day);
                          field.onChange(Array.from(new Set(newDays)));
                        }}
                      />
                      <span>{day}</span>
                    </label>
                  )}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="durationHours">Duration Hours</Label>
              <Controller
                name="durationHours"
                control={control}
                render={({ field }) => <Input {...field} id="durationHours" type="number" min="0" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} />}
              />
            </div>
            <div>
              <Label htmlFor="durationMinutes">Duration Minutes</Label>
              <Controller
                name="durationMinutes"
                control={control}
                render={({ field }) => <Input {...field} id="durationMinutes" type="number" min="0" max="59" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} />}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="specificTime">Specific Time (HH:mm)</Label>
            <Controller
              name="specificTime"
              control={control}
              render={({ field }) => <Input {...field} id="specificTime" type="time" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || '')} />}
            />
          </div>

          <div>
            <Label htmlFor="optimalTiming">Optimal Timing</Label>
            <Controller
              name="optimalTiming"
              control={control}
              render={({ field }) => <Input {...field} id="optimalTiming" placeholder="e.g., Morning" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || '')} />}
            />
          </div>

          <CardFooter className="justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCloseForm} disabled={isSubmitting || isAISuggesting}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isAISuggesting}>
              {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Habit
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default InlineCreateHabitForm;