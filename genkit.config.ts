import { defineConfig } from 'genkit';
import firebase from '@genkit-ai/firebase';
import googleAI from '@genkit-ai/googleai';
import next from '@genkit-ai/next';

export const config = defineConfig({
  integrations: [firebase(), googleAI(), next()],
  tracing: {
    provider: 'gcp'
  },
  logLevel: 'debug'
});