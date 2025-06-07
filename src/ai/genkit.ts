
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// Try importing enableFirebaseTelemetry as suggested by build errors for version 1.8.0
import { enableFirebaseTelemetry } from '@genkit-ai/firebase'; 

// Ensure your Firebase project ID is available as an environment variable
// For local development, this might be in your .env.local file
// For Vercel, set this in your project's environment variables
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET; // Keep this for potential future use

// Call enableFirebaseTelemetry for its side effects if projectId is available
if (firebaseProjectId) {
  try {
    enableFirebaseTelemetry({
      projectId: firebaseProjectId,
      // Configure traceStore to use Firestore
      traceStore: {
        provider: 'firestore',
        // Optional: collection: 'genkit-traces', // Default is 'genkit-traces'
      },
      // Configure flowStateStore to use Firestore
      flowStateStore: {
        provider: 'firestore',
        // Optional: collection: 'genkit-flow-states', // Default is 'genkit-flow-states'
      },
      // Optional: if you plan to use Genkit to deploy flows to Firebase Functions
      // functions: {
      //   region: 'us-central1', // or your preferred region
      //   firebaseAdminConfig: { projectId: firebaseProjectId }, // If needed for admin operations
      // },
      // Optional: if your flows use Firebase Storage (ensure bucket is configured)
      // storage: firebaseStorageBucket ? { bucket: firebaseStorageBucket } : undefined,
    });
    console.log('Firebase telemetry setup for Genkit has been attempted.');
  } catch (error) {
    console.error('Failed to setup Firebase telemetry for Genkit:', error);
    // Proceed without the Firebase plugin if initialization fails
  }
} else {
  console.warn(
    'Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is not set. Genkit Firebase plugin for tracing will not be enabled.'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({apiVersion: 'v1beta'}),
    // The return value of enableFirebaseTelemetry is not added here
  ].filter(Boolean), // filter(Boolean) is kept in case any plugin factory could return undefined
  // No model specified here, will be specified per call or in flow defaults.
  // Enable OpenTelemetry trace collection. Traces are sent to the configured traceStore.
  enableTracing: true, 
  // Optional: Configure log level for Genkit
  // logLevel: 'debug', // Can be 'info', 'warn', 'error', 'debug'
});
