
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebase} from '@genkit-ai/firebase'; // Import the firebase plugin

// Ensure your Firebase project ID is available as an environment variable
// For local development, this might be in your .env.local file
// For Vercel, set this in your project's environment variables
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

if (!firebaseProjectId) {
  console.warn(
    'Firebase Project ID is not set. Genkit Firebase plugin may not work correctly for tracing.'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({apiVersion: 'v1beta'}),
    firebaseProjectId ? firebase({ // Only initialize if projectId is available
      projectId: firebaseProjectId,
      // Configure traceStore to use Firestore
      traceStore: {
        provider: 'firestore',
        // Optional: collection: 'genkit-traces', // Default is 'genkit-traces'
        // Optional: firestore: getFirestoreInstance(), // If you have a custom Firestore instance
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
      // Optional: if your flows use Firebase Storage
      // storage: firebaseStorageBucket ? { bucket: firebaseStorageBucket } : undefined,
    }) : undefined,
  ].filter(Boolean), // Filter out undefined plugins if projectId is missing
  // No model specified here, will be specified per call or in flow defaults.
  // Enable OpenTelemetry trace collection. Traces are sent to the configured traceStore.
  enableTracing: true, 
  // Optional: Configure log level for Genkit
  // logLevel: 'debug', // Can be 'info', 'warn', 'error', 'debug'
});
