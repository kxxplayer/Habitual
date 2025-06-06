
'use server';
/**
 * @fileOverview Generates a multi-habit program based on a user's goal and focus duration.
 * - generateHabitProgramFromGoal - Main function to call the flow.
 * - GenerateHabitProgramInput - Input type for the flow.
 * - GenerateHabitProgramOutput - Output type for the flow.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { HABIT_CATEGORIES, type HabitCategory, type WeekDay } from '@/types';

const GenerateHabitProgramInputSchema = z.object({
  goal: z.string().describe('The high-level goal the user wants to achieve (e.g., "reduce weight", "learn guitar", "be more productive").'),
  focusDuration: z.string().describe('The duration the user wants to focus on this program (e.g., "1 month", "3 months", "6 weeks").'),
});
export type GenerateHabitProgramInput = z.infer<typeof GenerateHabitProgramInputSchema>;

const SuggestedProgramHabitSchema = z.object({
  name: z.string().describe("Concise and actionable name for the habit (e.g., 'Morning Jog', 'Practice Chords', 'Daily Planning')."),
  description: z.string().optional().describe("A brief (1-2 sentences) description explaining the habit and its relevance to the goal."),
  category: z.enum(HABIT_CATEGORIES).optional().describe(`Suggested category from: ${HABIT_CATEGORIES.join(', ')}. Choose the most fitting one. If unsure, suggest 'Other'.`),
  daysOfWeek: z.array(z.enum(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])).describe('Suggested days of the week (3-letter abbreviations like "Mon", "Wed", "Fri") for the habit. For daily habits, include all seven days.'),
  optimalTiming: z.string().optional().describe('A suggested general optimal time of day (e.g., "Morning", "After Work", "Before Bed", "Anytime").'),
  durationHours: z.number().int().min(0).optional().describe('Suggested duration in whole hours (e.g., 1 for 1 hour). Omit if not applicable or highly variable.'),
  durationMinutes: z.number().int().min(0).max(59).optional().describe('Suggested duration in minutes (e.g., 30 for 30 minutes). Omit if not applicable or highly variable. Use in conjunction with durationHours if needed.'),
  specificTime: z.string().optional().describe('A suggested specific start time in HH:mm format (e.g., "07:00", "18:30"). Omit if flexible or covered by optimalTiming.'),
});
export type SuggestedProgramHabit = z.infer<typeof SuggestedProgramHabitSchema>;

const GenerateHabitProgramOutputSchema = z.object({
  programName: z.string().describe("A catchy and motivating name for the overall habit program or challenge (e.g., '90-Day Fitness Transformation', 'Guitar Beginner Bootcamp', 'Productivity Power-Up')."),
  suggestedHabits: z.array(SuggestedProgramHabitSchema).min(2).max(5).describe("A list of 2 to 5 distinct, actionable habits that contribute to the user's goal over the focus duration. Each habit should have a clear name, description, and appropriate schedule details."),
});
export type GenerateHabitProgramOutput = z.infer<typeof GenerateHabitProgramOutputSchema>;

export async function generateHabitProgramFromGoal(input: GenerateHabitProgramInput): Promise<GenerateHabitProgramOutput> {
  return generateHabitProgramFromGoalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateHabitProgramPrompt',
  model: 'googleai/gemini-2.5-pro-latest',
  input: {schema: GenerateHabitProgramInputSchema},
  output: {schema: GenerateHabitProgramOutputSchema},
  prompt: `You are an expert habit formation coach and program designer.
A user wants to achieve a specific goal over a certain period. Your task is to create a comprehensive habit program for them.

User's Goal: {{{goal}}}
Focus Duration: {{{focusDuration}}}

Based on this, generate:
1.  A 'programName': A catchy and motivating name for the habit program (e.g., "90-Day Wellness Journey", "Learn Piano Fundamentals in 6 Weeks").
2.  A list of 'suggestedHabits' (between 2 and 5 distinct habits):
    For each habit, provide:
    *   'name': A concise, actionable name (e.g., "Daily Meditation", "Practice Scales", "Evening Review").
    *   'description': A brief explanation (1-2 sentences) of the habit and how it helps achieve the overall goal.
    *   'category': The most fitting category from these options: ${HABIT_CATEGORIES.join(', ')}. Default to 'Other' if truly ambiguous.
    *   'daysOfWeek': An array of 3-letter day abbreviations (e.g., ["Mon", "Wed", "Fri"]). For daily habits, suggest all seven days (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).
    *   'optimalTiming': A general time of day (e.g., "Morning", "Lunch Break", "Evening", "Anytime").
    *   'durationHours': (Optional) Suggested duration in whole hours (e.g., 1).
    *   'durationMinutes': (Optional) Suggested duration in minutes (e.g., 30, range 0-59). Use with durationHours if needed. If a habit is very short (e.g. 5 min meditation), only use durationMinutes.
    *   'specificTime': (Optional) Suggested specific start time in HH:mm format (e.g., "08:00", "19:30"). Use if a specific time is beneficial, otherwise omit.

Important Considerations:
*   The habits should be actionable and directly contribute to the user's stated 'goal'.
*   The 'focusDuration' should influence the intensity or type of habits suggested. For example, a "1-month" program might have more intensive daily habits, while a "6-month" program might build more gradually.
*   Aim for a balanced program. For "reduce weight," consider diet, exercise, and potentially sleep/hydration. For "learn a skill," consider practice, theory, and application.
*   Ensure the output strictly adheres to the JSON schema format described for 'programName' and 'suggestedHabits' including all fields for each habit.
*   Provide between 2 and 5 habits.

Example for Goal: "Learn basic Spanish", Focus Duration: "2 months"
Program Name: "Spanish Fluency Sprint: 60 Days"
Suggested Habits:
  - name: "Duolingo Daily", description: "Complete 2 Duolingo lessons.", category: "Personal Growth", daysOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], optimalTiming: "Anytime", durationMinutes: 20
  - name: "Vocabulary Flashcards", description: "Review 20 new Spanish vocabulary words using flashcards.", category: "Personal Growth", daysOfWeek: ["Mon", "Wed", "Fri"], optimalTiming: "Evening", durationMinutes: 15
  - name: "Listen to Spanish Music", description: "Listen to at least 30 minutes of Spanish-language music.", category: "Personal Growth", daysOfWeek: ["Tue", "Thu", "Sat"], optimalTiming: "Anytime", durationMinutes: 30

Now, generate the program for the user's goal: {{{goal}}} and focus duration: {{{focusDuration}}}.
`,
});

const generateHabitProgramFromGoalFlow = ai.defineFlow(
  {
    name: 'generateHabitProgramFromGoalFlow',
    inputSchema: GenerateHabitProgramInputSchema,
    outputSchema: GenerateHabitProgramOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    // Basic validation and sanitization
    if (output && output.suggestedHabits) {
        output.suggestedHabits = output.suggestedHabits.map(habit => {
            const days = Array.isArray(habit.daysOfWeek) ? habit.daysOfWeek.map(d => d.slice(0,3) as WeekDay) : [];
            const validDays = days.filter(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].includes(d));

            let category = habit.category;
            if (category && !HABIT_CATEGORIES.includes(category)) {
                category = 'Other';
            }

            let specificTime = habit.specificTime;
            if (specificTime && !/^\d{2}:\d{2}$/.test(specificTime) && (specificTime.toLowerCase() === "anytime" || specificTime.toLowerCase() === "flexible") ) {
                specificTime = undefined;
            } else if (specificTime && !/^\d{2}:\d{2}$/.test(specificTime)) {
                 // Attempt to parse HH:mm AM/PM to HH:mm
                try {
                    const timeParts = specificTime.match(/(\d{1,2}):(\d{2})\s*([APap][Mm])?/);
                    if (timeParts) {
                        let hours = parseInt(timeParts[1]);
                        const minutes = parseInt(timeParts[2]);
                        const ampm = timeParts[3];
                        if (ampm) {
                            if (ampm.toLowerCase() === 'pm' && hours < 12) hours += 12;
                            if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0; // Midnight
                        }
                        specificTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                        if (!/^\d{2}:\d{2}$/.test(specificTime)) specificTime = undefined; // if conversion failed
                    } else {
                         specificTime = undefined;
                    }
                } catch (e) {
                    specificTime = undefined;
                }
            }


            return {
                ...habit,
                daysOfWeek: validDays.length > 0 ? validDays : ["Mon", "Wed", "Fri"], // Fallback if AI gives bad days
                category: category || 'Other',
                durationHours: habit.durationHours && habit.durationHours > 0 ? habit.durationHours : undefined,
                durationMinutes: habit.durationMinutes && habit.durationMinutes >=0 && habit.durationMinutes <=59 ? habit.durationMinutes : undefined,
                specificTime: specificTime
            };
        });
    }
    return output!;
  }
);
