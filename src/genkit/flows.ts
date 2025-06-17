// src/genkit/flows.ts - IMPROVED VERSION WITH BETTER PROMPTS

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
      const prompt = `You are a habit formation expert. Analyze the user's input carefully and create a SPECIFIC habit based on what they actually wrote.

User's exact input: "${description}"

IMPORTANT: Base your response DIRECTLY on what the user typed. For example:
- If they say "learn guitar" → "Practice Guitar"
- If they say "practice guitar on weekends" → Include weekend days only
- If they say "master python" → "Practice Python Programming"
- If they say "sql practice" → "Practice SQL Exercises"

Category mapping (choose the MOST appropriate):
- guitar, music, piano, singing, art, drawing → "Creative"
- python, sql, coding, programming, study → "Work & Study"
- exercise, run, gym, yoga, workout → "Health & Fitness"
- meditate, journal, mindfulness → "Mindfulness"
- read, learn (non-coding) → "Personal Development"

Frequency rules:
- "daily" or no frequency mentioned → ["Mon", "Tue", "Wed", "Thu", "Fri"]
- "every day" → ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
- "weekends" → ["Sat", "Sun"]
- "3 times a week" → ["Mon", "Wed", "Fri"]
- "5 days" → ["Mon", "Tue", "Wed", "Thu", "Fri"]

Duration suggestions:
- Guitar/Music practice → 30 minutes
- Coding/Programming → 45-60 minutes
- Exercise → 30-45 minutes
- Reading → 30 minutes
- Meditation → 15-20 minutes

Timing suggestions:
- Exercise/Workout → "morning"
- Creative activities → "evening"
- Study/Work → "morning" or "afternoon"
- Meditation → "morning" or "evening"

Respond with ONLY valid JSON. Example:
{
  "habitName": "Practice Guitar",
  "category": "Creative",
  "daysOfWeek": ["Mon", "Wed", "Fri"],
  "optimalTiming": "evening",
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
        habitName: parsed.habitName || createSmartHabitName(description),
        category: (HabitCategorySchema.options.includes(parsed.category) ? 
          parsed.category : categorizeDescription(description)) as HabitCategory,
        daysOfWeek: Array.isArray(parsed.daysOfWeek) && parsed.daysOfWeek.length > 0
          ? parsed.daysOfWeek.filter((day: any) => WeekDaySchema.options.includes(day)) as WeekDay[]
          : getDefaultDays(description),
        optimalTiming: parsed.optimalTiming || 'anytime',
        durationHours: typeof parsed.durationHours === 'number' ? parsed.durationHours : undefined,
        durationMinutes: typeof parsed.durationMinutes === 'number' ? parsed.durationMinutes : 30,
        specificTime: parsed.specificTime || undefined,
      };

      console.log('✅ GenerateHabit result:', result);
      return result;
    } catch (error) {
      console.error('❌ GenerateHabit error:', error);
      // Return a smart fallback based on the input
      const fallback = createIntelligentFallback(description);
      console.log('🔄 Using intelligent fallback:', fallback);
      return fallback;
    }
  }
);

// Helper function to create smart habit names
function createSmartHabitName(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('guitar')) return 'Practice Guitar';
  if (desc.includes('python')) return 'Practice Python Programming';
  if (desc.includes('sql')) return 'Practice SQL Exercises';
  if (desc.includes('piano')) return 'Practice Piano';
  if (desc.includes('exercise') || desc.includes('workout')) return 'Daily Workout';
  if (desc.includes('run')) return 'Running Session';
  if (desc.includes('meditate')) return 'Meditation Practice';
  if (desc.includes('read')) return 'Reading Session';
  if (desc.includes('journal')) return 'Daily Journaling';
  
  // Extract the main verb and noun if possible
  const words = desc.split(' ');
  if (words.includes('practice') || words.includes('learn')) {
    const subject = words[words.indexOf('practice') + 1] || words[words.indexOf('learn') + 1];
    if (subject) return `Practice ${subject.charAt(0).toUpperCase() + subject.slice(1)}`;
  }
  
  return 'Daily Practice';
}

// Helper function to categorize based on description
function categorizeDescription(description: string): HabitCategory {
  const desc = description.toLowerCase();
  
  if (desc.match(/guitar|music|piano|sing|art|draw|paint|creative/)) return 'Creative';
  if (desc.match(/python|sql|code|program|study|learn|work/)) return 'Work & Study';
  if (desc.match(/exercise|run|gym|yoga|workout|fitness/)) return 'Health & Fitness';
  if (desc.match(/meditate|mindful|journal|relax/)) return 'Mindfulness';
  if (desc.match(/read|book|improve/)) return 'Personal Development';
  if (desc.match(/friend|social|family/)) return 'Social';
  if (desc.match(/money|finance|budget|save/)) return 'Finance';
  if (desc.match(/clean|organize|home/)) return 'Home & Environment';
  
  return 'Other';
}

// Helper function to get default days based on description
function getDefaultDays(description: string): WeekDay[] {
  const desc = description.toLowerCase();
  
  if (desc.includes('daily') || desc.includes('every day')) {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }
  if (desc.includes('weekends')) {
    return ['Sat', 'Sun'];
  }
  if (desc.includes('weekdays')) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  }
  if (desc.match(/3\s*(times|days)/)) {
    return ['Mon', 'Wed', 'Fri'];
  }
  if (desc.match(/5\s*(times|days)/)) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  }
  
  // Default to 3 times a week
  return ['Mon', 'Wed', 'Fri'];
}

// IMPROVED: Enhanced generateHabitProgramFromGoal with better prompts
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
        daysOfWeek: z.array(WeekDaySchema)
      }))
    }),
  },
  async ({ goal, focusDuration }) => {
    console.log('🤖 GenerateHabitProgramFromGoal called with:', { goal, focusDuration });
    
    try {
      const prompt = `You are a habit formation expert creating a comprehensive program.

User's exact goal: "${goal}"
Time frame: ${focusDuration}

Create a program with 2-4 specific habits that directly address the user's goal.

IMPORTANT: Base everything on the user's EXACT input:
- If they say "master python" → Create Python-specific habits
- If they say "learn guitar" → Create guitar-specific habits
- If they say "get fit" → Create fitness-specific habits

Example for "master python" over "6 months":
{
  "programName": "Python Mastery Program",
  "suggestedHabits": [
    {
      "name": "Daily Python Coding Practice",
      "description": "Write Python code for at least 1 hour focusing on core concepts",
      "category": "Work & Study",
      "daysOfWeek": ["Mon", "Tue", "Wed", "Thu", "Fri"]
    },
    {
      "name": "Python Problem Solving",
      "description": "Solve 2-3 LeetCode or HackerRank problems in Python",
      "category": "Work & Study",
      "daysOfWeek": ["Mon", "Wed", "Fri"]
    },
    {
      "name": "Build Python Projects",
      "description": "Work on a personal Python project to apply your skills",
      "category": "Work & Study",
      "daysOfWeek": ["Sat", "Sun"]
    }
  ]
}

Categories: ${HabitCategorySchema.options.map(cat => `"${cat}"`).join(', ')}
Valid days: ${WeekDaySchema.options.map(day => `"${day}"`).join(', ')}

Respond with ONLY valid JSON that directly addresses "${goal}".`;

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
        category: (HabitCategorySchema.options.includes(habit.category) ? 
          habit.category : categorizeDescription(habit.name)) as HabitCategory,
        daysOfWeek: Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.length > 0
          ? habit.daysOfWeek.filter((day: any) => WeekDaySchema.options.includes(day as WeekDay)) as WeekDay[]
          : ['Mon', 'Wed', 'Fri'] as WeekDay[]
      }));

      const result = {
        programName: parsed.programName || createSmartProgramName(goal),
        suggestedHabits: validatedHabits.slice(0, 4) // Limit to 4 habits
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

// Helper function to create smart program names
function createSmartProgramName(goal: string): string {
  const g = goal.toLowerCase();
  
  if (g.includes('python')) return 'Python Mastery Program';
  if (g.includes('guitar')) return 'Guitar Learning Journey';
  if (g.includes('fitness') || g.includes('fit')) return 'Fitness Transformation Program';
  if (g.includes('language')) return 'Language Learning Program';
  if (g.includes('health')) return 'Health Improvement Program';
  
  // Capitalize first letter of each word
  return goal.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ') + ' Program';
}

// Keep other flows as they were...
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
      const prompt = `You are a supportive habit coach. Give a specific, actionable tip for someone working on: "${habitName}".

Their progress: ${trackingData}
Schedule: ${daysOfWeek.join(', ')}

Provide ONE specific tip that's directly related to "${habitName}". Make it encouraging and actionable.

Examples:
- For "Practice Guitar": "This week, try learning the G major scale. Practice it slowly for 5 minutes at the start of each session."
- For "Practice Python Programming": "Focus on list comprehensions this week - they're a powerful Python feature that will make your code more elegant."
- For "Daily Workout": "Add 30 seconds of plank holds at the end of each workout to build core strength."`;

      const { text } = await ai.generate({
        model,
        prompt,
      });

      console.log('✅ GetHabitSuggestion result:', text);
      return { suggestion: text };
    } catch (error) {
      console.error('❌ GetHabitSuggestion error:', error);
      return { 
        suggestion: `Keep up the great work with ${habitName}! Consistency is key to building lasting habits.`
      };
    }
  }
);

// Rest of the helper functions...
function createIntelligentFallback(description: string): {
  habitName: string;
  category: HabitCategory;
  daysOfWeek: WeekDay[];
  optimalTiming: string;
  durationMinutes: number;
} {
  return {
    habitName: createSmartHabitName(description),
    category: categorizeDescription(description),
    daysOfWeek: getDefaultDays(description),
    optimalTiming: 'anytime',
    durationMinutes: 30
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
  const category = categorizeDescription(goal);
  const programName = createSmartProgramName(goal);
  
  return {
    programName,
    suggestedHabits: [
      {
        name: `Daily ${goal} Practice`,
        description: `Dedicate time each day to work on ${goal}`,
        category,
        daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      },
      {
        name: `${goal} Deep Work`,
        description: `Extended focused sessions for ${goal}`,
        category,
        daysOfWeek: ['Sat', 'Sun']
      }
    ]
  };
}

// Keep the rest of the flows unchanged...
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
      - category: must be "${category}"
      
      Respond with a JSON object containing a "suggestions" array.`;

      const { text } = await ai.generate({
        model,
        prompt,
      });

      const parsed = JSON.parse(text);
      
      // Validate suggestions
      const validatedSuggestions = (parsed.suggestions || []).map((suggestion: any) => ({
        name: suggestion.name || 'Practice Daily',
        category: (HabitCategorySchema.options.includes(suggestion.category) ? 
          suggestion.category : category) as HabitCategory
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