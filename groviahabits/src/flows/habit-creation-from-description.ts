// groviahabits/src/flows/habit-creation-from-description.ts

import {z} from "zod";
import {defineFlow} from "@genkit-ai/flow";
import {generate} from "@genkit-ai/ai";
import {geminiPro} from "@genkit-ai/vertexai";
import {HABIT_CATEGORIES} from "../../../src/types";

// FIX: Define a plain, mutable array for Zod to use, instead of importing the readonly one.
const weekDaysForZod = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// Define the shape of your AI's output using Zod
const HabitDetailsSchema = z.object({
  habitName: z.string().describe("A short, clear name for the habit."),
  category: z.enum(HABIT_CATEGORIES).describe("The best category for this habit."),
  // Use the new plain array here.
  daysOfWeek: z.array(z.enum(weekDaysForZod)).describe("An array of abbreviated days (e.g., 'Mon', 'Tue') suitable for the habit."),
  optimalTiming: z.string().optional().describe("A general time of day (e.g., 'Morning', 'After Lunch')."),
  durationHours: z.number().optional().nullable().describe("Suggested duration in hours, if applicable."),
  durationMinutes: z.number().optional().nullable().describe("Suggested duration in minutes (0-59), if applicable."),
  specificTime: z.string().optional().describe("A specific time in HH:mm format, if applicable."),
});

export const habitCreationFlow = defineFlow(
  {
    name: "habitCreationFlow",
    inputSchema: z.object({description: z.string()}),
    outputSchema: HabitDetailsSchema,
  },
  async (input) => {
    const response = await generate({
      model: geminiPro,
      prompt: `Analyze the following user goal and extract structured details for creating a new habit. Goal: "${input.description}"`,
      output: {
        schema: HabitDetailsSchema,
      },
    });

    return response.output()!;
  }
);
