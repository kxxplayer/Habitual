// src/types/index.ts
// src/types/index.ts - Complete type definitions to fix all errors

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

// src/types/index.ts

// ... other code ...

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
  icon?: string; // FIX: Added optional icon property to match created objects
}

export interface AISuggestion {
  suggestionText: string;
  isLoading: boolean;
  error: string | null;
  habitId?: string;
}

export interface SuggestedHabitForCommonList {
  name: string;
  description?: string;
  category?: HabitCategory;
  defaultOptimalTiming?: string;
  estimatedMinutes?: number;
}

export interface SuggestedProgramHabit {
  name: string;
  description?: string;
  category?: HabitCategory;
  daysOfWeek: WeekDay[]; // Changed to non-optional as per AI flow output
  optimalTiming?: string;
  durationHours?: number;
  durationMinutes?: number;
  specificTime?: string;
}

export interface GenerateHabitProgramOutput {
  programName: string;
  suggestedHabits: SuggestedProgramHabit[];
  goal: string;
  focusDuration: string;
  durationWeeks?: number;
}

// Badge IDs
export const FIRST_HABIT_COMPLETED_BADGE_ID = 'first-habit-completed';
export const SEVEN_DAY_STREAK_BADGE_ID = '7-day-streak';
export const THIRTY_DAY_STREAK_BADGE_ID = '30-day-streak';
export const THREE_DAY_SQL_STREAK_BADGE_ID = '3-day-sql-streak';

// Component Props Interfaces
export interface HabitOverviewProps {
  habits: Habit[];
  totalPoints: number;
  earnedBadges?: EarnedBadge[];
  getAISuggestion?: (habit: Habit) => Promise<void>;
}

export interface DailyQuestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export interface GoalInputProgramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: string, duration: string) => void; // Changed from onGenerateProgram and durationWeeks: number
  isLoading?: boolean; // Added isLoading prop
}

export interface ProgramSuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  programSuggestion: GenerateHabitProgramOutput | null; // Changed to allow null
  onAddProgramHabits: (habits: SuggestedProgramHabit[], programName: string) => void;
  isLoading?: boolean;
}