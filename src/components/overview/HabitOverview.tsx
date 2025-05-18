
// src/components/overview/HabitOverview.tsx
'use client';

import type { FC } from 'react';
import { useMemo } from 'react';
import type { Habit, HabitCompletionLogEntry, WeekDay } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval, subWeeks } from 'date-fns';
import { getDayAbbreviationFromDate } from '@/lib/dateUtils';
import { Target, Repeat, Award, ClipboardList, CheckCircle2, Circle, BarChart3, BookCopy } from 'lucide-react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";


interface HabitOverviewProps {
  habits: Habit[];
}

interface WeeklyConsistencyData {
  name: string; // e.g., "This Week", "Last Week"
  "Consistency (%)": number;
  scheduled: number;
  completed: number;
}

const calculateWeeklyConsistency = (habits: Habit[], weeksAgo: number, today: Date): WeeklyConsistencyData => {
  const targetDate = subWeeks(today, weeksAgo);
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 });
  
  let totalScheduledInstances = 0;
  let totalCompletedInstances = 0;

  habits.forEach(habit => {
    for (let i = 0; i < 7; i++) {
      const currentDateInLoop = addDays(weekStart, i);
      const currentDayAbbr = getDayAbbreviationFromDate(currentDateInLoop);

      if (habit.daysOfWeek.includes(currentDayAbbr)) {
        totalScheduledInstances++;
        const logEntry = habit.completionLog.find(log => 
          log.date === format(currentDateInLoop, 'yyyy-MM-dd') && 
          (log.status === 'completed' || log.status === undefined)
        );
        if (logEntry) {
          totalCompletedInstances++;
        }
      }
    }
  });
  
  const consistencyPercentage = totalScheduledInstances > 0 ? Math.round((totalCompletedInstances / totalScheduledInstances) * 100) : 0;
  let weekLabel = "";
  if (weeksAgo === 0) weekLabel = "This Week";
  else if (weeksAgo === 1) weekLabel = "Last Week";
  else weekLabel = `${weeksAgo} Weeks Ago`;
  
  return { 
    name: weekLabel,
    "Consistency (%)": consistencyPercentage,
    scheduled: totalScheduledInstances,
    completed: totalCompletedInstances
  };
};

// Helper function to add days to a date
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};


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
      habit.completionLog.some(log => log.date === todayStr && (log.status === 'completed' || log.status === undefined))
    );
    return {
        scheduled: scheduledToday.length,
        completed: completedToday.length,
        percent: Math.round((completedToday.length / scheduledToday.length) * 100)
    };
  }, [habits, scheduledToday, todayStr]);

  const overallConsistencyScore = useMemo(() => {
    if (!habits || habits.length === 0) return { score: 0, days: 7 };
    const numDays = 7; // For overall 7-day consistency score
    let totalScheduledInstances = 0;
    let totalCompletedInstances = 0;

    for (let i = 0; i < numDays; i++) {
      const currentDate = subDays(today, i);
      const currentDateStr = format(currentDate, 'yyyy-MM-dd');
      const currentDayAbbr = getDayAbbreviationFromDate(currentDate);

      habits.forEach(habit => {
        if (habit.daysOfWeek.includes(currentDayAbbr)) {
          totalScheduledInstances++;
          if (habit.completionLog.some(log => log.date === currentDateStr && (log.status === 'completed' || log.status === undefined))) {
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
    if (overallConsistencyScore.score >= 80) {
        journeyMessage = "Excellent Consistency! You're on a roll!";
    } else if (overallConsistencyScore.score >= 50) {
        journeyMessage = "Great Progress! Keep it up!";
    } else {
        journeyMessage = "Keep building those habits!";
    }
  }

  const weeklyConsistencyChartData = useMemo(() => {
    const data: WeeklyConsistencyData[] = [];
    for (let i = 3; i >= 0; i--) { // Last 4 weeks including current
      data.push(calculateWeeklyConsistency(habits, i, today));
    }
    return data;
  }, [habits, today]);

  const chartConfig = {
    "Consistency (%)": {
      label: "Consistency (%)",
      color: "hsl(var(--chart-1))",
    },
  };

  const totalSqlHours = useMemo(() => {
    let totalMinutes = 0;
    const sqlHabits = habits.filter(h => h.name.toLowerCase().includes("sql"));
    sqlHabits.forEach(habit => {
      habit.completionLog.forEach(log => {
        if (log.status === 'completed' || log.status === undefined) {
          totalMinutes += (habit.durationHours || 0) * 60;
          totalMinutes += (habit.durationMinutes || 0);
        }
      });
    });
    return (totalMinutes / 60).toFixed(2);
  }, [habits]);


  return (
    <Card className="border-0 shadow-none">
      <CardContent className="space-y-4 px-2 sm:px-4 py-3">
        {totalHabitsTracked > 0 ? (
          <>
            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs sm:text-sm font-medium text-foreground flex items-center">
                  <Target className="mr-2 h-4 w-4 text-primary/90" />
                  Today's Goal
                </p>
                <span className="text-xs sm:text-sm font-semibold text-primary">
                  {dailyProgress.scheduled > 0 ? `${dailyProgress.completed} / ${dailyProgress.scheduled} (${dailyProgress.percent}%)` : 'No habits today'}
                </span>
              </div>
              <Progress value={dailyProgress.scheduled > 0 ? dailyProgress.percent : 0} className="h-2" indicatorClassName="bg-primary" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs sm:text-sm font-medium text-foreground flex items-center">
                  <Repeat className="mr-2 h-4 w-4 text-accent" />
                  {overallConsistencyScore.days}-Day Consistency
                </p>
                <span className="text-xs sm:text-sm font-semibold text-accent">{overallConsistencyScore.score}%</span>
              </div>
              <Progress value={overallConsistencyScore.score} className="h-2" indicatorClassName="bg-accent" />
            </div>
            
            {scheduledToday.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <h4 className="text-xs sm:text-sm font-medium text-foreground flex items-center">
                  <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
                  Today's Checklist:
                </h4>
                <ul className="space-y-1 pl-1">
                  {scheduledToday.map(habit => {
                    const isCompleted = habit.completionLog.some(log => log.date === todayStr && (log.status === 'completed' || log.status === undefined));
                    return (
                      <li key={habit.id} className="flex items-center text-xs sm:text-sm">
                        {isCompleted ? (
                          <CheckCircle2 className="mr-2 h-4 w-4 text-accent flex-shrink-0" />
                        ) : (
                          <Circle className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={`${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'} truncate max-w-[200px] xs:max-w-[240px] sm:max-w-none`}>
                          {habit.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="pt-3 mt-3 border-t border-border/60">
                 <h4 className="text-xs sm:text-sm font-medium text-foreground flex items-center mb-2">
                  <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" />
                  Weekly Consistency Trend
                </h4>
                {habits.length > 0 && weeklyConsistencyChartData.some(d => d.scheduled > 0) ? (
                    <ChartContainer config={chartConfig} className="h-[150px] w-full">
                      <BarChart accessibilityLayer data={weeklyConsistencyChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => value.slice(0, 3)}
                          className="text-xs"
                        />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" domain={[0, 100]}/>
                        <Tooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Legend content={<ChartLegendContent />} />
                        <Bar dataKey="Consistency (%)" fill="var(--color-Consistency (\\%))" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                     <p className="text-xs text-muted-foreground text-center py-4">Not enough data for weekly trend yet.</p>
                  )}
            </div>
            
            {habits.some(h => h.name.toLowerCase().includes("sql")) && (
                <div className="pt-3 mt-3 border-t border-border/60">
                    <p className="text-xs sm:text-sm font-medium text-foreground flex items-center">
                        <BookCopy className="mr-2 h-4 w-4 text-blue-500" />
                        Total SQL Practice Logged: <span className="ml-1 font-semibold text-blue-500">{totalSqlHours} hrs</span>
                    </p>
                </div>
            )}


            <div className="pt-3 text-center border-t border-border/60">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-center mt-2">
                    <Award className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                    {journeyMessage}
                </p>
            </div>
          </>
        ) : (
            <div className="text-center py-2">
                <p className="text-muted-foreground text-xs sm:text-sm">{journeyMessage}</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HabitOverview;
