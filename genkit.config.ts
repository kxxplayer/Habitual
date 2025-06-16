// In your ROOT genkit.config.ts
import { firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';
import { configureGenkit } from 'genkit';
import { nextJs } from '@genkit-ai/next';

export default configureGenkit({
  plugins: [
    nextJs(), // The Next.js plugin handles API routing
    firebase(), // The Firebase plugin for security
    googleAI(), // The plugin for Google's AI models
  ],
  logSinks: ['stdout'],
  enableTracingAndMetrics: true,
  flowStateStore: 'firebase',
  traceStore: 'firebase',
});