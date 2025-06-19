import {
  generateHabitOutputSchema,
  generateHabitProgramFromGoalOutputSchema,
  getHabitSuggestionInputSchema,
  getHabitSuggestionOutputSchema,
  getReflectionStarterInputSchema,
  getReflectionStarterOutputSchema,
  getCommonHabitSuggestionsInputSchema,
  getCommonHabitSuggestionsOutputSchema,
} from '../genkit/flows';
import { z } from 'genkit';
import { toast } from '../hooks/use-toast';

// Define types from imported schemas
type GenerateHabitOutput = z.infer<typeof generateHabitOutputSchema>;
type GenerateProgramOutput = z.infer<typeof generateHabitProgramFromGoalOutputSchema>;
type GetHabitSuggestionInput = z.infer<typeof getHabitSuggestionInputSchema>;
type GetHabitSuggestionOutput = z.infer<typeof getHabitSuggestionOutputSchema>;
type GetReflectionStarterInput = z.infer<typeof getReflectionStarterInputSchema>;
type GetReflectionStarterOutput = z.infer<typeof getReflectionStarterOutputSchema>;
type GetCommonHabitsInput = z.infer<typeof getCommonHabitSuggestionsInputSchema>;
type GetCommonHabitsOutput = z.infer<typeof getCommonHabitSuggestionsOutputSchema>;


// Use your production URL when running on mobile (Capacitor)
const IS_PRODUCTION_APP = process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && (window as any).Capacitor;
const API_BASE_PATH = IS_PRODUCTION_APP ? 'https://https://habitual-eight.vercel.app//api' : '/api';

function handleAIError(error: any, flowName: string): never {
  console.error(`[GenkitService] Error in flow '${flowName}':`, error);
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred.';

  toast({
    title: `AI Error in ${flowName}`,
    description: errorMessage,
    variant: 'destructive',
  });

  throw new Error(errorMessage);
}

async function runFlow<T, U>(flowName: string, input: T): Promise<U> {
  try {
    const response = await fetch(`${API_BASE_PATH}/${flowName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: input }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[${flowName}] API Error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.result;
  } catch (error) {
    handleAIError(error, flowName);
  }
}

export const genkitService = {
  async generateHabit(description: string): Promise<GenerateHabitOutput> {
    return runFlow('generateHabit', { description });
  },

  async generateHabitProgramFromGoal(
    goal: string,
    focusDuration: string
  ): Promise<GenerateProgramOutput> {
    return runFlow('generateHabitProgramFromGoal', { goal, focusDuration });
  },

  async getHabitSuggestion(
    input: GetHabitSuggestionInput
  ): Promise<GetHabitSuggestionOutput> {
    return runFlow('getHabitSuggestion', input);
  },

  async getReflectionStarter(
    input: GetReflectionStarterInput
  ): Promise<GetReflectionStarterOutput> {
    return runFlow('getReflectionStarter', input);
  },

  async getCommonHabitSuggestions(
    input: GetCommonHabitsInput
  ): Promise<GetCommonHabitsOutput> {
    return runFlow('getCommonHabitSuggestions', input);
  },
};