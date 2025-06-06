
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, ListChecks, Droplets, Bed, BookOpenText, HeartPulse, Briefcase, Paintbrush, Home as HomeIconLucide, Landmark, Users, Smile as LifestyleIcon, Sparkles as SparklesIcon } from 'lucide-react';
import type { Habit, HabitCategory } from '@/types';
import { HABIT_CATEGORIES } from '@/types';
import { format, isSameDay, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface HabitItemProps {
  habit: Habit;
  onOpenDetailView: (habit: Habit) => void;
  todayString: string; // YYYY-MM-DD
}

const getHabitTileIcon = (habit: Habit): React.ReactNode => {
  const nameLower = habit.name.toLowerCase();
  // Simplified icon logic for tiles, can be expanded
  if (nameLower.includes('gym') || nameLower.includes('workout')) return <span className="text-lg">🏋️</span>;
  if (nameLower.includes('sql') || nameLower.includes('code')) return <span className="text-lg">💻</span>;
  if (nameLower.includes('walk') || nameLower.includes('run')) return <span className="text-lg">🚶</span>;
  if (nameLower.includes('read') || nameLower.includes('book')) return <span className="text-lg">📚</span>;
  if (nameLower.includes('meditate') || nameLower.includes('mindfulness')) return <span className="text-lg">🧘</span>;
  if (nameLower.includes('learn') || nameLower.includes('study')) return <Briefcase className="h-5 w-5" />;
  if (nameLower.includes('water') || nameLower.includes('hydrate')) return <Droplets className="h-5 w-5" />;
  if (nameLower.includes('sleep') || nameLower.includes('bed')) return <Bed className="h-5 w-5" />;

  if (habit.category) {
    switch (habit.category) {
      case 'Health & Wellness': return <HeartPulse className="h-5 w-5" />;
      case 'Work/Study': return <Briefcase className="h-5 w-5" />;
      case 'Creative': return <Paintbrush className="h-5 w-5" />;
      case 'Chores': return <HomeIconLucide className="h-5 w-5" />;
      case 'Finance': return <Landmark className="h-5 w-5" />;
      case 'Social': return <Users className="h-5 w-5" />;
      case 'Personal Growth': return <SparklesIcon className="h-5 w-5" />;
      case 'Lifestyle': return <LifestyleIcon className="h-5 w-5" />;
      default: return <ListChecks className="h-5 w-5 text-muted-foreground" />;
    }
  }
  return <ListChecks className="h-5 w-5 text-muted-foreground" />;
};

const getCategoryTileColor = (category?: HabitCategory): string => {
  const categoryColorMap: Record<HabitCategory, string> = {
    "Lifestyle": "border-sky-500", "Work/Study": "border-blue-500", "Health & Wellness": "border-red-500",
    "Creative": "border-orange-500", "Chores": "border-green-500", "Finance": "border-indigo-500",
    "Social": "border-pink-500", "Personal Growth": "border-yellow-500", "Other": "border-gray-400",
  };
  return (category && HABIT_CATEGORIES.includes(category) && categoryColorMap[category]) ? categoryColorMap[category] : categoryColorMap["Other"];
}

const HabitItem: FC<HabitItemProps> = ({ habit, onOpenDetailView, todayString }) => {
  const isCompletedToday = habit.completionLog.some(log => log.date === todayString && log.status === 'completed');

  const categoryBorderColor = getCategoryTileColor(habit.category);

  return (
    <Card
      onClick={() => onOpenDetailView(habit)}
      className={cn(
        "cursor-pointer p-3 transition-all duration-200 ease-in-out hover:shadow-lg hover:scale-[1.03] active:scale-95 rounded-xl flex flex-col justify-between min-h-[100px] sm:min-h-[120px]",
        isCompletedToday ? "bg-accent/10 border-l-4 border-accent shadow-md" : `bg-card border-l-4 ${categoryBorderColor}`,
        "shadow-md"
      )}
    >
      <div className="flex items-center space-x-2 mb-1">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-primary">
          {getHabitTileIcon(habit)}
        </div>
        <h3 className="text-sm font-semibold text-foreground truncate flex-grow min-w-0 pr-1">
          {habit.name}
        </h3>
      </div>
      <div className="flex items-center justify-end mt-auto">
        {isCompletedToday ? (
          <CheckCircle2 className="h-4 w-4 text-accent" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/60" />
        )}
      </div>
    </Card>
  );
};

export default HabitItem;
    
