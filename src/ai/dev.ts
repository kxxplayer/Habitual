
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Attempt to load .env.local first, then .env from project root
const projectRoot = path.resolve(__dirname, '../../'); // Assuming dev.ts is in src/ai/
const envLocalPath = path.join(projectRoot, '.env.local');
const envPath = path.join(projectRoot, '.env');

console.log(`[Genkit Env] Attempting to load .env.local from: ${envLocalPath}`);
const localResult = dotenvConfig({ path: envLocalPath });

if (localResult.error) {
  if (localResult.error.message.includes('ENOENT')) {
    console.log('[Genkit Env] .env.local file not found.');
  } else {
    console.warn('[Genkit Env] Error loading .env.local file:', localResult.error);
  }
  // If .env.local failed or not found, try .env
  console.log(`[Genkit Env] Attempting to load .env from: ${envPath}`);
  const envResult = dotenvConfig({ path: envPath });
  if (envResult.error) {
    if (envResult.error.message.includes('ENOENT')) {
        console.log('[Genkit Env] .env file not found.');
    } else {
        console.warn('[Genkit Env] Error loading .env file:', envResult.error);
    }
  } else {
    console.log('[Genkit Env] .env file loaded successfully. Parsed keys:', Object.keys(envResult.parsed || {}).join(', '));
  }
} else {
  console.log('[Genkit Env] .env.local file loaded successfully. Parsed keys:', Object.keys(localResult.parsed || {}).join(', '));
  // If .env.local was loaded, we can optionally also load .env to fill in any missing vars,
  // but dotenv by default doesn't override existing process.env vars.
  // For simplicity, we'll assume .env.local is comprehensive if it exists.
}

// Debug log the critical environment variables as seen by the Genkit dev process
console.log('[Genkit Env Debug] process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('[Genkit Env Debug] process.env.GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT);
console.log('[Genkit Env Debug] process.env.GOOGLE_API_KEY:', !!process.env.GOOGLE_API_KEY ? 'Exists' : 'Not Found');


// Temporarily comment out flow imports for debugging
// import '@/ai/flows/habit-creation-from-description';
// import '@/ai/flows/habit-suggestion';
// import '@/ai/flows/motivational-quote-flow';
// import '@/ai/flows/sql-tip-flow';
// import '@/ai/flows/common-habit-suggestions-flow';
// import '@/ai/flows/generate-habit-program-flow';
// import '@/ai/flows/app-improvement-suggester-flow';
// import '@/ai/flows/reflection-starter-flow';

console.log('[Genkit Dev] All flow imports are currently commented out for debugging.');
console.log('[Genkit Dev] If Genkit starts successfully now, the issue is likely in one of the flow files or src/ai/genkit.ts during plugin initialization.');

// The ai object from genkit.ts will be initialized when genkit.ts is implicitly loaded
// if any flow was imported. Since no flows are imported, genkit.ts might not be directly
// executed by this dev.ts script right now unless something else triggers its import.
// However, the genkit start command itself will try to initialize Genkit.
// Let's ensure genkit.ts is at least processed by importing it directly to see if plugin loading fails.
import '@/ai/genkit';
console.log('[Genkit Dev] src/ai/genkit.ts has been imported directly.');
