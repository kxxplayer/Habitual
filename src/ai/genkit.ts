
console.log('[Genkit Init] Starting src/ai/genkit.ts execution...');
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai'; // Re-enabled googleAI

// Temporarily comment out Firebase telemetry for debugging
// console.log('[Genkit Firebase] Attempting to get NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
// const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
// if (firebaseProjectId) {
//   try {
//     console.log('[Genkit Firebase] Calling enableFirebaseTelemetry with projectId:', firebaseProjectId);
//     enableFirebaseTelemetry({ // This function is called for its side effects
//       projectId: firebaseProjectId,
//       traceStore: { provider: 'firestore' },
//       flowStateStore: { provider: 'firestore' },
//     });
//     console.log('[Genkit Firebase] Telemetry setup attempted for project:', firebaseProjectId);
//   } catch (error) {
//     console.error('[Genkit Firebase] Failed to setup Firebase telemetry:', error);
//   }
// } else {
//   console.warn(
//     '[Genkit Firebase] Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) not set. Firebase plugin for tracing/state will not be enabled.'
//   );
// }

console.log('[Genkit Init] Initializing Genkit object with GoogleAI plugin...');
export const ai = genkit({
  plugins: [
    googleAI(), // googleAI plugin is active
  ],
  enableTracing: false, // Keep tracing disabled
  logLevel: 'debug', // Enabled debug logging
});
console.log('[Genkit Init] Genkit object initialized. enableTracing is false. logLevel is debug.');
console.log('[Genkit Init] End of src/ai/genkit.ts execution.');

