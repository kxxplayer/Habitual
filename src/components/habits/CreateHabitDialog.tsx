"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InlineCreateHabitForm from "./InlineCreateHabitForm";
import GoalInputProgramDialog from "../programs/GoalInputProgramDialog";
import { Habit } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface ManualHabitData {
  description: string;
  frequency: string;
  timeOfDay: string;
}

interface AiHabitData {
  description: string;
  isAI: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateHabit: (habit: Omit<Habit, "id" | "userId">) => void;
}

export function CreateHabitDialog({
  open,
  onOpenChange,
  onCreateHabit,
}: Props) {
  const [creationMode, setCreationMode] = useState<
    "description" | "manual" | "program"
  >("description");
  const { toast } = useToast();


  const renderContent = () => {
    switch (creationMode) {
      case "description":
        return (
          <>
            <DialogHeader>
              <DialogTitle>Add a new habit</DialogTitle>
              <DialogDescription>
                How would you like to create your new habit?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setCreationMode("manual")}
              >
                Fill Manually
              </Button>
              <Button
                variant="outline"
                onClick={() => setCreationMode("program")}
              >
                Create a Program
              </Button>
            </DialogFooter>
          </>
        );
      case "manual":
        return (
          // FIX: Added the required onCancel prop
          <InlineCreateHabitForm
            onCreate={(data: ManualHabitData | AiHabitData) => {
              onCreateHabit(data as any);
              onOpenChange(false);
            }}
            onCancel={() => setCreationMode("description")}
          />
        );
      case "program":
        return (
          <GoalInputProgramDialog
            isOpen={true}
            onClose={() => setCreationMode("description")}
            onSubmit={(goal, duration) => {
              console.log("Program Goal:", goal, "Duration:", duration);
              toast({
                title: "Generating Program...",
                description: "Your new habit program is being created.",
              });
              onOpenChange(false);
            }}
          />
        );
    }
  };

  return (
    // FIX: Corrected onOpen to open and ensured matching braces
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{renderContent()}</DialogContent>
    </Dialog>
  );
}