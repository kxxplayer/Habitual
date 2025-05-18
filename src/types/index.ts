
export interface HabitCompletionLogEntry {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM', can be 'N/A' for skipped/pending
  note?: string; // Optional reflection note
  status?: 'completed' | 'pending_makeup' | 'skipped'; // Status of the completion
  originalMissedDate?: string; // 'YYYY-MM-DD', if this entry is a makeup for a previously missed date
}

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export type WeekDay = typeof weekDays[number];

export const HABIT_CATEGORIES = [
  "Lifestyle",
  "Work/Study",
  "Health & Wellness",
  "Creative",
  "Chores",
  "Finance",
  "Social",
  "Personal Growth",
  "Other",
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
  reminderEnabled?: boolean; // Added for reminders
}

export interface AISuggestion {
  habitId: string;
  suggestionText: string;
  isLoading: boolean;
  error?: string | null;
}

// Form data type for habit creation
export interface CreateHabitFormData {
  description?: string;
  name: string;
  category?: HabitCategory;
  daysOfWeek: WeekDay[];
  optimalTiming?: string;
  durationHours?: number | null;
  durationMinutes?: number | null;
  specificTime?: string;
}

// Badge Types
export const SEVEN_DAY_STREAK_BADGE_ID = "sevenDayStreak";
export const THIRTY_DAY_STREAK_BADGE_ID = "thirtyDayStreak";
export const FIRST_HABIT_COMPLETED_BADGE_ID = "firstHabitCompleted";
export const THREE_DAY_SQL_STREAK_BADGE_ID = "threeDaySqlStreak";

export interface EarnedBadge {
  id: string; // e.g., SEVEN_DAY_STREAK_BADGE_ID
  name: string;
  description: string;
  dateAchieved: string; // 'YYYY-MM-DD'
  icon?: string; // Placeholder for future icon identifier or emoji
}
