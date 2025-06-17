// src/genkit/flows.ts - COMPLETELY UPDATED VERSION

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

// IMPROVED: Enhanced generateHabit flow with much better prompts
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
    console.log('🤖 GenerateHabit called with:', description);
    
    try {
      // Validate input
      if (!description || description.trim() === '') {
        throw new Error('Description is required');
      }

      // IMPROVED: Much more specific and detailed prompt
      const prompt = `You are a habit formation expert. Based on the user's goal: "${description}", create a specific, actionable habit.

EXAMPLES:
- Input: "learn guitar" → Output: {"habitName": "Practice Guitar", "category": "Creative", "daysOfWeek": ["Mon", "Wed", "Fri"], "optimalTiming": "evening", "durationMinutes": 30}
- Input: "sql questions 5 days a week" → Output: {"habitName": "Practice SQL Problems", "category": "Work & Study", "daysOfWeek": ["Mon", "Tue", "Wed", "Thu", "Fri"], "optimalTiming": "morning", "durationMinutes": 45}
- Input: "exercise daily" → Output: {"habitName": "Daily Workout", "category": "Health & Fitness", "daysOfWeek": ["Mon", "Tue", "Wed", "Thu", "Fri"], "optimalTiming": "morning", "durationMinutes": 30}

RULES:
1. Make habitName specific and actionable (e.g., "Practice Guitar" not "Daily Habit")
2. Choose the most appropriate category from: ${HabitCategorySchema.options.map(cat => `"${cat}"`).join(', ')}
3. Set realistic frequency based on the goal (daily, every other day, weekdays only, etc.)
4. Suggest appropriate duration (15-60 minutes for most activities)
5. Pick optimal timing: "morning", "afternoon", "evening", or "anytime"

For "${description}":
- If it mentions "guitar", "music", "art", "drawing" → category: "Creative"
- If it mentions "sql", "coding", "study", "learn", "practice" (academic) → category: "Work & Study"  
- If it mentions "exercise", "run", "gym", "fitness" → category: "Health & Fitness"
- If it mentions "meditate", "mindfulness", "journal" → category: "Mindfulness"
- If it mentions "read", "book" → category: "Personal Development"

Respond with ONLY valid JSON matching this exact format:
{
  "habitName": "Specific Action Name",
  "category": "Appropriate Category",
  "daysOfWeek": ["Mon", "Wed", "Fri"],
  "optimalTiming": "morning",
  "durationMinutes": 30
}`;

      console.log('🤖 Sending prompt to AI...');
      const { text } = await ai.generate({
        model,
        prompt,
      });

      console.log('🤖 AI Response:', text);

      // Parse and validate the response
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', text);
        throw new Error('AI returned invalid JSON');
      }
      
      // Validate and ensure the response has required fields
      const result = {
        habitName: parsed.habitName || `Practice ${description}`,
        category: (HabitCategorySchema.options.includes(parsed.category) ? parsed.category : 'Other') as HabitCategory,
        daysOfWeek: Array.isArray(parsed.daysOfWeek) 
          ? parsed.daysOfWeek.filter((day: any) => WeekDaySchema.options.includes(day)) as WeekDay[]
          : ['Mon', 'Wed', 'Fri'] as WeekDay[],
        optimalTiming: parsed.optimalTiming || 'anytime',
        durationHours: typeof parsed.durationHours === 'number' ? parsed.durationHours : undefined,
        durationMinutes: typeof parsed.durationMinutes === 'number' ? parsed.durationMinutes : undefined,
        specificTime: parsed.specificTime || undefined,
      };

      console.log('✅ GenerateHabit result:', result);
      return result;
    } catch (error) {
      console.error('❌ GenerateHabit error:', error);
      // Return a fallback based on the input description instead of generic
      const fallback = createIntelligentFallback(description);
      console.log('🔄 Using intelligent fallback:', fallback);
      return fallback;
    }
  }
);

// IMPROVED: Enhanced getHabitSuggestion flow
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
    console.log('🤖 GetHabitSuggestion called for:', habitName);
    
    try {
      const prompt = `You are a motivational habit coach. Give a specific, encouraging tip for the habit "${habitName}".

Current progress: ${trackingData}
Scheduled days: ${daysOfWeek.join(', ')}

EXAMPLES:
- For "Practice Guitar": "Try learning one new chord this week, then practice switching between it and chords you already know."
- For "Practice SQL": "Focus on mastering JOIN statements this week - they're the foundation of complex queries."
- For "Daily Workout": "Start each session with 5 minutes of light stretching to prevent injury and improve performance."

Give ONE specific, actionable tip (1-2 sentences) that helps them improve or stay motivated with "${habitName}".`;

      const { text } = await ai.generate({
        model,
        prompt,
      });

      console.log('✅ GetHabitSuggestion result:', text);
      return { suggestion: text };
    } catch (error) {
      console.error('❌ GetHabitSuggestion error:', error);
      return { 
        suggestion: `Keep building momentum with ${habitName}! Consistency beats perfection - even small steps count.` 
      };
    }
  }
);

// IMPROVED: Enhanced generateHabitProgramFromGoal flow
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
    console.log('🤖 GenerateHabitProgramFromGoal called:', { goal, focusDuration });
    
    try {
      // Validate input
      if (!goal || goal.trim() === '') {
        throw new Error('Goal is required');
      }
      if (!focusDuration || focusDuration.trim() === '') {
        throw new Error('Focus duration is required');
      }

      const prompt = `Create a comprehensive habit program for the goal: "${goal}" over "${focusDuration}".

Generate 3-4 specific habits that build toward this goal. Each habit should be:
- Specific and actionable
- Appropriate for the timeframe
- Complementary to each other

EXAMPLE for "Learn Python Programming" / "3 months":
{
  "programName": "Python Mastery Program",
  "suggestedHabits": [
    {
      "name": "Daily Python Practice",
      "description": "Code for 30 minutes focusing on fundamentals",
      "category": "Work & Study",
      "daysOfWeek": ["Mon", "Tue", "Wed", "Thu", "Fri"]
    },
    {
      "name": "Algorithm Problem Solving",
      "description": "Solve 2-3 coding problems on platforms like LeetCode",
      "category": "Work & Study", 
      "daysOfWeek": ["Mon", "Wed", "Fri"]
    },
    {
      "name": "Build Personal Project",
      "description": "Work on a real Python project to apply skills",
      "category": "Work & Study",
      "daysOfWeek": ["Sat", "Sun"]
    }
  ]
}

Categories available: ${HabitCategorySchema.options.map(cat => `"${cat}"`).join(', ')}
Days format: ${WeekDaySchema.options.map(day => `"${day}"`).join(', ')}

For goal "${goal}" over "${focusDuration}", respond with ONLY valid JSON:`;

      console.log('🤖 Sending program prompt to AI...');
      const { text } = await ai.generate({
        model,
        prompt,
      });

      console.log('🤖 AI Program Response:', text);

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ Failed to parse program response as JSON:', text);
        throw new Error('AI returned invalid JSON for program');
      }
      
      // Validate and sanitize the response
      const validatedHabits = (parsed.suggestedHabits || []).map((habit: any) => ({
        name: habit.name || 'New Habit',
        description: habit.description || 'Practice this habit regularly',
        category: (HabitCategorySchema.options.includes(habit.category) ? habit.category : 'Other') as HabitCategory,
        daysOfWeek: Array.isArray(habit.daysOfWeek) 
          ? habit.daysOfWeek.filter((day: any) => WeekDaySchema.options.includes(day as WeekDay)) as WeekDay[]
          : ['Mon', 'Wed', 'Fri'] as WeekDay[]
      }));

      const result = {
        programName: parsed.programName || `${goal} Program`,
        suggestedHabits: validatedHabits.slice(0, 5) // Limit to 5 habits
      };

      console.log('✅ GenerateHabitProgramFromGoal result:', result);
      return result;
    } catch (error) {
      console.error('❌ GenerateHabitProgramFromGoal error:', error);
      // Return an intelligent fallback based on the goal
      const fallback = createProgramFallback(goal, focusDuration);
      console.log('🔄 Using program fallback:', fallback);
      return fallback;
    }
  }
);

// Keep the other flows as they were
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
      const prompt = `Generate a thoughtful reflection question for someone tracking the habit: "${habitName}".
      
      Create a question that helps them reflect on their progress and feelings.`;

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

// HELPER FUNCTIONS for intelligent fallbacks

function createIntelligentFallback(description: string): {
  habitName: string;
  category: HabitCategory;
  daysOfWeek: WeekDay[];
  optimalTiming: string;
  durationHours?: number;
  durationMinutes?: number;
  specificTime?: string;
} {
  const desc = description.toLowerCase();
  
  // Analyze the description to create intelligent defaults
  let habitName = 'Practice Daily Habit';
  let category: HabitCategory = 'Other';
  let daysOfWeek: WeekDay[] = ['Mon', 'Wed', 'Fri'];
  let optimalTiming = 'anytime';
  let durationMinutes = 30;

  // Guitar/Music related
  if (desc.includes('guitar') || desc.includes('music') || desc.includes('piano')) {
    habitName = desc.includes('guitar') ? 'Practice Guitar' : 'Practice Music';
    category = 'Creative';
    optimalTiming = 'evening';
    durationMinutes = 30;
  }
  // SQL/Coding related  
  else if (desc.includes('sql') || desc.includes('code') || desc.includes('programming')) {
    habitName = desc.includes('sql') ? 'Practice SQL Problems' : 'Practice Coding';
    category = 'Work & Study';
    optimalTiming = 'morning';
    durationMinutes = 45;
    if (desc.includes('5 days') || desc.includes('weekday')) {
      daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    }
  }
  // Exercise related
  else if (desc.includes('exercise') || desc.includes('workout') || desc.includes('gym') || desc.includes('run')) {
    habitName = 'Daily Exercise';
    category = 'Health & Fitness';
    optimalTiming = 'morning';
    durationMinutes = 30;
    daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  }
  // Reading related
  else if (desc.includes('read') || desc.includes('book')) {
    habitName = 'Daily Reading';
    category = 'Personal Development';
    optimalTiming = 'evening';
    durationMinutes = 20;
    daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }
  // Study/Learn related
  else if (desc.includes('study') || desc.includes('learn')) {
    habitName = `Study ${description}`;
    category = 'Work & Study';
    optimalTiming = 'morning';
    durationMinutes = 45;
  }

  return {
    habitName,
    category,
    daysOfWeek,
    optimalTiming,
    durationMinutes
  };
}

function createProgramFallback(goal: string, focusDuration: string): {
  programName: string;
  suggestedHabits: Array<{
    name: string;
    description: string;
    category: HabitCategory;
    daysOfWeek: WeekDay[];
  }>;
} {
  const goalLower = goal.toLowerCase();
  
  if (goalLower.includes('guitar') || goalLower.includes('music')) {
    return {
      programName: 'Guitar Mastery Program',
      suggestedHabits: [
        {
          name: 'Practice Guitar Chords',
          description: 'Focus on basic chord progressions and transitions',
          category: 'Creative',
          daysOfWeek: ['Mon', 'Wed', 'Fri']
        },
        {
          name: 'Learn New Songs',
          description: 'Practice playing complete songs to build repertoire',
          category: 'Creative',
          daysOfWeek: ['Tue', 'Thu']
        }
      ]
    };
  }
  
  if (goalLower.includes('fitness') || goalLower.includes('exercise')) {
    return {
      programName: 'Fitness Journey Program',
      suggestedHabits: [
        {
          name: 'Cardio Workout',
          description: 'Running, cycling, or other cardiovascular exercise',
          category: 'Health & Fitness',
          daysOfWeek: ['Mon', 'Wed', 'Fri']
        },
        {
          name: 'Strength Training',
          description: 'Weight lifting or bodyweight exercises',
          category: 'Health & Fitness',
          daysOfWeek: ['Tue', 'Thu']
        }
      ]
    };
  }

  // Default fallback
  return {
    programName: `${goal} Development Program`,
    suggestedHabits: [
      {
        name: `Practice ${goal}`,
        description: `Daily practice session focused on ${goal}`,
        category: 'Personal Development',
        daysOfWeek: ['Mon', 'Wed', 'Fri']
      }
    ]
  };
}