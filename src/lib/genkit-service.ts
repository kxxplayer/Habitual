// src/lib/genkit-service.ts
import { runFlow } from '@genkit-ai/next/client';
import type {
  generateHabit,
  getHabitSuggestion,
  generateHabitProgramFromGoal,
  getReflectionStarter,
  getCommonHabitSuggestions
} from '@/genkit/flows';

export interface GenerateHabitInput {
  description: string;
}

export interface GenerateHabitOutput {
  habitName: string;
  category: string;
  daysOfWeek: string[];
  optimalTiming?: string;
  durationHours?: number;
  durationMinutes?: number;
  specificTime?: string;
}

export interface GetHabitSuggestionInput {
  habitName: string;
  trackingData: string;
  daysOfWeek: string[];
}

export interface GetHabitSuggestionOutput {
  suggestion: string;
}

export interface GenerateHabitProgramInput {
  goal: string;
  focusDuration: string;
}

export interface GenerateHabitProgramOutput {
  programName: string;
  suggestedHabits: Array<{
    name: string;
    description: string;
    category: string;
    daysOfWeek: string[];
  }>;
}

export interface GetReflectionStarterInput {
  habitName: string;
}

export interface GetReflectionStarterOutput {
  reflectionPrompt: string;
}

export interface GetCommonHabitSuggestionsInput {
  category: string;
}

export interface GetCommonHabitSuggestionsOutput {
  suggestions: Array<{
    name: string;
    category: string;
  }>;
}

export const genkitService = {
  generateHabit: async (input: GenerateHabitInput): Promise<GenerateHabitOutput> => {
    return await runFlow<typeof generateHabit>({
      url: '/api/generateHabit',
      input,
    });
  },

  getHabitSuggestion: async (input: GetHabitSuggestionInput): Promise<GetHabitSuggestionOutput> => {
    return await runFlow<typeof getHabitSuggestion>({
      url: '/api/getHabitSuggestion',
      input,
    });
  },

  generateHabitProgramFromGoal: async (input: GenerateHabitProgramInput): Promise<GenerateHabitProgramOutput> => {
    return await runFlow<typeof generateHabitProgramFromGoal>({
      url: '/api/generateHabitProgramFromGoal',
      input,
    });
  },

  getReflectionStarter: async (input: GetReflectionStarterInput): Promise<GetReflectionStarterOutput> => {
    return await runFlow<typeof getReflectionStarter>({
      url: '/api/getReflectionStarter',
      input,
    });
  },

  getCommonHabitSuggestions: async (input: GetCommonHabitSuggestionsInput): Promise<GetCommonHabitSuggestionsOutput> => {
    return await runFlow<typeof getCommonHabitSuggestions>({
      url: '/api/getCommonHabitSuggestions',
      input,
    });
  },
};