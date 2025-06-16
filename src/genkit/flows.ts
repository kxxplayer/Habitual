// src/genkit/flows.ts
import { googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';

// Validate environment variables at startup
if (!process.env.GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

if (!process.env.GOOGLE_CLOUD_PROJECT) {
  console.warn('GOOGLE_CLOUD_PROJECT environment variable is not set');
}

console.log('Initializing Genkit with Google AI...');

// Initialize Genkit with Google AI plugin
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    })
  ],
});

console.log('Genkit initialized successfully');

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

// Define flows using the new API
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
    try {
      // Validate input
      if (!description || description.trim() === '') {
        throw new Error('Description is required');
      }

      const prompt = `Based on the user's goal: "${description}", generate a structured habit that directly relates to this goal.

      If the goal mentions:
      - SQL, coding, programming, development: Create a study/practice habit with "Work & Study" category
      - Exercise, fitness, running, gym: Create a fitness habit with "Health & Fitness" category  
      - Reading, books, learning: Create a learning habit with appropriate category
      - Guitar, music, art, creative: Create a creative habit with "Creative" category

      Respond with a JSON object containing:
      - habitName: a clear, actionable habit name that DIRECTLY relates to "${description}"
      - category: one of [${HabitCategorySchema.options.join(', ')}] that best fits the goal
      - daysOfWeek: array of days like ['Mon', 'Wed', 'Fri'] (choose appropriate frequency)
      - optimalTiming: 'morning', 'afternoon', 'evening', or 'anytime'
      - durationHours: number of hours (optional, for longer activities)
      - durationMinutes: number of minutes (15-60 minutes for most habits)
      - specificTime: specific time like '07:00' (optional)
      
      Make the habit name specific and actionable. For example:
      - For "SQL 5 days a week" → "Practice SQL Queries" not "Practice Daily Habit"
      - For "learn guitar" → "Practice Guitar" not "Practice Daily Habit"
      
      Respond ONLY with valid JSON.`;

      const { text } = await ai.generate({
        model,
        prompt,
      });

      // Parse and validate the response
      const parsed = JSON.parse(text);
      
      // Ensure the response has required fields
      return {
        habitName: parsed.habitName || 'New Habit',
        category: (HabitCategorySchema.options.includes(parsed.category) ? parsed.category : 'Other') as HabitCategory,
        daysOfWeek: Array.isArray(parsed.daysOfWeek) 
          ? parsed.daysOfWeek.filter((day: any) => WeekDaySchema.options.includes(day)) as WeekDay[]
          : ['Mon', 'Wed', 'Fri'] as WeekDay[],
        optimalTiming: parsed.optimalTiming || 'anytime',
        durationHours: typeof parsed.durationHours === 'number' ? parsed.durationHours : undefined,
        durationMinutes: typeof parsed.durationMinutes === 'number' ? parsed.durationMinutes : undefined,
        specificTime: parsed.specificTime || undefined,
      };
    } catch (error) {
      console.error('Failed to generate habit:', error);
      // Return a fallback response instead of throwing
      return {
        habitName: 'Practice Daily Habit',
        category: 'Other' as HabitCategory,
        daysOfWeek: ['Mon', 'Wed', 'Fri'] as WeekDay[],
        optimalTiming: 'anytime',
      };
    }
  }
);

export const getHabitSuggestion = ai.defineFlow(
  {
    name: 'getHabitSuggestion',
    inputSchema: z.object({
      habitName: z.string(),
      trackingData: z.string(),
      daysOfWeek: z.array(z.string())
    }),
    outputSchema: z.object({
      suggestion: z.string()
    }),
  },
  async ({ habitName, trackingData, daysOfWeek }) => {
    try {
      const prompt = `Give a short, encouraging, and actionable tip for the habit "${habitName}". 
      The user's recent tracking data is: ${trackingData}. 
      The habit is scheduled on: ${daysOfWeek.join(', ')}.
      
      Provide a 1-2 sentence motivational tip.`;

      const { text } = await ai.generate({
        model,
        prompt,
      });

      return { suggestion: text };
    } catch (error) {
      console.error('Failed to get habit suggestion:', error);
      return { suggestion: 'Keep up the great work! Consistency is key to building lasting habits.' };
    }
  }
);

export const generateHabitProgramFromGoal = ai.defineFlow(
  {
    name: 'generateHabitProgramFromGoal',
    inputSchema: z.object({
      goal: z.string(),
      focusDuration: z.string()
    }),
    outputSchema: z.object({
      programName: z.string(),
      suggestedHabits: z.array(z.object({
        name: z.string(),
        description: z.string(),
        category: HabitCategorySchema,
        daysOfWeek: z.array(WeekDaySchema),
      }))
    }),
  },
  async ({ goal, focusDuration }) => {
    try {
      // Validate input
      if (!goal || goal.trim() === '') {
        throw new Error('Goal is required');
      }
      if (!focusDuration || focusDuration.trim() === '') {
        throw new Error('Focus duration is required');
      }

      const prompt = `Based on the user's goal "${goal}" and a focus duration of "${focusDuration}", create a habit program.
      
      Respond with a JSON object containing:
      - programName: a catchy program name
      - suggestedHabits: array of 3-5 habits, each with:
        - name: habit name
        - description: brief description
        - category: one of [${HabitCategorySchema.options.join(', ')}]
        - daysOfWeek: array of days
      
      Respond ONLY with valid JSON.`;

      const { text } = await ai.generate({
        model,
        prompt,
      });

      const parsed = JSON.parse(text);
      
      // Validate and sanitize the response
      const validatedHabits = (parsed.suggestedHabits || []).map((habit: any) => ({
        name: habit.name || 'New Habit',
        description: habit.description || 'Practice this habit regularly',
        category: (HabitCategorySchema.options.includes(habit.category) ? habit.category : 'Other') as HabitCategory,
        daysOfWeek: Array.isArray(habit.daysOfWeek) 
          ? habit.daysOfWeek.filter((day: any) => WeekDaySchema.options.includes(day as WeekDay)) as WeekDay[]
          : ['Mon', 'Wed', 'Fri'] as WeekDay[]
      }));

      return {
        programName: parsed.programName || 'Personal Development Program',
        suggestedHabits: validatedHabits.slice(0, 5) // Limit to 5 habits
      };
    } catch (error) {
      console.error('Failed to generate habit program:', error);
      // Return a fallback response
      return {
        programName: 'Personal Development Program',
        suggestedHabits: [
          {
            name: 'Morning Reflection',
            description: 'Take 5 minutes each morning to reflect on your goals',
            category: 'Personal Development' as HabitCategory,
            daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as WeekDay[]
          }
        ]
      };
    }
  }
);

export const getReflectionStarter = ai.defineFlow(
  {
    name: 'getReflectionStarter',
    inputSchema: z.object({
      habitName: z.string()
    }),
    outputSchema: z.object({
      reflectionPrompt: z.string()
    }),
  },
  async ({ habitName }) => {
    try {
      const prompt = `Generate a short, insightful reflection prompt for someone tracking the habit: "${habitName}".
      
      Create a thought-provoking question that helps them reflect on their progress and feelings.`;

      const { text } = await ai.generate({
        model,
        prompt,
      });

      return { reflectionPrompt: text };
    } catch (error) {
      console.error('Failed to get reflection starter:', error);
      return { reflectionPrompt: `How did practicing ${habitName} make you feel today?` };
    }
  }
);

export const getCommonHabitSuggestions = ai.defineFlow(
  {
    name: 'getCommonHabitSuggestions',
    inputSchema: z.object({
      category: z.string()
    }),
    outputSchema: z.object({
      suggestions: z.array(z.object({
        name: z.string(),
        category: HabitCategorySchema
      }))
    }),
  },
  async ({ category }) => {
    try {
      const prompt = `List 5 common, beginner-friendly habits for the category "${category}".
      
      For each, provide:
      - name: a simple habit name
      - category: must be "${category}" or from this list if "${category}" is not valid: [${HabitCategorySchema.options.join(', ')}]
      
      Respond with a JSON object containing a "suggestions" array.
      Respond ONLY with valid JSON.`;

      const { text } = await ai.generate({
        model,
        prompt,
      });

      const parsed = JSON.parse(text);
      
      // Validate suggestions
      const validatedSuggestions = (parsed.suggestions || []).map((suggestion: any) => ({
        name: suggestion.name || 'Practice Daily',
        category: (HabitCategorySchema.options.includes(suggestion.category) ? suggestion.category : category) as HabitCategory
      }));

      return { suggestions: validatedSuggestions };
    } catch (error) {
      console.error('Failed to get common habit suggestions:', error);
      return {
        suggestions: [
          { name: 'Practice daily', category: 'Other' as HabitCategory }
        ]
      };
    }
  }
);