
"use client";

import * as React from 'react';
import type { FC } from 'react';
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
import { Loader2, Brain } from 'lucide-react';

interface AIReflectionPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  habitName: string;
  promptText: string | null;
  isLoading: boolean;
  error?: string | null;
}

const AIReflectionPromptDialog: FC<AIReflectionPromptDialogProps> = ({
  isOpen,
  onClose,
  habitName,
  promptText,
  isLoading,
  error,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center">
            <Brain className="mr-2 h-5 w-5 text-primary" /> AI Reflection for "{habitName}"
          </DialogTitle>
          <DialogDescription>
            Here's a thought-starter for your reflection.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 px-2 min-h-[100px]">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Generating prompt...</p>
            </div>
          )}
          {error && !isLoading && (
            <div className="text-destructive text-center">
              <p>Could not load reflection prompt: {error}</p>
            </div>
          )}
          {!isLoading && !error && promptText && (
            <p className="text-foreground whitespace-pre-wrap">{promptText}</p>
          )}
          {!isLoading && !error && !promptText && (
            <p className="text-muted-foreground text-center">No prompt available.</p>
          )}
        </div>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button onClick={onClose} variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIReflectionPromptDialog;
