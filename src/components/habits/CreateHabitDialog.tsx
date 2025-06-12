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
import { Loader2, Wand2, Clock, CalendarClock, Hourglass, PlusCircle, Tag, Edit3, Save, Brain, FilePenLine } from 'lucide-react';
import { createHabitFromDescription } from '@/ai/flows/habit-creation-from-description';
import type { CreateHabitFormData, WeekDay, HabitCategory } from '@/types';
import { HABIT_CATEGORIES } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

interface CreateHabitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveHabit: (habit: CreateHabitFormData & { id?: string }) => void;
  initialData?: Partial<CreateHabitFormData> | null;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  onOpenGoalProgramDialog: () => void;
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
  setCurrentStep,
  onOpenGoalProgramDialog
}) => {
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const { toast } = useToast();
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
         if (isEditing) setCurrentStep(2);

      } else {
        reset(defaultVals);
        if (!isEditing) setCurrentStep(1);
      }
    }
    setIsAISuggesting(false);
  }, [isOpen, initialData, reset, isEditing, setCurrentStep]);

  const handleAISuggestDetails = async () => {
    if (!habitDescriptionForAI || habitDescriptionForAI.trim() === "") {
      toast({ title: "Input Missing", description: "Please describe your habit first.", variant: "destructive" });
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
      } else if (result.specificTime && (result.specificTime.toLowerCase() === "anytime" || result.specificTime.toLowerCase() === "flexible") ) {
         setValue('specificTime', '');
      } else {
        setValue('specificTime', result.specificTime || '');
      }
      toast({ title: "AI Suggestion Applied!", description: "The details have been filled in for you."});
    } catch (error) {
      console.error("AI Suggestion Error:", error);
      toast({ title: "AI Suggestion Failed", description: "Could not get AI suggestions. Please fill manually or try again.", variant: "destructive" });
    } finally {
      setIsAISuggesting(false);
    }
  };

  const onSubmitDialog = (data: CreateHabitFormData) => {
    const dataToSave = isEditing && initialData?.id ? { ...data, id: initialData.id } : data;
    onSaveHabit(dataToSave);
  };
  
  const handleOpenProgramDialog = () => {
    onClose(); 
    onOpenGoalProgramDialog(); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl bg-card rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center text-primary">
            {isEditing ? <Edit3 className="mr-3 h-6 w-6" /> : <PlusCircle className="mr-3 h-6 w-6" />}
            {isEditing ? "Edit Habit" : "Create a New Habit"}
          </DialogTitle>
          {!isEditing && (
            <DialogDescription>
              {currentStep === 1 ? "Choose how you'd like to start." : "Create your habit with AI assistance or fill in the details manually."}
            </DialogDescription>
          )}
        </DialogHeader>

        {currentStep === 1 && !isEditing && (
          <div className="flex-grow min-h-0 overflow-y-auto">
            <div className="p-6 space-y-4">
              {/* Manual Fill Option */}
              <button
                onClick={() => setCurrentStep(2)}
                className="w-full text-left p-6 rounded-lg border-2 border-border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <FilePenLine className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">Create Custom Habit</h4>
                    <p className="text-sm text-muted-foreground">Build your habit with AI help or manually enter details.</p>
                  </div>
                </div>
              </button>

              {/* Program Option */}
              <button
                onClick={handleOpenProgramDialog}
                className="w-full text-left p-6 rounded-lg border-2 border-border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Brain className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">Create a Program</h4>
                    <p className="text-sm text-muted-foreground">Get a set of habits for a larger goal.</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {(currentStep === 2 || isEditing) && (
          <form onSubmit={handleSubmit(onSubmitDialog)} className="flex flex-col flex-grow min-h-0">
            <div className="flex-grow overflow-y-auto px-4 -mx-4">
              <div className="space-y-4 px-4 pb-4">
                {!isEditing && (
                  <Button type="button" onClick={() => setCurrentStep(1)} variant="ghost" size="sm" className="text-xs text-muted-foreground mb-2 px-1">
                    &larr; Back to Creation Options
                  </Button>
                )}
                
                {/* AI Assistance Section */}
                <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    <h3 className="font-medium text-primary">Quick Start with AI</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Describe your habit idea and let AI fill in the details.
                  </p>
                  <div className="space-y-2">
                    <Controller name="description" control={control} render={({ field }) =>
                      <Textarea
                        placeholder="e.g., Run 3 times a week, Learn to play guitar, Read before bed"
                        {...field}
                        className="bg-background text-sm"
                        rows={2}
                      />
                    } />
                    <Button
                      type="button"
                      onClick={handleAISuggestDetails}
                      disabled={isAISuggesting || !habitDescriptionForAI?.trim()}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      {isAISuggesting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Wand2 className="mr-2 h-4 w-4" /> Generate Habit Details</>}
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or fill manually</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="dialog-habit-name" className="text-sm font-medium">Name</Label>
                    <Controller name="name" control={control} render={({ field }) => <Input id="dialog-habit-name" placeholder="e.g., Read a chapter" {...field} className="bg-input/50 text-sm" />} />
                    {errors.name && <p className="text-xs text-destructive pt-1">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dialog-habit-category" className="text-sm font-medium">Category</Label>
                    <Controller name="category" control={control} render={({ field }) =>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="dialog-habit-category" className="bg-input/50 text-sm">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {HABIT_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat} className="text-sm">
                              <div className="flex items-center">
                                <Tag className="mr-2 h-3 w-3" />
                                {cat}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    } />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Days of the week</Label>
                  <div className="flex flex-wrap gap-2">
                    {weekDaysArray.map(day => (
                      <Controller key={day} name="daysOfWeek" control={control} render={({ field }) =>
                        <label className={cn("flex items-center space-x-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                          field.value.includes(day) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                        )}>
                          <Checkbox
                            checked={field.value.includes(day)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, day]);
                              } else {
                                field.onChange(field.value.filter((d: WeekDay) => d !== day));
                              }
                            }}
                            className="sr-only"
                          />
                          <span>{day}</span>
                        </label>
                      } />
                    ))}
                  </div>
                  {errors.daysOfWeek && <p className="text-xs text-destructive pt-1">{errors.daysOfWeek.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="dialog-optimal-timing" className="text-sm font-medium flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      Optimal Timing
                    </Label>
                    <Controller name="optimalTiming" control={control} render={({ field }) =>
                      <Input id="dialog-optimal-timing" placeholder="e.g., Morning" {...field} className="bg-input/50 text-sm" />
                    } />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dialog-specific-time" className="text-sm font-medium flex items-center">
                      <CalendarClock className="mr-1 h-3 w-3" />
                      Specific Time
                    </Label>
                    <Controller name="specificTime" control={control} render={({ field }) =>
                      <Input id="dialog-specific-time" type="time" {...field} className="bg-input/50 text-sm" />
                    } />
                    {errors.specificTime && <p className="text-xs text-destructive pt-1">{errors.specificTime.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center">
                      <Hourglass className="mr-1 h-3 w-3" />
                      Duration
                    </Label>
                    <div className="flex gap-2">
                      <Controller name="durationHours" control={control} render={({ field }) =>
                        <Input type="number" placeholder="H" {...field} value={field.value ?? ''} className="bg-input/50 text-sm w-16" min={0} />
                      } />
                      <Controller name="durationMinutes" control={control} render={({ field }) =>
                        <Input type="number" placeholder="M" {...field} value={field.value ?? ''} className="bg-input/50 text-sm w-16" min={0} max={59} />
                      } />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="min-w-[100px]">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateHabitDialog;