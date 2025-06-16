// src/app/api/genkit/route.ts

import { defineFlow, run } from '@genkit-ai/core';
import { generate } from 'genkit/ai';
import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import cors from 'cors';
import { startFlowsServer } from '@genkit-ai/next';

// Define Zod schemas for your data types to ensure type safety.
const WeekDaySchema = z.enum(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const HabitCategorySchema = z.enum([
  'Health & Fitness', 'Work & Study', 'Personal Development', 'Mindfulness',
  'Social', 'Creative', 'Finance', 'Home & Environment', 'Entertainment', 'Other',
]);

const SuggestedHabitSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  category: HabitCategorySchema,
  daysOfWeek: z.array(WeekDaySchema),
});

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
export const generateHabit = defineFlow(
  {
    name: 'generateHabit',
    inputSchema: z.object({ description: z.string() }),
    outputSchema: z.any(),
    middleware: [commonMiddleware],
  },
  async (input) => {
    const prompt = `Based on the user's goal: "${input.description}", generate a structured habit. Respond ONLY with a valid JSON object.`;
    const llmResponse = await run('generate-habit-details', () =>
      generate({
        prompt,
        model: gemini15Flash,
        output: { format: 'json' },
      })
    );
    return llmResponse.output();
  }
);

// 2. Flow for getting a habit suggestion
export const getHabitSuggestion = defineFlow(
  {
    name: 'getHabitSuggestion',
    inputSchema: z.object({ habitName: z.string(), trackingData: z.string(), daysOfWeek: z.array(z.string()) }),
    outputSchema: z.object({ suggestion: z.string() }),
    middleware: [commonMiddleware],
  },
  async (input) => {
    const prompt = `Give a short, encouraging, and actionable tip for the habit "${input.habitName}".`;
    const llmResponse = await run('get-tip', async () => generate({ prompt, model: gemini15Flash }));
    return { suggestion: llmResponse.text() };
  }
);

// 3. Flow for generating a program from a goal
export const generateHabitProgramFromGoal = defineFlow(
  {
    name: 'generateHabitProgramFromGoal',
    inputSchema: z.object({ goal: z.string(), focusDuration: z.string() }),
    outputSchema: z.any(),
    middleware: [commonMiddleware],
  },
  async (input) => {
     const prompt = `Based on the user's goal "${input.goal}" and a focus duration of "${input.focusDuration}", create a habit program. Respond ONLY with a valid JSON object.`;
    const llmResponse = await run('generate-program', async () =>
      generate({ prompt, model: gemini15Flash, output: { format: 'json' } })
    );
    return llmResponse.output();
  }
);

// 4. Flow for getting a reflection starter
export const getReflectionStarter = defineFlow(
  {
    name: 'getReflectionStarter',
    inputSchema: z.object({ habitName: z.string() }),
    outputSchema: z.object({ reflectionPrompt: z.string() }),
    middleware: [commonMiddleware],
  },
  async (input) => {
    const prompt = `Generate a short, insightful reflection prompt for someone tracking the habit: "${input.habitName}".`;
    const llmResponse = await run('get-reflection', async () => generate({ prompt, model: gemini15Flash }));
    return { reflectionPrompt: llmResponse.text() };
  }
);

// 5. Flow to get common suggested habits
export const getCommonHabitSuggestions = defineFlow(
  {
    name: 'getCommonHabitSuggestions',
    inputSchema: z.object({ category: z.string() }),
    outputSchema: z.any(),
    middleware: [commonMiddleware],
  },
  async (input) => {
    const prompt = `List 5 common, beginner-friendly habits. For each, provide a 'name' and a 'category' from this list: ${HabitCategorySchema.options.join(', ')}. Respond ONLY with a valid JSON object.`;
    
    const llmResponse = await run('get-common-suggestions', async () =>
      generate({ prompt, model: gemini15Flash, output: { format: 'json' } })
    );
    
    return llmResponse.output();
  }
);

// This starts the server and exposes all the flows defined in this file.
export const { GET, POST, OPTIONS } = startFlowsServer({
  flows: [
    generateHabit,
    getHabitSuggestion,
    generateHabitProgramFromGoal,
    getReflectionStarter,
    getCommonHabitSuggestions
  ],
});
