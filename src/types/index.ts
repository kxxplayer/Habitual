
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
  specificTime?: string;
  completionLog: HabitCompletionLogEntry[];
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
