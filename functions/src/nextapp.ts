// functions/src/nextapp.ts
import { onRequest } from "firebase-functions/v2/https";
import * as next from "next";

// Initialize Next.js app instance
// This part is crucial for connecting Firebase Functions with your Next.js build.
// "dev: false" ensures it runs in production mode.
// "conf.distDir" tells Next.js where to find its build output.
// We assume the .next folder will be copied into the functions directory before deployment.
const app = next.default({
  dev: false, // Set to false for production deployments
  conf: {
    distDir: ".next", // Next.js build output directory relative to the function's root
  },
});

// Get the Next.js request handler
const handle = app.getRequestHandler();

/**
     * Firebase Function to serve the Next.js application.
     * All requests to Firebase Hosting will be rewritten to this function.
     */
export const nextjsApp = onRequest(
  {
    // Enable CORS for development/testing if needed, or restrict to your domains.
    // For production, you might want to restrict this to only your hosting domain.
    cors: true,
    // It's highly recommended to explicitly set a region for your functions.
    region: "us-central1", // Choose a region close to your users
  },
  async (req, res) => {
    // This prepares the Next.js app to handle the request.
    // For production, `app.prepare()` is typically called once globally
    // for performance. For simplicity, calling it inside the handler
    // works, but be aware of potential cold start impacts.
    await app.prepare();
    // Hand over the request to the Next.js app handler
    await handle(req, res);
  }
);
