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
  DollarSign, Brush, PenSquare, Bed, Leaf, MessageCircle, Brain, Target, Bike, Laptop,
  Car, Music, Utensils, Coffee, Camera, Gamepad2, Headphones, ShoppingCart, 
  Plane, Hammer, GraduationCap, Calculator, Scissors, Stethoscope, Wrench
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const getHabitIcon = (habitName: string): React.ReactNode => {
    const nameLower = habitName.toLowerCase();
  
    // Driving related
    if (nameLower.includes('driving') || nameLower.includes('drive')) {
        return <Car className="h-8 w-8 text-blue-600" />;
    }
    
    // Music and instruments
    if (nameLower.includes('guitar') || nameLower.includes('piano') || nameLower.includes('music') || nameLower.includes('practice') && (nameLower.includes('instrument') || nameLower.includes('guitar') || nameLower.includes('piano'))) {
        return <Music className="h-8 w-8 text-purple-600" />;
    }
    
    // Theory study (books, learning)
    if (nameLower.includes('theory') || nameLower.includes('study') || nameLower.includes('learn')) {
        return <GraduationCap className="h-8 w-8 text-indigo-600" />;
    }
    
    // Simulation (games, practice)
    if (nameLower.includes('simulation') || nameLower.includes('simulator')) {
        return <Gamepad2 className="h-8 w-8 text-green-600" />;
    }
    
    // Review sessions
    if (nameLower.includes('review') || nameLower.includes('revision')) {
        return <BookOpen className="h-8 w-8 text-orange-600" />;
    }
    
    // Fitness and workout
    if (nameLower.includes('workout') || nameLower.includes('fitness') || nameLower.includes('exercise') || nameLower.includes('gym')) {
        return <Dumbbell className="h-8 w-8 text-red-600" />;
    }
    
    // Cycling and biking
    if (nameLower.includes('bike') || nameLower.includes('cycle') || nameLower.includes('cycling')) {
        return <Bike className="h-8 w-8 text-emerald-600" />;
    }
    
    // Programming and coding
    if (nameLower.includes('code') || nameLower.includes('programming') || nameLower.includes('develop') || nameLower.includes('sql') || nameLower.includes('python') || nameLower.includes('javascript')) {
        return <Laptop className="h-8 w-8 text-slate-600" />;
    }
    
    // Water and hydration
    if (nameLower.includes('water') || nameLower.includes('drink') || nameLower.includes('hydrate')) {
        return <Droplets className="h-8 w-8 text-cyan-600" />;
    }
    
    // Reading
    if (nameLower.includes('read') || nameLower.includes('book')) {
        return <BookOpen className="h-8 w-8 text-amber-600" />;
    }
    
    // Meditation and mindfulness
    if (nameLower.includes('meditate') || nameLower.includes('mindful') || nameLower.includes('meditation')) {
        return <Brain className="h-8 w-8 text-violet-600" />;
    }
    
    // Sleep and rest
    if (nameLower.includes('sleep') || nameLower.includes('bed') || nameLower.includes('rest')) {
        return <Bed className="h-8 w-8 text-blue-500" />;
    }
    
    // Writing and journaling
    if (nameLower.includes('journal') || nameLower.includes('write') || nameLower.includes('writing')) {
        return <PenSquare className="h-8 w-8 text-teal-600" />;
    }
    
    // Diet and nutrition
    if (nameLower.includes('diet') || nameLower.includes('eat') || nameLower.includes('food') || nameLower.includes('nutrition')) {
        return <Utensils className="h-8 w-8 text-green-600" />;
    }
    
    // Social activities
    if (nameLower.includes('social') || nameLower.includes('talk') || nameLower.includes('call') || nameLower.includes('friends')) {
        return <MessageCircle className="h-8 w-8 text-pink-600" />;
    }
    
    // Creative activities
    if (nameLower.includes('draw') || nameLower.includes('paint') || nameLower.includes('creative') || nameLower.includes('art')) {
        return <Brush className="h-8 w-8 text-orange-500" />;
    }
    
    // Finance and money
    if (nameLower.includes('finance') || nameLower.includes('budget') || nameLower.includes('money') || nameLower.includes('saving')) {
        return <DollarSign className="h-8 w-8 text-green-700" />;
    }
    
    // Yoga and stretching
    if (nameLower.includes('stretch') || nameLower.includes('yoga')) {
        return <Heart className="h-8 w-8 text-rose-600" />;
    }
    
    // Coffee or morning routine
    if (nameLower.includes('coffee') || nameLower.includes('morning')) {
        return <Coffee className="h-8 w-8 text-amber-700" />;
    }
    
    // Photography
    if (nameLower.includes('photo') || nameLower.includes('picture') || nameLower.includes('camera')) {
        return <Camera className="h-8 w-8 text-gray-600" />;
    }
    
    // Shopping or errands
    if (nameLower.includes('shop') || nameLower.includes('grocery') || nameLower.includes('buy')) {
        return <ShoppingCart className="h-8 w-8 text-blue-700" />;
    }
    
    // Travel or planning
    if (nameLower.includes('travel') || nameLower.includes('trip') || nameLower.includes('vacation')) {
        return <Plane className="h-8 w-8 text-sky-600" />;
    }
    
    // Work or business
    if (nameLower.includes('work') || nameLower.includes('business') || nameLower.includes('office')) {
        return <Briefcase className="h-8 w-8 text-gray-700" />;
    }
    
    // Repair or maintenance
    if (nameLower.includes('repair') || nameLower.includes('fix') || nameLower.includes('maintenance')) {
        return <Wrench className="h-8 w-8 text-zinc-600" />;
    }
    
    // Health and medical
    if (nameLower.includes('health') || nameLower.includes('doctor') || nameLower.includes('medical')) {
        return <Stethoscope className="h-8 w-8 text-red-500" />;
    }
    
    // Fallback icon with primary color
    return <Target className="h-8 w-8 text-primary" />;
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
          className={cn(
            "w-full transition-all duration-300 ease-in-out active:scale-[0.97] relative overflow-hidden",
            isCompleted 
              ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-green-500 shadow-lg shadow-green-500/25" 
              : "hover:bg-primary/5 hover:border-primary/50 border-2 border-dashed border-muted-foreground/30 hover:border-primary/60"
          )}
          size="lg"
        >
          <div className={cn(
            "flex items-center justify-center mr-2 h-6 w-6 rounded-full transition-all duration-300",
            isCompleted 
              ? "bg-white/20 backdrop-blur-sm" 
              : "border-2 border-primary/40 border-dashed hover:border-primary/70 hover:bg-primary/10"
          )}>
            {isCompleted ? (
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <div className="h-2 w-2 rounded-full bg-primary/40 transition-all duration-300 group-hover:bg-primary/70" />
            )}
          </div>
          <span className="font-semibold">
            {isCompleted ? 'Completed ✨' : 'Mark as Done'}
          </span>
          {isCompleted && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-pulse" />
          )}
        </Button>
      </div>
    </Card>
  );
};

export default HabitItem;