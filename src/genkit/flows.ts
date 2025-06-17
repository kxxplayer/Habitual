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

// Flow to generate a single habit from a description
export const generateHabit = ai.defineFlow(
  {
    name: 'generateHabit',
    inputSchema: z.object({ description: z.string() }),
    // FIX: Added .nullable() to all optional fields to allow the AI to return null
    outputSchema: z.object({
      habitName: z.string(),
      category: HabitCategorySchema,
      daysOfWeek: z.array(WeekDaySchema),
      optimalTiming: z.string().optional().nullable(),
      durationHours: z.number().optional().nullable(),
      durationMinutes: z.number().optional().nullable(),
      specificTime: z.string().optional().nullable(),
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
      If a value is not present in the user text, set it to null.
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
      throw new Error("The AI failed to generate a valid habit structure.");
    }
  }
);

// Flow to generate a full habit program from a user's goal
export const generateHabitProgramFromGoal = ai.defineFlow(
  {
    name: 'generateHabitProgramFromGoal',
    inputSchema: z.object({ goal: z.string(), focusDuration: z.string() }),
    // FIX: Added .nullable() to all optional fields within the suggestedHabits array
    outputSchema: z.object({
      programName: z.string(),
      suggestedHabits: z.array(z.object({
        name: z.string(),
        description: z.string(),
        category: HabitCategorySchema,
        daysOfWeek: z.array(WeekDaySchema),
        optimalTiming: z.string().optional().nullable(),
        durationHours: z.number().int().min(0).optional().nullable(),
        durationMinutes: z.number().int().min(0).max(59).optional().nullable(),
        specificTime: z.string().optional().nullable(),
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
      **Instructions:** Create a \`programName\` and a \`suggestedHabits\` array of 3-5 habits.
      Each habit MUST have: \`name\`, \`description\`, \`category\`, \`daysOfWeek\`.
      Optional keys per habit: \`optimalTiming\`, \`durationHours\`, \`durationMinutes\`. If a value isn't known, set it to null.
      \`category\` MUST be from: [${HabitCategorySchema.options.join(', ')}].
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
    inputSchema: z.object({ habitName: z.string() }),
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