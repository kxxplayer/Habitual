// Create a new file: src/lib/env-check.ts

export function validateEnvironmentVariables() {
    const requiredVars = {
      'GOOGLE_API_KEY': process.env.GOOGLE_API_KEY,
      'GOOGLE_CLOUD_PROJECT': process.env.GOOGLE_CLOUD_PROJECT,
    };
  
    const missing = Object.entries(requiredVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
  
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  
    console.log('Environment validation passed');
    return true;
  }
  
  // Add this check to your API routes
  // Update src/genkit/flows.ts to include environment validation:
  
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