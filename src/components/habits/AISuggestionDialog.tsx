
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Lightbulb } from 'lucide-react';

interface AISuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  habitName: string;
  suggestion: string;
  isLoading: boolean;
  error: string | null;
}

const AISuggestionDialog: FC<AISuggestionDialogProps> = ({ isOpen, onClose, habitName, suggestion, isLoading, error }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center">
            <Lightbulb className="mr-2 h-6 w-6 text-primary" /> AI Suggestion for "{habitName}"
          </DialogTitle>
          <DialogDescription> Personalized tip to help you stay on track. </DialogDescription>
        </DialogHeader>
        <div className="py-4 px-2 min-h-[100px]">
          {isLoading && (<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Generating...</p></div>)}
          {error && !isLoading && (<div className="text-destructive text-center"><p>Could not load suggestion: {error}</p></div>)}
          {!isLoading && !error && suggestion && (<p className="text-foreground whitespace-pre-wrap">{suggestion}</p>)}
          {!isLoading && !error && !suggestion && (<p className="text-muted-foreground text-center">No suggestion available.</p>)}
        </div>
        <DialogFooter className="pt-4"> <Button onClick={onClose}>Close</Button> </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default AISuggestionDialog;

