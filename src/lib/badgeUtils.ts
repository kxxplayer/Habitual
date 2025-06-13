
"use client";

import type { Habit, EarnedBadge } from '@/types';
import { SEVEN_DAY_STREAK_BADGE_ID, THIRTY_DAY_STREAK_BADGE_ID, FIRST_HABIT_COMPLETED_BADGE_ID, THREE_DAY_SQL_STREAK_BADGE_ID } from '@/types';
import { calculateStreak } from '@/lib/dateUtils';
import { format } from 'date-fns';

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  condition: (habits: Habit[], existingBadges: EarnedBadge[]) => boolean;
}

const badgeDefinitions: BadgeDefinition[] = [
  {
    id: FIRST_HABIT_COMPLETED_BADGE_ID,
    name: "First Step! ✅",
    description: "Completed your first habit task.",
    icon: "✅",
    condition: (habits) => habits.some(habit => habit.completionLog.some(log => log.status === 'completed')),
  },
  {
    id: SEVEN_DAY_STREAK_BADGE_ID,
    name: "7-Day Streak! 🔥",
    description: "Kept a habit going for 7 consecutive scheduled days.",
    icon: "🔥",
    condition: (habits) => habits.some(habit => calculateStreak(habit) >= 7),
  },
  {
    id: THIRTY_DAY_STREAK_BADGE_ID,
    name: "30-Day Master! 🌟",
    description: "Maintained a habit for 30 incredible scheduled days.",
    icon: "🌟",
    condition: (habits) => habits.some(habit => calculateStreak(habit) >= 30),
  },
  {
    id: THREE_DAY_SQL_STREAK_BADGE_ID,
    name: "3-Day SQL Pro! 💻",
    description: "Practiced SQL for 3 consecutive scheduled days.",
    icon: "💻",
    condition: (habits) =>
      habits.some(habit =>
        habit.name.toLowerCase().includes("sql") && calculateStreak(habit) >= 3
      ),
  },
];

// src/lib/badgeUtils.ts

// ... other code ...

export function checkAndAwardBadges(habits: Habit[], existingBadges: EarnedBadge[]): EarnedBadge[] {
  const newlyEarnedBadges: EarnedBadge[] = [];
  const today = format(new Date(), 'yyyy-MM-dd');

  for (const definition of badgeDefinitions) {
    const alreadyEarned = existingBadges.some(b => b.id === definition.id);
    if (!alreadyEarned && definition.condition(habits, existingBadges)) {
      newlyEarnedBadges.push({
        id: definition.id,
        name: definition.name,
        description: definition.description,
        earnedDate: today, // FIX: Changed property from 'dateAchieved' to 'earnedDate'
        icon: definition.icon,
      });
    }
  }
  return newlyEarnedBadges;
}
