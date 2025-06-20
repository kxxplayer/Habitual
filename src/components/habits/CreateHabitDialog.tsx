"use client";

import * as React from 'react';
import { FC, useState, useEffect } from 'react';
import { useForm, Controller, useWatch, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { genkitService } from '@/lib/genkit-service';
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
import {
  Loader2, Wand2, Clock, CalendarClock, Hourglass,
  PlusCircle, Tag, Edit3, Save, FilePenLine, Target
} from 'lucide-react';
import type { CreateHabitFormData, WeekDay, HabitCategory } from '@/types';
import { HABIT_CATEGORIES } from '@/types';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";

import { Network } from '@capacitor/network';
import type { PluginListenerHandle } from '@capacitor/core';

interface CreateHabitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveHabit: (habit: CreateHabitFormData & { id?: string }) => void;
  initialData?: Partial<CreateHabitFormData> | null;
  onOpenGoalProgramDialog: () => void;
}

const weekDaysArray = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const createHabitFormSchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
  name: z.string().min(1, "Habit name is required."),
  category: z.enum(HABIT_CATEGORIES).optional(),
  daysOfWeek: z.array(z.enum(weekDaysArray)).min(1, "Please select at least one day."),
  optimalTiming: z.string().nullable().optional(),
  durationHours: z.coerce.number().min(0).optional().nullable(),
  durationMinutes: z.coerce.number().min(0).max(59).optional().nullable(),
  specificTime: z.string().optional().refine((val: string | undefined) => !val || /^\d{2}:\d{2}$/.test(val), {
  message: "Time should be in HH:mm format or empty",
  }),
});
type HabitFormSchema = z.infer<typeof createHabitFormSchema>;
const dayMapFullToAbbr: { [key: string]: WeekDay } = {
  "sunday": "Sun", "sun": "Sun", "sundays": "Sun",
  "monday": "Mon", "mon": "Mon", "mondays": "Mon",
  "tuesday": "Tue", "tue": "Tue", "tuesdays": "Tue",
  "wednesday": "Wed", "wed": "Wed", "wednesdays": "Wed",
  "thursday": "Thu", "thu": "Thu", "thursdays": "Thu",
  "friday": "Fri", "fri": "Fri", "fridays": "Fri",
  "saturday": "Sat", "sat": "Sat", "saturdays": "Sat",
};

const normalizeDay = (day: string): WeekDay | undefined => {
  if (typeof day !== 'string') return undefined;
  const lowerDay = day.trim().toLowerCase().replace(/,/g, '');
  return dayMapFullToAbbr[lowerDay] || weekDaysArray.find(d => d.toLowerCase() === lowerDay);
};

const CreateHabitDialog: FC<CreateHabitDialogProps> = ({
  isOpen,
  onClose,
  onSaveHabit,
  initialData,
  onOpenGoalProgramDialog
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const {
    control, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting }
  } = useForm<HabitFormSchema>({
    resolver: zodResolver(createHabitFormSchema),
    defaultValues: {
    // ...
      id: undefined,
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

  const onSubmitDialog: SubmitHandler<CreateHabitFormData> = (data) => {
    onSaveHabit(data);
  };

  const habitDescriptionForAI = watch('description');
  const isEditing = !!(initialData && initialData.id);

  useEffect(() => {
    const defaultVals = {
      id: undefined,
      description: '',
      name: '',
      category: 'Other' as HabitCategory,
      daysOfWeek: [] as WeekDay[],
      optimalTiming: '',
      durationHours: null,
      durationMinutes: null,
      specificTime: '',
    };
    if (isOpen) {
      if (initialData) {
        reset({
          id: initialData.id,
          description: initialData.description || '',
          name: initialData.name || '',
          category: initialData.category || 'Other',
          daysOfWeek: initialData.daysOfWeek || [],
          optimalTiming: initialData.optimalTiming || '',
          durationHours: typeof initialData.durationHours === 'number' ? initialData.durationHours : null,
          durationMinutes: typeof initialData.durationMinutes === 'number' ? initialData.durationMinutes : null,
          specificTime: initialData.specificTime || '',
        });
        setCurrentStep(2);
      } else {
        reset(defaultVals);
        setCurrentStep(1);
      }
    }
  }, [isOpen, initialData, reset]);

  const handleAISuggestDetails = async () => {
    if (!habitDescriptionForAI || habitDescriptionForAI.trim() === "") {
      return;
    }

    setIsAISuggesting(true);
    try {
      const result = await genkitService.generateHabit(habitDescriptionForAI.trim());

      if (result.habitName) setValue('name', result.habitName, { shouldValidate: true });
      if (result.category && HABIT_CATEGORIES.includes(result.category as HabitCategory)) {
        setValue('category', result.category as HabitCategory);
      } else {
        setValue('category', 'Other');
      }

      const suggestedDays = Array.isArray(result.daysOfWeek)
        ? result.daysOfWeek.map((day: string) => normalizeDay(day)).filter((d): d is WeekDay => !!d)
        : [];

      if (suggestedDays.length > 0) setValue('daysOfWeek', suggestedDays, { shouldValidate: true });
      if (result.optimalTiming) setValue('optimalTiming', result.optimalTiming);
      if (typeof result.durationHours === 'number') setValue('durationHours', typeof result.durationHours === 'number' ? result.durationHours : parseInt(result.durationHours ?? '0'));
      if (typeof result.durationMinutes === 'number') setValue('durationMinutes', typeof result.durationMinutes === 'number' ? result.durationMinutes : parseInt(result.durationMinutes ?? '0'));
      if (result.specificTime && /^\d{2}:\d{2}$/.test(result.specificTime)) setValue('specificTime', result.specificTime);

    } catch (error) {
      console.error("AI Suggestion Failed:", error);
    } finally {
      setIsAISuggesting(false);
    }
  };

  const handleOpenProgramDialog = () => {
    onClose();
    onOpenGoalProgramDialog();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-card to-card/95 rounded-2xl shadow-2xl border-0 flex flex-col max-h-[90vh] overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="text-2xl font-bold flex items-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {isEditing ? <Edit3 className="mr-3 h-6 w-6 text-primary" /> : <Target className="mr-3 h-6 w-6 text-primary" />}
                  {isEditing ? "Edit Habit" : "Create New Habit"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                  {isEditing ? "Modify your habit details below." : (currentStep === 1 ? "Choose how you'd like to get started." : "Let AI help you or customize everything yourself.")}
              </DialogDescription>
          </DialogHeader>

          {currentStep === 1 && !isEditing && (
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <div className="grid gap-4">
                      <div
                          className="group relative p-6 rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 cursor-pointer bg-gradient-to-br from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10"
                          onClick={() => setCurrentStep(2)}
                      >
                          <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0 p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                  <FilePenLine className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-foreground mb-2">Create a Single Habit</h3>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                      Define one habit at a time, with or without AI assistance to help you set it up perfectly.
                                  </p>
                              </div>
                              <div className="flex-shrink-0 text-primary/60 group-hover:text-primary transition-colors">
                                  →
                              </div>
                          </div>
                      </div>
                      
                      <div
                          className="group relative p-6 rounded-xl border-2 border-accent/20 hover:border-accent/40 transition-all duration-300 cursor-pointer bg-gradient-to-br from-accent/5 to-primary/5 hover:from-accent/10 hover:to-primary/10"
                          onClick={handleOpenProgramDialog}
                      >
                          <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0 p-3 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                                  <Target className="h-6 w-6 text-accent" />
                              </div>
                              <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-foreground mb-2">Create a Program</h3>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                      Get a set of related habits for a larger goal. Perfect for learning new skills or achieving big objectives.
                                  </p>
                              </div>
                              <div className="flex-shrink-0 text-accent/60 group-hover:text-accent transition-colors">
                                  →
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {currentStep === 2 && (
              <div className="flex-1 overflow-y-auto">
                  <form onSubmit={handleSubmit(onSubmitDialog)} className="space-y-6">
                      <div className="px-6 space-y-6">
                          {/* AI Description Section */}
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                              <div className="flex items-center mb-3">
                                  <Wand2 className="h-5 w-5 text-blue-600 mr-2" />
                                  <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">AI Assistant</Label>
                              </div>
                              <Controller
                                  name="description"
                                  control={control}
                                  render={({ field }) => (
                                      <Textarea
                                          {...field}
                                          placeholder="Describe what you want to achieve... (e.g., 'I want to learn guitar and practice 30 minutes daily')"
                                          className="min-h-[80px] border-blue-200 focus:border-blue-400 dark:border-blue-800 dark:focus:border-blue-600 bg-white/50 dark:bg-gray-900/50"
                                      />
                                  )}
                              />
                              <Button
                                  type="button"
                                  onClick={handleAISuggestDetails}
                                  disabled={isAISuggesting || !habitDescriptionForAI?.trim()}
                                  className="mt-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                  size="sm"
                              >
                                  {isAISuggesting ? (
                                      <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Generating...
                                      </>
                                  ) : (
                                      <>
                                          <Wand2 className="mr-2 h-4 w-4" />
                                          Get AI Suggestions
                                      </>
                                  )}
                              </Button>
                          </div>

                          {/* Form Fields */}
                          <div className="grid gap-6">
                              {/* Habit Name */}
                              <div className="space-y-2">
                                  <Label htmlFor="name" className="text-sm font-medium flex items-center">
                                      <Tag className="h-4 w-4 mr-2 text-primary" />
                                      Habit Name *
                                  </Label>
                                  <Controller
                                      name="name"
                                      control={control}
                                      render={({ field }) => (
                                          <Input
                                              {...field}
                                              id="name"
                                              placeholder="e.g., Practice Guitar, Morning Jog, Read 30 minutes"
                                              className="h-11"
                                          />
                                      )}
                                  />
                                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                              </div>

                              {/* Category */}
                              <div className="space-y-2">
                                  <Label className="text-sm font-medium">Category</Label>
                                  <Controller
                                      name="category"
                                      control={control}
                                      render={({ field }) => (
                                          <Select onValueChange={field.onChange} value={field.value}>
                                              <SelectTrigger className="h-11">
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

                              {/* Days of Week */}
                              <div className="space-y-3">
                                  <Label className="text-sm font-medium flex items-center">
                                      <CalendarClock className="h-4 w-4 mr-2 text-primary" />
                                      Days of the Week *
                                  </Label>
                                  <Controller
                                      name="daysOfWeek"
                                      control={control}
                                      render={({ field }) => (
                                          <div className="grid grid-cols-7 gap-2">
                                              {weekDaysArray.map((day) => (
                                                  <div key={day} className="flex flex-col items-center">
                                                      <Checkbox
                                                          checked={field.value.includes(day)}
                                                          onCheckedChange={(checked) => {
                                                              if (checked) {
                                                                  field.onChange([...field.value, day]);
                                                              } else {
                                                                  field.onChange(field.value.filter((d) => d !== day));
                                                              }
                                                          }}
                                                      />
                                                      <Label className="text-xs mt-1 text-center">{day}</Label>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  />
                                  {errors.daysOfWeek && <p className="text-sm text-destructive">{errors.daysOfWeek.message}</p>}
                              </div>

                              {/* Duration */}
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label className="text-sm font-medium flex items-center">
                                          <Hourglass className="h-4 w-4 mr-2 text-primary" />
                                          Hours
                                      </Label>
                                      <Controller
                                          name="durationHours"
                                          control={control}
                                          render={({ field }) => (
                                              <Input
                                                  {...field}
                                                  type="number"
                                                  min="0"
                                                  placeholder="0"
                                                  className="h-11"
                                                  value={field.value ?? ''}
                                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                              />
                                          )}
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-sm font-medium">Minutes</Label>
                                      <Controller
                                          name="durationMinutes"
                                          control={control}
                                          render={({ field }) => (
                                              <Input
                                                  {...field}
                                                  type="number"
                                                  min="0"
                                                  max="59"
                                                  placeholder="30"
                                                  className="h-11"
                                                  value={field.value ?? ''}
                                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                              />
                                          )}
                                      />
                                  </div>
                              </div>

                              {/* Specific Time */}
                              <div className="space-y-2">
                                  <Label className="text-sm font-medium flex items-center">
                                      <Clock className="h-4 w-4 mr-2 text-primary" />
                                      Specific Time (Optional)
                                  </Label>
                                  <Controller
                                      name="specificTime"
                                      control={control}
                                      render={({ field }) => (
                                          <Input
                                              {...field}
                                              type="time"
                                              className="h-11"
                                          />
                                      )}
                                  />
                                  {errors.specificTime && <p className="text-sm text-destructive">{errors.specificTime.message}</p>}
                              </div>

                              {/* Optimal Timing */}
                              <div className="space-y-2">
                                  <Label className="text-sm font-medium">Optimal Timing (Optional)</Label>
                                  <Controller
                                      name="optimalTiming"
                                      control={control}
                                      render={({ field }) => (
                                          <Input
                                              {...field}
                                              value={field.value ?? ''}
                                              onChange={(e) => field.onChange(e.target.value || null)}
                                              placeholder="e.g., Morning after coffee, Before bed"
                                              className="h-11"
                                          />
                                      )}
                                  />
                              </div>
                          </div>
                      </div>

                      <DialogFooter className="px-6 py-4 bg-muted/30 border-t">
                          <div className="flex justify-between w-full">
                              {!isEditing && (
                                  <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => setCurrentStep(1)}
                                      className="text-muted-foreground hover:text-foreground"
                                  >
                                      ← Back
                                  </Button>
                              )}
                              <div className="flex space-x-3 ml-auto">
                                  <DialogClose asChild>
                                      <Button type="button" variant="outline" disabled={isSubmitting || isAISuggesting}>
                                          Cancel
                                      </Button>
                                  </DialogClose>
                                  <Button 
                                      type="submit" 
                                      disabled={isSubmitting || isAISuggesting}
                                      className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
                                  >
                                      {isSubmitting ? (
                                          <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              {isEditing ? 'Updating...' : 'Creating...'}
                                          </>
                                      ) : (
                                          <>
                                              <Save className="mr-2 h-4 w-4" />
                                              {isEditing ? 'Update Habit' : 'Create Habit'}
                                          </>
                                      )}
                                  </Button>
                              </div>
                          </div>
                      </DialogFooter>
                  </form>
              </div>
          )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateHabitDialog;