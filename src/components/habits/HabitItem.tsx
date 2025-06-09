
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, ListChecks, Droplets, Bed, BookOpenText, HeartPulse, Briefcase, Paintbrush, Home as HomeIconLucide, Landmark, Users, Smile as LifestyleIcon, Sparkles as SparklesIcon, Flame, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress'; // Added Progress
import type { Habit, HabitCategory, WeekDay } from '@/types';
import { HABIT_CATEGORIES } from '@/types';
import { calculateStreak, type WeekDayInfo } from '@/lib/dateUtils'; // Added WeekDayInfo
import { parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface HabitItemProps {
  habit: Habit;
  onOpenDetailView: (habit: Habit) => void;
  todayString: string; // YYYY-MM-DD
  currentWeekDays: WeekDayInfo[]; // Added currentWeekDays
}

const getHabitTileIcon = (habit: Habit): React.ReactNode => {
  const nameLower = habit.name.toLowerCase();
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

const isTimerBased = (habit: Habit): boolean => {
  const nameDesc = `${habit.name.toLowerCase()} ${habit.description?.toLowerCase() || ''}`;
  const durationKeywords = ['minute', 'minutes', 'min', 'hour', 'hours', 'hr', 'hrs', 'timer', 'duration', 'session'];
  const forPattern = /\bfor\s+(\d+)\s*(min|minute|minutes|hr|hour|hours)/i;
  const durationPattern = /(\d+)\s*(min|minute|minutes|hr|hour|hours)\s*(session|practice|reading|workout)/i;

  if (forPattern.test(nameDesc) || durationPattern.test(nameDesc)) return true;
  if (durationKeywords.some(keyword => nameDesc.includes(keyword))) {
     if (habit.durationHours && habit.durationHours > 0) return true;
     if (habit.durationMinutes && habit.durationMinutes > 0) return true;
  }
  return false;
};


const HabitItem: FC<HabitItemProps> = ({ habit, onOpenDetailView, todayString, currentWeekDays }) => {
  const isCompletedToday = habit.completionLog.some(log => log.date === todayString && log.status === 'completed');
  const categoryBorderColor = getCategoryTileColor(habit.category);
  const habitIsTimerBased = isTimerBased(habit);

  let streak = 0;
  try {
    const todayDate = parseISO(todayString); 
    streak = calculateStreak(habit, todayDate);
  } catch (e) {
    console.error("Error calculating streak for habit item:", e);
  }

  const { scheduledInCurrentWeek, completedInCurrentWeek } = React.useMemo(() => {
    if (!currentWeekDays || currentWeekDays.length === 0) {
      return { scheduledInCurrentWeek: 0, completedInCurrentWeek: 0 };
    }
    let scheduledCount = 0;
    let completedCount = 0;
    for (const dayInfo of currentWeekDays) {
      if (habit.daysOfWeek.includes(dayInfo.dayAbbrFull)) {
        scheduledCount++;
        if (habit.completionLog.some(log => log.date === dayInfo.dateStr && log.status === 'completed')) {
          completedCount++;
        }
      }
    }
    return { scheduledInCurrentWeek: scheduledCount, completedInCurrentWeek: completedCount };
  }, [habit, currentWeekDays]);

  const weeklyProgressPercent = scheduledInCurrentWeek > 0 ? Math.round((completedInCurrentWeek / scheduledInCurrentWeek) * 100) : 0;

  return (
    <Card
      onClick={() => {
        onOpenDetailView(habit);
      }}
      className={cn(
        "cursor-pointer p-3 transition-all duration-200 ease-in-out hover:shadow-lg hover:scale-[1.03] active:scale-95 rounded-xl flex flex-col justify-between min-h-[120px] sm:min-h-[130px]", // Increased min-height
        isCompletedToday ? "bg-accent/15 border-l-2 border-accent shadow" : `bg-card border-l-2 ${categoryBorderColor} shadow`,
      )}
    >
      <div> {/* Wrapper for top content */}
        <div className="flex items-start space-x-2 mb-1">
          <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-primary mt-0.5">
            {getHabitTileIcon(habit)}
          </div>
          <h3 className="text-sm font-semibold text-foreground flex-grow min-w-0 pr-1 break-words">
            {habit.name}
          </h3>
        </div>
        {scheduledInCurrentWeek > 0 && (
          <div className="mt-1.5 mb-1 px-0.5">
            <Progress value={weeklyProgressPercent} className="h-1.5 rounded" indicatorClassName={cn(weeklyProgressPercent > 0 ? "bg-primary" : "bg-muted")} />
            <p className="text-xs text-muted-foreground mt-0.5 text-right">
              {completedInCurrentWeek}/{scheduledInCurrentWeek} wk
            </p>
          </div>
        )}
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
          ) : habitIsTimerBased ? (
            <Clock className="h-5 w-5 text-blue-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground/60" />
          )}
        </div>
      </div>
    </Card>
  );
};

export default HabitItem;
    
