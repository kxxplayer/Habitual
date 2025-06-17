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
    try {
      console.log('genkitService.generateHabit called with:', input);
      const result = await runFlow<typeof generateHabit>({
        url: '/api/generateHabit',
        input,
      });
      console.log('genkitService.generateHabit result:', result);
      return result;
    } catch (error) {
      console.error('genkitService.generateHabit error:', error);
      throw error;
    }
  },

  getHabitSuggestion: async (input: GetHabitSuggestionInput): Promise<GetHabitSuggestionOutput> => {
    try {
      console.log('genkitService.getHabitSuggestion called with:', input);
      const result = await runFlow<typeof getHabitSuggestion>({
        url: '/api/getHabitSuggestion',
        input,
      });
      console.log('genkitService.getHabitSuggestion result:', result);
      return result;
    } catch (error) {
      console.error('genkitService.getHabitSuggestion error:', error);
      throw error;
    }
  },

  generateHabitProgramFromGoal: async (input: GenerateHabitProgramInput): Promise<GenerateHabitProgramOutput> => {
    try {
      console.log('genkitService.generateHabitProgramFromGoal called with:', input);
      const result = await runFlow<typeof generateHabitProgramFromGoal>({
        url: '/api/generateHabitProgramFromGoal',
        input,
      });
      console.log('genkitService.generateHabitProgramFromGoal result:', result);
      return result;
    } catch (error) {
      console.error('genkitService.generateHabitProgramFromGoal error:', error);
      throw error;
    }
  },

  getReflectionStarter: async (input: GetReflectionStarterInput): Promise<GetReflectionStarterOutput> => {
    try {
      console.log('genkitService.getReflectionStarter called with:', input);
      const result = await runFlow<typeof getReflectionStarter>({
        url: '/api/getReflectionStarter',
        input,
      });
      console.log('genkitService.getReflectionStarter result:', result);
      return result;
    } catch (error) {
      console.error('genkitService.getReflectionStarter error:', error);
      throw error;
    }
  },

  getCommonHabitSuggestions: async (input: GetCommonHabitSuggestionsInput): Promise<GetCommonHabitSuggestionsOutput> => {
    try {
      console.log('genkitService.getCommonHabitSuggestions called with:', input);
      const result = await runFlow<typeof getCommonHabitSuggestions>({
        url: '/api/getCommonHabitSuggestions',
        input,
      });
      console.log('genkitService.getCommonHabitSuggestions result:', result);
      return result;
    } catch (error) {
      console.error('genkitService.getCommonHabitSuggestions error:', error);
      throw error;
    }
  },
};