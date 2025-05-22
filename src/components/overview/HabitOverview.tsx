
"use client";

/**
 * ==========================================================================
 * HABIT OVERVIEW COMPONENT - VERCEL BUILD DEBUG ATTEMPT
 * Date: 2025-05-20 (Ensuring this file is treated as NEW by Vercel cache)
 * Issue: Persistent "module factory not available" for lucide-react 'Repeat' icon,
 *        which is NOT imported or used in this component. This is likely a
 *        Vercel build cache or HMR artifact issue.
 * ==========================================================================
 */

import * as React from 'react';
import type { FC } from 'react';
import { useMemo } from 'react';

import { format, subDays, startOfWeek, addDays as dateFnsAddDays } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'; // Removed Legend
import {
  Target,
  Flame,
  ClipboardList,
  CheckCircle2,
  Circle,
  BarChart3,
  BookCopy,
  Star,
  Zap,
  ShieldCheck,
  Sparkles as JourneyIcon
} from 'lucide-react'; // Repeat icon is confirmed NOT to be in this import.

import { cn } from '@/lib/utils';
import { getDayAbbreviationFromDate, calculateStreak } from '@/lib/dateUtils';
import type { Habit } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";


interface HabitOverviewProps {
  habits: Habit[];
  totalPoints: number;
}

interface WeeklyConsistencyData {
  name: string; "Consistency (%)": number; scheduled: number; completed: number;
}

const subWeeks = (date: Date, amount: number) => dateFnsAddDays(date, -amount * 7);

const calculateWeeklyConsistency = (habits: Habit[], weeksAgo: number, today: Date): WeeklyConsistencyData => {
  const targetDate = subWeeks(today, weeksAgo);
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
  let totalScheduled = 0;
  let totalCompleted = 0;

  habits.forEach(habit => {
    for (let i = 0; i < 7; i++) {
      const currentDateInLoop = dateFnsAddDays(weekStart, i);
      const dayAbbr = getDayAbbreviationFromDate(currentDateInLoop);
      if (habit.daysOfWeek.includes(dayAbbr)) {
        totalScheduled++;
        if (habit.completionLog.some(log => log.date === format(currentDateInLoop, 'yyyy-MM-dd') && log.status === 'completed')) {
          totalCompleted++;
        }
      }
    }
  });

  const consistency = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
  let weekLabel = "This Week";
  if (weeksAgo === 1) weekLabel = "Last Week";
  else if (weeksAgo > 1) weekLabel = `${weeksAgo} Wks Ago`;

  return { name: weekLabel, "Consistency (%)": consistency, scheduled: totalScheduled, completed: totalCompleted };
};


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
    let totalScheduledInstances = 0;
    let totalCompletedInstances = 0;
    const daysToConsider = 7;
    for (let i = 0; i < daysToConsider; i++) {
      const date = subDays(today, i);
      const dateStrLoop = format(date, 'yyyy-MM-dd');
      const dayAbbrLoop = getDayAbbreviationFromDate(date);
      habits.forEach(h => {
        if (h.daysOfWeek.includes(dayAbbrLoop)) {
          totalScheduledInstances++;
          if (h.completionLog.some(l => l.date === dateStrLoop && l.status === 'completed')) {
            totalCompletedInstances++;
          }
        }
      });
    }
    return { score: totalScheduledInstances > 0 ? Math.round((totalCompletedInstances / totalScheduledInstances) * 100) : 0, days: daysToConsider };
  }, [habits, today]);

  const totalHabitsTracked = habits.length;

  const pointsPerLevel = 100;
  const currentLevel = Math.floor(totalPoints / pointsPerLevel) + 1;
  const pointsInCurrentLevel = totalPoints % pointsPerLevel;
  const pointsToNextLevel = pointsPerLevel - pointsInCurrentLevel;
  const progressToNextLevelPercent = (pointsInCurrentLevel / pointsPerLevel) * 100;

  const { longestActiveStreak, activeStreaksCount } = useMemo(() => {
    if(habits.length === 0) return { longestActiveStreak: 0, activeStreaksCount: 0 };
    let longest = 0;
    let activeCount = 0;
    habits.forEach(habit => {
      const streak = calculateStreak(habit, today);
      if (streak > 0) {
        activeCount++;
        if (streak > longest) {
          longest = streak;
        }
      }
    });
    return { longestActiveStreak: longest, activeStreaksCount: activeCount };
  }, [habits, today]);

  let journeyMessage = "Embark on your habit journey! Add a habit to begin.";
  if (totalHabitsTracked > 0) {
    if (currentLevel >= 10) journeyMessage = `Level ${currentLevel} Habit Guru! Truly inspiring!`;
    else if (currentLevel >= 5) journeyMessage = `Level ${currentLevel} Habit Master! You're on a roll!`;
    else if (overallConsistency.score >= 80) journeyMessage = "Excellent Consistency! Keep crushing those goals!";
    else if (overallConsistency.score >= 50) journeyMessage = "Great Progress! You're building momentum!";
    else journeyMessage = "Keep building those habits, consistency is key!";
  }


  const weeklyChartData = useMemo(() => {
    return [3, 2, 1, 0].map(i => calculateWeeklyConsistency(habits, i, today));
  }, [habits, today]);

  const chartConfig = { "Consistency (%)": { label: "Consistency (%)", color: "hsl(var(--chart-1))" } };

  const totalSqlHours = useMemo(() => {
    let totalMinutes = 0;
    habits.filter(h => h.name.toLowerCase().includes("sql")).forEach(h => {
      h.completionLog.forEach(l => {
        if (l.status === 'completed') {
          const durationHours = h.durationHours || 0;
          const durationMinutes = h.durationMinutes || 0;
          totalMinutes += (durationHours * 60) + durationMinutes;
        }
      });
    });
    return (totalMinutes / 60).toFixed(2);
  }, [habits]);

  const StatCard: FC<{title: string; icon: React.ElementType; children: React.ReactNode; className?: string}> = ({ title, icon: IconComponent, children, className }) => (
    <div className={cn("p-3 rounded-lg bg-card/50 dark:bg-card/80 border", className)}>
      <h4 className="text-xs font-semibold flex items-center text-muted-foreground mb-1.5">
        <IconComponent className="mr-2 h-4 w-4 text-primary" />
        {title}
      </h4>
      {children}
    </div>
  );


  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="space-y-3 px-1 py-2">
        {totalHabitsTracked > 0 ? (
          <>
            <StatCard title="Your Level" icon={Star}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-bold text-primary">Level {currentLevel}</span>
                <span className="text-xs font-medium text-muted-foreground">
                  <Zap className="inline h-3 w-3 mr-0.5 text-yellow-500" /> {totalPoints} PTS
                </span>
              </div>
              <Progress value={progressToNextLevelPercent} className="h-1.5 mb-0.5" indicatorClassName="bg-yellow-500" />
              <p className="text-xs text-muted-foreground text-right">{pointsToNextLevel} points to Level {currentLevel + 1}</p>
            </StatCard>

            <StatCard title="Streak Power" icon={Flame}>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-medium text-primary">{longestActiveStreak} days</p>
                  <p className="text-muted-foreground">Longest Streak</p>
                </div>
                <div>
                  <p className="font-medium text-primary">{activeStreaksCount} habits</p>
                  <p className="text-muted-foreground">Active Streaks</p>
                </div>
              </div>
            </StatCard>

            <StatCard title="Today's Mission" icon={Target}>
              <div className="flex justify-between items-center mb-0.5">
                <p className="text-sm font-semibold text-primary">
                  {dailyProgress.scheduled > 0 ? `${dailyProgress.completed}/${dailyProgress.scheduled} Tasks` : 'No tasks today'}
                </p>
                {dailyProgress.scheduled > 0 && (
                   <span className="text-xs font-semibold text-primary/80">{dailyProgress.percent}%</span>
                )}
              </div>
              {dailyProgress.scheduled > 0 && <Progress value={dailyProgress.percent} className="h-1.5" indicatorClassName="bg-primary" />}

              {scheduledToday.length > 0 && (
                <div className="mt-2 space-y-1 border-t pt-2">
                  <h5 className="text-xs font-medium flex items-center text-muted-foreground"><ClipboardList className="mr-1.5 h-3.5 w-3.5" />Checklist:</h5>
                  <ul className="space-y-0.5 pl-1 max-h-24 overflow-y-auto">
                    {scheduledToday.map(h_item => (
                      <li key={h_item.id} className="flex items-center text-xs">
                        {h_item.completionLog.some(l_item=>l_item.date===todayStr && l_item.status==='completed') ?
                         <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-accent shrink-0" /> :
                         <Circle className="mr-1.5 h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />}
                        <span className={cn("truncate", h_item.completionLog.some(l_item=>l_item.date===todayStr && l_item.status==='completed') && "text-muted-foreground line-through opacity-70")}>
                          {h_item.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </StatCard>

            <StatCard title="Consistency Shield" icon={ShieldCheck}>
               <div className="flex justify-between items-center mb-0.5">
                <p className="text-sm font-semibold text-accent">{overallConsistency.score}%</p>
                <span className="text-xs text-muted-foreground">Last {overallConsistency.days} Days</span>
               </div>
              <Progress value={overallConsistency.score} className="h-1.5" indicatorClassName="bg-accent" />
            </StatCard>

            <StatCard title="Weekly Progress Chart" icon={BarChart3}>
              {habits.length > 0 && weeklyChartData.some(d_item => d_item.scheduled > 0) ? (
                <ChartContainer config={chartConfig} className="h-[100px] w-full text-xs">
                  <BarChart accessibilityLayer data={weeklyChartData} margin={{ top: 5, right: 0, left: -30, bottom: -10 }}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={2} fontSize={10} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={2} domain={[0, 100]} fontSize={10}/>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" className="text-xs p-1.5"/>} />
                    <Bar dataKey="Consistency (%)" fill="var(--color-Consistency (\\%))" radius={2} barSize={15}/>
                  </BarChart>
                </ChartContainer>
              ) : (<p className="text-xs text-muted-foreground text-center py-2">Not enough data for trend.</p>)}
            </StatCard>

            {habits.some(h_item => h_item.name.toLowerCase().includes("sql")) && (
              <StatCard title="SQL Focus" icon={BookCopy}>
                <p className="text-sm font-semibold text-blue-500">{totalSqlHours} hrs</p>
                <p className="text-xs text-muted-foreground">Total SQL Logged</p>
              </StatCard>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <JourneyIcon className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">{journeyMessage}</p>
          </div>
        )}
        <div className="pt-2 text-center mt-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center justify-center">
                <JourneyIcon className="mr-1.5 h-4 w-4 text-primary/70" />
                {journeyMessage}
            </p>
        </div>
      </CardContent>
    </Card>
  );
};
export default HabitOverview;

    