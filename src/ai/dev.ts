
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
}

// Debug log the critical environment variables as seen by the Genkit dev process
console.log('[Genkit Env Debug] process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('[Genkit Env Debug] process.env.GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT);
console.log('[Genkit Env Debug] process.env.GOOGLE_API_KEY:', !!process.env.GOOGLE_API_KEY ? 'Exists' : 'Not Found');

// Flows will import genkit.ts as needed.
// console.log('[Genkit Dev] Attempting to import src/ai/genkit.ts directly to ensure it runs before genkit start takes over...');
// import '@/ai/genkit'; // This ensures genkit.ts is processed and its logs appear
// console.log('[Genkit Dev] src/ai/genkit.ts has been imported directly.');


// Temporarily comment out ALL flow imports for debugging
// import '@/ai/flows/habit-creation-from-description';
// import '@/ai/flows/habit-suggestion';
// import '@/ai/flows/motivational-quote-flow'; // Also commented out
// import '@/ai/flows/sql-tip-flow';
// import '@/ai/flows/common-habit-suggestions-flow';
// import '@/ai/flows/generate-habit-program-flow';
// import '@/ai/flows/app-improvement-suggester-flow';
// import '@/ai/flows/reflection-starter-flow';

console.log('[Genkit Dev] ALL flow imports are currently commented out for debugging.');
console.log('[Genkit Dev] If Genkit starts successfully now, the issue is likely in one of the other flow files or how Genkit handles no flows/plugins.');

console.log('[Genkit Dev] End of dev.ts script. Genkit start should now proceed with discovered elements.');

