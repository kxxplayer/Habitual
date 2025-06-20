"use client";

import * as React from 'react';
import type { FC } from 'react';
import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { WandSparkles, Send, Loader2 } from 'lucide-react';

interface GoalInputProgramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: string, duration: string) => void;
  isLoading?: boolean;
}

const GoalInputProgramDialog: FC<GoalInputProgramDialogProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('');

  const handleSubmit = () => {
    if (goal.trim() && duration.trim()) {
      onSubmit(goal, duration);
    } else {
      // Input validation - just return without showing toast
      return;
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      setGoal('');
      setDuration('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card rounded-lg shadow-xl max-h-[90vh] max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center">
            <WandSparkles className="mr-2 h-5 w-5 text-primary" /> Create Habit Program from Goal
          </DialogTitle>
          <DialogDescription>
            Tell us your goal and how long you want to focus. We'll suggest a habit program.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain py-4 px-4 space-y-4">
          <div>
            <Label htmlFor="program-goal" className="text-sm font-medium">
              What is your primary goal?
            </Label>
            <Input
              id="program-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., Reduce weight, Learn Python, Read more books"
              className="mt-2 border-2 border-border focus:border-primary bg-background"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="program-duration" className="text-sm font-medium">
              Focus duration for this program?
            </Label>
            <Input
              id="program-duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 3 months, 6 weeks, 1 month"
              className="mt-2 border-2 border-border focus:border-primary bg-background"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4 border-t bg-card">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading} onClick={onClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isLoading || !goal.trim() || !duration.trim()}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isLoading ? 'Generating...' : 'Get Program Suggestion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoalInputProgramDialog;
