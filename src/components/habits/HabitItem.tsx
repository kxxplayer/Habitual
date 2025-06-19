"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Circle,
  MoreVertical,
  Edit,
  Trash2,
  CalendarClock,
  Eye,
} from 'lucide-react';
import type { Habit } from '@/types';
import { cn } from '@/lib/utils';
import {
  BookOpen, Briefcase, Code, Dumbbell, Droplets, Heart,
  DollarSign, Brush, PenSquare, Bed, Leaf, MessageCircle, Brain, Target, Bike, Laptop
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const getHabitIcon = (habitName: string): React.ReactNode => {
    const nameLower = habitName.toLowerCase();
    const iconProps = { className: "h-8 w-8 text-foreground/80" };
  
    
    if (nameLower.includes('workout') || nameLower.includes('fitness')) return <Dumbbell {...iconProps} />;
    if (nameLower.includes('bike') || nameLower.includes('cycle')) return <Bike {...iconProps} />;
    if (nameLower.includes('sql') || nameLower.includes('code') || nameLower.includes('python') || nameLower.includes('develop')) return <Laptop {...iconProps} />;
    if (nameLower.includes('water') || nameLower.includes('drink') || nameLower.includes('hydrate')) return <Droplets {...iconProps} />;
    if (nameLower.includes('read') || nameLower.includes('book')) return <BookOpen {...iconProps} />;
    if (nameLower.includes('meditate') || nameLower.includes('mindful')) return <Brain {...iconProps} />;
    if (nameLower.includes('learn') || nameLower.includes('study')) return <Briefcase {...iconProps} />;
    if (nameLower.includes('sleep') || nameLower.includes('bed')) return <Bed {...iconProps} />;
    if (nameLower.includes('journal') || nameLower.includes('write')) return <PenSquare {...iconProps} />;
    if (nameLower.includes('diet') || nameLower.includes('eat healthy') || nameLower.includes('food')) return <Leaf {...iconProps} />;
    if (nameLower.includes('social') || nameLower.includes('talk') || nameLower.includes('call')) return <MessageCircle {...iconProps} />;
    if (nameLower.includes('draw') || nameLower.includes('paint') || nameLower.includes('creative')) return <Brush {...iconProps} />;
    if (nameLower.includes('finance') || nameLower.includes('budget') || nameLower.includes('money')) return <DollarSign {...iconProps} />;
    if (nameLower.includes('stretch') || nameLower.includes('yoga')) return <Heart {...iconProps} />;
    
    // Fallback icon
    return <Target {...iconProps} />;
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
  isSelected?: boolean;
  onSelect?: (habitId: string, checked: boolean) => void;
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
  isSelected,
  onSelect,
}) => {
  
  const handleCompletionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleComplete(habit.id, currentDate);
  };

  return (
    <Card
      onClick={() => onOpenDetailView(habit)}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 flex flex-col h-full",
        isCompleted ? "bg-muted/70" : "bg-card"
      )}
    >
      <div className="p-4 flex flex-col h-full gap-2">
        {/* Top section with name and options */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={!!isSelected}
              onCheckedChange={checked => onSelect && onSelect(habit.id, !!checked)}
              onClick={e => e.stopPropagation()}
              className="mr-2"
            />
            <div className="flex h-10 w-10 items-center justify-center">
              {getHabitIcon(habit.name)}
            </div>
            <p className={cn("font-semibold text-base", isCompleted && "line-through text-muted-foreground")}>
              {habit.name}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 -mr-2 -mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onOpenDetailView(habit)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(habit)}><Edit className="mr-2 h-4 w-4" />Edit Habit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReschedule(habit, currentDate)}><CalendarClock className="mr-2 h-4 w-4" />Reschedule</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(habit.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Spacer to push button to the bottom */}
        <div className="flex-grow" />

        {/* Rounded Completion Button */}
        <Button
          onClick={handleCompletionClick}
          variant={isCompleted ? "secondary" : "outline"}
          className="w-full transition-all duration-150 ease-in-out active:scale-[0.97]"
          size="lg"
        >
          {isCompleted ? (
            <CheckCircle2 className="mr-2 h-5 w-5" />
          ) : (
            <Circle className="mr-2 h-5 w-5" />
          )}
          <span className="font-semibold">
            {isCompleted ? 'Completed' : 'Mark as Done'}
          </span>
        </Button>
      </div>
    </Card>
  );
};

export default HabitItem;