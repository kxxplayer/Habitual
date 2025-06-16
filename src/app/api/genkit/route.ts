// src/app/api/genkit/route.ts

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import cors from 'cors';

// Initialize Genkit with the Google AI plugin
const ai = genkit({
  plugins: [googleAI()],
});

// Define Zod schemas for your data types to ensure type safety.
const WeekDaySchema = z.enum(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const HabitCategorySchema = z.enum([
  'Health & Fitness', 'Work & Study', 'Personal Development', 'Mindfulness',
  'Social', 'Creative', 'Finance', 'Home & Environment', 'Entertainment', 'Other',
]);

// Configure CORS to allow requests from your Vercel app and localhost.
const corsHandler = cors({
  origin: ['https://habitual-eight.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-firebase-appcheck'],
});

// 1. Flow for generating a habit from a description
const generateHabitInputSchema = z.object({ description: z.string() });
const generateHabitOutputSchema = z.object({
  habitName: z.string(),
  category: HabitCategorySchema,
  daysOfWeek: z.array(WeekDaySchema),
  optimalTiming: z.string().optional(),
  durationHours: z.number().optional(),
  durationMinutes: z.number().optional(),
  specificTime: z.string().optional(),
});

export const generateHabit = ai.defineFlow(
  {
    name: 'generateHabit',
    inputSchema: generateHabitInputSchema,
    outputSchema: generateHabitOutputSchema,
  },
  async (input) => {
    const prompt = `
      Based on the user's goal: "${input.description}", generate a structured habit.
      Provide a concise name, a suitable category, recommended days, optimal general timing, and a sensible duration.
      - habitName: A short, clear name for the habit.
      - category: Choose one from: ${HabitCategorySchema.options.join(', ')}.
      - daysOfWeek: An array of day abbreviations (Sun, Mon, Tue, etc.). Default to a reasonable schedule if not specified.
      - optimalTiming: A short phrase like 'Morning', 'After work', etc.
      - durationMinutes: A number, like 30.
      - specificTime: A specific time in HH:mm format if applicable, otherwise null.
      Respond ONLY with a valid JSON object.`;

    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
      output: {
        schema: generateHabitOutputSchema,
      },
    });
    
    if (!output) {
      throw new Error('Failed to generate habit');
    }
    
    return output;
  }
);

// 2. Flow for getting a habit suggestion
const getHabitSuggestionInputSchema = z.object({
  habitName: z.string(),
  trackingData: z.string(),
  daysOfWeek: z.array(z.string()),
});
const getHabitSuggestionOutputSchema = z.object({ suggestion: z.string() });

export const getHabitSuggestion = ai.defineFlow(
  {
    name: 'getHabitSuggestion',
    inputSchema: getHabitSuggestionInputSchema,
    outputSchema: getHabitSuggestionOutputSchema,
  },
  async (input) => {
    const prompt = `Give a short, encouraging, and actionable tip for the habit "${input.habitName}". The user's recent tracking data is: ${input.trackingData}. The habit is scheduled on: ${input.daysOfWeek.join(', ')}.`;
    
    const { text } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
    });
    
    return { suggestion: text };
  }
);

// 3. Flow for generating a program from a goal
const generateHabitProgramFromGoalInputSchema = z.object({ 
  goal: z.string(), 
  focusDuration: z.string() 
});
const generateHabitProgramOutputSchema = z.object({
  programName: z.string(),
  suggestedHabits: z.array(z.object({
    name: z.string(),
    description: z.string(),
    category: HabitCategorySchema,
    daysOfWeek: z.array(WeekDaySchema),
  })),
});

export const generateHabitProgramFromGoal = ai.defineFlow(
  {
    name: 'generateHabitProgramFromGoal',
    inputSchema: generateHabitProgramFromGoalInputSchema,
    outputSchema: generateHabitProgramOutputSchema,
  },
  async (input) => {
    const prompt = `Based on the user's goal "${input.goal}" and a focus duration of "${input.focusDuration}", create a habit program.
     Provide a creative programName and an array of 3-5 suggestedHabits.
     Each habit should have a name, description, category, and recommended daysOfWeek.
     - category: Choose from: ${HabitCategorySchema.options.join(', ')}.
     - daysOfWeek: An array of day abbreviations (Sun, Mon, Tue, etc.).
     Respond ONLY with a valid JSON object in the format { programName: string, suggestedHabits: [...] }.`;

    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
      output: {
        schema: generateHabitProgramOutputSchema,
      },
    });
    
    if (!output) {
      throw new Error('Failed to generate habit program');
    }
    
    return output;
  }
);

// 4. Flow for getting a reflection starter
const getReflectionStarterInputSchema = z.object({ habitName: z.string() });
const getReflectionStarterOutputSchema = z.object({ prompt: z.string() });

export const getReflectionStarter = ai.defineFlow(
  {
    name: 'getReflectionStarter',
    inputSchema: getReflectionStarterInputSchema,
    outputSchema: getReflectionStarterOutputSchema,
  },
  async (input) => {
    const prompt = `Generate a short, insightful reflection prompt for someone tracking the habit: "${input.habitName}". Keep it open-ended.`;
    
    const { text } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
    });
    
    return { prompt: text };
  }
);

// 5. Flow to get common suggested habits (used on first load)
const getCommonHabitSuggestionsInputSchema = z.object({ category: z.string() });
const getCommonHabitSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.object({
    name: z.string(),
    category: HabitCategorySchema,
  })),
});

export const getCommonHabitSuggestions = ai.defineFlow(
  {
    name: 'getCommonHabitSuggestions',
    inputSchema: getCommonHabitSuggestionsInputSchema,
    outputSchema: getCommonHabitSuggestionsOutputSchema,
  },
  async (input) => {
    const prompt = `List 5 common, beginner-friendly habits. For each, provide a 'name' and a 'category' from this list: ${HabitCategorySchema.options.join(', ')}. Respond ONLY with a valid JSON object in the format { "suggestions": [{ "name": "...", "category": "..." }] }.`;
    
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
      output: {
        schema: getCommonHabitSuggestionsOutputSchema,
      },
    });
    
    if (!output) {
      throw new Error('Failed to generate common habit suggestions');
    }
    
    return output;
  }
);

// Next.js API route handlers with CORS
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-firebase-appcheck',
    },
  });
}

export async function POST(request: Request) {
  // Apply CORS headers
  const origin = request.headers.get('origin');
  const headers = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-firebase-appcheck',
  };

  try {
    const body = await request.json();
    const { flow, input } = body;

    let result;
    switch (flow) {
      case 'generateHabit':
        result = await generateHabit(input);
        break;
      case 'getHabitSuggestion':
        result = await getHabitSuggestion(input);
        break;
      case 'generateHabitProgramFromGoal':
        result = await generateHabitProgramFromGoal(input);
        break;
      case 'getReflectionStarter':
        result = await getReflectionStarter(input);
        break;
      case 'getCommonHabitSuggestions':
        result = await getCommonHabitSuggestions(input);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown flow' }),
          { status: 400, headers }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error in Genkit route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

export async function GET(request: Request) {
  // Apply CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-firebase-appcheck',
  };

  return new Response(
    JSON.stringify({ message: 'Genkit API is running' }),
    { status: 200, headers }
  );
}