// src/components/habits/HabitItem.tsx
"use client";

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { CheckCircle2, Circle, MoreVertical, Edit, Trash2, CalendarClock, Eye } from 'lucide-react';
import type { Habit } from '@/types';
import { cn } from '@/lib/utils';

// Helper function to get a more modern icon based on keywords
const getHabitIcon = (habitName: string): string => {
  const nameLower = habitName.toLowerCase();
  if (nameLower.includes('gym') || nameLower.includes('workout') || nameLower.includes('fitness')) return '🏋️';
  if (nameLower.includes('sql') || nameLower.includes('code') || nameLower.includes('python')) return '💻';
  if (nameLower.includes('water') || nameLower.includes('drink') || nameLower.includes('hydrate')) return '💧';
  if (nameLower.includes('walk') || nameLower.includes('run') || nameLower.includes('jog')) return '🚶';
  if (nameLower.includes('read') || nameLower.includes('book')) return '📚';
  if (nameLower.includes('meditate') || nameLower.includes('mindfulness')) return '🧘';
  if (nameLower.includes('learn') || nameLower.includes('study')) return '📝';
  if (nameLower.includes('sleep') || nameLower.includes('bed')) return '🛏️';
  if (nameLower.includes('journal') || nameLower.includes('write')) return '✍️';
  return '✨';
};

interface HabitItemProps {
  habit: Habit;
  isCompleted: boolean;
  currentDate: string;
  todayString: string;
  onToggleComplete: (habitId: string, date: string) => void;
  onDelete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onReschedule: (habit: Habit, missedDate: string) => void;
  onOpenDetailView: (habit: Habit) => void;
}

const HabitItem: React.FC<HabitItemProps> = ({
  habit,
  isCompleted,
  currentDate,
  onToggleComplete,
  onDelete,
  onEdit,
  onReschedule,
  onOpenDetailView,
}) => {
  const handleCardClick = () => {
    onOpenDetailView(habit);
  };

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/40 active:scale-[0.98]",
        isCompleted ? "bg-muted/60" : "bg-card"
      )}
    >
      <div className="p-3 flex items-center gap-3">
        {/* Completion Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(habit.id, currentDate);
          }}
          aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-6 w-6 text-accent" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground/50" />
          )}
        </Button>

        {/* Habit Name and Icon */}
        <div className="flex-grow flex items-center gap-3 truncate">
          <span className="text-2xl">{getHabitIcon(habit.name)}</span>
          <div className="truncate">
            <p className={cn("font-medium truncate", isCompleted && "line-through text-muted-foreground")}>
              {habit.name}
            </p>
          </div>
        </div>

        {/* More Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onOpenDetailView(habit)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(habit)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Habit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReschedule(habit, currentDate)}>
              <CalendarClock className="mr-2 h-4 w-4" />
              Reschedule
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(habit.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};

export default HabitItem;