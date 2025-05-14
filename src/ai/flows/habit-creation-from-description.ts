'use server';

/**
 * @fileOverview Creates a habit from a user-provided description by suggesting details like name, days of the week, timing, duration, and specific time.
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
  daysOfWeek: z.array(z.string().length(3)).describe('Suggested days of the week (3-letter abbreviations like "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun") for the habit. For daily, suggest all seven days.'),
  optimalTiming: z.string().describe('A suggested general optimal time of day to perform the habit (e.g., morning, afternoon, evening).'),
  durationHours: z.number().optional().describe('Suggested duration in hours for the habit (e.g., 1 for 1 hour).'),
  durationMinutes: z.number().optional().describe('Suggested duration in minutes for the habit (e.g., 30 for 30 minutes, range 0-59).'),
  specificTime: z.string().optional().describe('A suggested specific time for the habit if applicable (e.g., "08:00", "17:30", "Anytime"). Use HH:mm format for specific times.'),
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
  2. The days of the week this habit should be performed. Provide this as an array of 3-letter day abbreviations (e.g., ["Mon", "Wed", "Fri"] or ["Sat", "Sun"] for weekends, or ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] for daily habits).
  3. An optimal general timing (e.g., morning, afternoon, evening).
  4. A suitable duration for the activity. Provide this as durationHours (e.g., 1 for 1 hour) and durationMinutes (e.g., 30 for 30 minutes, range 0-59). If only minutes, durationHours can be omitted or 0. If only hours, durationMinutes can be omitted or 0.
  5. A specific time of day if applicable. Use HH:mm format (e.g., "08:00", "17:30"). If not applicable or flexible, suggest "Anytime" or "Flexible".

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
    // Ensure daysOfWeek is an array, even if AI returns a single string by mistake (though schema should enforce array)
    if (output && output.daysOfWeek && !Array.isArray(output.daysOfWeek)) {
        // This is a fallback, schema validation should ideally catch this.
        // If AI sends a string like "Mon,Tue,Wed", try to split. Otherwise, wrap.
        if (typeof output.daysOfWeek === 'string' && (output.daysOfWeek as string).includes(',')) {
           output.daysOfWeek = (output.daysOfWeek as string).split(',').map(d => d.trim());
        } else {
           output.daysOfWeek = [output.daysOfWeek as any];
        }
    }
    // Ensure minutes are within 0-59 if provided
    if (output?.durationMinutes && (output.durationMinutes < 0 || output.durationMinutes > 59)) {
        output.durationMinutes = Math.max(0, Math.min(59, output.durationMinutes));
    }
    return output!;
  }
);
