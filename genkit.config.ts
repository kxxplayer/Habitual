// genkit.config.ts

import { configureGenkit } from 'genkit';
import firebase from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';
import nextJs from '@genkit-ai/next';

export default configureGenkit({
  plugins: [
    // The Next.js plugin is what allows you to define flows in your /api directory.
    nextJs(),
    // The Firebase plugin is used for tracing and state management.
    firebase(),
    // The Google AI plugin is configured here with your API key.
    // It reads the GOOGLE_API_KEY from your .env.local file.
    googleAI(), 
  ],
  // These settings are for development and debugging.
  logSinks: ['stdout'],
  enableTracingAndMetrics: true,
  // These tell Genkit to use Firestore for storing flow states and traces.
  flowStateStore: 'firebase',
  traceStore: 'firebase',
});
