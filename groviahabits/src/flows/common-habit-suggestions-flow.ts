// groviahabits/src/flows/common-habit-suggestions-flow.ts

import {z} from "zod";
import {defineFlow} from "@genkit-ai/flow";
import {generate} from "@genkit-ai/ai";
import {geminiPro} from "@genkit-ai/vertexai";

// Define the shape of the AI's output
const HabitSuggestionSchema = z.object({
  suggestions: z.array(z.string()).describe("A list of 3-5 habit suggestions."),
});

// Define the flow
export const commonHabitSuggestionsFlow = defineFlow(
  {
    name: "commonHabitSuggestionsFlow",
    inputSchema: z.string().describe("The category of habits to suggest, e.g., 'Health'."),
    outputSchema: HabitSuggestionSchema,
  },
  async (category) => {
    const response = await generate({
      model: geminiPro,
      prompt: `Generate a short list of 3 to 5 common, actionable habits for the category: "${category}".`,
      output: {
        schema: HabitSuggestionSchema,
      },
    });

    return response.output()!;
  }
);
