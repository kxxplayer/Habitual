
export interface HabitCompletionLogEntry {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM', can be 'N/A' for skipped/pending
  note?: string;
  status?: 'completed' | 'pending_makeup' | 'skipped';
  originalMissedDate?: string; // 'YYYY-MM-DD'
}

export const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export type WeekDay = typeof weekDays[number];

export const HABIT_CATEGORIES = [
  "Lifestyle", "Work/Study", "Health & Wellness", "Creative",
  "Chores", "Finance", "Social", "Personal Growth", "Other",
] as const;
export type HabitCategory = typeof HABIT_CATEGORIES[number];

export interface Habit {
  id: string;
  name: string;
  description?: string;
  category?: HabitCategory;
  daysOfWeek: WeekDay[];
  optimalTiming?: string;
  durationHours?: number;
  durationMinutes?: number;
  specificTime?: string; // HH:mm format
  completionLog: HabitCompletionLogEntry[];
  reminderEnabled?: boolean;
}

export interface AISuggestion {
  habitId: string;
  suggestionText: string;
  isLoading: boolean;
  error?: string | null;
}

export interface CreateHabitFormData {
  id?: string;
  description?: string;
  name: string;
  category?: HabitCategory;
  daysOfWeek: WeekDay[];
  optimalTiming?: string;
  durationHours?: number | null;
  durationMinutes?: number | null;
  specificTime?: string;
}

export const SEVEN_DAY_STREAK_BADGE_ID = "sevenDayStreak";
export const THIRTY_DAY_STREAK_BADGE_ID = "thirtyDayStreak";
export const FIRST_HABIT_COMPLETED_BADGE_ID = "firstHabitCompleted";
export const THREE_DAY_SQL_STREAK_BADGE_ID = "threeDaySqlStreak";

export interface EarnedBadge {
  id: string;
  name: string;
  description: string;
  dateAchieved: string; // 'YYYY-MM-DD'
  icon?: string;
}

// Renamed this to avoid conflict with the one from generate-habit-program-flow.ts
export interface SuggestedHabitForCommonList { 
  name: string;
  category?: HabitCategory;
}

// Types for Habit Program Generation (can be refined further)
// These are now primarily defined within the generate-habit-program-flow.ts
// but if shared across more UI components, they could live here.
// For now, direct import from the flow file is used in the dialogs.

// Example:
// export interface SuggestedProgramHabit {
//   name: string;
//   description?: string;
//   category?: HabitCategory;
//   daysOfWeek: WeekDay[];
//   optimalTiming?: string;
//   durationHours?: number;
//   durationMinutes?: number;
//   specificTime?: string;
// }

// export interface HabitProgram {
//   programName: string;
//   suggestedHabits: SuggestedProgramHabit[];
// }

