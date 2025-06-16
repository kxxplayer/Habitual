// In your ROOT genkit.config.ts

import { firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';
import { configureGenkit } from 'genkit';
import { nextJs } from '@genkit-ai/next';

export default configureGenkit({
  plugins: [
    nextJs(),
    firebase(),
    // FIX: Add the location to the googleAI plugin configuration
    googleAI({ location: 'us-central1' }),
  ],
  logSinks: ['stdout'],
  enableTracingAndMetrics: true,
  flowStateStore: 'firebase',
  traceStore: 'firebase',
});