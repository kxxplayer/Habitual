"use client";

import * as React from 'react';
import type { FC } from 'react';

// UI & Utility Imports
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';


// Date-fns imports
import { format, subDays, startOfWeek, addDays as dateFnsAddDays, isPast, getDay } from 'date-fns';

// Lucide-react icons
import { Target, Flame, CheckCircle2, BarChart3, Star, Zap, Brain, Circle } from 'lucide-react';

// Recharts imports
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

// Local utility and type imports
import { cn } from '@/lib/utils';
import type { Habit, EarnedBadge } from '@/types';
import { getDayAbbreviationFromDate, calculateStreak } from '@/lib/dateUtils';
import type { HabitSuggestionInput } from '@/ai/flows/habit-suggestion';

interface HabitOverviewProps {
  habits: Habit[];
  totalPoints: number;
  earnedBadges: EarnedBadge[];
  getAISuggestion: (input: HabitSuggestionInput) => Promise<{ suggestion: string }>;
}

// --- Reusable Card Component ---
const DashboardCard: FC<{
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ title, icon: Icon, children, className, style }) => (
  <Card className={cn("shadow-lg border-border/80 animate-card-fade-in", className)} style={style}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

// --- Individual Dashboard Modules/Cards ---

const ProgressSnapshotCard: FC<Pick<HabitOverviewProps, 'totalPoints' | 'habits'>> = React.memo(({ totalPoints, habits }) => {
  const { longestActiveStreak, activeStreaksCount } = React.useMemo(() => {
    if (habits.length === 0) return { longestActiveStreak: 0, activeStreaksCount: 0 };
    let longest = 0;
    let activeCount = 0;
    habits.forEach(habit => {
      const streak = calculateStreak(habit, new Date());
      if (streak > 0) activeCount++;
      if (streak > longest) longest = streak;
    });
    return { longestActiveStreak: longest, activeStreaksCount: activeCount };
  }, [habits]);

  const pointsPerLevel = 100;
  const currentLevel = Math.floor(totalPoints / pointsPerLevel) + 1;
  const pointsToNextLevel = pointsPerLevel - (totalPoints % pointsPerLevel);
  const progressToNextLevelPercent = (totalPoints % pointsPerLevel) / pointsPerLevel * 100;
  
  return (
    <DashboardCard title="Progress Snapshot" icon={Star} style={{ animationDelay: '100ms' }}>
      <div className="text-2xl font-bold">Level {currentLevel}</div>
      <p className="text-xs text-muted-foreground">{totalPoints} total points</p>
      <Progress value={progressToNextLevelPercent} className="h-2 mt-4" />
      <p className="text-xs text-muted-foreground mt-1 text-right">{pointsToNextLevel} to Level {currentLevel + 1}</p>
      <div className="grid grid-cols-2 gap-4 mt-4 text-center">
        <div>
          <div className="text-lg font-bold flex items-center justify-center"><Flame className="h-5 w-5 text-destructive mr-1"/>{longestActiveStreak}</div>
          <p className="text-xs text-muted-foreground">Longest Streak</p>
        </div>
        <div>
          <div className="text-lg font-bold">{activeStreaksCount}</div>
          <p className="text-xs text-muted-foreground">Active Streaks</p>
        </div>
      </div>
    </DashboardCard>
  );
});
ProgressSnapshotCard.displayName = 'ProgressSnapshotCard';

const TodayFocusCard: FC<Pick<HabitOverviewProps, 'habits'>> = React.memo(({ habits }) => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayAbbr = getDayAbbreviationFromDate(today);

    const scheduledToday = habits.filter(h => h.daysOfWeek.includes(todayAbbr));
    const completedToday = scheduledToday.filter(h => h.completionLog.some(l => l.date === todayStr && l.status === 'completed'));
    
    if (scheduledToday.length === 0) {
      return (
        <DashboardCard title="Today's Focus" icon={Target} style={{ animationDelay: '0ms' }}>
          <div className="text-center py-4">
            <p className="text-sm font-semibold">All Clear!</p>
            <p className="text-xs text-muted-foreground">No habits scheduled for today. Enjoy your day!</p>
          </div>
        </DashboardCard>
      );
    }
    
    const dailyProgress = Math.round((completedToday.length / scheduledToday.length) * 100);

    return (
        <DashboardCard title="Today's Focus" icon={Target} style={{ animationDelay: '0ms' }}>
            <div className="text-2xl font-bold">{completedToday.length} / {scheduledToday.length}</div>
            <p className="text-xs text-muted-foreground">habits completed today</p>
            <Progress value={dailyProgress} className="h-2 mt-4" indicatorClassName="bg-primary" />
             <div className="mt-4 space-y-2">
                {scheduledToday.slice(0, 3).map(habit => {
                    const isCompleted = habit.completionLog.some(l => l.date === todayStr && l.status === 'completed');
                    return (
                        <div key={habit.id} className="flex items-center text-sm">
                            {isCompleted ? <CheckCircle2 className="h-4 w-4 text-accent mr-2"/> : <Circle className="h-4 w-4 text-muted-foreground/30 mr-2"/>}
                            <span className={cn(isCompleted && "line-through text-muted-foreground")}>{habit.name}</span>
                        </div>
                    );
                })}
                {scheduledToday.length > 3 && <p className="text-xs text-muted-foreground text-center mt-2">...and {scheduledToday.length - 3} more.</p>}
            </div>
        </DashboardCard>
    );
});
TodayFocusCard.displayName = 'TodayFocusCard';


const AIGoalsCard: FC<Pick<HabitOverviewProps, 'habits' | 'getAISuggestion'>> = React.memo(({ habits, getAISuggestion }) => {
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [suggestedHabit, setSuggestedHabit] = React.useState<Habit | null>(null);

  const fetchSuggestion = React.useCallback(async () => {
    const habitsWithMissedDays = habits.filter(habit => {
        return habit.daysOfWeek.some(day => {
            const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
            for (let i = 1; i < 8; i++) { // Check last 7 days
                const d = subDays(new Date(), i);
                if (getDay(d) === dayIndex && isPast(d)) {
                    if (!habit.completionLog.some(log => log.date === format(d, 'yyyy-MM-dd') && log.status === 'completed')) {
                        return true;
                    }
                }
            }
            return false;
        });
    });

    const targetHabit = habitsWithMissedDays.length > 0 ? habitsWithMissedDays[0] : habits[0];

    if (!targetHabit) return;

    setIsLoading(true);
    setSuggestedHabit(targetHabit);
    try {
        const input: HabitSuggestionInput = {
            habitName: targetHabit.name,
            habitDescription: targetHabit.description,
            daysOfWeek: targetHabit.daysOfWeek,
            trackingData: `Completions: ${targetHabit.completionLog.length}`
        };
        const result = await getAISuggestion(input);
        setSuggestion(result.suggestion);
    } catch (error) {
        console.error("AI Suggestion failed:", error);
        setSuggestion("Could not fetch a tip at this time.");
    } finally {
        setIsLoading(false);
    }
  }, [habits, getAISuggestion]);

  React.useEffect(() => {
    if (habits.length > 0) {
        fetchSuggestion();
    }
  }, [habits, fetchSuggestion]);

  return (
    <DashboardCard title="AI Co-Pilot" icon={Brain} style={{ animationDelay: '200ms' }}>
      {isLoading ? (
        <div className="flex items-center space-x-2 py-4">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-3/4" />
        </div>
      ) : suggestion ? (
        <>
          <p className="text-sm font-semibold text-primary">{suggestedHabit?.name}</p>
          <p className="text-sm text-muted-foreground mt-1">{suggestion}</p>
          <div className="flex justify-end mt-4">
            <Badge variant="outline">AI Pro</Badge>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Add a habit to get personalized tips.</p>
      )}
    </DashboardCard>
  );
});
AIGoalsCard.displayName = 'AIGoalsCard';

const TrendsCard: FC<Pick<HabitOverviewProps, 'habits'>> = React.memo(({ habits }) => {
  const chartData = React.useMemo(() => {
    const today = new Date();
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayAbbr = getDayAbbreviationFromDate(date);
        
        const scheduled = habits.filter(h => h.daysOfWeek.includes(dayAbbr)).length;
        const completed = habits.filter(h => h.completionLog.some(l => l.date === dateStr && l.status === 'completed')).length;

        data.push({
            name: format(date, 'EEE'),
            Completed: completed,
            Scheduled: scheduled,
        });
    }
    return data;
  }, [habits]);

  const chartConfig = {
      Completed: { label: "Completed", color: "hsl(var(--chart-2))" },
      Scheduled: { label: "Scheduled", color: "hsl(var(--chart-1))" },
  } as const;

  return (
      <DashboardCard title="Last 7 Days" icon={BarChart3} style={{ animationDelay: '300ms' }}>
          <ChartContainer config={chartConfig} className="h-[150px] w-full">
              <BarChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="Scheduled" fill="var(--color-Scheduled)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completed" fill="var(--color-Completed)" radius={[4, 4, 0, 0]} />
              </BarChart>
          </ChartContainer>
      </DashboardCard>
  );
});
TrendsCard.displayName = 'TrendsCard';


// --- Main Overview Component ---
const HabitOverview: FC<HabitOverviewProps> = ({ habits, totalPoints, earnedBadges, getAISuggestion }) => {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        <TodayFocusCard habits={habits} />
        <ProgressSnapshotCard totalPoints={totalPoints} habits={habits}/>
        <AIGoalsCard habits={habits} getAISuggestion={getAISuggestion} />
        <TrendsCard habits={habits} />
      </div>
    </div>
  );
};
export default HabitOverview;
