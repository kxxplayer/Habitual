// groviahabits/src/index.ts

import {initializeApp} from "firebase-admin/app";
import {onCall, HttpsError} from "firebase-functions/v2/https";

// Genkit imports have been removed from the top level to speed up startup.

// Initialize Firebase Admin SDK.
initializeApp();

// Define the HTTPS Callable Function
export const generateHabit = onCall(async (request) => {
  const description = request.data.description;

  if (!description || typeof description !== "string") {
    console.error("Invalid argument received:", request.data);
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a `description` string.",
    );
  }

  console.log(`Received description: ${description}`);

  try {
    const {runFlow} = await import("@genkit-ai/flow");
    // FIX: Add the .js extension to the import path.
    const {habitCreationFlow} = await import(
      "./flows/habit-creation-from-description.js"
    );

    const result = await runFlow(habitCreationFlow, description);
    console.log("Successfully generated habit:", result);
    return {result};
  } catch (error) {
    console.error("Error running Genkit flow:", error);
    throw new HttpsError(
      "internal",
      "An error occurred while generating the habit.",
    );
  }
});
export const getCommonHabitSuggestions = onCall(async (request) => {
  const category = request.data.category; // Expect a category from the client

  if (!category || typeof category !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a `category` string."
    );
  }

  try {
    const {runFlow} = await import("@genkit-ai/flow");
    const {commonHabitSuggestionsFlow} = await import(
      "./flows/common-habit-suggestions-flow.js"
    );
    const result = await runFlow(commonHabitSuggestionsFlow, category);
    return {result};
  } catch (error) {
    console.error("Error running suggestions flow:", error);
    throw new HttpsError("internal", "An error occurred while getting suggestions.");
  }
});
