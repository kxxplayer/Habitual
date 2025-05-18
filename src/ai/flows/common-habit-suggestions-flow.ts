'use server';
/**
 * @fileOverview Suggests a list of common habits for new users.
 *
 * - getCommonHabitSuggestions - A function that returns a list of common habit suggestions.
 * - CommonHabitSuggestionsInput - The input type (e.g., how many suggestions).
 * - CommonHabitSuggestionsOutput - The return type (array of suggested habits).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { HABIT_CATEGORIES } from '@/types';

const CommonHabitSuggestionsInputSchema = z.object({
  count: z.number().optional().default(4).describe('The number of common habit suggestions to generate.'),
});
export type CommonHabitSuggestionsInput = z.infer<typeof CommonHabitSuggestionsInputSchema>;

const SuggestedHabitSchema = z.object({
  name: z.string().describe("A concise name for the habit (e.g., 'Morning Run', 'Read a Book'). Max 3-4 words."),
  description: z.string().optional().describe("A brief, encouraging description of the habit (e.g., 'Start your day with energy!', 'Expand your mind for 20 minutes.'). Max 1-2 short sentences."),
  category: z.enum(HABIT_CATEGORIES).optional().describe(`A suitable category for this habit from the list: ${HABIT_CATEGORIES.join(', ')}.`),
});
export type SuggestedHabit = z.infer<typeof SuggestedHabitSchema>;

const CommonHabitSuggestionsOutputSchema = z.object({
  suggestions: z.array(SuggestedHabitSchema).describe('A list of common habit suggestions.'),
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
1.  A short 'name' (3-4 words max).
2.  An optional brief 'description' (1-2 short, encouraging sentences max).
3.  An optional 'category' chosen from this exact list: ${HABIT_CATEGORIES.join(', ')}.

Example suggestions:
- name: "Morning Hydration", description: "Start your day right by drinking a glass of water.", category: "Health & Wellness"
- name: "Read for 20 Minutes", description: "Expand your knowledge or escape into a story.", category: "Personal Growth"
- name: "Evening Walk", description: "Relax and get some fresh air after your day.", category: "Lifestyle"
- name: "Daily Tidying", description: "Spend 15 minutes decluttering one area.", category: "Chores"
- name: "Practice Coding", description: "Dedicate time to improve your coding skills.", category: "Work/Study"

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
