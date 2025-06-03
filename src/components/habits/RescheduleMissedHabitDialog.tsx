
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, startOfToday, isBefore } from 'date-fns';
import { AlertTriangle, CalendarClock, SkipForward } from 'lucide-react';

interface RescheduleMissedHabitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  habitName: string;
  originalMissedDate: string;
  onReschedule: (newDate: string) => void;
  onMarkAsSkipped: () => void;
}

const RescheduleMissedHabitDialog: FC<RescheduleMissedHabitDialogProps> = ({ isOpen, onClose, habitName, originalMissedDate, onReschedule, onMarkAsSkipped }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const today = startOfToday();

  const handleReschedule = () => { if (selectedDate) { onReschedule(format(selectedDate, 'yyyy-MM-dd')); onClose(); setSelectedDate(undefined); } };
  const handleSkip = () => { onMarkAsSkipped(); onClose(); setSelectedDate(undefined); };
  
  let formattedOriginalDate = originalMissedDate;
  try {
    const dateObj = parseISO(originalMissedDate);
    if (!isNaN(dateObj.getTime())) formattedOriginalDate = format(dateObj, 'MMMM d, yyyy');
  } catch (e) { console.error("Error formatting original missed date for reschedule dialog:", e); }

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) { onClose(); setSelectedDate(undefined); }}}>
      <DialogContent className="sm:max-w-[480px] bg-card rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive" />Action for Missed Habit</DialogTitle>
          <DialogDescription>"{habitName}" was missed on {formattedOriginalDate}.</DialogDescription>
        </DialogHeader>
        <div className="py-4 px-1 space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1.5 flex items-center"><CalendarClock className="mr-1.5 h-4 w-4 text-primary"/>Reschedule to a future date:</h4>
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={date => isBefore(date, today)} initialFocus className="rounded-md border bg-input/20 w-full flex justify-center"/>
          </div>
        </div>
        <DialogFooter className="pt-4 flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Button onClick={handleSkip} variant="outline" className="w-full sm:w-auto"><SkipForward className="mr-2 h-4 w-4" /> Mark as Skipped</Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end sm:space-x-2 w-full sm:w-auto">
            <DialogClose asChild><Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setSelectedDate(undefined)}>Cancel</Button></DialogClose>
            <Button onClick={handleReschedule} disabled={!selectedDate} className="w-full sm:w-auto">Reschedule</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default RescheduleMissedHabitDialog;

