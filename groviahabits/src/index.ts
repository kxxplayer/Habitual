// groviahabits/src/index.ts

import { initializeApp } from "firebase-admin/app";
import { onCall, HttpsError } from "firebase-functions/v2/https";
// FIX: `runFlow` is the new way to run a flow, imported from '@genkit-ai/flow'.
import { runFlow } from "@genkit-ai/flow";

// This import should now work correctly.
import { habitCreationFlow } from "./flows/habit-creation-from-description";

// Initialize Firebase Admin SDK. Genkit initialization is no longer needed here.
initializeApp();

// Define the HTTPS Callable Function
export const generateHabit = onCall(async (request) => {
  const description = request.data.description;

  if (!description || typeof description !== "string") {
    console.error("Invalid argument received:", request.data);
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a `description` string."
    );
  }

  console.log(`Received description: ${description}`);

  try {
    // FIX: Use `runFlow` to execute the flow.
    const result = await runFlow(habitCreationFlow, description);
    console.log("Successfully generated habit:", result);
    return { result };
  } catch (error) {
    console.error("Error running Genkit flow:", error);
    throw new HttpsError(
      "internal",
      "An error occurred while generating the habit."
    );
  }
});