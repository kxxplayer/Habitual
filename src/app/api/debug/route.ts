import { NextRequest, NextResponse } from 'next/server';
import { googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting comprehensive AI diagnostics...');
    
    // 1. Check environment variables
    const envCheck = {
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      GOOGLE_API_KEY_LENGTH: process.env.GOOGLE_API_KEY?.length || 0,
      GOOGLE_API_KEY_PREFIX: process.env.GOOGLE_API_KEY?.substring(0, 10) + '...',
      GOOGLE_CLOUD_PROJECT: !!process.env.GOOGLE_CLOUD_PROJECT,
      NODE_ENV: process.env.NODE_ENV,
    };
    
    console.log('📊 Environment check:', envCheck);

    // 2. Test direct Google AI connection
    console.log('🧪 Testing direct Google AI connection...');
    
    try {
      const ai = genkit({
        plugins: [
          googleAI({
            apiKey: process.env.GOOGLE_API_KEY,
          })
        ],
      });

      const model = googleAI.model('gemini-1.5-flash');
      
      const directResult = await ai.generate({
        model,
        prompt: 'Respond with exactly: "AI is working correctly"',
      });
      
      console.log('✅ Direct AI test result:', directResult.text);
      
      // 3. Test our service layer
      console.log('🧪 Testing service layer...');
      const { genkitService } = await import('@/lib/genkit-service');
      
      // Test habit generation
      const habitResult = await genkitService.generateHabit({
        description: 'practice guitar daily'
      });
      
      console.log('🎸 Habit result:', habitResult);

      // Test habit suggestion
      const suggestionResult = await genkitService.getHabitSuggestion({
        habitName: 'Practice Guitar',
        trackingData: 'Completions: 5',
        daysOfWeek: ['Mon', 'Wed', 'Fri']
      });
      
      console.log('💡 Suggestion result:', suggestionResult);

      // Test program generation
      const programResult = await genkitService.generateHabitProgramFromGoal({
        goal: 'learn guitar',
        focusDuration: '3 months'
      });
      
      console.log('📋 Program result:', programResult);

      return NextResponse.json({
        status: 'success',
        message: 'All AI tests passed!',
        environment: envCheck,
        directAI: {
          text: directResult.text,
          working: directResult.text.includes('AI is working correctly')
        },
        results: {
          habit: habitResult,
          suggestion: suggestionResult,
          program: programResult
        },
        timestamp: new Date().toISOString(),
      });
      
    } catch (aiError) {
      console.error('❌ AI Connection Error:', aiError);
      
      // Check if it's a quota/billing issue
      const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
      const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('429');
      const isAuthError = errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('API key');
      
      return NextResponse.json({
        status: 'ai_error',
        environment: envCheck,
        error: {
          message: errorMessage,
          isQuotaError,
          isAuthError,
          fullError: aiError
        },
        diagnosis: {
          quotaIssue: isQuotaError ? 'Your API has reached quota limits or needs billing enabled' : false,
          authIssue: isAuthError ? 'Your API key may be invalid or restricted' : false,
          suggestion: isQuotaError 
            ? 'Check Google AI Studio quota and enable billing if needed' 
            : isAuthError 
            ? 'Verify your API key is correct and has proper permissions'
            : 'Check the detailed error message above'
        },
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    return NextResponse.json({
      status: 'setup_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
