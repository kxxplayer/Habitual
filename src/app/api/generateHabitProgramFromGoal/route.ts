// Create/Update: src/app/api/generateHabitProgramFromGoal/route.ts

import { generateHabitProgramFromGoal } from '@/genkit/flows';
import { appRoute } from '@genkit-ai/next';
import { NextRequest, NextResponse } from 'next/server';

// Add debugging wrapper
export const POST = async (request: NextRequest) => {
  try {
    console.log('=== generateHabitProgramFromGoal API called ===');
    
    // Log headers
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    // Get and log the raw body
    const body = await request.text();
    console.log('Raw request body:', body);
    
    // Try to parse JSON
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      console.log('Parsed body:', parsedBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: { message: 'Invalid JSON in request body', status: 'INVALID_REQUEST' } },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!parsedBody || typeof parsedBody !== 'object') {
      console.error('Body is not an object:', typeof parsedBody);
      return NextResponse.json(
        { error: { message: 'Request body must be an object', status: 'INVALID_REQUEST' } },
        { status: 400 }
      );
    }
    
    if (!parsedBody.goal || typeof parsedBody.goal !== 'string') {
      console.error('Missing or invalid goal:', parsedBody.goal);
      return NextResponse.json(
        { error: { message: 'Goal is required and must be a string', status: 'INVALID_REQUEST' } },
        { status: 400 }
      );
    }
    
    if (!parsedBody.focusDuration || typeof parsedBody.focusDuration !== 'string') {
      console.error('Missing or invalid focusDuration:', parsedBody.focusDuration);
      return NextResponse.json(
        { error: { message: 'Focus duration is required and must be a string', status: 'INVALID_REQUEST' } },
        { status: 400 }
      );
    }
    
    // Create new request with parsed body
    const newRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(parsedBody),
    });
    
    console.log('Calling appRoute with validated data...');
    
    // Call the original route handler
    return await appRoute(generateHabitProgramFromGoal)(newRequest);
    
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error', status: 'INTERNAL' } },
      { status: 500 }
    );
  }
};