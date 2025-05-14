"use client";

// This component's core functionality (the form) has been moved to src/app/page.tsx.
// It is no longer used for creating habits via a dialog from the AppHeader.
// Keeping the file for now, but it's not actively used in the main "create habit" flow.
// It could be repurposed or deleted later.

import type { FC } from 'react';
// import { useState, useEffect } from 'react';
// import { useForm, Controller } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
// import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea';
// import { Label } from '@/components/ui/label';
// import { Loader2, Wand2, Clock, CalendarClock, Timer } from 'lucide-react';
// import { createHabitFromDescription } from '@/ai/flows/habit-creation-from-description';
import type { Habit } from '@/types';
// import { useToast } from '@/hooks/use-toast';

interface CreateHabitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddHabit: (habit: Omit<Habit, 'id' | 'completionLog'>) => void;
}

// const formSchema = z.object({
//   description: z.string().optional(),
//   name: z.string().min(1, "Habit name is required."),
//   frequency: z.string().min(1, "Frequency is required."),
//   optimalTiming: z.string().optional(),
//   duration: z.string().optional(),
//   specificTime: z.string().optional(),
// });

// type FormData = z.infer<typeof formSchema>;

const CreateHabitDialog: FC<CreateHabitDialogProps> = ({ isOpen, onClose, onAddHabit }) => {
  // const [isAISuggesting, setIsAISuggesting] = useState(false);
  // const { toast } = useToast();
  
  // const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
  //   resolver: zodResolver(formSchema),
  //   defaultValues: {
  //     description: '',
  //     name: '',
  //     frequency: '',
  //     optimalTiming: '',
  //     duration: '',
  //     specificTime: '',
  //   },
  // });

  // const habitDescription = watch('description');

  // useEffect(() => {
  //   if (!isOpen) {
  //     reset(); 
  //   }
  // }, [isOpen, reset]);

  // const handleAISuggest = async () => { /* ... logic moved ... */ };
  // const onSubmit = (data: FormData) => { /* ... logic moved ... */ };

  // The form UI and logic are now in src/app/page.tsx
  // This dialog is not being used for the primary add habit flow anymore.

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] bg-card rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Create New Habit (Dialog - Deprecated Flow)</DialogTitle>
          <DialogDescription>
            This dialog is no longer the primary way to add habits. Please use the form on the main page.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <p>The habit creation form has been moved to the main page for easier access.</p>
        </div>
        <DialogFooter className="pt-4">
          {/* <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled>
            Add Habit (Disabled)
          </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateHabitDialog;
