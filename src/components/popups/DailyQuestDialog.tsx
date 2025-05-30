
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, PlayCircle } from 'lucide-react';

interface DailyQuestDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DailyQuestDialog: React.FC<DailyQuestDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card rounded-lg shadow-xl">
        <DialogHeader className="text-center space-y-2 pt-4">
          <div className="flex justify-center">
            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-bold text-primary">
            Your Daily Quest Awaits!
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground px-4">
            Today is a fresh start! Ready to take one small step towards a
            brighter, calmer you? Let's begin this journey together.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4 pb-6">
          <Button onClick={onClose} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base">
            <PlayCircle className="mr-2 h-5 w-5" />
            Let's Go!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DailyQuestDialog;
