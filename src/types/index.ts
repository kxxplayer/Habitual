export interface HabitCompletionLogEntry {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
}

export interface Habit {
  id: string;
  name: string;
  description?: string; // Optional: Original user description for AI context
  daysOfWeek: string[]; // e.g., ["Mon", "Wed", "Fri"] or ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] for daily
  optimalTiming?: string; // e.g., "Morning", "Evening" - AI suggestion
  durationHours?: number; // e.g., 1 for 1 hour
  durationMinutes?: number; // e.g., 30 for 30 minutes
  specificTime?: string; // e.g., "08:00" (HH:mm format for input type="time"), "Anytime"
  completionLog: HabitCompletionLogEntry[]; // Array of completion entries
}

export interface AISuggestion {
  habitId: string; // To link suggestion to a specific habit
  suggestionText: string;
  isLoading: boolean;
  error?: string | null;
}
