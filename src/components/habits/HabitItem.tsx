"use client";

import React from 'react';

interface HabitItemProps {
 habit: any; // Simplify type for now
 onToggleComplete: (habitId: string, date: string) => void;
 onDelete: (habitId: string) => void;
 onEdit: (habit: any) => void;
 onReschedule: (habit: any) => void;
 isCompleted: boolean;
 currentDate: string;
}

const HabitItem: React.FC<HabitItemProps> = ({
 habit,
 onToggleComplete,
 onDelete,
 onEdit,
 onReschedule,
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

 return (
 <div>
 <h3>{habit.name}</h3>
 <button onClick={handleToggleComplete}>
 Toggle Complete
 </button>
 <div>
 <button onClick={handleEdit}>
 Edit
 </button>
 <button onClick={handleReschedule}>
 Reschedule
 </button>
 <button onClick={handleDelete}>
 Delete
 </button>
 </div>
 </div>
 );
};

export default HabitItem;
