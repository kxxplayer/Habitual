
'use server';
/**
 * @fileOverview Generates a useful SQL tip.
 *
 * - getSqlTip - A function that returns a SQL tip.
 * - SqlTipOutput - The return type for the getSqlTip function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SqlTipOutputSchema = z.object({
  tip: z.string().describe('A short, useful SQL tip for learners or intermediate users. Should be concise and practical.'),
});
export type SqlTipOutput = z.infer<typeof SqlTipOutputSchema>;

export async function getSqlTip(): Promise<SqlTipOutput> {
  return sqlTipFlow({});
}

const prompt = ai.definePrompt({
  name: 'sqlTipPrompt',
  output: {schema: SqlTipOutputSchema},
  prompt: `You are a helpful assistant that provides SQL tips.
  Generate one concise, useful SQL tip. The tip should be practical for someone learning or using SQL.
  Focus on tips related to query optimization, common pitfalls, useful functions, or best practices.
  Keep it short and to the point, ideally one or two sentences.
  Example: "Use COUNT(column_name) instead of COUNT(*) when you only need to count non-NULL values in a specific column for potentially better performance."
  Another Example: "Always use aliases for table names in JOINs to improve readability, especially with multiple tables."
  A third example: "The COALESCE() function is great for returning the first non-null expression among its arguments."
  `,
});

const sqlTipFlow = ai.defineFlow(
  {
    name: 'sqlTipFlow',
    outputSchema: SqlTipOutputSchema,
  },
  async () => {
    const {output} = await prompt({});
    return output!;
  }
);
