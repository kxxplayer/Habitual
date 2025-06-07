
console.log('[Genkit Init] Starting src/ai/genkit.ts execution...');
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import { enableFirebaseTelemetry } from '@genkit-ai/firebase'; // Ensure this path is correct for your version

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
    googleAI({apiVersion: 'v1beta'}),
    // Do not add the return value of enableFirebaseTelemetry here if it doesn't return a plugin
  ].filter(Boolean),
  // Enable OpenTelemetry trace collection. Traces are sent to the configured traceStore.
  enableTracing: false, // Temporarily set to false for debugging
  // Optional: Configure log level for Genkit
  // logLevel: 'debug', // Can be 'info', 'warn', 'error', 'debug'
});
console.log('[Genkit Init] Genkit object initialized. enableTracing is false.');
console.log('[Genkit Init] End of src/ai/genkit.ts execution.');
