
'use server';
/**
 * @fileOverview Generates a useful SQL tip.
 * - getSqlTip - Returns a SQL tip.
 * - SqlTipOutput - Return type.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SqlTipOutputSchema = z.object({
  tip: z.string().describe('A short, useful SQL tip for learners or intermediate users. Concise and practical.'),
});
export type SqlTipOutput = z.infer<typeof SqlTipOutputSchema>;

export async function getSqlTip(): Promise<SqlTipOutput> {
  return sqlTipFlow({});
}

const prompt = ai.definePrompt({
  name: 'sqlTipPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  output: {schema: SqlTipOutputSchema},
  prompt: `You are a helpful assistant providing SQL tips.
  Generate ONE concise, useful SQL tip for learners or intermediate users.
  Focus on query optimization, common pitfalls, useful functions, or best practices.
  Short and to the point (1-2 sentences).
  Example: "Use COUNT(column_name) instead of COUNT(*) for specific non-NULL counts for potential performance gain."
  Another: "Always alias table names in JOINs for readability with multiple tables."
  A third: "COALESCE() is great for returning the first non-null expression among its arguments."
  `,
});

const sqlTipFlow = ai.defineFlow(
  { name: 'sqlTipFlow', outputSchema: SqlTipOutputSchema },
  async () => { const {output} = await prompt({}); return output!; }
);

