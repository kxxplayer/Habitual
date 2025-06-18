"use client";

import * as React from 'react';
import type { FC } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { CreateHabitFormData, HabitCategory, WeekDay } from '../../types';
import { HABIT_CATEGORIES, weekDays } from '../../types';
import { useToast } from "@/hooks/use-toast";
import { genkitService } from '@/lib/genkit-service';
import { Lightbulb, Loader2, Wand2 } from 'lucide-react';

interface CreateHabitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveHabit: (data: CreateHabitFormData) => void;
  initialData?: Partial<CreateHabitFormData> | null;
  onOpenGoalProgramDialog: () => void;
}

// FIXED: Added .nullable() to match the CreateHabitFormData type
const createHabitFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "Habit name must be at least 2 characters." }),
  description: z.string().optional(),
  category: z.enum(HABIT_CATEGORIES).optional(),
  daysOfWeek: z.array(z.enum(weekDays)).min(1, { message: "Select at least one day." }),
  optimalTiming: z.string().optional().nullable(),
  durationHours: z.number().optional().nullable(),
  durationMinutes: z.number().optional().nullable(),
  specificTime: z.string().optional().nullable(),
});

const CreateHabitDialog: FC<CreateHabitDialogProps> = ({
  isOpen,
  onClose,
  onSaveHabit,
  initialData,
  onOpenGoalProgramDialog,
}) => {
  const { toast } = useToast();
  const form = useForm<CreateHabitFormData>({
    resolver: zodResolver(createHabitFormSchema),
    defaultValues: {
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

  const [isAILoading, setIsAILoading] = React.useState(false);

  const watchedName = form.watch('name');

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          ...initialData,
          durationHours: initialData.durationHours ?? null,
          durationMinutes: initialData.durationMinutes ?? null,
        });
      } else {
        form.reset({
          id: undefined,
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
    }
  }, [initialData, form.reset, isOpen]);

  const handleAIHabitGeneration = async () => {
    if (!watchedName || watchedName.trim().length < 5) {
      toast({
        title: "AI Assistant",
        description: "Please enter a more descriptive habit idea (at least 5 characters).",
        variant: "default",
      });
      return;
    }

    setIsAILoading(true);
    try {
      const result = await genkitService.generateHabit(watchedName);
      form.setValue('name', result.habitName, { shouldValidate: true });
      form.setValue('category', result.category);
      form.setValue('daysOfWeek', result.daysOfWeek as WeekDay[]);
      if (result.optimalTiming) form.setValue('optimalTiming', result.optimalTiming);
      if (result.durationHours) form.setValue('durationHours', result.durationHours);
      if (result.durationMinutes) form.setValue('durationMinutes', result.durationMinutes);
      if (result.specificTime) form.setValue('specificTime', result.specificTime);

      toast({
        title: "AI Complete!",
        description: "Your habit has been structured by AI.",
      });
    } catch (error) {
      console.error("AI habit generation failed:", error);
      toast({
        title: "AI Error",
        description: "Could not generate habit details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAILoading(false);
    }
  };
  
  const processSubmit = (data: CreateHabitFormData) => {
    onSaveHabit(data);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Habit' : 'Create a New Habit'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update the details of your habit.' : 'Fill in the details for your new habit. You can also use AI to help!'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(processSubmit)}>
            <ScrollArea className="h-[60vh] p-4">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Habit Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input placeholder="e.g., Read for 30 minutes" {...field} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={handleAIHabitGeneration}
                            disabled={isAILoading || !watchedName}
                          >
                            {isAILoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Why is this habit important to you?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {HABIT_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="daysOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeat on</FormLabel>
                      <FormControl>
                        <ToggleGroup
                          type="multiple"
                          variant="outline"
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex flex-wrap"
                        >
                          {weekDays.map(day => (
                            <ToggleGroupItem key={day} value={day} aria-label={`Toggle ${day}`}>
                              {day}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                        onClose();
                        onOpenGoalProgramDialog();
                    }}
                >
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Need inspiration? Create a full program from a goal.
                </Button>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-6">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? 'Save Changes' : 'Create Habit'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateHabitDialog;