
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import { enableFirebaseTelemetry } from '@genkit-ai/firebase'; // Ensure this path is correct for your version

// const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// if (firebaseProjectId) {
//   try {
//     enableFirebaseTelemetry({ // This function is called for its side effects
//       projectId: firebaseProjectId,
//       traceStore: { provider: 'firestore' },
//       flowStateStore: { provider: 'firestore' },
//     });
//     console.log('[Genkit Firebase] Telemetry setup attempted.');
//   } catch (error) {
//     console.error('[Genkit Firebase] Failed to setup Firebase telemetry:', error);
//   }
// } else {
//   console.warn(
//     '[Genkit Firebase] Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) not set. Firebase plugin for tracing/state will not be enabled.'
//   );
// }

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
