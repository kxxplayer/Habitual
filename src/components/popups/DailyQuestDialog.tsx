
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
import { Lightbulb, ChevronRight } from 'lucide-react'; // Changed icon to Lightbulb

export interface DailyQuestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
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
            <Lightbulb className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-bold text-primary">
            Unlock Today's Inner Strength!
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground px-4">
            A new day, a new discovery! Ready to find a new tool for your peace of mind? 
            Your journey to a more balanced you starts now. Let's uncover your first gem!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4 pb-6">
          <Button onClick={onClose} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base">
            <ChevronRight className="mr-2 h-4 w-4" />
            Begin Discovery!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DailyQuestDialog;
