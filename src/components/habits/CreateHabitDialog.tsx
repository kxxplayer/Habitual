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
import { Loader2, Wand2, Clock, CalendarClock, Hourglass, PlusCircle, Tag, Edit3, Save, Brain, FilePenLine, Target } from 'lucide-react';
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
  const [creationMode, setCreationMode] = useState<'ai' | 'manual' | null>(null);
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
        if (!isEditing) {
            setCurrentStep(1);
            setCreationMode(null);
        }
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
      setCurrentStep(3);
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
                {currentStep === 1 ? "Choose how you'd like to start." :
                currentStep === 2 && creationMode === null ? "How would you like to create your habit?" :
                currentStep === 2 && creationMode === 'ai' ? "Describe your habit and let AI help." :
                "Refine the details for your new habit."}
            </DialogDescription>
          )}
        </DialogHeader>

        {currentStep === 1 && !isEditing && (
        <div className="flex-grow min-h-0 overflow-y-auto">
            <div className="p-6 grid md:grid-cols-2 gap-6 items-start">
            {/* Fill Manually Card - Modified */}
            <div
                className="flex flex-col h-full p-6 rounded-lg border-2 border-muted hover:border-primary transition-colors cursor-pointer bg-card hover:bg-accent/5"
                onClick={() => {
                setCurrentStep(2);
                setCreationMode(null); // Reset creation mode
                }}
            >
                <div className="flex items-center gap-3 mb-2">
                <Edit3 className="h-8 w-8 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Fill Manually</h3>
                </div>
                <p className="text-sm text-muted-foreground flex-grow">
                Craft your new habit from scratch - with or without AI assistance.
                </p>
            </div>

            {/* Create a Program Card */}
            <div
                className="flex flex-col h-full p-6 rounded-lg border-2 border-muted hover:border-primary transition-colors cursor-pointer bg-card hover:bg-accent/5"
                onClick={handleOpenProgramDialog}
            >
                <div className="flex items-center gap-3 mb-2">
                <Target className="h-8 w-8 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Create a Program</h3>
                </div>
                <p className="text-sm text-muted-foreground flex-grow">
                Get a set of habits for a larger goal.
                </p>
            </div>
            </div>
        </div>
        )}

        {currentStep === 2 && !isEditing && creationMode === null && (
        <div className="flex-grow min-h-0 overflow-y-auto">
            <div className="p-6 grid md:grid-cols-2 gap-6 items-start">
            {/* AI Assistance Option */}
            <div
                className="flex flex-col h-full p-6 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                onClick={() => setCreationMode('ai')}
            >
                <div className="flex items-center gap-3 mb-2">
                <Wand2 className="h-8 w-8 text-primary" />
                <h3 className="text-lg font-semibold text-primary">Use AI Assistant</h3>
                </div>
                <p className="text-sm text-muted-foreground flex-grow">
                Describe your goal and let AI suggest the details for you. It's the fastest way to get started.
                </p>
            </div>

            {/* Manual Creation Option */}
            <div
                className="flex flex-col h-full p-6 rounded-lg border-2 border-muted hover:border-primary transition-colors cursor-pointer bg-card hover:bg-accent/5"
                onClick={() => {
                setCreationMode('manual');
                setCurrentStep(3);
                }}
            >
                <div className="flex items-center gap-3 mb-2">
                <Edit3 className="h-8 w-8 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Create Manually</h3>
                </div>
                <p className="text-sm text-muted-foreground flex-grow">
                Fill in all the details yourself without AI assistance.
                </p>
            </div>
            </div>
        </div>
        )}

        {currentStep === 2 && !isEditing && creationMode === 'ai' && (
        <div className="flex-grow min-h-0 overflow-y-auto">
            <div className="p-6">
            <div className="max-w-md mx-auto space-y-4">
                <div className="space-y-2">
                <Label htmlFor="dialog-ai-description" className="text-sm font-medium">
                    Describe your habit goal
                </Label>
                <Controller
                    name="description"
                    control={control}
                    render={({ field }) =>
                    <Textarea
                        id="dialog-ai-description"
                        placeholder="e.g., Run 3 times a week, Learn to play guitar, Read before bed"
                        {...field}
                        className="bg-background text-sm"
                        rows={4}
                    />
                    }
                />
                <p className="text-xs text-muted-foreground">
                    Be specific about what you want to achieve and AI will suggest the best schedule and details.
                </p>
                </div>

                <div className="flex gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreationMode(null)}
                    className="flex-1"
                >
                    Back
                </Button>
                <Button
                    type="button"
                    onClick={handleAISuggestDetails}
                    disabled={isAISuggesting || !habitDescriptionForAI?.trim()}
                    className="flex-1"
                >
                    {isAISuggesting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                    </>
                    ) : (
                    <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Generate Details
                    </>
                    )}
                </Button>
                </div>
            </div>
            </div>
        </div>
        )}


        {(currentStep === 3 || (currentStep === 2 && isEditing)) && (
          <form onSubmit={handleSubmit(onSubmitDialog)} className="flex flex-col flex-grow min-h-0">
            <div className="flex-grow overflow-y-auto px-4 -mx-4">
              <div className="space-y-4 px-4 pb-4">
                {!isEditing && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground mb-2 px-1"
                        onClick={() => {
                            if (creationMode === 'ai') {
                                setCurrentStep(2);
                            } else {
                                setCurrentStep(2);
                                setCreationMode(null);
                            }
                        }}>
                        &larr; Back
                    </Button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="dialog-habit-name" className="text-sm font-medium">Name</Label>
                    <Controller name="name" control={control} render={({ field }) => <Input id="dialog-habit-name" placeholder="e.g., Read a chapter" {...field} className="bg-input/50 text-sm" />} />
                    {errors.name && <p className="text-xs text-destructive pt-1">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dialog-habit-category" className="text-sm font-medium flex items-center"><Tag className="mr-1.5 h-4 w-4 text-muted-foreground" />Category</Label>
                    <Controller name="category" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || "Other"}>
                        <SelectTrigger id="dialog-habit-category" className="bg-input/50 text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{HABIT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>)}</SelectContent>
                      </Select>)} />
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
                        </div>)} />))}
                  </div>
                  {errors.daysOfWeek && <p className="text-xs text-destructive pt-1">{errors.daysOfWeek.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center"><Hourglass className="mr-1.5 h-4 w-4 text-muted-foreground" />Duration (Optional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div> <Label htmlFor="dialog-duration-hours" className="text-xs text-muted-foreground">Hours</Label>
                        <Controller name="durationHours" control={control} render={({ field }) => <Input id="dialog-duration-hours" type="number" placeholder="Hr" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} value={field.value ?? ''} className="bg-input/50 w-full text-sm" min="0" />} />
                        {errors.durationHours && <p className="text-xs text-destructive pt-1">{errors.durationHours.message}</p>}
                      </div>
                      <div> <Label htmlFor="dialog-duration-minutes" className="text-xs text-muted-foreground">Minutes</Label>
                        <Controller name="durationMinutes" control={control} render={({ field }) => <Input id="dialog-duration-minutes" type="number" placeholder="Min" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))} value={field.value ?? ''} className="bg-input/50 w-full text-sm" min="0" max="59" />} />
                        {errors.durationMinutes && <p className="text-xs text-destructive pt-1">{errors.durationMinutes.message}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dialog-habit-specificTime" className="text-sm font-medium flex items-center"><Clock className="mr-1.5 h-4 w-4 text-muted-foreground" />Specific Time (Optional)</Label>
                    <Controller name="specificTime" control={control} render={({ field }) => <Input id="dialog-habit-specificTime" type="time" {...field} className="bg-input/50 w-full text-sm" />} />
                    {errors.specificTime && <p className="text-xs text-destructive pt-1">{errors.specificTime.message}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dialog-habit-optimalTiming" className="text-sm font-medium flex items-center"><CalendarClock className="mr-1.5 h-4 w-4 text-muted-foreground" />Optimal General Timing (Optional)</Label>
                  <Controller name="optimalTiming" control={control} render={({ field }) => <Input id="dialog-habit-optimalTiming" placeholder="e.g., Morning, After work" {...field} className="bg-input/50 text-sm" />} />
                </div>
                <div className={cn("space-y-1", isEditing ? "" : "hidden")}>
                  <Label htmlFor="dialog-final-description" className="text-sm font-medium">Description (Optional)</Label>
                  <Controller name="description" control={control} render={({ field }) => <Textarea id="dialog-final-description" placeholder="Detailed description of the habit" {...field} className="bg-input/50 text-sm" rows={2} />} />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4 shrink-0 px-4 pb-4 border-t">
              <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting || isAISuggesting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />)}
                {isEditing ? "Save Changes" : "Add This Habit"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default CreateHabitDialog;