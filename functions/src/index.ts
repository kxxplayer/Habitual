// functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
// Import the nextjsApp from the separate file
import { nextjsApp } from "./nextapp";

// Initialize Firebase Admin
initializeApp();

/**
 * Health check function.
 * Responds with basic health status and environment variable presence.
 */
export const healthCheck = onRequest({ cors: true }, async (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    env_check: {
      google_api_key: process.env.GOOGLE_API_KEY ? "Present" : "Missing",
      google_cloud_project: process.env.GOOGLE_CLOUD_PROJECT ?
        "Present" : "Missing",
    },
  });
});

/**
 * Motivational quote function.
 * Returns a random motivational quote.
 */
export const motivationalQuote = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const quotes = [
        "Every small step counts. Keep building momentum!",
        "Consistency beats perfection every time.",
        "Your habits shape your future. Choose wisely!",
        "Progress, not perfection, is the goal.",
        "One day at a time, one habit at a time.",
      ];

      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

      res.json({ quote: randomQuote });
    } catch (error) {
      console.error("Error generating quote:", error);
      res.status(500).json({ error: "Failed to generate quote" });
    }
  },
);

/**
 * Habit creation function.
 * Processes a habit description and returns a structured habit object.
 */
export const habitCreation = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const { description } = req.body;

      if (!description) {
        res.status(400).json({ error: "Description is required" });
        return;
      }

      const result = {
        habit: {
          title: "Generated Habit",
          description: description,
          category: "Personal Growth",
          frequency: "daily",
        },
      };

      res.json(result);
    } catch (error) {
      console.error("Error in habitCreation:", error);
      res.status(500).json({ error: "Failed to create habit" });
    }
  },
);

// Re-export the Next.js app serving function
export { nextjsApp };
