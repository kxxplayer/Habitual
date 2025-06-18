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

export const WeekDaySchema = z.enum(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
export const HabitCategorySchema = z.enum([
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

const normalizeDuration = (habit: any): any => {
  if (habit.durationMinutes >= 60) {
    const additionalHours = Math.floor(habit.durationMinutes / 60);
    const remainingMinutes = habit.durationMinutes % 60;
    
    return {
      ...habit,
      durationHours: (habit.durationHours || 0) + additionalHours,
      durationMinutes: remainingMinutes || null
    };
  }
  return habit;
};

// Schemas for generateHabit
export const generateHabitInputSchema = z.object({ description: z.string() });
export const generateHabitOutputSchema = z.object({
  habitName: z.string(),
  category: HabitCategorySchema,
  daysOfWeek: z.array(WeekDaySchema),
  optimalTiming: z.string().optional().nullable(),
  durationHours: z.number().optional().nullable(),
  durationMinutes: z.number().optional().nullable(),
  specificTime: z.string().optional().nullable(),
});

export const generateHabit = ai.defineFlow(
  {
    name: 'generateHabit',
    inputSchema: generateHabitInputSchema,
    outputSchema: generateHabitOutputSchema,
  },
  async ({ description }) => {
    // ... (rest of the function is unchanged)
    if (!description || description.trim() === '') {
      throw new Error('Description is required');
    }

    const prompt = `
      You are a machine that strictly converts user text into a JSON object.
      Your ONLY output must be the JSON. Do not add explanations or markdown.

      **CRITICAL RULES:**
      - The JSON keys MUST be exactly: \`habitName\`, \`category\`, \`daysOfWeek\`, \`optimalTiming\`, \`durationHours\`, \`durationMinutes\`, \`specificTime\`.
      - \`category\`: MUST be one of these values: [${HabitCategorySchema.options.join(', ')}]. If unsure, you MUST default to "Other". The category field cannot be null.
      - \`daysOfWeek\`: MUST be an array of these exact 3-letter abbreviations: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].
      - For optional fields (\`optimalTiming\`, etc.), if the value is not present, set it to null.
      - IMPORTANT: \`durationMinutes\` MUST be between 0 and 59. If duration is 60 minutes or more, convert to hours. For example: 90 minutes = 1 hour and 30 minutes, 60 minutes = 1 hour and 0 minutes (set durationMinutes to null).

      User text: "${description}"

      Your JSON Output:`;

    const { text } = await ai.generate({ model, prompt });

    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, ''));
      const normalized = normalizeDuration(parsed);
      return {
        ...normalized,
        daysOfWeek: Array.isArray(normalized.daysOfWeek) ? normalized.daysOfWeek.map(normalizeDay).filter(Boolean) : [],
      };
    } catch (e) {
      console.error("Failed to parse AI response for generateHabit. Response was:", text);
      throw new Error("The AI failed to generate a valid habit structure.");
    }
  }
);

// Schemas for generateHabitProgramFromGoal
export const generateHabitProgramFromGoalInputSchema = z.object({ goal: z.string(), focusDuration: z.string() });
export const generateHabitProgramFromGoalOutputSchema = z.object({
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
});

export const generateHabitProgramFromGoal = ai.defineFlow(
  {
    name: 'generateHabitProgramFromGoal',
    inputSchema: generateHabitProgramFromGoalInputSchema,
    outputSchema: generateHabitProgramFromGoalOutputSchema,
  },
  async ({ goal, focusDuration }) => {
    // ... (rest of the function is unchanged)
    if (!goal || !focusDuration) {
      throw new Error('Goal and focus duration are required.');
    }
    const prompt = `
      You are a machine that creates a JSON habit program. Your ONLY output must be the JSON.
      **Goal:** ${goal}
      **Duration:** ${focusDuration}

      **CRITICAL RULES:**
      1. Create a \`programName\` and a \`suggestedHabits\` array of 3-5 habits.
      2. Each habit MUST have keys: \`name\`, \`description\`, \`category\`, \`daysOfWeek\`.
      3. Optional keys per habit: \`optimalTiming\`, \`durationHours\`, \`durationMinutes\`. If a value isn't known, set it to null.
      4. \`category\` MUST be from: [${HabitCategorySchema.options.join(', ')}]. If unsure, you MUST default to "Other". The category field cannot be null.
      5. \`daysOfWeek\` MUST be an array of these exact 3-letter abbreviations: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].
      6. IMPORTANT: \`durationMinutes\` MUST be between 0 and 59. If duration is 60 minutes or more, convert to hours. Examples:
         - 30 minutes = durationHours: null, durationMinutes: 30
         - 60 minutes = durationHours: 1, durationMinutes: null
         - 90 minutes = durationHours: 1, durationMinutes: 30
         - 120 minutes = durationHours: 2, durationMinutes: null

      Your JSON Output:`;

    const { text } = await ai.generate({ model, prompt });
    
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, ''));
      if (parsed.suggestedHabits && Array.isArray(parsed.suggestedHabits)) {
        parsed.suggestedHabits = parsed.suggestedHabits.map((habit: any) => {
          const normalized = normalizeDuration(habit);
          return {
            ...normalized,
            daysOfWeek: Array.isArray(normalized.daysOfWeek) ? normalized.daysOfWeek.map(normalizeDay).filter(Boolean) : [],
          };
        });
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse AI response for program generation. Response was:", text);
      throw new Error("The AI failed to generate a valid program.");
    }
  }
);

// Schemas for getHabitSuggestion
export const getHabitSuggestionInputSchema = z.object({ habitName: z.string(), trackingData: z.string(), daysOfWeek: z.array(WeekDaySchema) });
export const getHabitSuggestionOutputSchema = z.object({ suggestion: z.string() });

export const getHabitSuggestion = ai.defineFlow(
  {
    name: 'getHabitSuggestion',
    inputSchema: getHabitSuggestionInputSchema,
    outputSchema: getHabitSuggestionOutputSchema,
  },
  async ({ habitName, trackingData, daysOfWeek }) => {
    // ... (rest of the function is unchanged)
    const prompt = `You are a helpful habit coach. Give one specific, actionable, and motivating tip for the habit "${habitName}". 
    
    Context:
    - Progress: ${trackingData}
    - Schedule: ${daysOfWeek.join(', ')}
    
    Your tip should be:
    1. Specific and actionable (something they can do today)
    2. Encouraging and positive
    3. Based on behavioral science or proven habit-building techniques
    4. Concise (2-3 sentences max)
    
    Focus on practical advice like timing, environment design, habit stacking, or motivation techniques.`;
    
    const { text } = await ai.generate({ model, prompt });
    return { suggestion: text };
  }
);

// Schemas for getReflectionStarter
export const getReflectionStarterInputSchema = z.object({ habitName: z.string() });
export const getReflectionStarterOutputSchema = z.object({ reflectionPrompt: z.string() });

export const getReflectionStarter = ai.defineFlow(
  {
    name: 'getReflectionStarter',
    inputSchema: getReflectionStarterInputSchema,
    outputSchema: getReflectionStarterOutputSchema,
  },
  async ({ habitName }) => {
    const prompt = `Generate one thoughtful, open-ended reflection question for the habit: "${habitName}".`;
    const { text } = await ai.generate({ model, prompt });
    return { reflectionPrompt: text };
  }
);

// Schemas for getCommonHabitSuggestions
export const getCommonHabitSuggestionsInputSchema = z.object({ category: z.string() });
export const getCommonHabitSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.object({
    name: z.string(),
    category: HabitCategorySchema
  }))
});

export const getCommonHabitSuggestions = ai.defineFlow(
  {
    name: 'getCommonHabitSuggestions',
    inputSchema: getCommonHabitSuggestionsInputSchema,
    outputSchema: getCommonHabitSuggestionsOutputSchema,
  },
  async ({ category }) => {
    // ... (rest of the function is unchanged)
    const prompt = `List 5 common habits for the category "${category}". Format as JSON array with "name" and "category" fields only.`;
    const { text } = await ai.generate({ model, prompt });
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, ''));
      return { suggestions: parsed.suggestions || parsed };
    } catch (e) {
      console.error("Failed to parse common suggestions. Response was:", text);
      return { suggestions: [] };
    }
  }
);