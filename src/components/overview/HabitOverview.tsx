
"use client";

// ==========================================================================
// HABIT OVERVIEW COMPONENT - VERCEL BUILD DEBUG ATTEMPT (2025-05-20 v4)
// Date: 2025-05-20
// THIS IS A MAJOR REFRESH ATTEMPT TO FORCE VERCEL CACHE BREAK.
// Issue: Persistent "ChartTooltip is not defined" on Vercel,
//        suggesting Vercel build/cache issues with this specific component.
// Goal: Force Vercel to fully rebuild this file from scratch.
// All imports have been meticulously checked.
// ==========================================================================

import * as React from 'react'; // Explicit React import
import { useMemo, type FC } from 'react';

// UI & Utility Imports (Ordered)
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
// CRITICAL IMPORT: Ensure ChartTooltip, ChartContainer, and ChartTooltipContent are correctly imported.
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Date-fns imports (ordered and specific)
import { format, subDays, startOfWeek, addDays as dateFnsAddDays } from 'date-fns';

// Lucide-react icons (ordered and specific, only used ones)
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
  Sparkles as JourneyIcon,
  LayoutDashboard
} from 'lucide-react';

// Recharts imports (ordered and specific)
// Removed unused 'Legend' import
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

// Local utility imports
import { cn } from '@/lib/utils';
import type { Habit } from '@/types';
import { getDayAbbreviationFromDate, calculateStreak } from '@/lib/dateUtils';


interface HabitOverviewProps {
  habits: Habit[];
  totalPoints: number;
}

interface WeeklyConsistencyData {
  name: string;
  "Consistency (%)": number;
  scheduled: number;
  completed: number;
}

// Helper to get date `amount` weeks ago
const subWeeks = (date: Date, amount: number): Date => {
  return dateFnsAddDays(date, -amount * 7);
};

// Calculates consistency for a given week
const calculateWeeklyConsistency = (habits: Habit[], weeksAgo: number, todayRef: Date): WeeklyConsistencyData => {
  const targetDate_calc_week = subWeeks(todayRef, weeksAgo);
  const weekStart_calc_week = startOfWeek(targetDate_calc_week, { weekStartsOn: 0 }); // Assuming week starts on Sunday
  let totalScheduled_calc_week = 0;
  let totalCompleted_calc_week = 0;

  habits.forEach(habit_item_calc_week => {
    for (let i_calc_week = 0; i_calc_week < 7; i_calc_week++) {
      const currentDateInLoop_calc_week = dateFnsAddDays(weekStart_calc_week, i_calc_week);
      const dayAbbr_calc_week = getDayAbbreviationFromDate(currentDateInLoop_calc_week);
      if (habit_item_calc_week.daysOfWeek.includes(dayAbbr_calc_week)) {
        totalScheduled_calc_week++;
        if (habit_item_calc_week.completionLog.some(log_item_calc_week => log_item_calc_week.date === format(currentDateInLoop_calc_week, 'yyyy-MM-dd') && log_item_calc_week.status === 'completed')) {
          totalCompleted_calc_week++;
        }
      }
    }
  });

  const consistency_calc_week = totalScheduled_calc_week > 0 ? Math.round((totalCompleted_calc_week / totalScheduled_calc_week) * 100) : 0;
  let weekLabel_calc_week = "This Week";
  if (weeksAgo === 1) weekLabel_calc_week = "Last Week";
  else if (weeksAgo > 1) weekLabel_calc_week = `${weeksAgo} Wks Ago`;

  return {
    name: weekLabel_calc_week,
    "Consistency (%)": consistency_calc_week,
    scheduled: totalScheduled_calc_week,
    completed: totalCompleted_calc_week
  };
};

// Main component
const HabitOverview: FC<HabitOverviewProps> = ({ habits, totalPoints }) => {
  // Memoized date values
  const today = React.useMemo(() => new Date(), []);
  const todayStr = React.useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const todayAbbr = React.useMemo(() => getDayAbbreviationFromDate(today), [today]);

  // Memoized calculation for habits scheduled today
  const scheduledToday = React.useMemo(() => habits.filter(h_item_sched => h_item_sched.daysOfWeek.includes(todayAbbr)), [habits, todayAbbr]);

  // Memoized calculation for daily progress
  const dailyProgress = React.useMemo(() => {
    if (scheduledToday.length === 0) return { scheduled: 0, completed: 0, percent: 0 };
    const completed_daily_prog = scheduledToday.filter(h_item_daily_prog => h_item_daily_prog.completionLog.some(l_item_daily_prog => l_item_daily_prog.date === todayStr && l_item_daily_prog.status === 'completed')).length;
    return {
      scheduled: scheduledToday.length,
      completed: completed_daily_prog,
      percent: scheduledToday.length > 0 ? Math.round((completed_daily_prog / scheduledToday.length) * 100) : 0
    };
  }, [scheduledToday, todayStr]);

  // Memoized calculation for overall consistency
  const overallConsistency = React.useMemo(() => {
    let totalScheduledInstances_overall_cons = 0;
    let totalCompletedInstances_overall_cons = 0;
    const daysToConsider_overall_cons = 7; // Consider last 7 days
    for (let i_overall_cons = 0; i_overall_cons < daysToConsider_overall_cons; i_overall_cons++) {
      const date_overall_cons = subDays(today, i_overall_cons);
      const dateStrLoop_overall_cons = format(date_overall_cons, 'yyyy-MM-dd');
      const dayAbbrLoop_overall_cons = getDayAbbreviationFromDate(date_overall_cons);
      habits.forEach(h_item_overall_cons => {
        if (h_item_overall_cons.daysOfWeek.includes(dayAbbrLoop_overall_cons)) {
          totalScheduledInstances_overall_cons++;
          if (h_item_overall_cons.completionLog.some(l_item_overall_cons => l_item_overall_cons.date === dateStrLoop_overall_cons && l_item_overall_cons.status === 'completed')) {
            totalCompletedInstances_overall_cons++;
          }
        }
      });
    }
    return {
      score: totalScheduledInstances_overall_cons > 0 ? Math.round((totalCompletedInstances_overall_cons / totalScheduledInstances_overall_cons) * 100) : 0,
      days: daysToConsider_overall_cons
    };
  }, [habits, today]);

  const totalHabitsTracked = habits.length;

  // Memoized level calculation
  const pointsPerLevel = 100;
  const currentLevel = React.useMemo(() => Math.floor(totalPoints / pointsPerLevel) + 1, [totalPoints, pointsPerLevel]);
  const pointsInCurrentLevel = React.useMemo(() => totalPoints % pointsPerLevel, [totalPoints, pointsPerLevel]);
  const pointsToNextLevel = React.useMemo(() => pointsPerLevel - pointsInCurrentLevel, [pointsInCurrentLevel, pointsPerLevel]);
  const progressToNextLevelPercent = React.useMemo(() => (pointsInCurrentLevel / pointsPerLevel) * 100, [pointsInCurrentLevel, pointsPerLevel]);

  // Memoized streak calculation
  const { longestActiveStreak, activeStreaksCount } = React.useMemo(() => {
    if (habits.length === 0) return { longestActiveStreak: 0, activeStreaksCount: 0 };
    let longest_streak_calc = 0;
    let activeCount_streak_calc = 0;
    habits.forEach(habit_streak_calc => {
      const streak_val_calc = calculateStreak(habit_streak_calc, today);
      if (streak_val_calc > 0) {
        activeCount_streak_calc++;
        if (streak_val_calc > longest_streak_calc) {
          longest_streak_calc = streak_val_calc;
        }
      }
    });
    return { longestActiveStreak: longest_streak_calc, activeStreaksCount: activeCount_streak_calc };
  }, [habits, today]);

  // Memoized journey message
  const journeyMessage = React.useMemo(() => {
    if (totalHabitsTracked === 0) return "Embark on your habit journey! Add a habit to begin.";
    if (currentLevel >= 10) return `Level ${currentLevel} Habit Guru! Truly inspiring!`;
    if (currentLevel >= 5) return `Level ${currentLevel} Habit Master! You're on a roll!`;
    if (overallConsistency.score >= 80) return "Excellent Consistency! Keep crushing those goals!";
    if (overallConsistency.score >= 50) return "Great Progress! You're building momentum!";
    return "Keep building those habits, consistency is key!";
  }, [totalHabitsTracked, currentLevel, overallConsistency.score]);


  // Memoized weekly chart data
  const weeklyChartData = React.useMemo(() => {
    // Calculate for last 4 weeks including current (weeksAgo: 3, 2, 1, 0)
    return [3, 2, 1, 0].map(i_chart_data => calculateWeeklyConsistency(habits, i_chart_data, today));
  }, [habits, today]);

  // Chart configuration
  const chartConfig = {
    "Consistency (%)": { label: "Consistency (%)", color: "hsl(var(--chart-1))" }
  } as const;

  // Memoized total SQL hours
  const totalSqlHours = React.useMemo(() => {
    let totalMinutes_sql = 0;
    habits.filter(h_item_sql => h_item_sql.name.toLowerCase().includes("sql")).forEach(h_item_sql_inner => {
      h_item_sql_inner.completionLog.forEach(l_item_sql_inner => {
        if (l_item_sql_inner.status === 'completed') {
          const durationHours_sql = h_item_sql_inner.durationHours || 0;
          const durationMinutes_sql = h_item_sql_inner.durationMinutes || 0;
          totalMinutes_sql += (durationHours_sql * 60) + durationMinutes_sql;
        }
      });
    });
    return (totalMinutes_sql / 60).toFixed(2); // Return as string with 2 decimal places
  }, [habits]);

  // StatCard sub-component
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
    <Card className="shadow-md mb-4 sm:mb-6">
      <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-md font-semibold flex items-center">
            <LayoutDashboard className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Habit Dashboard
          </CardTitle>
        </div>
        <CardDescription className="text-xs mt-0.5">
          Your progress snapshot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-4 pb-3 pt-1">
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
                    {scheduledToday.map(h_item_checklist => (
                      <li key={h_item_checklist.id} className="flex items-center text-xs">
                        {h_item_checklist.completionLog.some(l_item_checklist=>l_item_checklist.date===todayStr && l_item_checklist.status==='completed') ?
                         <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-accent shrink-0" /> :
                         <Circle className="mr-1.5 h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />}
                        <span className={cn("truncate", h_item_checklist.completionLog.some(l_item_checklist_inner=>l_item_checklist_inner.date===todayStr && l_item_checklist_inner.status==='completed') && "text-muted-foreground line-through opacity-70")}>
                          {h_item_checklist.name}
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
              {habits.length > 0 && weeklyChartData.some(d_item_chart => d_item_chart.scheduled > 0) ? (
                <ChartContainer config={chartConfig} className="h-[100px] w-full text-xs">
                  <BarChart accessibilityLayer data={weeklyChartData} margin={{ top: 5, right: 0, left: -30, bottom: -10 }}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={2} fontSize={10} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={2} domain={[0, 100]} fontSize={10}/>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" className="text-xs p-1.5"/>} />
                    <Bar dataKey="Consistency (%)" fill="var(--color-Consistency-\(\%\))" radius={2} barSize={15}/>
                  </BarChart>
                </ChartContainer>
              ) : (<p className="text-xs text-muted-foreground text-center py-2">Not enough data for trend.</p>)}
            </StatCard>

            {habits.some(h_item_sql_check => h_item_sql_check.name.toLowerCase().includes("sql")) && (
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
    