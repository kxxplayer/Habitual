// genkit.config.ts - Fixed version for Genkit 1.12.0

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export default genkit({
  // Configure plugins
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
});