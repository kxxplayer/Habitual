// src/components/habits/HabitItem.tsx

"use client";

import React, { useState } from 'react';
import type { FC } from 'react';
import type { Habit } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Check, Flame, Repeat, Info, Trash2, Edit, CalendarPlus, X } from 'lucide-react';
import { getHabitIcon } from '@/lib/getHabitIcon';
import { Badge } from '@/components/ui/badge';

interface HabitItemProps {
  habit: Habit;
  onToggleComplete: (habitId: string, date: string) => void;
  onDelete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onReschedule: (habit: Habit) => void;
  isCompleted: boolean;
  currentDate: string;
}

const HabitItem: FC<HabitItemProps> = ({
  habit,
  onToggleComplete,
  onDelete,
  onEdit,
  onReschedule,
  isCompleted,
  currentDate
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const HabitIcon = getHabitIcon(habit.category);
  const streak = habit.streak || 0;

  const cardVariants = {
    initial: { height: 'auto', opacity: 1, scale: 1 },
    deleted: { height: 0, opacity: 0, scale: 0.8, transition: { duration: 0.4 } },
    completed: {
      borderColor: ['hsl(var(--primary))', 'hsl(var(--border))'],
      transition: { duration: 1.5, ease: "circOut" }
    }
  };

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
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="initial"
      animate={isCompleted ? "completed" : "initial"}
      exit="deleted"
      className={cn(
        "bg-card text-card-foreground rounded-2xl shadow-sm border-l-4 transition-all duration-300 ease-in-out cursor-pointer",
        isCompleted ? "border-primary bg-primary/10" : "border-transparent",
        "hover:shadow-md hover:border-primary/50" // Subtle hover effect
      )}
      onClick={handleCardClick}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("p-2 rounded-full", isCompleted ? "bg-primary/20" : "bg-secondary")}>
            <HabitIcon className={cn("h-6 w-6", isCompleted ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg">{habit.name}</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>{streak} day streak</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleToggleComplete}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out",
            isCompleted ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-primary/10"
          )}
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          <Check className="h-6 w-6" />
        </button>
      </div>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="px-4 pb-4 pt-2 border-t border-border"
        >
          <p className="text-sm text-muted-foreground mb-3">{habit.description || 'No description provided.'}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{habit.category}</Badge>
            {habit.optimalTiming && <Badge variant="secondary">{habit.optimalTiming}</Badge>}
            {habit.durationMinutes && <Badge variant="secondary">{habit.durationMinutes} min</Badge>}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={handleEdit} className="p-2 hover:bg-secondary rounded-full"><Edit className="h-4 w-4" /></button>
            <button onClick={handleReschedule} className="p-2 hover:bg-secondary rounded-full"><CalendarPlus className="h-4 w-4" /></button>
            <button onClick={handleDelete} className="p-2 hover:bg-destructive/10 text-destructive rounded-full"><Trash2 className="h-4 w-4" /></button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default HabitItem;
