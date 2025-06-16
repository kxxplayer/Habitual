import { getHabitSuggestion } from '@/genkit/flows';
import { appRoute } from '@genkit-ai/next';

export const POST = appRoute(getHabitSuggestion);