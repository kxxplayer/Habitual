// src/app/api/genkit/route.ts

import { defineFlow, run, generate } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import cors from 'cors';
import { startFlowsServer } from '@genkit-ai/next';
import { ModelReference } from 'genkit/model';

// Define a reference to the model you want to use.
// The string 'googleai/gemini-1.5-flash' tells Genkit to use the 'gemini-1.5-flash' model
// from the 'googleAI' plugin configured in your genkit.config.ts.
const geminiFlash = googleAI('gemini-1.5-flash') as ModelReference<any>;

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

const commonMiddleware = (req: any, res: any, next: (err?: any) => void) => {
  corsHandler(req, res, next);
};

// 1. Flow for generating a habit from a description
const generateHabitInputSchema = z.object({ description: z.string() });
export const generateHabit = defineFlow(
  {
    name: 'generateHabit',
    inputSchema: generateHabitInputSchema,
    outputSchema: z.object({
      habitName: z.string(),
      category: HabitCategorySchema,
      daysOfWeek: z.array(WeekDaySchema),
      optimalTiming: z.string().optional(),
      durationHours: z.number().optional(),
      durationMinutes: z.number().optional(),
      specificTime: z.string().optional(),
    }),
    middleware: [commonMiddleware],
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

    const llmResponse = await run('generate-habit-details', () =>
      generate({
        prompt,
        model: geminiFlash,
        output: { format: 'json' },
      })
    );
    
    return llmResponse.output() as any;
  }
);


// 2. Flow for getting a habit suggestion
const getHabitSuggestionInputSchema = z.object({
  habitName: z.string(),
  trackingData: z.string(),
  daysOfWeek: z.array(z.string()),
});
export const getHabitSuggestion = defineFlow(
  {
    name: 'getHabitSuggestion',
    inputSchema: getHabitSuggestionInputSchema,
    outputSchema: z.object({ suggestion: z.string() }),
    middleware: [commonMiddleware],
  },
  async (input) => {
    const prompt = `Give a short, encouraging, and actionable tip for the habit "${input.habitName}". The user's recent tracking data is: ${input.trackingData}. The habit is scheduled on: ${input.daysOfWeek.join(', ')}.`;
    const llmResponse = await run('get-tip', async () =>
      generate({
        prompt,
        model: geminiFlash,
      })
    );
    return { suggestion: llmResponse.text() };
  }
);

// 3. Flow for generating a program from a goal
const generateHabitProgramFromGoalInputSchema = z.object({ goal: z.string(), focusDuration: z.string() });
export const generateHabitProgramFromGoal = defineFlow(
  {
    name: 'generateHabitProgramFromGoal',
    inputSchema: generateHabitProgramFromGoalInputSchema,
    outputSchema: z.any(),
    middleware: [commonMiddleware],
  },
  async (input) => {
     const prompt = `Based on the user's goal "${input.goal}" and a focus duration of "${input.focusDuration}", create a habit program.
     Provide a creative programName and an array of 3-5 suggestedHabits.
     Each habit should have a name, description, category, and recommended daysOfWeek.
     - category: Choose from: ${HabitCategorySchema.options.join(', ')}.
     - daysOfWeek: An array of day abbreviations (Sun, Mon, Tue, etc.).
     Respond ONLY with a valid JSON object in the format { programName: string, suggestedHabits: [...] }.`;

    const llmResponse = await run('generate-program', async () =>
      generate({
        prompt,
        model: geminiFlash,
        output: { format: 'json' },
      })
    );
    return llmResponse.output() as any;
  }
);

// 4. Flow for getting a reflection starter
const getReflectionStarterInputSchema = z.object({ habitName: z.string() });
export const getReflectionStarter = defineFlow(
  {
    name: 'getReflectionStarter',
    inputSchema: getReflectionStarterInputSchema,
    outputSchema: z.object({ prompt: z.string() }),
    middleware: [commonMiddleware],
  },
  async (input) => {
    const prompt = `Generate a short, insightful reflection prompt for someone tracking the habit: "${input.habitName}". Keep it open-ended.`;
    const llmResponse = await run('get-reflection', async () =>
      generate({
        prompt,
        model: geminiFlash,
      })
    );
    return { prompt: llmResponse.text() };
  }
);


// 5. Flow to get common suggested habits (used on first load)
const getCommonHabitSuggestionsInputSchema = z.object({ category: z.string() });
export const getCommonHabitSuggestions = defineFlow(
  {
    name: 'getCommonHabitSuggestions',
    inputSchema: getCommonHabitSuggestionsInputSchema,
    outputSchema: z.any(),
    middleware: [commonMiddleware],
  },
  async (input) => {
    const prompt = `List 5 common, beginner-friendly habits. For each, provide a 'name' and a 'category' from this list: ${HabitCategorySchema.options.join(', ')}. Respond ONLY with a valid JSON object in the format { "suggestions": [{ "name": "...", "category": "..." }] }.`;
    
    const llmResponse = await run('get-common-suggestions', async () =>
      generate({
        prompt,
        model: geminiFlash,
        output: { format: 'json' },
      })
    );
    
    const output = llmResponse.output();
    return { result: output };
  }
);


// This starts the server for all defined flows.
export const { GET, POST, OPTIONS } = startFlowsServer({
  flows: [
    generateHabit,
    getHabitSuggestion,
    generateHabitProgramFromGoal,
    getReflectionStarter,
    getCommonHabitSuggestions,
  ],
});
