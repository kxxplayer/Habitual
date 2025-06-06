
'use server';
/**
 * @fileOverview Generates a motivational quote for habit building.
 * - getMotivationalQuote - Returns a quote.
 * - MotivationalQuoteInput - Input type.
 * - MotivationalQuoteOutput - Return type.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MotivationalQuoteInputSchema = z.object({
  habitName: z.string().optional().describe('The name of the habit (optional).'),
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
  model: 'googleai/gemini-2.5-pro-latest',
  input: {schema: MotivationalQuoteInputSchema},
  output: {schema: MotivationalQuoteOutputSchema},
  prompt: `You are a motivational coach. Generate a short, encouraging, actionable quote.
  {{#if habitName}}Make it relevant to: '{{habitName}}'. E.g., for 'SQL Practice', "Keep coding, SQL skills leveling up! Don't break the chain!". For 'Morning Run', "First step out the door is hardest. You got this!".{{/if}}
  If no habit name, offer a general quote about consistency or perseverance.
  Concise & impactful. Inspiring & playful if possible.
  General example: "Every small step counts. Keep building momentum!"
  Specific example: "Your '{{habitName}}' streak looks good! Keep it glowing!"
  `,
});

const motivationalQuoteFlow = ai.defineFlow(
  { name: 'motivationalQuoteFlow', inputSchema: MotivationalQuoteInputSchema, outputSchema: MotivationalQuoteOutputSchema },
  async input => { const {output} = await prompt(input); return output!; }
);
