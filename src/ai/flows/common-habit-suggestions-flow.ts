
'use server';
/**
 * @fileOverview Suggests common habits for new users.
 * - getCommonHabitSuggestions - Returns common habit suggestions.
 * - CommonHabitSuggestionsInput - Input type.
 * - CommonHabitSuggestionsOutput - Return type.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { HABIT_CATEGORIES } from '@/types';

const CommonHabitSuggestionsInputSchema = z.object({
  count: z.number().optional().default(5).describe('Number of common habit suggestions to generate.'),
});
export type CommonHabitSuggestionsInput = z.infer<typeof CommonHabitSuggestionsInputSchema>;

const SuggestedHabitSchema = z.object({
  name: z.string().describe("Concise habit name for a tile (e.g., 'Gym', 'Study', 'Meditate'). Max 2-3 words."),
  category: z.enum(HABIT_CATEGORIES).optional().describe(`Suitable category from: ${HABIT_CATEGORIES.join(', ')}.`),
});
export type SuggestedHabit = z.infer<typeof SuggestedHabitSchema>;

const CommonHabitSuggestionsOutputSchema = z.object({
  suggestions: z.array(SuggestedHabitSchema).describe('List of common habit suggestions (name and optional category).'),
});
export type CommonHabitSuggestionsOutput = z.infer<typeof CommonHabitSuggestionsOutputSchema>;

export async function getCommonHabitSuggestions(input: CommonHabitSuggestionsInput): Promise<CommonHabitSuggestionsOutput> {
  return commonHabitSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'commonHabitSuggestionsPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: CommonHabitSuggestionsInputSchema},
  output: {schema: CommonHabitSuggestionsOutputSchema},
  prompt: `You are a helpful assistant suggesting common positive habits for a habit tracking app.
  Generate a list of {{count}} diverse and actionable habit suggestions.
  For each, provide:
  1. A short 'name' for a button/tile (2-3 words max, e.g., "Morning Run", "Read a Book", "Meditate", "Study Session", "Pay Bills", "Tidy Up").
  2. An optional 'category' from: ${HABIT_CATEGORIES.join(', ')}.
  Examples:
  - name: "Gym Session", category: "Health & Wellness"
  - name: "Read for 20 Min", category: "Personal Growth"
  - name: "Daily Tidying", category: "Chores"
  Focus on common, beneficial habits. Do not suggest specific days, times, or durations. Provide exactly {{count}} suggestions.
  `,
});

const commonHabitSuggestionsFlow = ai.defineFlow(
  { name: 'commonHabitSuggestionsFlow', inputSchema: CommonHabitSuggestionsInputSchema, outputSchema: CommonHabitSuggestionsOutputSchema },
  async (input) => { const {output} = await prompt(input); return output!; }
);
