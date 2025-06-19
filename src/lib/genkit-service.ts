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
import { Capacitor } from '@capacitor/core';

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
// Use Capacitor's recommended detection for native app
const IS_NATIVE_APP = Capacitor.isNativePlatform && Capacitor.isNativePlatform();

// IMPORTANT: Replace with your actual Vercel/production backend URL below
const PRODUCTION_URL = 'https://habitual-eight.vercel.app'; // <-- Update this if your backend changes

const API_BASE_PATH = IS_NATIVE_APP ? `${PRODUCTION_URL}/api` : '/api';

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

// In src/lib/genkit-service.ts

async function runFlow<T, U>(flowName: string, input: T): Promise<U> {
  try {
    const response = await fetch(`${API_BASE_PATH}/${flowName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // This is the correct format for the appRoute helper
      body: JSON.stringify({ data: input }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // The detailed error from the server is now in errorText
      throw new Error(`[${flowName}] API Error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    // The actual flow output is nested in a 'result' property
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