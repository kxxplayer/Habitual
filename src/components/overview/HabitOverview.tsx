
"use client";

import * as React from 'react';
import type { FC } from 'react';
import { useMemo } from 'react';
import type { Habit } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, subDays, startOfWeek, endOfWeek, addDays as dateFnsAddDays } from 'date-fns';
import { getDayAbbreviationFromDate } from '@/lib/dateUtils';
import { Target, Repeat, Award, ClipboardList, CheckCircle2, Circle, BarChart3, BookCopy, Star } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";

interface HabitOverviewProps {
  habits: Habit[];
  totalPoints: number;
}

interface WeeklyConsistencyData {
  name: string; "Consistency (%)": number; scheduled: number; completed: number;
}

const calculateWeeklyConsistency = (habits: Habit[], weeksAgo: number, today: Date): WeeklyConsistencyData => {
  const targetDate = subWeeks(today, weeksAgo);
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
  let totalScheduled = 0, totalCompleted = 0;

  habits.forEach(habit => {
    for (let i = 0; i < 7; i++) {
      const currentDateInLoop = dateFnsAddDays(weekStart, i);
      if (habit.daysOfWeek.includes(getDayAbbreviationFromDate(currentDateInLoop))) {
        totalScheduled++;
        if (habit.completionLog.some(log => log.date === format(currentDateInLoop, 'yyyy-MM-dd') && log.status === 'completed')) {
          totalCompleted++;
        }
      }
    }
  });
  const consistency = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
  let weekLabel = weeksAgo === 0 ? "This Week" : weeksAgo === 1 ? "Last Week" : `${weeksAgo} Weeks Ago`;
  return { name: weekLabel, "Consistency (%)": consistency, scheduled: totalScheduled, completed: totalCompleted };
};

const subWeeks = (date: Date, amount: number) => dateFnsAddDays(date, -amount * 7);

const HabitOverview: FC<HabitOverviewProps> = ({ habits, totalPoints }) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const todayAbbr = useMemo(() => getDayAbbreviationFromDate(today), [today]);

  const scheduledToday = useMemo(() => habits.filter(h => h.daysOfWeek.includes(todayAbbr)), [habits, todayAbbr]);

  const dailyProgress = useMemo(() => {
    if (scheduledToday.length === 0) return { scheduled: 0, completed: 0, percent: 0 };
    const completed = scheduledToday.filter(h => h.completionLog.some(l => l.date === todayStr && l.status === 'completed')).length;
    return { scheduled: scheduledToday.length, completed, percent: Math.round((completed / scheduledToday.length) * 100) };
  }, [scheduledToday, todayStr]);

  const overallConsistency = useMemo(() => {
    let totalScheduled = 0, totalCompleted = 0;
    for (let i = 0; i < 7; i++) {
      const date = subDays(today, i); const dateStr = format(date, 'yyyy-MM-dd'); const dayAbbr = getDayAbbreviationFromDate(date);
      habits.forEach(h => {
        if (h.daysOfWeek.includes(dayAbbr)) {
          totalScheduled++;
          if (h.completionLog.some(l => l.date === dateStr && l.status === 'completed')) totalCompleted++;
        }
      });
    }
    return { score: totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0, days: 7 };
  }, [habits, today]);

  const totalHabitsTracked = habits.length;
  let journeyMessage = "Start by adding a habit!";
  if (totalHabitsTracked > 0) journeyMessage = overallConsistency.score >= 80 ? "Excellent Consistency!" : overallConsistency.score >= 50 ? "Great Progress!" : "Keep building those habits!";

  const weeklyChartData = useMemo(() => [3, 2, 1, 0].map(i => calculateWeeklyConsistency(habits, i, today)), [habits, today]);
  const chartConfig = { "Consistency (%)": { label: "Consistency (%)", color: "hsl(var(--chart-1))" } };
  const totalSqlHours = useMemo(() => {
    let totalMinutes = 0;
    habits.filter(h => h.name.toLowerCase().includes("sql")).forEach(h => {
      h.completionLog.forEach(l => { if (l.status === 'completed') totalMinutes += (h.durationHours || 0) * 60 + (h.durationMinutes || 0); });
    });
    return (totalMinutes / 60).toFixed(2);
  }, [habits]);

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="space-y-3 px-2 sm:px-3 py-3">
        {totalHabitsTracked > 0 ? (
          <>
            <div className="flex justify-between items-center"><p className="text-xs font-medium flex items-center"><Star className="mr-1.5 h-4 w-4 text-yellow-500" />Total Points</p><span className="text-xs font-semibold text-yellow-500">{totalPoints}</span></div>
            <div>
              <div className="flex justify-between items-center mb-0.5"><p className="text-xs font-medium flex items-center"><Target className="mr-1.5 h-4 w-4 text-primary/90" />Today's Goal</p><span className="text-xs font-semibold text-primary">{dailyProgress.scheduled > 0 ? `${dailyProgress.completed}/${dailyProgress.scheduled} (${dailyProgress.percent}%)` : 'No habits today'}</span></div>
              <Progress value={dailyProgress.scheduled > 0 ? dailyProgress.percent : 0} className="h-1.5" indicatorClassName="bg-primary" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-0.5"><p className="text-xs font-medium flex items-center"><Repeat className="mr-1.5 h-4 w-4 text-accent" />{overallConsistency.days}-Day Consistency</p><span className="text-xs font-semibold text-accent">{overallConsistency.score}%</span></div>
              <Progress value={overallConsistency.score} className="h-1.5" indicatorClassName="bg-accent" />
            </div>
            {scheduledToday.length > 0 && (
              <div className="pt-1.5 space-y-1">
                <h4 className="text-xs font-medium flex items-center"><ClipboardList className="mr-1.5 h-4 w-4 text-muted-foreground" />Today's Checklist:</h4>
                <ul className="space-y-0.5 pl-1">{scheduledToday.map(h => (<li key={h.id} className="flex items-center text-xs">{h.completionLog.some(l=>l.date===todayStr && l.status==='completed') ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-accent shrink-0" /> : <Circle className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />}<span className={cn("truncate", h.completionLog.some(l=>l.date===todayStr && l.status==='completed') && "text-muted-foreground line-through")}>{h.name}</span></li>))}</ul>
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-border/60">
              <h4 className="text-xs font-medium flex items-center mb-1"><BarChart3 className="mr-1.5 h-4 w-4 text-muted-foreground" />Weekly Consistency</h4>
              {habits.length > 0 && weeklyChartData.some(d => d.scheduled > 0) ? (
                <ChartContainer config={chartConfig} className="h-[120px] w-full text-xs">
                  <BarChart accessibilityLayer data={weeklyChartData} margin={{ top: 5, right: 0, left: -30, bottom: -5 }}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={4} tickFormatter={val => val.slice(0,3)} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={4} domain={[0, 100]}/>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" className="text-xs"/>} />
                    <Legend content={<ChartLegendContent className="text-xs" />} />
                    <Bar dataKey="Consistency (%)" fill="var(--color-Consistency (\\%))" radius={3} />
                  </BarChart>
                </ChartContainer>
              ) : (<p className="text-xs text-muted-foreground text-center py-2">Not enough data for trend.</p>)}
            </div>
            {habits.some(h => h.name.toLowerCase().includes("sql")) && (<div className="pt-2 mt-2 border-t border-border/60"><p className="text-xs font-medium flex items-center"><BookCopy className="mr-1.5 h-4 w-4 text-blue-500" />Total SQL Logged: <span className="ml-1 font-semibold text-blue-500">{totalSqlHours} hrs</span></p></div>)}
            <div className="pt-2 text-center border-t border-border/60"><p className="text-xs font-medium text-muted-foreground flex items-center justify-center mt-1"><Award className="mr-1.5 h-4 w-4 text-yellow-500" />{journeyMessage}</p></div>
          </>
        ) : (<div className="text-center py-2"><p className="text-muted-foreground text-xs">{journeyMessage}</p></div>)}
      </CardContent>
    </Card>
  );
};
export default HabitOverview;
