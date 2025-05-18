'use server';
/**
 * @fileOverview Suggests a list of common habits for new users as simple, tile-like names.
 *
 * - getCommonHabitSuggestions - A function that returns a list of common habit suggestions.
 * - CommonHabitSuggestionsInput - The input type (e.g., how many suggestions).
 * - CommonHabitSuggestionsOutput - The return type (array of suggested habits).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { HABIT_CATEGORIES } from '@/types';

const CommonHabitSuggestionsInputSchema = z.object({
  count: z.number().optional().default(5).describe('The number of common habit suggestions to generate.'),
});
export type CommonHabitSuggestionsInput = z.infer<typeof CommonHabitSuggestionsInputSchema>;

const SuggestedHabitSchema = z.object({
  name: z.string().describe("A concise name for the habit suitable for a tile (e.g., 'Gym', 'Study', 'Meditate', 'Pay Bills'). Max 2-3 words."),
  category: z.enum(HABIT_CATEGORIES).optional().describe(`A suitable category for this habit from the list: ${HABIT_CATEGORIES.join(', ')}.`),
});
export type SuggestedHabit = z.infer<typeof SuggestedHabitSchema>;

const CommonHabitSuggestionsOutputSchema = z.object({
  suggestions: z.array(SuggestedHabitSchema).describe('A list of common habit suggestions, each with a name and optional category.'),
});
export type CommonHabitSuggestionsOutput = z.infer<typeof CommonHabitSuggestionsOutputSchema>;

export async function getCommonHabitSuggestions(input: CommonHabitSuggestionsInput): Promise<CommonHabitSuggestionsOutput> {
  return commonHabitSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'commonHabitSuggestionsPrompt',
  input: {schema: CommonHabitSuggestionsInputSchema},
  output: {schema: CommonHabitSuggestionsOutputSchema},
  prompt: `You are a helpful assistant that suggests common positive habits for new users of a habit tracking app.
Generate a list of {{count}} diverse and actionable habit suggestions.
For each suggestion, provide:
1.  A short 'name' suitable for a button or tile (2-3 words max, e.g., "Morning Run", "Read a Book", "Meditate", "Study Session", "Pay Bills", "Tidy Up").
2.  An optional 'category' chosen from this exact list: ${HABIT_CATEGORIES.join(', ')}.

Example suggestions:
- name: "Gym Session", category: "Health & Wellness"
- name: "Read for 20 Min", category: "Personal Growth"
- name: "Evening Walk", category: "Lifestyle"
- name: "Daily Tidying", category: "Chores"
- name: "Practice Coding", category: "Work/Study"
- name: "Drink Water", category: "Health & Wellness"
- name: "Plan Your Day", category: "Work/Study"

Focus on common, generally beneficial habits. Do not suggest specific days, times, or durations; the user will customize those.
Provide exactly {{count}} suggestions.
`,
});

const commonHabitSuggestionsFlow = ai.defineFlow(
  {
    name: 'commonHabitSuggestionsFlow',
    inputSchema: CommonHabitSuggestionsInputSchema,
    outputSchema: CommonHabitSuggestionsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
