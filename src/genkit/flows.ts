import { googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';

// Initialize Genkit with Google AI plugin
const ai = genkit({
  plugins: [googleAI()],
});

// Get the Gemini model
const model = googleAI.model('gemini-1.5-flash');

// Schema definitions
const WeekDaySchema = z.enum(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const HabitCategorySchema = z.enum([
  'Health & Fitness', 'Work & Study', 'Personal Development', 'Mindfulness',
  'Social', 'Creative', 'Finance', 'Home & Environment', 'Entertainment', 'Other'
]);

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
    const prompt = `Based on the user's goal: "${description}", generate a structured habit.
    
    Respond with a JSON object containing:
    - habitName: a clear, actionable habit name
    - category: one of [${HabitCategorySchema.options.join(', ')}]
    - daysOfWeek: array of days like ['Mon', 'Wed', 'Fri']
    - optimalTiming: 'morning', 'afternoon', 'evening', or 'anytime'
    - durationHours: number of hours (optional)
    - durationMinutes: number of minutes (optional)
    - specificTime: specific time like '07:00' (optional)
    
    Respond ONLY with valid JSON.`;

    const { text } = await ai.generate({
      model,
      prompt,
    });

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse habit response:', error);
      throw new Error('Failed to generate habit');
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
    const prompt = `Give a short, encouraging, and actionable tip for the habit "${habitName}". 
    The user's recent tracking data is: ${trackingData}. 
    The habit is scheduled on: ${daysOfWeek.join(', ')}.
    
    Provide a 1-2 sentence motivational tip.`;

    const { text } = await ai.generate({
      model,
      prompt,
    });

    return { suggestion: text };
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

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse program response:', error);
      throw new Error('Failed to generate habit program');
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
    const prompt = `Generate a short, insightful reflection prompt for someone tracking the habit: "${habitName}".
    
    Create a thought-provoking question that helps them reflect on their progress and feelings.`;

    const { text } = await ai.generate({
      model,
      prompt,
    });

    return { reflectionPrompt: text };
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
    const prompt = `List 5 common, beginner-friendly habits for the category "${category}".
    
    For each, provide:
    - name: a simple habit name
    - category: must be "${category}" or from this list if "${category}" is not valid: [${HabitCategorySchema.options.join(', ')}]
    
    Respond with a JSON object containing a "suggestions" array. Respond ONLY with valid JSON.`;

    const { text } = await ai.generate({
      model,
      prompt,
    });

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse suggestions response:', error);
      throw new Error('Failed to generate habit suggestions');
    }
  }
);