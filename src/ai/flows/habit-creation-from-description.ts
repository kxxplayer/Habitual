'use server';

/**
 * @fileOverview Creates a habit from a user-provided description by suggesting details like frequency, timing, duration, and specific time.
 *
 * - createHabitFromDescription - A function that handles the habit creation process.
 * - HabitCreationInput - The input type for the createHabitFromDescription function.
 * - HabitCreationOutput - The return type for the createHabitFromDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HabitCreationInputSchema = z.object({
  description: z.string().describe('A short description of the habit to create.'),
});
export type HabitCreationInput = z.infer<typeof HabitCreationInputSchema>;

const HabitCreationOutputSchema = z.object({
  habitName: z.string().describe('A suggested name for the habit.'),
  frequency: z.string().describe('A suggested frequency for performing the habit (e.g., daily, weekly, monthly).'),
  optimalTiming: z.string().describe('A suggested general optimal time of day to perform the habit (e.g., morning, afternoon, evening).'),
  duration: z.string().optional().describe('A suggested duration for the habit activity (e.g., "30 minutes", "1 hour").'),
  specificTime: z.string().optional().describe('A suggested specific time for the habit if applicable (e.g., "08:00 AM", "Anytime").'),
});
export type HabitCreationOutput = z.infer<typeof HabitCreationOutputSchema>;

export async function createHabitFromDescription(input: HabitCreationInput): Promise<HabitCreationOutput> {
  return createHabitFromDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'habitCreationPrompt',
  input: {schema: HabitCreationInputSchema},
  output: {schema: HabitCreationOutputSchema},
  prompt: `You are a helpful assistant that suggests habit details based on a user-provided description.

  Based on the following description, suggest:
  1. A habit name.
  2. A frequency (e.g., daily, weekly).
  3. An optimal general timing (e.g., morning, afternoon, evening).
  4. A suitable duration for the activity (e.g., "30 minutes", "1 hour").
  5. A specific time of day if applicable (e.g., "08:00 AM", "Anytime", or "Flexible").

  Description: {{{description}}}
  `,
});

const createHabitFromDescriptionFlow = ai.defineFlow(
  {
    name: 'createHabitFromDescriptionFlow',
    inputSchema: HabitCreationInputSchema,
    outputSchema: HabitCreationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
