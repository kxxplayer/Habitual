"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Lightbulb, CalendarDays, Clock } from 'lucide-react';
import type { Habit } from '@/types';

interface HabitItemProps {
  habit: Habit;
  onToggleComplete: (habitId: string, date: string, completed: boolean) => void;
  onGetAISuggestion: (habit: Habit) => void;
  isCompletedToday: boolean;
}

const HabitItem: FC<HabitItemProps> = ({ habit, onToggleComplete, onGetAISuggestion, isCompletedToday }) => {
  const today = new Date().toISOString().split('T')[0];

  const handleCompletionChange = (checked: boolean) => {
    onToggleComplete(habit.id, today, checked);
  };

  return (
    <Card className={`transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl ${isCompletedToday ? 'border-accent bg-green-50' : 'bg-card'}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold text-primary">{habit.name}</CardTitle>
            {habit.description && <CardDescription className="text-sm text-muted-foreground mt-1">{habit.description}</CardDescription>}
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`complete-${habit.id}`}
              checked={isCompletedToday}
              onCheckedChange={(checked) => handleCompletionChange(Boolean(checked))}
              className={`transform scale-125 ${isCompletedToday ? 'data-[state=checked]:bg-accent data-[state=checked]:border-accent' : ''}`}
            />
            <Label htmlFor={`complete-${habit.id}`} className={`text-sm font-medium ${isCompletedToday ? 'text-accent-foreground' : 'text-foreground'}`}>
              Done Today
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarDays className="mr-2 h-4 w-4" />
          Frequency: {habit.frequency}
        </div>
        {habit.optimalTiming && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            Optimal Timing: {habit.optimalTiming}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={() => onGetAISuggestion(habit)} className="w-full">
          <Lightbulb className="mr-2 h-4 w-4" />
          Get AI Suggestion
        </Button>
      </CardFooter>
    </Card>
  );
};

export default HabitItem;
