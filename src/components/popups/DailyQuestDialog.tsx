
"use client";

// ==========================================================================
// DAILY QUEST DIALOG - VERCEL BUILD DEBUG ATTEMPT (Force Rebuild v2)
// Date: 2025-05-21 (Ensuring PlayCircle is NOT imported, adding explicit React import)
// The persistent error on Vercel regarding PlayCircle strongly suggests a build cache issue.
// This version aims to make the file significantly different to force a cache break.
// ==========================================================================

import * as React from 'react'; // Added explicit React import
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookOpenText, ChevronRight } from 'lucide-react'; // Corrected and verified: No PlayCircle

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
            <BookOpenText className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-bold text-primary">
            Today's a Fresh Page!
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground px-4">
            Every big journey begins with a single step. Shall we start yours with a moment of calm?
            Let's take the first simple step together.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4 pb-6">
          <Button onClick={onClose} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base">
            <ChevronRight className="mr-2 h-5 w-5" />
            Take First Step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DailyQuestDialog;
