// Create: src/app/api/test-ai/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { genkitService } from '@/lib/genkit-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing AI functionality...');
    
    // Test environment variables
    const envCheck = {
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      GOOGLE_CLOUD_PROJECT: !!process.env.GOOGLE_CLOUD_PROJECT,
      NODE_ENV: process.env.NODE_ENV,
    };
    
    console.log('Environment check:', envCheck);

    // Test habit generation
    console.log('🧪 Testing habit generation...');
    const habitResult = await genkitService.generateHabit({
      description: 'practice guitar daily'
    });
    
    console.log('Habit result:', habitResult);

    // Test habit suggestion
    console.log('🧪 Testing habit suggestion...');
    const suggestionResult = await genkitService.getHabitSuggestion({
      habitName: 'Practice Guitar',
      trackingData: 'Completions: 5',
      daysOfWeek: ['Mon', 'Wed', 'Fri']
    });
    
    console.log('Suggestion result:', suggestionResult);

    // Test program generation
    console.log('🧪 Testing program generation...');
    const programResult = await genkitService.generateHabitProgramFromGoal({
      goal: 'learn guitar',
      focusDuration: '3 months'
    });
    
    console.log('Program result:', programResult);

    return NextResponse.json({
      status: 'success',
      message: 'All AI tests passed!',
      environment: envCheck,
      results: {
        habit: habitResult,
        suggestion: suggestionResult,
        program: programResult
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ AI Test failed:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { test, description, goal, focusDuration } = body;
    
    console.log(`🧪 Testing ${test} with data:`, body);
    
    let result;
    
    switch (test) {
      case 'habit':
        result = await genkitService.generateHabit({
          description: description || 'practice guitar'
        });
        break;
        
      case 'suggestion':
        result = await genkitService.getHabitSuggestion({
          habitName: 'Practice Guitar',
          trackingData: 'Completions: 3',
          daysOfWeek: ['Mon', 'Wed', 'Fri']
        });
        break;
        
      case 'program':
        result = await genkitService.generateHabitProgramFromGoal({
          goal: goal || 'learn guitar',
          focusDuration: focusDuration || '3 months'
        });
        break;
        
      default:
        throw new Error(`Unknown test type: ${test}`);
    }
    
    return NextResponse.json({
      status: 'success',
      test,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ AI Test failed:`, error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}