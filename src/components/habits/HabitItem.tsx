"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  CheckCircle2, 
  Circle, 
  MoreVertical, 
  Edit3, 
  CalendarClock, 
  Trash2,
  Clock,
  Tag,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Habit, WeekDay } from '@/types';

interface HabitItemProps {
  habit: Habit;
  onToggleComplete: (habitId: string, date: string) => void;
  onDelete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onReschedule: (habit: Habit) => void;
  onOpenDetailView?: (habit: Habit) => void;
  isCompleted: boolean;
  currentDate: string;
}

const getCategoryIcon = (category?: string) => {
  switch (category) {
    case 'Health & Fitness':
      return '💪';
    case 'Work & Study':
      return '💼';
    case 'Personal Development':
      return '🌱';
    case 'Mindfulness':
      return '🧘';
    case 'Social':
      return '👥';
    case 'Creative':
      return '🎨';
    case 'Finance':
      return '💰';
    case 'Home & Environment':
      return '🏡';
    case 'Entertainment':
      return '🎮';
    default:
      return '⭐';
  }
};

const HabitItem: React.FC<HabitItemProps> = ({
  habit,
  onToggleComplete,
  onDelete,
  onEdit,
  onReschedule,
  onOpenDetailView,
  isCompleted,
  currentDate,
}) => {
  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComplete(habit.id, currentDate);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(habit.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(habit);
  };

  const handleReschedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReschedule(habit);
  };

  const handleCardClick = () => {
    if (onOpenDetailView) {
      onOpenDetailView(habit);
    }
  };

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0;
    const sortedLogs = [...habit.completionLog]
      .filter(log => log.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (sortedLogs.length === 0) return 0;
    
    // Check if the most recent completion was today or yesterday
    const today = new Date(currentDate);
    const mostRecent = new Date(sortedLogs[0].date);
    const dayDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayDiff > 1) return 0;
    
    // Count consecutive days
    for (let i = 0; i < sortedLogs.length; i++) {
      const logDate = new Date(sortedLogs[i].date);
      const expectedDate = new Date(mostRecent);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (logDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();
  const hasSpecificTime = habit.specificTime && 
    habit.specificTime.toLowerCase() !== 'anytime' && 
    habit.specificTime.toLowerCase() !== 'flexible';

  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all duration-200 hover:shadow-lg relative overflow-visible",
        "border border-border bg-card hover:bg-accent/5",
        isCompleted && "opacity-75 bg-accent/10"
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Completion Status Icon */}
          <button
            onClick={handleToggleComplete}
            className={cn(
              "transition-all duration-200 hover:scale-110",
              isCompleted ? "text-accent" : "text-muted-foreground hover:text-primary"
            )}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <Circle className="h-6 w-6" />
            )}
          </button>

          {/* Habit Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getCategoryIcon(habit.category)}</span>
              <h3 className={cn(
                "font-semibold text-base truncate",
                isCompleted && "text-muted-foreground line-through"
              )}>
                {habit.name}
              </h3>
              {streak > 2 && (
                <div className="flex items-center gap-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                  <Star className="h-3 w-3" />
                  <span>{streak}</span>
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {habit.category && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  <span>{habit.category}</span>
                </div>
              )}
              {hasSpecificTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{habit.specificTime}</span>
                </div>
              )}
              {habit.durationMinutes && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{habit.durationMinutes}m</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleEdit}>
              <Edit3 className="mr-2 h-4 w-4" />
              <span>Edit Habit</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReschedule}>
              <CalendarClock className="mr-2 h-4 w-4" />
              <span>Reschedule</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};

export default HabitItem;