
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({apiVersion: 'v1beta'})], // Specify v1beta if needed, or remove for default
  // No model specified here, will be specified per call or in flow defaults.
});
