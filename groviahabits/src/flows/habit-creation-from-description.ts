// groviahabits/src/flows/habit-creation-from-description.ts

import { z } from "zod";
import { defineFlow } from "@genkit-ai/flow";
import { generate } from "@genkit-ai/ai";
// FIX: The model for this library version is named `geminiPro`.
import { geminiPro } from "@genkit-ai/vertexai";

// Define the shape of your AI's output using Zod
const HabitSchema = z.object({
  habitTitle: z.string().describe("A short, catchy title for the habit."),
  habitReason: z.string().describe("A brief explanation of why this habit is beneficial."),
});

export const habitCreationFlow = defineFlow(
  {
    name: "habitCreationFlow",
    inputSchema: z.string().describe("A user's description of a goal or habit they want to form."),
    outputSchema: HabitSchema,
  },
  async (prompt) => {
    const response = await generate({
      // Use the corrected model name
      model: geminiPro,
      prompt: `Analyze the following user goal and create a simple, actionable habit. Goal: "${prompt}"`,
      output: {
        schema: HabitSchema,
      },
    });

    return response.output()!;
  }
);