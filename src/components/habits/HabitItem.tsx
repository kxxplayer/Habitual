
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, ListChecks, Droplets, Bed, BookOpenText, HeartPulse, Briefcase, Paintbrush, Home as HomeIconLucide, Landmark, Users, Smile as LifestyleIcon, Sparkles as SparklesIcon, Flame } from 'lucide-react';
import type { Habit, HabitCategory } from '@/types';
import { HABIT_CATEGORIES } from '@/types';
import { calculateStreak } from '@/lib/dateUtils';
import { parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface HabitItemProps {
  habit: Habit;
  onOpenDetailView: (habit: Habit) => void;
  todayString: string; // YYYY-MM-DD
}

const getHabitTileIcon = (habit: Habit): React.ReactNode => {
  const nameLower = habit.name.toLowerCase();
  // Specific icons take precedence
  if (nameLower.includes('gym') || nameLower.includes('workout')) return <span className="text-xl">🏋️</span>;
  if (nameLower.includes('sql') || nameLower.includes('code')) return <span className="text-xl">💻</span>;
  if (nameLower.includes('walk') || nameLower.includes('run')) return <span className="text-xl">🚶</span>;
  if (nameLower.includes('read') || nameLower.includes('book')) return <span className="text-xl">📚</span>;
  if (nameLower.includes('meditate') || nameLower.includes('mindfulness')) return <span className="text-xl">🧘</span>;
  if (nameLower.includes('learn') || nameLower.includes('study')) return <Briefcase className="h-6 w-6" />;
  if (nameLower.includes('water') || nameLower.includes('hydrate')) return <Droplets className="h-6 w-6" />;
  if (nameLower.includes('sleep') || nameLower.includes('bed')) return <Bed className="h-6 w-6" />;
  if (nameLower.includes('journal') || nameLower.includes('write')) return <BookOpenText className="h-6 w-6" />;
  if (nameLower.includes('stretch') || nameLower.includes('yoga')) return <HeartPulse className="h-6 w-6" />;


  // Category icons as fallback
  if (habit.category) {
    switch (habit.category) {
      case 'Health & Wellness': return <HeartPulse className="h-6 w-6 text-red-500" />;
      case 'Work/Study': return <Briefcase className="h-6 w-6 text-blue-600" />;
      case 'Creative': return <Paintbrush className="h-6 w-6 text-orange-500" />;
      case 'Chores': return <HomeIconLucide className="h-6 w-6 text-green-600" />;
      case 'Finance': return <Landmark className="h-6 w-6 text-indigo-500" />;
      case 'Social': return <Users className="h-6 w-6 text-pink-500" />;
      case 'Personal Growth': return <SparklesIcon className="h-6 w-6 text-yellow-500" />;
      case 'Lifestyle': return <LifestyleIcon className="h-6 w-6 text-teal-500" />;
      default: return <ListChecks className="h-6 w-6 text-muted-foreground" />;
    }
  }
  return <ListChecks className="h-6 w-6 text-muted-foreground" />;
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

  let streak = 0;
  try {
    const todayDate = parseISO(todayString); // Assuming todayString is always valid
    streak = calculateStreak(habit, todayDate);
  } catch (e) {
    console.error("Error calculating streak for habit item:", e);
  }


  return (
    <Card
      onClick={() => onOpenDetailView(habit)}
      className={cn(
        "cursor-pointer p-3 transition-all duration-200 ease-in-out hover:shadow-lg hover:scale-[1.03] active:scale-95 rounded-xl flex flex-col justify-between min-h-[100px] sm:min-h-[120px]",
        isCompletedToday ? "bg-accent/15 border-l-2 border-accent shadow" : `bg-card border-l-2 ${categoryBorderColor} shadow`,
      )}
    >
      <div className="flex items-start space-x-2 mb-1">
        <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-primary mt-0.5">
          {getHabitTileIcon(habit)}
        </div>
        <h3 className="text-sm font-semibold text-foreground flex-grow min-w-0 pr-1 break-words">
          {habit.name}
        </h3>
      </div>
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center text-xs text-muted-foreground">
          {streak > 0 && (
            <>
              <Flame className={cn("h-3.5 w-3.5 mr-0.5", streak > 0 ? "text-orange-500" : "text-muted-foreground/50")} />
              <span>{streak}</span>
            </>
          )}
        </div>
        <div>
          {isCompletedToday ? (
            <CheckCircle2 className="h-5 w-5 text-accent" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground/60" />
          )}
        </div>
      </div>
    </Card>
  );
};

export default HabitItem;
    
