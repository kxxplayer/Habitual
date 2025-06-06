
"use client";

import * as React from 'react';
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
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Wand2, Clock, CalendarClock, Hourglass, PlusCircle, Tag, Edit3, Save, ChevronRight } from 'lucide-react';
import { createHabitFromDescription } from '@/ai/flows/habit-creation-from-description';
import type { CreateHabitFormData, WeekDay, HabitCategory } from '@/types';
import { HABIT_CATEGORIES } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface CreateHabitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveHabit: (habit: CreateHabitFormData & { id?: string }) => void;
  initialData?: Partial<CreateHabitFormData> | null;
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

const weekDaysArray = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const createHabitFormSchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
  name: z.string().min(1, "Habit name is required."),
  category: z.enum(HABIT_CATEGORIES).optional(),
  daysOfWeek: z.array(z.enum(weekDaysArray)).min(1, "Please select at least one day."),
  optimalTiming: z.string().optional(),
  durationHours: z.coerce.number().min(0).optional().nullable(),
  durationMinutes: z.coerce.number().min(0).max(59).optional().nullable(),
  specificTime: z.string().optional().refine(val => val === '' || val === undefined || /^\d{2}:\d{2}$/.test(val), {
    message: "Time should be in HH:mm format or empty",
  }),
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

const CreateHabitDialog: FC<CreateHabitDialogProps> = ({
  isOpen,
  onClose,
  onSaveHabit,
  initialData,
  currentStep,
  setCurrentStep
}) => {
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<CreateHabitFormData>({
    resolver: zodResolver(createHabitFormSchema),
    defaultValues: {
      id: undefined, description: '', name: '', category: 'Other', daysOfWeek: [],
      optimalTiming: '', durationHours: null, durationMinutes: null, specificTime: '',
    },
  });

  const habitDescriptionForAI = watch('description');
  const isEditing = !!(initialData && initialData.id);

  useEffect(() => {
    if (isOpen) {
      const defaultVals = {
        id: undefined, description: '', name: '', category: 'Other' as HabitCategory, daysOfWeek: [] as WeekDay[],
        optimalTiming: '', durationHours: null, durationMinutes: null, specificTime: '',
      };
      if (initialData) {
        reset({
          id: initialData.id,
          description: initialData.description || '',
          name: initialData.name || '',
          category: initialData.category || 'Other',
          daysOfWeek: initialData.daysOfWeek || [],
          optimalTiming: initialData.optimalTiming || '',
          durationHours: initialData.durationHours === undefined ? null : initialData.durationHours,
          durationMinutes: initialData.durationMinutes === undefined ? null : initialData.durationMinutes,
          specificTime: initialData.specificTime || '',
        });
         if (isEditing) setCurrentStep(2); // If editing, go straight to step 2
         // If initialData is present for non-editing (e.g. from common suggestion), page.tsx should set step to 2.
      } else {
        reset(defaultVals);
        if (!isEditing) setCurrentStep(1); // Only reset to step 1 if not editing and fully new habit
      }
    }
    setIsAISuggesting(false);
  }, [isOpen, initialData, reset, isEditing, setCurrentStep]);

  const handleAISuggestDetails = async () => {
    if (!habitDescriptionForAI || habitDescriptionForAI.trim() === "") {
      return;
    }
    setIsAISuggesting(true);
    try {
      const result = await createHabitFromDescription({ description: habitDescriptionForAI });

      setValue('name', result.habitName || '');
      if (result.category && HABIT_CATEGORIES.includes(result.category as HabitCategory)) {
        setValue('category', result.category as HabitCategory);
      } else if (result.category) {
        setValue('category', 'Other');
      }

      const suggestedDays = Array.isArray(result.daysOfWeek) ? result.daysOfWeek.map(day => normalizeDay(day as string)).filter((d): d is WeekDay => d !== undefined) : [];
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
      setCurrentStep(2);
    } catch (error) {
      console.error("AI Suggestion Error:", error);
    } finally {
      setIsAISuggesting(false);
    }
  };

  const onSubmitDialog = (data: CreateHabitFormData) => {
    const dataToSave = isEditing && initialData?.id ? { ...data, id: initialData.id } : data;
    onSaveHabit(dataToSave);
    // onClose(); // Handled by parent or DialogClose
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] bg-card rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center">
            {isEditing ? <Edit3 className="mr-2 h-6 w-6 text-primary" /> : <PlusCircle className="mr-2 h-6 w-6 text-primary" />}
            {isEditing ? "Edit Habit" : (currentStep === 1 ? "Create New Habit: Step 1" : "Create New Habit: Step 2")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Modify the details of your habit." : (currentStep === 1 ? "Describe your new habit. AI can help suggest details." : "Refine the details for your new habit.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitDialog)} className="space-y-4 p-1 pt-3">
          {currentStep === 1 && !isEditing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="dialog-ai-description" className="text-sm font-medium">Describe your habit (for AI suggestion)</Label>
                <Controller name="description" control={control} render={({ field }) => <Textarea id="dialog-ai-description" placeholder="e.g., Go to the gym 3 times a week in the evenings for 1 hour" {...field} className="bg-input/50 text-sm" rows={3}/>} />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <Button type="button" onClick={handleAISuggestDetails} disabled={isAISuggesting || !habitDescriptionForAI?.trim()} variant="default" className="w-full sm:flex-1">
                  {isAISuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Suggest with AI
                </Button>
                <Button type="button" onClick={() => setCurrentStep(2)} variant="outline" className="w-full sm:flex-1" disabled={isAISuggesting}>
                  Fill Manually
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              {isAISuggesting && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  AI is thinking... this may take a few moments.
                </p>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
               { !isEditing && (
                <Button type="button" onClick={() => setCurrentStep(1)} variant="ghost" size="sm" className="text-xs text-muted-foreground mb-2 px-1">
                  &larr; Back to Description
                </Button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="dialog-habit-name" className="text-sm font-medium">Name</Label>
                  <Controller name="name" control={control} render={({ field }) => <Input id="dialog-habit-name" placeholder="e.g., Read a chapter" {...field} className="bg-input/50 text-sm"/>} />
                  {errors.name && <p className="text-xs text-destructive pt-1">{errors.name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dialog-habit-category" className="text-sm font-medium flex items-center"><Tag className="mr-1.5 h-4 w-4 text-muted-foreground" />Category</Label>
                  <Controller name="category" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || "Other"}>
                        <SelectTrigger id="dialog-habit-category" className="bg-input/50 text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{HABIT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>)}</SelectContent>
                      </Select> )} />
                  {errors.category && <p className="text-xs text-destructive pt-1">{errors.category.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Days of the Week</Label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 p-1.5 border rounded-md bg-input/20">
                  {weekDaysArray.map(day => (
                    <Controller key={day} name="daysOfWeek" control={control} render={({ field }) => (
                      <div className="flex items-center space-x-1 p-1 rounded-md hover:bg-accent/10">
                        <Checkbox id={`dialog-day-${day}`} checked={field.value?.includes(day)}
                          onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), day].sort((a, b) => weekDaysArray.indexOf(a) - weekDaysArray.indexOf(b)) : (field.value || []).filter(d => d !== day))}
                          className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-4 w-4" />
                        <Label htmlFor={`dialog-day-${day}`} className="text-xs font-normal cursor-pointer select-none">{day}</Label>
                      </div> )} /> ))}
                </div>
                {errors.daysOfWeek && <p className="text-xs text-destructive pt-1">{errors.daysOfWeek.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center"><Hourglass className="mr-1.5 h-4 w-4 text-muted-foreground" />Duration (Optional)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div> <Label htmlFor="dialog-duration-hours" className="text-xs text-muted-foreground">Hours</Label>
                      <Controller name="durationHours" control={control} render={({ field }) => <Input id="dialog-duration-hours" type="number" placeholder="Hr" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} value={field.value ?? ''} className="bg-input/50 w-full text-sm" min="0"/>} />
                      {errors.durationHours && <p className="text-xs text-destructive pt-1">{errors.durationHours.message}</p>}
                    </div>
                    <div> <Label htmlFor="dialog-duration-minutes" className="text-xs text-muted-foreground">Minutes</Label>
                      <Controller name="durationMinutes" control={control} render={({ field }) => <Input id="dialog-duration-minutes" type="number" placeholder="Min" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} value={field.value ?? ''} className="bg-input/50 w-full text-sm" min="0" max="59"/>} />
                      {errors.durationMinutes && <p className="text-xs text-destructive pt-1">{errors.durationMinutes.message}</p>}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dialog-habit-specificTime" className="text-sm font-medium flex items-center"><Clock className="mr-1.5 h-4 w-4 text-muted-foreground" />Specific Time (Optional)</Label>
                  <Controller name="specificTime" control={control} render={({ field }) => <Input id="dialog-habit-specificTime" type="time" {...field} className="bg-input/50 w-full text-sm"/>} />
                  {errors.specificTime && <p className="text-xs text-destructive pt-1">{errors.specificTime.message}</p>}
                </div>
              </div>
               <div className="space-y-1">
                <Label htmlFor="dialog-habit-optimalTiming" className="text-sm font-medium flex items-center"><CalendarClock className="mr-1.5 h-4 w-4 text-muted-foreground" />Optimal General Timing (Optional)</Label>
                <Controller name="optimalTiming" control={control} render={({ field }) => <Input id="dialog-habit-optimalTiming" placeholder="e.g., Morning, After work" {...field} className="bg-input/50 text-sm"/>} />
              </div>
               <div className={cn("space-y-1", isEditing ? "hidden" : "")}> {/* Hide description field in step 2 for new habits, only for editing if needed */}
                <Label htmlFor="dialog-final-description" className="text-sm font-medium">Description (Optional)</Label>
                <Controller name="description" control={control} render={({ field }) => <Textarea id="dialog-final-description" placeholder="Detailed description of the habit" {...field} className="bg-input/50 text-sm" rows={2}/>} />
              </div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
            {currentStep === 2 && (
              <Button type="submit" disabled={isSubmitting || isAISuggesting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />)}
                {isEditing ? "Save Changes" : "Add This Habit"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default CreateHabitDialog;
