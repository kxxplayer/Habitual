
'use server';
/**
 * @fileOverview Creates a habit from a user-provided description by suggesting details.
 * - createHabitFromDescription - Function for habit creation.
 * - HabitCreationInput - Input type.
 * - HabitCreationOutput - Return type.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { HABIT_CATEGORIES, type HabitCategory } from '@/types';

const HabitCreationInputSchema = z.object({
  description: z.string().describe('A short description of the habit to create.'),
});
export type HabitCreationInput = z.infer<typeof HabitCreationInputSchema>;

const HabitCreationOutputSchema = z.object({
  habitName: z.string().describe('A suggested name for the habit.'),
  daysOfWeek: z.array(z.string().length(3)).describe('Suggested days of the week (3-letter abbreviations like "Mon", "Tue") for the habit. For daily, suggest all seven days.'),
  optimalTiming: z.string().describe('A suggested general optimal time of day (e.g., morning, afternoon, evening).'),
  durationHours: z.number().optional().describe('Suggested duration in hours (e.g., 1 for 1 hour).'),
  durationMinutes: z.number().optional().describe('Suggested duration in minutes (e.g., 30 for 30 minutes, range 0-59).'),
  specificTime: z.string().optional().describe('A suggested specific time (HH:mm format, e.g., "08:00", "17:30"). If not applicable or flexible, suggest "Anytime" or "Flexible".'),
  category: z.enum(HABIT_CATEGORIES).optional().describe(`Suggested category. Choose one from: ${HABIT_CATEGORIES.join(', ')}. If unsure, omit or suggest 'Other'.`),
});
export type HabitCreationOutput = z.infer<typeof HabitCreationOutputSchema>;

export async function createHabitFromDescription(input: HabitCreationInput): Promise<HabitCreationOutput> {
  return createHabitFromDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'habitCreationPrompt',
  model: 'googleai/gemini-1.5-flash-latest', // Explicitly choose a model
  input: {schema: HabitCreationInputSchema},
  output: {schema: HabitCreationOutputSchema},
  prompt: `You are a helpful assistant that suggests habit details based on a user-provided description.
  Based on the following description, suggest:
  1. A habit name.
  2. Days of the week (array of 3-letter day abbreviations like ["Mon", "Wed", "Fri"], or all seven for daily).
  3. Optimal general timing (e.g., morning, afternoon, evening).
  4. Duration in durationHours (e.g., 1) and durationMinutes (e.g., 30, range 0-59).
  5. Specific time in HH:mm format (e.g., "08:00"). If flexible, suggest "Anytime".
  6. A category from: ${HABIT_CATEGORIES.join(', ')}. Default to 'Other' if unsure.

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
    if (output && output.daysOfWeek && !Array.isArray(output.daysOfWeek)) {
        // This is a fallback, schema validation should ideally catch this.
        const daysString = output.daysOfWeek as any as string;
        output.daysOfWeek = daysString.includes(',') ? daysString.split(',').map(d => d.trim()) : [daysString];
    }
    if (output?.durationMinutes && (output.durationMinutes < 0 || output.durationMinutes > 59)) {
        output.durationMinutes = Math.max(0, Math.min(59, output.durationMinutes));
    }
    return output!;
  }
);
