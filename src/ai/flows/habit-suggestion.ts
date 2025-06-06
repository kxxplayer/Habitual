
'use server';
/**
 * @fileOverview A habit suggestion AI agent.
 * - getHabitSuggestion - Handles habit suggestion.
 * - HabitSuggestionInput - Input type.
 * - HabitSuggestionOutput - Return type.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HabitSuggestionInputSchema = z.object({
  habitName: z.string().describe('The name of the habit.'),
  habitDescription: z.string().optional().describe('The description of the habit.'),
  daysOfWeek: z.array(z.string()).describe('Scheduled days (e.g., ["Mon", "Wed"]).'),
  optimalTiming: z.string().optional().describe('Suggested optimal time (e.g., morning).'),
  durationHours: z.number().optional().describe('Suggested duration in hours.'),
  durationMinutes: z.number().optional().describe('Suggested duration in minutes (0-59).'),
  specificTime: z.string().optional().describe('Scheduled time (HH:mm, e.g., "08:00").'),
  trackingData: z.string().describe('Tracking data, including completions and notes. Example: "Completions: 2023-10-25 at 08:05, 2023-10-26 at 08:00. Notes: Felt tired on 2023-10-25."'),
});
export type HabitSuggestionInput = z.infer<typeof HabitSuggestionInputSchema>;

const HabitSuggestionOutputSchema = z.object({
  suggestion: z.string().describe('A personalized suggestion for improving habit consistency.'),
});
export type HabitSuggestionOutput = z.infer<typeof HabitSuggestionOutputSchema>;

export async function getHabitSuggestion(input: HabitSuggestionInput): Promise<HabitSuggestionOutput> {
  return habitSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'habitSuggestionPrompt',
  model: 'googleai/gemini-2.5-pro-latest',
  input: {schema: HabitSuggestionInputSchema},
  output: {schema: HabitSuggestionOutputSchema},
  prompt: `You are an encouraging habit coach. Provide ONE concise, actionable suggestion for the habit: '{{habitName}}'.
  Details:
  - Name: {{habitName}}
  {{#if habitDescription}}- Desc: {{habitDescription}}{{/if}}
  - Scheduled: {{#if daysOfWeek}}{{#each daysOfWeek}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}N/A{{/if}}
  {{#if optimalTiming}}- Optimal: {{optimalTiming}}{{/if}}
  - Duration:{{#if durationHours}} {{durationHours}}h{{/if}}{{#if durationMinutes}} {{durationMinutes}}m{{/if}}{{#unless durationHours}}{{#unless durationMinutes}} N/A{{/unless}}{{/unless}}
  {{#if specificTime}}- Time: {{specificTime}}{{else}} N/A{{/if}}
  Tracking Data: {{{trackingData}}}

  Focus on:
  - Consistency: Address missed days. "Noticed '{{habitName}}' is less frequent on [Day/Pattern]. Try [Action]?"
  - Time/Duration: If duration is long & consistency low: "For '{{habitName}}' ({{#if durationHours}}{{durationHours}}h{{/if}}{{#if durationMinutes}}{{durationMinutes}}m{{/if}}), consider splitting it?" If specific time often missed: "Scheduled time for '{{habitName}}' is {{specificTime}}. If challenging, try shifting it or use the {{optimalTiming}} flexibility?"
  - General Tips: "Many find mornings best for focus habits like '{{habitName}}'."
  - Reinforcement: If good consistency: "Great job with '{{habitName}}'! Keep it up!" If new habit: "Excellent start on '{{habitName}}'!"
  Be practical and supportive. If data is sparse, give a general tip for this habit type.
  `,
});

const habitSuggestionFlow = ai.defineFlow(
  { name: 'habitSuggestionFlow', inputSchema: HabitSuggestionInputSchema, outputSchema: HabitSuggestionOutputSchema },
  async input => { const {output} = await prompt(input); return output!; }
);
