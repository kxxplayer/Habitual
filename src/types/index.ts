export interface HabitCompletionLogEntry {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
}

export interface Habit {
  id: string;
  name: string;
  description?: string; // Optional: Original user description for AI context
  frequency: string; // e.g., "Daily", "Mon, Wed, Fri", "3 times a week"
  optimalTiming?: string; // e.g., "Morning", "Evening" - AI suggestion
  duration?: string; // e.g., "30 minutes", "1 hour"
  specificTime?: string; // e.g., "08:00 AM", "Anytime"
  completionLog: HabitCompletionLogEntry[]; // Array of completion entries
}

export interface AISuggestion {
  habitId: string; // To link suggestion to a specific habit
  suggestionText: string;
  isLoading: boolean;
  error?: string | null;
}
