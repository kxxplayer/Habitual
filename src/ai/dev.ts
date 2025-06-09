
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Attempt to load .env.local first, then .env from project root
const projectRoot = path.resolve(__dirname, '../../'); // Assuming dev.ts is in src/ai/
const envLocalPath = path.join(projectRoot, '.env.local');
const envPath = path.join(projectRoot, '.env');

console.log(`[Genkit Env] Attempting to load .env files for Genkit process.`);
console.log(`[Genkit Env] Project root: ${projectRoot}`);
console.log(`[Genkit Env] Checking for .env.local at: ${envLocalPath}`);

const localResult = dotenvConfig({ path: envLocalPath });
let loadedEnvFile = "";
let parsedKeysCount = 0;

if (localResult.error) {
  if (localResult.error.message.includes('ENOENT')) {
    console.log('[Genkit Env] .env.local file not found.');
  } else {
    // Log only the message, not the full error object for cleaner logs
    console.warn('[Genkit Env] Warning during .env.local loading:', localResult.error.message);
  }
  
  console.log(`[Genkit Env] Checking for .env at: ${envPath}`);
  const envResult = dotenvConfig({ path: envPath });
  if (envResult.error) {
    if (envResult.error.message.includes('ENOENT')) {
        console.log('[Genkit Env] .env file not found.');
    } else {
        console.warn('[Genkit Env] Warning during .env loading:', envResult.error.message);
    }
  } else {
    if (envResult.parsed) {
        loadedEnvFile = ".env";
        parsedKeysCount = Object.keys(envResult.parsed).length;
        console.log(`[Genkit Env] Successfully loaded .env file. Parsed ${parsedKeysCount} keys.`);
    } else {
        console.log('[Genkit Env] .env file found but no variables parsed.');
    }
  }
} else {
  if (localResult.parsed) {
    loadedEnvFile = ".env.local";
    parsedKeysCount = Object.keys(localResult.parsed).length;
    console.log(`[Genkit Env] Successfully loaded .env.local file. Parsed ${parsedKeysCount} keys.`);
  } else {
    console.log('[Genkit Env] .env.local file found but no variables parsed.');
  }
}

if (!loadedEnvFile && parsedKeysCount === 0) {
    console.warn("[Genkit Env] WARNING: No .env or .env.local file was successfully loaded with variables. Critical environment variables like GOOGLE_API_KEY might be missing.");
} else if (loadedEnvFile && parsedKeysCount === 0) {
    console.warn(`[Genkit Env] WARNING: ${loadedEnvFile} was found, but no variables were parsed from it. Check its content and formatting.`);
}


// Debug log the critical environment variables as seen by the Genkit dev process
console.log('[Genkit Env Debug] Environment variable status for Genkit process:');
console.log(`[Genkit Env Debug]   Attempted to load from: ${loadedEnvFile || 'None loaded'}`);
const googleApiKeyStatus = process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim() !== '' ? 'Exists and is not empty' : 'Not Found or Empty';
console.log(`[Genkit Env Debug]   process.env.GOOGLE_API_KEY: ${googleApiKeyStatus}`);
if (googleApiKeyStatus === 'Not Found or Empty') {
    console.error("[Genkit Env Debug] CRITICAL: GOOGLE_API_KEY is missing or empty. Genkit's Google AI plugin will likely fail.");
}
console.log('[Genkit Env Debug]   process.env.GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT || 'Not Found (Note: Needed for Firebase features like Firestore tracing/state)');
console.log('[Genkit Env Debug]   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not Found (Note: Used by client-side Firebase)');


// Flows will import genkit.ts as needed.
import '@/ai/flows/habit-creation-from-description';
import '@/ai/flows/habit-suggestion';
import '@/ai/flows/motivational-quote-flow';
import '@/ai/flows/sql-tip-flow';
import '@/ai/flows/common-habit-suggestions-flow';
import '@/ai/flows/generate-habit-program-flow';
import '@/ai/flows/app-improvement-suggester-flow';
import '@/ai/flows/reflection-starter-flow';

console.log('[Genkit Dev] All flow imports have been processed.');
console.log('[Genkit Dev] End of dev.ts script. Genkit start should now proceed with discovered elements.');
console.log('[Genkit Dev] If Genkit fails to start or the preview shuts down, check the GOOGLE_API_KEY status above.');
