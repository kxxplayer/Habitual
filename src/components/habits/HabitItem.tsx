"use client";

import type { FC } from 'react';
import * as React from 'react';
import type { Habit } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, CalendarClock as MakeupIcon, Target } from 'lucide-react';

export interface HabitItemProps {
  habit: Habit;
  todayString: string;
}

const getHabitListIcon = (habit: Habit): React.ReactNode => {
    const nameLower = habit.name.toLowerCase();
    if (nameLower.includes('sql') || nameLower.includes('code')) return <span className="text-lg">💻</span>;
    if (nameLower.includes('gym') || nameLower.includes('workout')) return <span className="text-lg">🏋️</span>;
    if (nameLower.includes('read') || nameLower.includes('book')) return <span className="text-lg">📚</span>;
    if (nameLower.includes('meditate')) return <span className="text-lg">🧘</span>;
    if (habit.programId) return <Target className="h-4 w-4 text-primary/80" />;
    return <Circle className="h-4 w-4 text-primary/80" />;
};


const HabitItem: FC<HabitItemProps> = ({ habit, todayString }) => {
  const logForToday = habit.completionLog.find(log => log.date === todayString);
  const isCompleted = logForToday?.status === 'completed';
  const isMakeup = logForToday?.status === 'pending_makeup';

  const cardStyle: React.CSSProperties = {};
  if (isCompleted) {
    cardStyle.borderColor = `hsl(var(--accent))`;
    cardStyle.backgroundColor = `hsla(var(--accent), 0.1)`;
  } else if (isMakeup) {
    cardStyle.borderColor = `hsl(200,100%,50%)`;
    cardStyle.backgroundColor = `hsla(200,100%,50%, 0.1)`;
  }

  return (
    <div
      style={cardStyle}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border shadow-sm transition-all duration-200 ease-in-out hover:shadow-md hover:bg-accent/10 hover:scale-[1.02]",
        isCompleted ? "bg-accent/10" : "bg-card"
      )}
    >
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-primary">
          {getHabitListIcon(habit)}
        </div>
        <span className={cn(
            "font-medium truncate",
            isCompleted && "text-muted-foreground line-through"
          )}>
          {habit.name}
        </span>
      </div>
      <div className="flex-shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-6 w-6 text-accent" />
        ) : isMakeup ? (
          <MakeupIcon className="h-6 w-6 text-blue-500" />
        ) : (
          <Circle className="h-6 w-6 text-muted-foreground/30" />
        )}
      </div>
    </div>
  );
};

export default HabitItem;

