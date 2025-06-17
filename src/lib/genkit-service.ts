// src/lib/genkit-service.ts - FIXED VERSION WITH PROPER URL HANDLING

import { runFlow } from '@genkit-ai/next/client';
import type {
  generateHabit,
  getHabitSuggestion,
  generateHabitProgramFromGoal,
  getReflectionStarter,
  getCommonHabitSuggestions
} from '@/genkit/flows';

// Helper function to get the base URL
function getBaseUrl(): string {
  // In the browser
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // On the server
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Fallback for local development
  return `http://localhost:${process.env.PORT || 3000}`;
}

// Helper function to construct full URL
function getApiUrl(endpoint: string): string {
  const baseUrl = getBaseUrl();
  // Ensure endpoint starts with /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
}

export interface GenerateHabitInput {
  description: string;
}

export interface GenerateHabitOutput {
  habitName: string;
  category: string;
  daysOfWeek: string[];
  optimalTiming?: string;
  durationHours?: number;
  durationMinutes?: number;
  specificTime?: string;
}

export interface GetHabitSuggestionInput {
  habitName: string;
  trackingData: string;
  daysOfWeek: string[];
}

export interface GetHabitSuggestionOutput {
  suggestion: string;
}

export interface GenerateHabitProgramInput {
  goal: string;
  focusDuration: string;
}

export interface GenerateHabitProgramOutput {
  programName: string;
  suggestedHabits: Array<{
    name: string;
    description: string;
    category: string;
    daysOfWeek: string[];
  }>;
}

export interface GetReflectionStarterInput {
  habitName: string;
}

export interface GetReflectionStarterOutput {
  reflectionPrompt: string;
}

export interface GetCommonHabitSuggestionsInput {
  category: string;
}

export interface GetCommonHabitSuggestionsOutput {
  suggestions: Array<{
    name: string;
    category: string;
  }>;
}

// Enhanced error handling helper
function handleAIError(error: unknown, operation: string): never {
  console.error(`❌ [Service] ${operation} error:`, error);
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = typeof error === 'string' ? error : errorMessage;
  
  // Check for URL parsing errors
  if (errorString.includes('Failed to parse URL')) {
    throw new Error(`URL configuration error. Please check your deployment settings. ${errorMessage}`);
  }
  
  // Check for specific AI/API errors
  if (errorString.includes('quota') || errorString.includes('429')) {
    throw new Error(`AI quota exceeded. Please check your Google AI Studio quota limits. Original error: ${errorMessage}`);
  }
  
  if (errorString.includes('billing') || errorString.includes('payment')) {
    throw new Error(`AI billing required. Please enable billing in Google Cloud Console. Original error: ${errorMessage}`);
  }
  
  if (errorString.includes('401') || errorString.includes('unauthorized')) {
    throw new Error(`AI authentication failed. Please check your GOOGLE_API_KEY. Original error: ${errorMessage}`);
  }
  
  if (errorString.includes('403') || errorString.includes('forbidden')) {
    throw new Error(`AI access forbidden. Please check your API key permissions. Original error: ${errorMessage}`);
  }
  
  if (errorString.includes('404') || errorString.includes('not found')) {
    throw new Error(`AI model not found. Please check if Gemini is available in your region. Original error: ${errorMessage}`);
  }
  
  if (errorString.includes('500') || errorString.includes('internal error')) {
    throw new Error(`AI service error. Please try again later. Original error: ${errorMessage}`);
  }
  
  // Generic error
  throw new Error(`AI service failed: ${errorMessage}`);
}

// Environment validation helper
function validateEnvironment(): void {
  if (typeof window !== 'undefined') {
    // Client-side - environment variables are not available
    return;
  }
  
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY environment variable is required but not found');
  }
  
  console.log('✅ [Service] Environment validation passed');
}

export const genkitService = {
  generateHabit: async (input: GenerateHabitInput): Promise<GenerateHabitOutput> => {
    try {
      console.log('🤖 [Service] generateHabit called with:', input);
      
      // Validate environment (server-side only)
      validateEnvironment();
      
      // Validate input
      if (!input.description || input.description.trim() === '') {
        throw new Error('Description is required for habit generation');
      }
      
      const result = await runFlow<typeof generateHabit>({
        url: getApiUrl('/api/generateHabit'),
        input,
      });
      
      console.log('✅ [Service] generateHabit result:', result);
      
      // Validate result
      if (!result || !result.habitName) {
        throw new Error('Invalid response from AI service - missing habit name');
      }
      
      return result;
    } catch (error) {
      handleAIError(error, 'generateHabit');
    }
  },

  getHabitSuggestion: async (input: GetHabitSuggestionInput): Promise<GetHabitSuggestionOutput> => {
    try {
      console.log('🤖 [Service] getHabitSuggestion called with:', input);
      
      // Validate environment (server-side only)
      validateEnvironment();
      
      // Validate input
      if (!input.habitName || input.habitName.trim() === '') {
        throw new Error('Habit name is required for suggestion generation');
      }
      
      const result = await runFlow<typeof getHabitSuggestion>({
        url: getApiUrl('/api/getHabitSuggestion'),
        input,
      });
      
      console.log('✅ [Service] getHabitSuggestion result:', result);
      
      // Validate result
      if (!result || !result.suggestion) {
        throw new Error('Invalid response from AI service - missing suggestion');
      }
      
      return result;
    } catch (error) {
      handleAIError(error, 'getHabitSuggestion');
    }
  },

  generateHabitProgramFromGoal: async (input: GenerateHabitProgramInput): Promise<GenerateHabitProgramOutput> => {
    try {
      console.log('🤖 [Service] generateHabitProgramFromGoal called with:', input);
      
      // Validate environment (server-side only)
      validateEnvironment();
      
      // Validate input
      if (!input.goal || input.goal.trim() === '') {
        throw new Error('Goal is required for program generation');
      }
      if (!input.focusDuration || input.focusDuration.trim() === '') {
        throw new Error('Focus duration is required for program generation');
      }
      
      const result = await runFlow<typeof generateHabitProgramFromGoal>({
        url: getApiUrl('/api/generateHabitProgramFromGoal'),
        input,
      });
      
      console.log('✅ [Service] generateHabitProgramFromGoal result:', result);
      
      // Validate result
      if (!result || !result.programName) {
        throw new Error('Invalid response from AI service - missing program name');
      }
      if (!result.suggestedHabits || !Array.isArray(result.suggestedHabits)) {
        throw new Error('Invalid response from AI service - missing suggested habits');
      }
      
      return result;
    } catch (error) {
      handleAIError(error, 'generateHabitProgramFromGoal');
    }
  },

  getReflectionStarter: async (input: GetReflectionStarterInput): Promise<GetReflectionStarterOutput> => {
    try {
      console.log('🤖 [Service] getReflectionStarter called with:', input);
      
      // Validate environment (server-side only)
      validateEnvironment();
      
      // Validate input
      if (!input.habitName || input.habitName.trim() === '') {
        throw new Error('Habit name is required for reflection starter generation');
      }
      
      const result = await runFlow<typeof getReflectionStarter>({
        url: getApiUrl('/api/getReflectionStarter'),
        input,
      });
      
      console.log('✅ [Service] getReflectionStarter result:', result);
      
      // Validate result
      if (!result || !result.reflectionPrompt) {
        throw new Error('Invalid response from AI service - missing reflection prompt');
      }
      
      return result;
    } catch (error) {
      handleAIError(error, 'getReflectionStarter');
    }
  },

  getCommonHabitSuggestions: async (input: GetCommonHabitSuggestionsInput): Promise<GetCommonHabitSuggestionsOutput> => {
    try {
      console.log('🤖 [Service] getCommonHabitSuggestions called with:', input);
      
      // Validate environment (server-side only)
      validateEnvironment();
      
      // Validate input
      if (!input.category || input.category.trim() === '') {
        throw new Error('Category is required for common habit suggestions');
      }
      
      const result = await runFlow<typeof getCommonHabitSuggestions>({
        url: getApiUrl('/api/getCommonHabitSuggestions'),
        input,
      });
      
      console.log('✅ [Service] getCommonHabitSuggestions result:', result);
      
      // Validate result
      if (!result || !result.suggestions || !Array.isArray(result.suggestions)) {
        throw new Error('Invalid response from AI service - missing suggestions array');
      }
      
      return result;
    } catch (error) {
      handleAIError(error, 'getCommonHabitSuggestions');
    }
  },
};

// Utility function to test if AI service is working
export async function testAIConnection(): Promise<{
  working: boolean;
  error?: string;
  details?: any;
}> {
  try {
    console.log('🧪 Testing AI connection...');
    
    const testResult = await genkitService.generateHabit({
      description: 'test connection'
    });
    
    console.log('✅ AI connection test passed:', testResult);
    
    return {
      working: true,
      details: testResult
    };
  } catch (error) {
    console.error('❌ AI connection test failed:', error);
    
    return {
      working: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Export a debug function for troubleshooting
export async function debugAIService(): Promise<{
  environment: any;
  connectionTest: any;
}> {
  const environment = {
    hasGoogleApiKey: typeof process !== 'undefined' && !!process.env?.GOOGLE_API_KEY,
    googleApiKeyLength: typeof process !== 'undefined' ? process.env?.GOOGLE_API_KEY?.length || 0 : 'N/A (client-side)',
    nodeEnv: typeof process !== 'undefined' ? process.env?.NODE_ENV : 'N/A (client-side)',
    baseUrl: getBaseUrl(),
  };
  
  const connectionTest = await testAIConnection();
  
  return {
    environment,
    connectionTest
  };
}