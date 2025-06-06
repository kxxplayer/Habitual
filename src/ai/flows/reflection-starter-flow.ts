
'use server';
/**
 * @fileOverview Generates an AI-powered reflection prompt for a habit.
 * - getReflectionStarter - Main function to call the flow.
 * - ReflectionStarterInput - Input type for the flow.
 * - ReflectionStarterOutput - Output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { HabitCategory } from '@/types'; // Assuming HabitCategory is defined in types

const ReflectionStarterInputSchema = z.object({
  habitName: z.string().describe('The name of the habit.'),
  habitCategory: z.string().optional().describe('The category of the habit (e.g., Health & Wellness, Creative).'),
  currentStreak: z.number().optional().describe('The current streak for this habit in days.'),
  recentCompletions: z.number().optional().describe('Number of times completed in the last 7 scheduled days.'),
  scheduledDaysInWeek: z.number().optional().describe('Number of days this habit is scheduled per week.'),
});
export type ReflectionStarterInput = z.infer<typeof ReflectionStarterInputSchema>;

const ReflectionStarterOutputSchema = z.object({
  prompt: z.string().describe('An insightful and encouraging reflection prompt or question for the user about their habit journey.'),
});
export type ReflectionStarterOutput = z.infer<typeof ReflectionStarterOutputSchema>;

export async function getReflectionStarter(input: ReflectionStarterInput): Promise<ReflectionStarterOutput> {
  return reflectionStarterFlow(input);
}

const sysPrompt = `You are a compassionate and insightful habit coach.
Your goal is to provide a user with a single, open-ended reflection prompt or question to help them think more deeply about their habit.
The prompt should be encouraging and forward-looking. Tailor it based on the habit's details.

Consider these angles:
- If streak is good: Acknowledge it and ask about keys to success or maintaining momentum.
- If recent completions are low compared to scheduled: Gently inquire about challenges or small steps to get back on track.
- General: Ask about feelings, learnings, connections to broader goals, or small adjustments.
- Avoid accusatory or judgmental language. Keep it concise (1-2 sentences).

Habit Details:
- Name: {{habitName}}
{{#if habitCategory}}- Category: {{habitCategory}}{{/if}}
{{#if currentStreak}}- Current Streak: {{currentStreak}} days{{/if}}
{{#if scheduledDaysInWeek}}
  {{#if recentCompletions}}
  - Progress: Completed {{recentCompletions}} out of the last {{scheduledDaysInWeek}} scheduled instances in the past week.
  {{/if}}
{{/if}}

Generate a reflection prompt:
`;

const prompt = ai.definePrompt({
  name: 'reflectionStarterPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: {schema: ReflectionStarterInputSchema},
  output: {schema: ReflectionStarterOutputSchema},
  prompt: sysPrompt,
});

const reflectionStarterFlow = ai.defineFlow(
  {
    name: 'reflectionStarterFlow',
    inputSchema: ReflectionStarterInputSchema,
    outputSchema: ReflectionStarterOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
