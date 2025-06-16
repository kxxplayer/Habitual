import { chat } from '@genkit-ai/googleai';
import { z } from 'zod';
import type { Flow } from 'genkit';
import cors from 'cors';
import type { ActionResult } from 'genkit';

const model = chat('gemini-1.5-flash');

const corsHandler = cors({
  origin: ['https://habitual-eight.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-firebase-appcheck'],
});

const commonMiddleware = (req: any, res: any, next: (err?: any) => void) => {
  corsHandler(req, res, next);
};

const WeekDaySchema = z.enum(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const HabitCategorySchema = z.enum([
  'Health & Fitness', 'Work & Study', 'Personal Development', 'Mindfulness',
  'Social', 'Creative', 'Finance', 'Home & Environment', 'Entertainment', 'Other'
]);

export const generateHabit: Flow = {
  name: 'generateHabit',
  inputSchema: z.object({ description: z.string() }),
  middleware: [commonMiddleware],
  run: async (input) => {
    const prompt = `Based on the user's goal: "${input.description}", generate a structured habit. Respond ONLY with a valid JSON object.`;
    const response = await model.invoke(prompt);
    return { result: response };
  }
};

export const getHabitSuggestion: Flow = {
  name: 'getHabitSuggestion',
  inputSchema: z.object({ habitName: z.string(), trackingData: z.string(), daysOfWeek: z.array(z.string()) }),
  middleware: [commonMiddleware],
  run: async (input) => {
    const prompt = `Give a short, encouraging, and actionable tip for the habit "${input.habitName}". The user's recent tracking data is: ${input.trackingData}. The habit is scheduled on: ${input.daysOfWeek.join(', ')}.`;
    const response = await model.invoke(prompt);
    return { result: { suggestion: response.text() } };
  }
};

export const generateHabitProgramFromGoal: Flow = {
  name: 'generateHabitProgramFromGoal',
  inputSchema: z.object({ goal: z.string(), focusDuration: z.string() }),
  middleware: [commonMiddleware],
  run: async (input) => {
    const prompt = `Based on the user's goal "${input.goal}" and a focus duration of "${input.focusDuration}", create a habit program. Respond ONLY with a valid JSON object.`;
    const response = await model.invoke(prompt);
    return { result: response };
  }
};

export const getReflectionStarter: Flow = {
  name: 'getReflectionStarter',
  inputSchema: z.object({ habitName: z.string() }),
  middleware: [commonMiddleware],
  run: async (input) => {
    const prompt = `Generate a short, insightful reflection prompt for someone tracking the habit: "${input.habitName}".`;
    const response = await model.invoke(prompt);
    return { result: { reflectionPrompt: response.text() } };
  }
};

export const getCommonHabitSuggestions: Flow = {
  name: 'getCommonHabitSuggestions',
  inputSchema: z.object({ category: z.string() }),
  middleware: [commonMiddleware],
  run: async (input) => {
    const prompt = `List 5 common, beginner-friendly habits. For each, provide a 'name' and a 'category' from this list: ${HabitCategorySchema.options.join(', ')}. Respond ONLY with a valid JSON object.`;
    const response = await model.invoke(prompt);
    return { result: response };
  }
};
