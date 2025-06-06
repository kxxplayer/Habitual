
'use server';
/**
 * @fileOverview An AI agent that suggests improvements for the Habitual app.
 * - getAppImprovementSuggestions - Main function to call the flow.
 * - AppImprovementInput - Input type for the flow.
 * - AppImprovementOutput - Output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AppImprovementInputSchema = z.object({
  userFocusArea: z.string().optional().describe('An optional area the user wants to focus on for improvements (e.g., "user engagement", "new features", "data visualization").'),
  currentFeaturesOverride: z.string().optional().describe('Optional: A specific list of current features to consider, overriding the default. For advanced use or testing.')
});
export type AppImprovementInput = z.infer<typeof AppImprovementInputSchema>;

const SuggestionDetailSchema = z.object({
  suggestionTitle: z.string().describe("A concise, catchy title for the improvement idea (3-5 words)."),
  suggestionDescription: z.string().describe("A clear explanation of the feature/improvement (2-4 sentences). Describe what it is and why it would be beneficial for users of a habit tracking app."),
  potentialImpact: z.string().describe("A brief note on the primary benefit (e.g., 'Enhanced User Engagement', 'Deeper Habit Insights', 'Increased Motivation', 'Community Building', 'Personalization')."),
  complexity: z.enum(["Low", "Medium", "High"]).describe("A rough estimate of implementation complexity."),
});

const AppImprovementOutputSchema = z.object({
  suggestions: z.array(SuggestionDetailSchema).min(2).max(4).describe("A list of 2 to 4 distinct, actionable improvement suggestions for the Habitual app."),
});
export type AppImprovementOutput = z.infer<typeof AppImprovementOutputSchema>;

export async function getAppImprovementSuggestions(input: AppImprovementInput): Promise<AppImprovementOutput> {
  return appImprovementSuggesterFlow(input);
}

const defaultCurrentFeatures = `
- User Authentication: Email/Password and Google Sign-In.
- Habit Management: Users can create, edit, and delete habits. Data is stored in Firestore per user.
- Habit Tracking: Daily and weekly progress tracking for habits.
- AI-Powered Habit Assistance:
    - AI suggestions for habit creation from a simple description.
    - AI-generated tips for specific habits based on their progress.
    - AI generation of multi-habit programs based on user goals and duration.
    - Common habit suggestions for new users if they have no habits.
- Motivational Quotes: AI-generated quotes.
- Achievements: Badge system for milestones (e.g., streaks, first completion). Stored in Firestore.
- Points System: Users earn points for completing habits. Stored in Firestore.
- Calendar View: Displays habit activity (scheduled, completed, missed, makeup) on a calendar.
- Customizable Themes: Users can cycle through several app color themes.
- PWA Enabled: App can be installed on devices.
- Profile Page: Displays user email.
- Settings Page: Links to Profile, Calendar, Theme Toggle, Notification Settings, and Sign Out.
- Dashboard Page: Overview of habit progress, points, level, streaks, and weekly consistency chart.
- Data Persistence: User data (habits, points, badges) is stored in Firestore and syncs across devices.
- Responsive Design: App is designed for mobile-first but usable on larger screens.
- Main Navigation: Bottom navigation bar for Home, Dashboard, Add Habit, Badges, Settings.
`;

const prompt = ai.definePrompt({
  name: 'appImprovementSuggesterPrompt',
  model: 'googleai/gemini-1.5-pro-latest', // Using a more capable model for creative suggestions
  input: {schema: AppImprovementInputSchema},
  output: {schema: AppImprovementOutputSchema},
  prompt: `You are an expert app designer, product manager, and UX strategist specializing in habit tracking and self-improvement applications.
Your goal is to suggest innovative and actionable improvements for an existing app called "Habitual".

Current Core Features of Habitual:
{{{currentFeaturesOverride}}}
{{^currentFeaturesOverride}}${defaultCurrentFeatures}{{/currentFeaturesOverride}}

{{#if userFocusArea}}
The user is particularly interested in improvements related to: "{{userFocusArea}}". Please prioritize suggestions in this area, but also feel free to include other high-impact ideas.
{{else}}
Please provide general improvement suggestions.
{{/if}}

Generate 2 to 4 distinct suggestions. For each suggestion, provide:
1.  'suggestionTitle': A concise, catchy title for the improvement idea (3-7 words).
2.  'suggestionDescription': A clear explanation of the feature/improvement (2-4 sentences). Describe what it is and why it would be beneficial for users of a habit tracking app like Habitual.
3.  'potentialImpact': A brief note on the primary benefit (e.g., "Enhanced User Engagement", "Deeper Habit Insights", "Increased Motivation", "Community Building", "Personalization", "Gamification").
4.  'complexity': A rough estimate of implementation complexity ("Low", "Medium", "High") considering a Next.js/React/Firebase/Genkit stack.

Focus on ideas that are practical to implement. The suggestions should be clear enough so the user can describe them to an AI coding assistant (like App Prototyper) to implement. Do not suggest overly broad or vague ideas like "improve UI" without specifics, or features that are already substantially covered by the "Current Core Features" list. Aim for novel yet achievable enhancements.
For example, do not suggest "add AI habit suggestions" if it's already listed. Instead, you could suggest a *specific type* of new AI suggestion or a way to improve existing ones.
`,
});

const appImprovementSuggesterFlow = ai.defineFlow(
  {
    name: 'appImprovementSuggesterFlow',
    inputSchema: AppImprovementInputSchema,
    outputSchema: AppImprovementOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
