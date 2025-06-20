import {
  generateHabitOutputSchema,
  generateHabitProgramFromGoalOutputSchema,
  getHabitSuggestionInputSchema,
  getHabitSuggestionOutputSchema,
  getReflectionStarterInputSchema,
  getReflectionStarterOutputSchema,
  getCommonHabitSuggestionsInputSchema,
  getCommonHabitSuggestionsOutputSchema,
} from '../genkit/flows';
import { z } from 'genkit';
import { toast } from '../hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { ENV_CONFIG } from './env-check';

// Define types from imported schemas
type GenerateHabitOutput = z.infer<typeof generateHabitOutputSchema>;
type GenerateProgramOutput = z.infer<typeof generateHabitProgramFromGoalOutputSchema>;
type GetHabitSuggestionInput = z.infer<typeof getHabitSuggestionInputSchema>;
type GetHabitSuggestionOutput = z.infer<typeof getHabitSuggestionOutputSchema>;
type GetReflectionStarterInput = z.infer<typeof getReflectionStarterInputSchema>;
type GetReflectionStarterOutput = z.infer<typeof getReflectionStarterOutputSchema>;
type GetCommonHabitsInput = z.infer<typeof getCommonHabitSuggestionsInputSchema>;
type GetCommonHabitsOutput = z.infer<typeof getCommonHabitSuggestionsOutputSchema>;

// Use Capacitor's recommended detection for native app
const IS_NATIVE_APP = Capacitor.isNativePlatform && Capacitor.isNativePlatform();

// IMPORTANT: Replace with your actual Vercel/production backend URL below
const PRODUCTION_URL = 'https://habitual-eight.vercel.app'; // <-- Update this if your backend changes

const API_BASE_PATH = IS_NATIVE_APP ? `${PRODUCTION_URL}/api` : '/api';

function handleAIError(error: any, flowName: string): never {
  console.error(`[GenkitService] Error in flow '${flowName}':`, error);
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred.';

  toast({
    title: `AI Error in ${flowName}`,
    description: errorMessage,
    variant: 'destructive',
  });

  throw new Error(errorMessage);
}

// Direct Google AI API call for mobile
async function callGoogleAIDirectly(prompt: string): Promise<any> {
  if (!ENV_CONFIG.GOOGLE_AI_KEY) {
    console.warn('Google AI API key not configured, using fallback response');
    return 'AI service is not configured. Please set up your Google AI API key.';
  }

  try {
    // Updated to use the correct Gemini API endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${ENV_CONFIG.GOOGLE_AI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI API Error Response:', errorText);
      throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error('Unexpected API response structure:', result);
      throw new Error('Invalid response from Google AI API');
    }
    
    return result.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Direct AI API Error:', error);
    throw error;
  }
}

async function runFlow<T, U>(flowName: string, input: T): Promise<U> {
  // For mobile apps, use direct Google AI API calls
  if (IS_NATIVE_APP) {
    return runFlowDirect(flowName, input);
  }

  // For web apps, use the API routes
  try {
    const response = await fetch(`${API_BASE_PATH}/${flowName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: input }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[${flowName}] API Error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.result;
  } catch (error) {
    // If API fails, try direct approach
    console.warn(`API route failed for ${flowName}, trying direct approach:`, error);
    return runFlowDirect(flowName, input);
  }
}

// Direct AI implementation for mobile
async function runFlowDirect<T, U>(flowName: string, input: T): Promise<U> {
  try {
    let prompt = '';
    
    switch (flowName) {
      case 'generateHabit':
        const { description } = input as { description: string };
        prompt = `Based on this habit description: "${description}"

Please generate a habit with the following JSON structure:
{
  "habitName": "Clear, actionable habit name",
  "category": "Health & Fitness" | "Work & Study" | "Creative" | "Home & Environment" | "Finance" | "Social" | "Personal Development" | "Entertainment" | "Mindfulness" | "Other",
  "daysOfWeek": ["Mon", "Wed", "Fri"] (array of abbreviated days),
  "optimalTiming": "Morning/Afternoon/Evening",
  "durationHours": 0,
  "durationMinutes": 15,
  "specificTime": "07:00" (optional, HH:MM format)
}

Make it practical and achievable. Return only the JSON object.`;
        break;
        
      case 'generateHabitProgramFromGoal':
        const { goal, focusDuration } = input as { goal: string; focusDuration: string };
        prompt = `Create a habit program for this goal: "${goal}" with focus duration: "${focusDuration}"

Please generate a program with this JSON structure:
{
  "programName": "Goal-focused program name",
  "suggestedHabits": [
    {
      "name": "Habit name",
      "description": "Brief description",
      "category": "Health & Fitness" | "Work & Study" | "Creative" | "Home & Environment" | "Finance" | "Social" | "Personal Development" | "Entertainment" | "Mindfulness" | "Other",
      "daysOfWeek": ["Mon", "Wed", "Fri"],
      "optimalTiming": "Morning/Afternoon/Evening",
      "durationHours": 0,
      "durationMinutes": 30,
      "specificTime": "07:00"
    }
  ]
}

Create 3-5 habits that build toward the goal. Return only the JSON object.`;
        break;
        
      case 'getHabitSuggestion':
        const suggestionInput = input as GetHabitSuggestionInput;
        prompt = `You are a helpful habit coach. Give one specific, actionable, and motivating tip for the habit "${suggestionInput.habitName}".

Context:
- Progress: ${suggestionInput.trackingData}
- Schedule: ${suggestionInput.daysOfWeek.join(', ')}

Your tip should be:
1. Specific and actionable (something they can do today)
2. Encouraging and positive
3. Based on behavioral science or proven habit-building techniques
4. Concise (2-3 sentences max)

Return JSON: {"suggestion": "your tip here"}`;
        break;
        
      case 'getReflectionStarter':
        prompt = `Generate a thoughtful reflection question for habit tracking.
        
Return JSON: {"question": "your reflection question", "category": "motivation"}`;
        break;
        
      case 'getCommonHabitSuggestions':
        prompt = `Generate 5 common habit suggestions for beginners.
        
Return JSON: {
  "suggestions": [
    {
      "title": "Habit name",
      "description": "What it involves",
      "frequency": "daily",
      "difficulty": "easy",
      "category": "Health & Fitness",
      "estimatedTime": "15 minutes"
    }
  ]
}`;
        break;
        
      default:
        throw new Error(`Unknown flow: ${flowName}`);
    }

    const aiResponse = await callGoogleAIDirectly(prompt);
    
    // Try to parse JSON from the AI response
    try {
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);
      return parsed;
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON:', aiResponse);
      // Return a fallback response based on the flow
      return getFallbackResponse(flowName, input) as U;
    }
  } catch (error) {
    console.warn(`Direct AI call failed for ${flowName}, using fallback:`, error);
    return getFallbackResponse(flowName, input) as U;
  }
}

function getFallbackResponse(flowName: string, input: any): any {
  switch (flowName) {
    case 'generateHabit':
      return {
        habitName: "Daily Reading",
        category: "Personal Development",
        daysOfWeek: ["Mon", "Wed", "Fri"],
        optimalTiming: "Evening",
        durationHours: 0,
        durationMinutes: 15,
        specificTime: "19:00"
      };
    case 'generateHabitProgramFromGoal':
      return {
        programName: "Personal Development Program",
        suggestedHabits: [
          {
            name: "Morning Reflection",
            description: "Start each day with 5 minutes of reflection",
            category: "Mindfulness",
            daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            optimalTiming: "Morning",
            durationHours: 0,
            durationMinutes: 5,
            specificTime: "07:00"
          },
          {
            name: "Evening Learning",
            description: "Dedicate time to learning something new",
            category: "Personal Development",
            daysOfWeek: ["Mon", "Wed", "Fri"],
            optimalTiming: "Evening",
            durationHours: 0,
            durationMinutes: 30,
            specificTime: "19:00"
          }
        ]
      };
    case 'getHabitSuggestion':
      return {
        suggestion: "Try setting up your environment the night before to make it easier to start your habit. Small preparation can make a big difference in consistency!"
      };
    case 'getReflectionStarter':
      return {
        question: "What's one small improvement you could make to your habit routine tomorrow?",
        category: "motivation"
      };
    case 'getCommonHabitSuggestions':
      return {
        suggestions: [
          {
            title: "Daily Water Intake",
            description: "Drink 8 glasses of water throughout the day",
            frequency: "daily",
            difficulty: "easy",
            category: "Health & Fitness",
            estimatedTime: "5 minutes"
          }
        ]
      };
    default:
      return { message: "AI service temporarily unavailable" };
  }
}

export const genkitService = {
  async generateHabit(description: string): Promise<GenerateHabitOutput> {
    return runFlow('generateHabit', { description });
  },

  async generateHabitProgramFromGoal(
    goal: string,
    focusDuration: string
  ): Promise<GenerateProgramOutput> {
    return runFlow('generateHabitProgramFromGoal', { goal, focusDuration });
  },

  async getHabitSuggestion(
    input: GetHabitSuggestionInput
  ): Promise<GetHabitSuggestionOutput> {
    return runFlow('getHabitSuggestion', input);
  },

  async getReflectionStarter(
    input: GetReflectionStarterInput
  ): Promise<GetReflectionStarterOutput> {
    return runFlow('getReflectionStarter', input);
  },

  async getCommonHabitSuggestions(
    input: GetCommonHabitsInput
  ): Promise<GetCommonHabitsOutput> {
    return runFlow('getCommonHabitSuggestions', input);
  },
};