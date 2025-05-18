'use server';
/**
 * @fileOverview Generates a motivational quote for habit building.
 *
 * - getMotivationalQuote - A function that returns a motivational quote.
 * - MotivationalQuoteInput - The input type for the getMotivationalQuote function.
 * - MotivationalQuoteOutput - The return type for the getMotivationalQuote function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MotivationalQuoteInputSchema = z.object({
  habitName: z.string().optional().describe('The name of the habit for which to generate a quote (optional).'),
});
export type MotivationalQuoteInput = z.infer<typeof MotivationalQuoteInputSchema>;

const MotivationalQuoteOutputSchema = z.object({
  quote: z.string().describe('A short, motivational quote.'),
});
export type MotivationalQuoteOutput = z.infer<typeof MotivationalQuoteOutputSchema>;

export async function getMotivationalQuote(input?: MotivationalQuoteInput): Promise<MotivationalQuoteOutput> {
  return motivationalQuoteFlow(input || {});
}

const prompt = ai.definePrompt({
  name: 'motivationalQuotePrompt',
  input: {schema: MotivationalQuoteInputSchema},
  output: {schema: MotivationalQuoteOutputSchema},
  prompt: `You are a motivational coach specializing in habit formation. 
  Generate a short, encouraging, and actionable motivational quote.
  {{#if habitName}}The quote should ideally be relevant to the habit: '{{habitName}}'. For example, if the habit is 'SQL Practice', you could say "Keep coding, your SQL skills are leveling up! Don't break the chain!". If the habit is 'Morning Run', "That first step out the door is the hardest. You've got this run!".{{/if}}
  If no specific habit is provided, offer a general motivational quote about consistency or perseverance in building habits.
  Keep the quote concise and impactful, like something that would fit well in a short reminder.
  Avoid generic platitudes. Make it sound inspiring and slightly playful if possible.
  Example for general: "Every small step counts. Keep building that momentum!"
  Example for specific: "Your '{{habitName}}' streak is looking good! Keep it glowing!"
  `,
});

const motivationalQuoteFlow = ai.defineFlow(
  {
    name: 'motivationalQuoteFlow',
    inputSchema: MotivationalQuoteInputSchema,
    outputSchema: MotivationalQuoteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
