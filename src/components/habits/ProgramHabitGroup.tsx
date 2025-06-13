"use client";

import * as React from 'react';
import type { FC } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Brain, Loader2 } from 'lucide-react';

interface GoalInputProgramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: string, duration: string) => void;
  isLoading?: boolean;
}

const formSchema = z.object({
  goal: z.string().min(10, { message: "Please describe your goal in at least 10 characters." }),
  duration: z.string({ required_error: "Please select a duration." }),
});

type FormData = z.infer<typeof formSchema>;

const GoalInputProgramDialog: FC<GoalInputProgramDialogProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goal: "",
      duration: "4 weeks",
    },
  });

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data.goal, data.duration);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center text-2xl">
            <Brain className="mr-3 h-6 w-6 text-primary" />
            Create a New Habit Program
          </DialogTitle>
          <DialogDescription className="pt-1">
            Describe your main objective, and our AI will generate a structured habit program to help you achieve it.
          </DialogDescription>
        </DialogHeader>
        {/* FIX: Form now wraps the scrollable content and footer */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-grow min-h-0">
          {/* FIX: This div is now scrollable on mobile when the keyboard is open */}
          <div className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="goal-input" className="text-base font-semibold">
                What is your primary goal?
              </Label>
              <Controller
                name="goal"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="goal-input"
                    placeholder="e.g., 'Learn to play the guitar', 'Get in shape for a marathon', or 'Become a better public speaker'"
                    className="min-h-[100px] text-base"
                    {...field}
                    // FIX: Removed autoFocus prop to prevent keyboard from popping up automatically
                    // autoFocus 
                  />
                )}
              />
              {errors.goal && <p className="text-sm text-destructive">{errors.goal.message}</p>}
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">
                How long do you want to focus on this goal?
              </Label>
              <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="2 weeks" id="d-2w" />
                      <Label htmlFor="d-2w">2 Weeks (Quick Start)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="4 weeks" id="d-4w" />
                      <Label htmlFor="d-4w">4 Weeks (Standard)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="8 weeks" id="d-8w" />
                      <Label htmlFor="d-8w">8 Weeks (Deep Dive)</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errors.duration && <p className="text-sm text-destructive">{errors.duration.message}</p>}
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Program
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GoalInputProgramDialog;