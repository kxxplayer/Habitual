
"use client";

import type { FC } from 'react';
import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquareText, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AddReflectionNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (note: string) => void;
  initialNote?: string;
  habitName: string;
  completionDate: string; // YYYY-MM-DD
}

const AddReflectionNoteDialog: FC<AddReflectionNoteDialogProps> = ({
  isOpen,
  onClose,
  onSaveNote,
  initialNote = '',
  habitName,
  completionDate,
}) => {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
    }
  }, [isOpen, initialNote]);

  const handleSave = () => {
    onSaveNote(note);
    onClose();
  };

  let formattedDate = completionDate;
  try {
    // Add a dummy time to parseISO to avoid timezone issues if only date is passed
    formattedDate = format(parseISO(completionDate + 'T00:00:00Z'), 'MMMM d, yyyy');
  } catch (e) {
    console.error("Error formatting date in reflection dialog:", e);
    // Keep original completionDate if formatting fails
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center">
            <MessageSquareText className="mr-2 h-5 w-5 text-primary" />
            Reflection for "{habitName}"
          </DialogTitle>
          <DialogDescription>
            On {formattedDate}. What are your thoughts on this completion?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 px-1 space-y-2">
          <Label htmlFor="reflection-note" className="text-sm font-medium">Your Note</Label>
          <Textarea
            id="reflection-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="E.g., Felt energized after this, or found it challenging today because..."
            className="min-h-[100px] bg-input/50"
            rows={4}
          />
        </div>

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddReflectionNoteDialog;
