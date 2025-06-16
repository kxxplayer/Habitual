// src/lib/genkit-service.ts

// Since we're using relative URLs, the API will work both in development and production
const API_URL = '/api/genkit';

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
  prompt: string;
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

async function callGenkitFlow<TInput, TOutput>(
  flowName: string,
  input: TInput
): Promise<TOutput> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        flow: flowName,
        input,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to call ${flowName}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error calling ${flowName}:`, error);
    throw error;
  }
}

export const genkitService = {
  generateHabit: (input: GenerateHabitInput) =>
    callGenkitFlow<GenerateHabitInput, GenerateHabitOutput>('generateHabit', input),

  getHabitSuggestion: (input: GetHabitSuggestionInput) =>
    callGenkitFlow<GetHabitSuggestionInput, GetHabitSuggestionOutput>('getHabitSuggestion', input),

  generateHabitProgramFromGoal: (input: GenerateHabitProgramInput) =>
    callGenkitFlow<GenerateHabitProgramInput, GenerateHabitProgramOutput>('generateHabitProgramFromGoal', input),

  getReflectionStarter: (input: GetReflectionStarterInput) =>
    callGenkitFlow<GetReflectionStarterInput, GetReflectionStarterOutput>('getReflectionStarter', input),

  getCommonHabitSuggestions: (input: GetCommonHabitSuggestionsInput) =>
    callGenkitFlow<GetCommonHabitSuggestionsInput, GetCommonHabitSuggestionsOutput>('getCommonHabitSuggestions', input),
};