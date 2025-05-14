
// src/components/overview/HabitOverview.tsx
'use client';

import type { FC } from 'react';
import { useMemo } from 'react';
import type { Habit } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, subDays } from 'date-fns';
import { getDayAbbreviationFromDate } from '@/lib/dateUtils';
import { Target, Repeat, Award, TrendingUp, ClipboardList, CheckCircle2, Circle } from 'lucide-react';

interface HabitOverviewProps {
  habits: Habit[];
}

const HabitOverview: FC<HabitOverviewProps> = ({ habits }) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const todayAbbr = useMemo(() => getDayAbbreviationFromDate(today), [today]);

  const scheduledToday = useMemo(() => {
    return habits.filter(habit => habit.daysOfWeek.includes(todayAbbr));
  }, [habits, todayAbbr]);

  const dailyProgress = useMemo(() => {
    if (!habits || habits.length === 0) return { scheduled: 0, completed: 0, percent: 0 };
    
    if (scheduledToday.length === 0) return { scheduled: 0, completed: 0, percent: 0 };

    const completedToday = scheduledToday.filter(habit =>
      habit.completionLog.some(log => log.date === todayStr)
    );
    return {
        scheduled: scheduledToday.length,
        completed: completedToday.length,
        percent: Math.round((completedToday.length / scheduledToday.length) * 100)
    };
  }, [habits, scheduledToday, todayStr]);

  const consistencyScore = useMemo(() => {
    if (!habits || habits.length === 0) return { score: 0, days: 7 };
    const numDays = 7;
    let totalScheduledInstances = 0;
    let totalCompletedInstances = 0;

    for (let i = 0; i < numDays; i++) {
      const currentDate = subDays(today, i);
      const currentDateStr = format(currentDate, 'yyyy-MM-dd');
      const currentDayAbbr = getDayAbbreviationFromDate(currentDate);

      habits.forEach(habit => {
        if (habit.daysOfWeek.includes(currentDayAbbr)) {
          totalScheduledInstances++;
          if (habit.completionLog.some(log => log.date === currentDateStr)) {
            totalCompletedInstances++;
          }
        }
      });
    }

    if (totalScheduledInstances === 0) return { score: 0, days: numDays };
    return {
        score: Math.round((totalCompletedInstances / totalScheduledInstances) * 100),
        days: numDays
    };
  }, [habits, today]);

  const totalHabitsTracked = habits.length;
  
  let journeyMessage = "Start your journey by adding a habit!";
  if (totalHabitsTracked > 0) {
    if (consistencyScore.score >= 80) {
        journeyMessage = "Excellent Consistency! You're on a roll!";
    } else if (consistencyScore.score >= 50) {
        journeyMessage = "Great Progress! Keep it up!";
    } else {
        journeyMessage = "Keep building those habits!";
    }
  }


  return (
    <Card className="mb-6 shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-primary flex items-center">
          <TrendingUp className="mr-2.5 h-6 w-6" />
          Your Habit Dashboard
        </CardTitle>
        {totalHabitsTracked > 0 && <CardDescription>A snapshot of your progress and consistency.</CardDescription>}
        {totalHabitsTracked === 0 && <CardDescription>Add your first habit to see your progress here.</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">
        {totalHabitsTracked > 0 ? (
          <>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-sm font-medium text-foreground flex items-center">
                  <Target className="mr-2 h-4 w-4 text-primary/90" />
                  Today's Goal Completion
                </p>
                <span className="text-sm font-semibold text-primary">
                  {dailyProgress.scheduled > 0 ? `${dailyProgress.completed} / ${dailyProgress.scheduled} (${dailyProgress.percent}%)` : 'No habits today'}
                </span>
              </div>
              <Progress value={dailyProgress.scheduled > 0 ? dailyProgress.percent : 0} className="h-2.5" indicatorClassName="bg-primary" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-sm font-medium text-foreground flex items-center">
                  <Repeat className="mr-2 h-4 w-4 text-accent" />
                  Last {consistencyScore.days} Days Consistency
                </p>
                <span className="text-sm font-semibold text-accent">{consistencyScore.score}%</span>
              </div>
              <Progress value={consistencyScore.score} className="h-2.5" indicatorClassName="bg-accent" />
            </div>
            
            {scheduledToday.length > 0 && (
              <div className="pt-3 space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center">
                  <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
                  Today's Checklist:
                </h4>
                <ul className="space-y-1.5 pl-1">
                  {scheduledToday.map(habit => {
                    const isCompleted = habit.completionLog.some(log => log.date === todayStr);
                    return (
                      <li key={habit.id} className="flex items-center text-sm">
                        {isCompleted ? (
                          <CheckCircle2 className="mr-2 h-4 w-4 text-accent flex-shrink-0" />
                        ) : (
                          <Circle className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}>
                          {habit.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="pt-2 text-center border-t border-border/60">
                <p className="text-sm font-medium text-muted-foreground flex items-center justify-center mt-3">
                    <Award className="mr-2 h-5 w-5 text-yellow-500" />
                    {journeyMessage}
                </p>
            </div>
          </>
        ) : (
            <div className="text-center py-3">
                <p className="text-muted-foreground">{journeyMessage}</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HabitOverview;

