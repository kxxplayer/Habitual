// src/types/index.ts

export const HABIT_CATEGORIES = [
  'Health & Fitness',
  'Work & Study',
  'Personal Development',
  'Mindfulness',
  'Social',
  'Creative',
  'Finance',
  'Home & Environment',
  'Entertainment',
  'Other'
] as const;

export type HabitCategory = typeof HABIT_CATEGORIES[number];
export type WeekDay = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export const weekDays: readonly WeekDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface HabitCompletionLogEntry {
  date: string;
  time: string;
  note?: string;
  status: 'completed' | 'pending_makeup' | 'skipped';
  originalMissedDate?: string;
}

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
  reminderEnabled: boolean;
  programId?: string;
  programName?: string;
}

export interface CreateHabitFormData {
  id?: string;
  name: string;
  description?: string;
  category?: HabitCategory;
  daysOfWeek: WeekDay[];
  optimalTiming?: string;
  durationHours?: number | null;
  durationMinutes?: number | null;
  specificTime?: string;
}

export interface EarnedBadge {
  id: string;
  name: string;
  description: string;
  earnedDate: string;
  icon?: string;
}

export interface AISuggestion {
  suggestionText: string;
  isLoading: boolean;
  error: string | null;
  habitId?: string;
}

export interface CommonSuggestedHabitType {
  name: string;
  category: HabitCategory;
  description?: string;
}

export interface SuggestedProgramHabit {
  name: string;
  description: string; // Remove ? to make it required
  category: HabitCategory; // Remove ? to make it required  
  daysOfWeek: WeekDay[];
  optimalTiming?: string;
  durationHours?: number;
  durationMinutes?: number;
  specificTime?: string;
}

export interface GenerateHabitProgramOutput {
  programName: string;
  suggestedHabits: SuggestedProgramHabit[];
  goal: string;
  focusDuration?: string;
}

export interface ReflectionStarterInput {
  habitName: string;
}

export interface ReflectionStarterOutput {
  reflectionPrompt: string;
}
export interface GenerateHabitProgramOutput {
  programName: string;
  suggestedHabits: SuggestedProgramHabit[];
  goal: string;
  focusDuration?: string; // ✅ Add this to fix TS error at line 475
}
export const FIRST_HABIT_COMPLETED_BADGE_ID = 'firstHabit';
export const SEVEN_DAY_STREAK_BADGE_ID = 'sevenDayStreak';
export const THIRTY_DAY_STREAK_BADGE_ID = 'thirtyDayStreak';
