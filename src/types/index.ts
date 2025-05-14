export interface Habit {
  id: string;
  name: string;
  description?: string; // Optional: Original user description for AI context
  frequency: string; // e.g., "Daily", "Mon, Wed, Fri", "3 times a week"
  optimalTiming?: string; // e.g., "Morning", "Evening"
  completedDates: string[]; // Array of 'YYYY-MM-DD' strings
}

export interface AISuggestion {
  habitId: string; // To link suggestion to a specific habit
  suggestionText: string;
  isLoading: boolean;
  error?: string | null;
}
