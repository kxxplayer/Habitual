import { getCommonHabitSuggestions } from '@/genkit/flows';
import { appRoute } from '@genkit-ai/next';

export const POST = appRoute(getCommonHabitSuggestions);