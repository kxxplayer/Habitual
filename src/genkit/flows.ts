// src/genkit/flows.ts

import { googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';

// Validate environment variables at startup
if (!process.env.GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY environment variable is required');
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

console.log('✅ Initializing Genkit with Google AI...');

// Initialize Genkit with Google AI plugin
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    })
  ],
});

console.log('✅ Genkit initialized successfully');

// Get the Gemini model
const model = googleAI.model('gemini-1.5-flash');

// Schema definitions
const WeekDaySchema = z.enum(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const HabitCategorySchema = z.enum([
  'Health & Fitness', 'Work & Study', 'Personal Development', 'Mindfulness',
  'Social', 'Creative', 'Finance', 'Home & Environment', 'Entertainment', 'Other'
]);

// Type definitions
type WeekDay = z.infer<typeof WeekDaySchema>;
type HabitCategory = z.infer<typeof HabitCategorySchema>;

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
    outputSchema: z.object({
      habitName: z.string(),
      category: HabitCategorySchema,
      daysOfWeek: z.array(WeekDaySchema),
      optimalTiming: z.string().optional(),
      durationHours: z.number().optional(),
      durationMinutes: z.number().optional(),
      specificTime: z.string().optional().refine(val => !val || /^\d{2}:\d{2}$/.test(val), {
        message: "Time should be in HH:mm format or empty",
      }),
    }),
  },
  async ({ description }) => {
    if (!description || description.trim() === '') {
      throw new Error('Description is required');
    }

    const prompt = `
      Analyze the user's habit description to create a structured JSON object.

      **Instructions:**
      1.  **habitName**: Create a short, clear name.
      2.  **category**: Assign ONE category from this exact list: [${HabitCategorySchema.options.join(', ')}].
      3.  **daysOfWeek**: Extract days. "Weekends" are ["Sat", "Sun"]. "Weekdays" are ["Mon", "Tue", "Wed", "Thu", "Fri"]. "Daily" is all seven days. Use the exact 3-letter abbreviations.
      4.  **duration**: Extract duration. "1 hour" means "durationHours": 1. "30 minutes" means "durationMinutes": 30. If duration is like "6m", it means "durationMinutes": 6.
      5.  **optimalTiming**: Infer a general time like "Morning", "Afternoon", "Evening", "Weekend", or "Anytime".
      6.  **specificTime**: If a specific time like "8:00 AM" or "17:00" is mentioned, use HH:mm format (e.g., "08:00", "17:00"). Otherwise, omit this field or leave it as an empty string.

      **User Description:** "${description}"

      **Output ONLY the JSON object.**

      **Example for "do 5 sql questions on weekends for 1 hour in the evening":**
      {
        "habitName": "Practice SQL Exercises",
        "category": "Work & Study",
        "daysOfWeek": ["Sat", "Sun"],
        "optimalTiming": "Evening",
        "durationHours": 1,
        "durationMinutes": 0,
        "specificTime": ""
      }`;

    const { text } = await ai.generate({ model, prompt });

    try {
      const parsed = JSON.parse(text().replace(/```json|```/g, ''));
      return {
        ...parsed,
        daysOfWeek: Array.isArray(parsed.daysOfWeek) ? parsed.daysOfWeek.map(normalizeDay).filter(Boolean) : [],
      };
    } catch (e) {
      console.error("Failed to parse AI response for generateHabit. Response was:", text());
      throw new Error("The AI failed to generate a valid habit structure. Please try rephrasing.");
    }
  }
);

// Flow to generate a full habit program from a user's goal
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
        optimalTiming: z.string().optional().describe("e.g., Morning, Evening, Weekend, Anytime"),
        durationHours: z.number().int().min(0).optional().describe("Duration in hours"),
        durationMinutes: z.number().int().min(0).max(59).optional().describe("Duration in minutes (0-59)"),
        specificTime: z.string().optional().refine(val => !val || /^\d{2}:\d{2}$/.test(val), {
          message: "Time should be in HH:mm format (e.g., 08:00, 17:30) or empty/omitted if not applicable.",
        }).describe("Specific time in HH:mm format if applicable"),
      }))
    }),
  },
  async ({ goal, focusDuration }) => {
    if (!goal || !focusDuration) {
      throw new Error('Goal and focus duration are required.');
    }
    const prompt = `
      You are an expert life coach creating a habit program.
      **Goal:** ${goal}
      **Duration:** ${focusDuration}

      **Instructions:**
      1.  **programName**: Create an inspiring program name including the goal and duration.
      2.  **suggestedHabits**: Generate an array of 3 to 5 distinct, complementary habits. For each habit:
          * **name**: A clear, concise name.
          * **description**: A 1-2 sentence explanation of WHY this habit helps achieve the goal.
          * **category**: The BEST category from this list: [${HabitCategorySchema.options.join(', ')}].
          * **daysOfWeek**: A recommended weekly schedule using these exact 3-letter values: "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat". "Daily" means all 7 days. "Weekdays" are Mon-Fri. "Weekends" are Sat, Sun.
          * **optimalTiming**: A general time (e.g., "Morning", "Evening", "Weekend", "After Lunch", "Anytime").
          * **durationHours**: (Optional) Estimated hours for the habit. If duration is like "1h", then 1.
          * **durationMinutes**: (Optional) Estimated minutes (0-59). If duration is like "30m", then 30. If "1h 30m", then durationHours: 1, durationMinutes: 30. If "6m", durationMinutes: 6.
          * **specificTime**: (Optional) If a specific time is implied (e.g., "8 AM class"), use HH:mm format (e.g., "08:00"). Otherwise, omit or leave empty.

      **Respond with ONLY the valid JSON object.**

      **Example for "Learn Python in 6 months":**
      {
        "programName": "Python Mastery: 6-Month Immersion",
        "suggestedHabits": [
          {
            "name": "Daily Coding Practice",
            "description": "Solve at least one coding problem on platforms like LeetCode or HackerRank to reinforce concepts and improve problem-solving skills.",
            "category": "Work & Study",
            "daysOfWeek": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "optimalTiming": "Evening",
            "durationMinutes": 30 
          },
          {
            "name": "Python Project Work",
            "description": "Dedicate time to work on a personal Python project to apply your knowledge and build a portfolio. Choose a project that aligns with your interests or goals.",
            "category": "Creative",
            "daysOfWeek": ["Sat", "Sun"],
            "optimalTiming": "Weekend",
            "durationHours": 2
          },
          {
            "name": "Read Python Documentation",
            "description": "Spend 15 minutes reading the official Python docs to understand the language fundamentals deeply.",
            "category": "Personal Development",
            "daysOfWeek": ["Mon", "Wed", "Fri"],
            "optimalTiming": "Anytime",
            "durationMinutes": 15
          }
        ]
      }`;

    const { text } = await ai.generate({ model, prompt });
    
    try {
      const parsed = JSON.parse(text().replace(/```json|```/g, ''));
      // Normalize daysOfWeek for each suggested habit
      if (parsed.suggestedHabits && Array.isArray(parsed.suggestedHabits)) {
        parsed.suggestedHabits = parsed.suggestedHabits.map((habit: any) => ({
          ...habit,
          daysOfWeek: Array.isArray(habit.daysOfWeek) ? habit.daysOfWeek.map(normalizeDay).filter(Boolean) : [],
        }));
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse AI response for program generation. Response was:", text());
      throw new Error("The AI failed to generate a valid program. Please try again.");
    }
  }
);


// These flows below are okay, but I've added some minor prompt improvements for consistency.
export const getHabitSuggestion = ai.defineFlow(
  {
    name: 'getHabitSuggestion',
    inputSchema: z.object({ habitName: z.string(), trackingData: z.string(), daysOfWeek: z.array(WeekDaySchema) }),
    outputSchema: z.object({ suggestion: z.string() }),
  },
  async ({ habitName, trackingData, daysOfWeek }) => {
    const prompt = `You are a supportive habit coach. Give one specific, actionable tip for someone working on the habit "${habitName}".
Their progress so far: ${trackingData}.
Their schedule: ${daysOfWeek.join(', ')}.
Keep the tip concise and encouraging.`;
    const { text } = await ai.generate({ model, prompt });
    return { suggestion: text() };
  }
);

export const getReflectionStarter = ai.defineFlow(
  {
    name: 'getReflectionStarter',
    // Updated inputSchema to match type definition for ReflectionStarterInput in frontend
    inputSchema: z.object({ 
      habitName: z.string(),
      // Adding optional fields that were in the frontend type, though the prompt doesn't use them yet.
      // This makes the flow compatible if the frontend sends them.
      habitCategory: HabitCategorySchema.optional(), 
      currentStreak: z.number().optional(),
      recentCompletions: z.number().optional(),
      scheduledDaysInWeek: z.number().optional()
    }),
    outputSchema: z.object({ prompt: z.string() }), // Changed output field to "prompt" to match frontend call
  },
  async ({ habitName }) => { // Only habitName is used from input for now
    const prompt = `Generate one thoughtful, open-ended reflection question for someone tracking the habit: "${habitName}". The question should encourage them to think about their experience.`;
    const { text } = await ai.generate({ model, prompt });
    return { prompt: text() }; // Changed output field to "prompt"
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
    const prompt = `List 5 common, beginner-friendly habits for the category "${category}". Respond with ONLY a JSON object containing a "suggestions" array. Each item should have a "name" and a "category" from this list: [${HabitCategorySchema.options.join(', ')}].`;
    const { text } = await ai.generate({ model, prompt });
    try {
        const parsed = JSON.parse(text().replace(/```json|```/g, ''));
        return parsed;
    } catch (e) {
        console.error("Failed to parse AI response for common habit suggestions. Response was:", text());
        throw new Error("The AI failed to generate valid common habit suggestions.");
    }
  }
);
