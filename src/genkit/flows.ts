// src/genkit/flows.ts

import { googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';

if (!process.env.GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY environment variable is required');
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    })
  ],
});

const model = googleAI.model('gemini-1.5-flash');

const WeekDaySchema = z.enum(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const HabitCategorySchema = z.enum([
  'Health & Fitness', 'Work & Study', 'Personal Development', 'Mindfulness',
  'Social', 'Creative', 'Finance', 'Home & Environment', 'Entertainment', 'Other'
]);

type WeekDay = z.infer<typeof WeekDaySchema>;

const dayMapFullToAbbr: { [key: string]: WeekDay } = {
  "sunday": "Sun", "sun": "Sun", "sundays": "Sun",
  "monday": "Mon", "mon": "Mon", "mondays": "Mon",
  "tuesday": "Tue", "tue": "Tue", "tuesdays": "Tue",
  "wednesday": "Wed", "wed": "Wed", "wednesdays": "Wed",
  "thursday": "Thu", "thu": "Thu", "thursdays": "Thu",
  "friday": "Fri", "fri": "Fri", "fridays": "Fri",
  "saturday": "Sat", "sat": "Sat", "saturdays": "Sat",
};

const normalizeDay = (day: string): WeekDay | undefined => {
  if (typeof day !== 'string') return undefined;
  const lowerDay = day.trim().toLowerCase().replace(/,/g, '');
  return dayMapFullToAbbr[lowerDay] || (WeekDaySchema.options as readonly string[]).includes(day) ? day as WeekDay : undefined;
};

export const generateHabit = ai.defineFlow(
  {
    name: 'generateHabit',
    inputSchema: z.object({ description: z.string() }),
    outputSchema: z.object({
      habitName: z.string(),
      category: HabitCategorySchema,
      daysOfWeek: z.array(WeekDaySchema),
      optimalTiming: z.string().optional(),
      durationHours: z.number().optional(),
      durationMinutes: z.number().optional(),
      specificTime: z.string().optional(),
    }),
  },
  async ({ description }) => {
    if (!description || description.trim() === '') {
      throw new Error('Description is required');
    }

    const prompt = `
      You are a machine that strictly converts user text into a JSON object.
      Your ONLY output must be the JSON. Do not add explanations or markdown.

      The JSON keys MUST be exactly: \`habitName\`, \`category\`, \`daysOfWeek\`, \`optimalTiming\`, \`durationHours\`, \`durationMinutes\`, \`specificTime\`.
      Do NOT use other keys like "activity" or "frequency".

      - category: Choose one from [${HabitCategorySchema.options.join(', ')}].
      - daysOfWeek: Use ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].
      - duration: If text says "1 hour", use "durationHours": 1. If "30 minutes", use "durationMinutes": 30.

      User text: "${description}"

      Your JSON Output:`;

    const { text } = await ai.generate({ model, prompt });

    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, ''));
      return {
        ...parsed,
        daysOfWeek: Array.isArray(parsed.daysOfWeek) ? parsed.daysOfWeek.map(normalizeDay).filter(Boolean) : [],
      };
    } catch (e) {
      console.error("Failed to parse AI response for generateHabit. Response was:", text);
      throw new Error("The AI failed to generate a valid habit structure. Please try rephrasing.");
    }
  }
);

export const generateHabitProgramFromGoal = ai.defineFlow(
  {
    name: 'generateHabitProgramFromGoal',
    inputSchema: z.object({ goal: z.string(), focusDuration: z.string() }),
    outputSchema: z.object({
      programName: z.string(),
      suggestedHabits: z.array(z.object({
        name: z.string(),
        description: z.string(),
        category: HabitCategorySchema,
        daysOfWeek: z.array(WeekDaySchema),
        optimalTiming: z.string().optional(),
        durationHours: z.number().int().min(0).optional(),
        durationMinutes: z.number().int().min(0).max(59).optional(),
        specificTime: z.string().optional(),
      }))
    }),
  },
  async ({ goal, focusDuration }) => {
    if (!goal || !focusDuration) {
      throw new Error('Goal and focus duration are required.');
    }
    const prompt = `
      You are a machine that creates a JSON habit program. Your ONLY output must be the JSON.
      **Goal:** ${goal}
      **Duration:** ${focusDuration}

      **Instructions:**
      1. Create an inspiring \`programName\`.
      2. Create a \`suggestedHabits\` array with 3-5 habits.
      3. Each habit MUST have these keys: \`name\`, \`description\`, \`category\`, \`daysOfWeek\`.
      4. Optional keys per habit: \`optimalTiming\`, \`durationHours\`, \`durationMinutes\`.
      5. \`category\` MUST be from: [${HabitCategorySchema.options.join(', ')}].
      
      Your JSON Output:`;

    const { text } = await ai.generate({ model, prompt });
    
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, ''));
      if (parsed.suggestedHabits && Array.isArray(parsed.suggestedHabits)) {
        parsed.suggestedHabits = parsed.suggestedHabits.map((habit: any) => ({
          ...habit,
          daysOfWeek: Array.isArray(habit.daysOfWeek) ? habit.daysOfWeek.map(normalizeDay).filter(Boolean) : [],
        }));
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse AI response for program generation. Response was:", text);
      throw new Error("The AI failed to generate a valid program.");
    }
  }
);

export const getHabitSuggestion = ai.defineFlow(
  {
    name: 'getHabitSuggestion',
    inputSchema: z.object({ habitName: z.string(), trackingData: z.string(), daysOfWeek: z.array(WeekDaySchema) }),
    outputSchema: z.object({ suggestion: z.string() }),
  },
  async ({ habitName, trackingData, daysOfWeek }) => {
    const prompt = `Give one specific, actionable tip for the habit "${habitName}". Progress: ${trackingData}. Schedule: ${daysOfWeek.join(', ')}.`;
    const { text } = await ai.generate({ model, prompt });
    return { suggestion: text };
  }
);

export const getReflectionStarter = ai.defineFlow(
  {
    name: 'getReflectionStarter',
    inputSchema: z.object({ 
      habitName: z.string(),
      habitCategory: HabitCategorySchema.optional(), 
      currentStreak: z.number().optional(),
      recentCompletions: z.number().optional(),
      scheduledDaysInWeek: z.number().optional()
    }),
    outputSchema: z.object({ reflectionPrompt: z.string() }),
  },
  async ({ habitName }) => {
    const prompt = `Generate one thoughtful, open-ended reflection question for the habit: "${habitName}".`;
    const { text } = await ai.generate({ model, prompt });
    return { reflectionPrompt: text };
  }
);

export const getCommonHabitSuggestions = ai.defineFlow(
  {
    name: 'getCommonHabitSuggestions',
    inputSchema: z.object({ category: z.string() }),
    outputSchema: z.object({
      suggestions: z.array(z.object({
        name: z.string(),
        category: HabitCategorySchema
      }))
    }),
  },
  async ({ category }) => {
    const prompt = `List 5 common habits for the category "${category}". Respond with ONLY a JSON object with a "suggestions" array.`;
    const { text } = await ai.generate({ model, prompt });
    try {
        const parsed = JSON.parse(text.replace(/```json|```/g, ''));
        return parsed;
    } catch (e) {
        console.error("Failed to parse AI response for common habit suggestions. Response was:", text);
        throw new Error("The AI failed to generate valid common habit suggestions.");
    }
  }
);