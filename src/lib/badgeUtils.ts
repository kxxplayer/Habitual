
"use client";

import type { Habit, EarnedBadge } from '@/types';
import { SEVEN_DAY_STREAK_BADGE_ID, THIRTY_DAY_STREAK_BADGE_ID, FIRST_HABIT_COMPLETED_BADGE_ID } from '@/types';
import { calculateStreak } from '@/lib/dateUtils';
import { format } from 'date-fns';

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string; // Emoji or identifier for a Lucide icon
  condition: (habits: Habit[], existingBadges: EarnedBadge[]) => boolean;
}

const badgeDefinitions: BadgeDefinition[] = [
  {
    id: SEVEN_DAY_STREAK_BADGE_ID,
    name: "7-Day Streak! 🔥",
    description: "Kept a habit going for 7 consecutive days.",
    icon: "🔥",
    condition: (habits) => habits.some(habit => calculateStreak(habit) >= 7),
  },
  {
    id: THIRTY_DAY_STREAK_BADGE_ID,
    name: "30-Day Master! 🌟",
    description: "Maintained a habit for 30 incredible days.",
    icon: "🌟",
    condition: (habits) => habits.some(habit => calculateStreak(habit) >= 30),
  },
  {
    id: FIRST_HABIT_COMPLETED_BADGE_ID,
    name: "First Step! ✅",
    description: "Completed your first habit task.",
    icon: "✅",
    condition: (habits) => habits.some(habit => habit.completionLog.some(log => log.status === 'completed')),
  },
  // Add more badge definitions here
];

/**
 * Checks all defined badge conditions and returns any newly earned badges.
 * @param habits The current list of habits.
 * @param existingBadges The list of already earned badges.
 * @returns An array of newly earned Badge objects, or an empty array if none.
 */
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
        dateAchieved: today,
        icon: definition.icon,
      });
    }
  }
  return newlyEarnedBadges;
}
