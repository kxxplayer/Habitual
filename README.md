
# Habitual - Habit Tracking App

This is a Next.js application for tracking habits, built with Firebase for authentication and Genkit for AI features.

## Features

- User authentication (Email/Password, Google Sign-In)
- Create, edit, and delete habits
- Track daily and weekly progress for habits
- AI-powered suggestions for habit creation and tips
- Motivational quotes
- Badge system for achievements
- Points system for completions
- Calendar view of habit activity
- Customizable themes
- PWA enabled for app-like experience

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn

### Setup

1.  **Clone the repository (if applicable):**
    ```bash
    git clone <your-repo-url>
    cd <your-repo-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Firebase:**
    *   Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
    *   Add a Web app to your Firebase project.
    *   Copy the Firebase configuration (apiKey, authDomain, etc.) from your Firebase project settings.
    *   In Firebase console: Go to **Authentication** > **Sign-in method**.
        *   Enable **Email/Password**.
        *   Enable **Google** as a sign-in provider.
    *   In Firebase console: Go to **Authentication** > **Settings** > **Authorized domains**.
        *   Ensure `localhost` (or your local development port if different) is added.
        *   **Crucially for Vercel**: Add your production Vercel domain (e.g., `your-app-name.vercel.app`) and any Vercel preview deployment domains. Vercel preview domains can look like `your-project-git-branch-org.vercel.app` or `your-project-uniqueid-org.vercel.app`.

4.  **Set up Google AI API Key (for Genkit):**
    *   Go to [Google AI Studio (formerly MakerSuite)](https://aistudio.google.com/).
    *   Create or get an API key. This is needed for Genkit AI features.

5.  **Configure Environment Variables:**
    *   Create a `.env.local` file in the root of your project (this file should be in `.gitignore`).
    *   Use the following template, replacing placeholder values with your actual Firebase config and Google AI API key:
        ```
        # Firebase Configuration (Client-side, prefixed with NEXT_PUBLIC_)
        NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
        NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
        NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

        # Google AI API Key (Server-side, for Genkit)
        GOOGLE_API_KEY=your_google_ai_api_key

        # Google Cloud Project ID (Server-side, for Genkit Firebase integration like Firestore tracing/state)
        # This is typically the same as your Firebase Project ID.
        GOOGLE_CLOUD_PROJECT=your_firebase_project_id
        ```

### Running the Development Server

1.  **Run Genkit (in a separate terminal, required for AI features):**
    ```bash
    npm run genkit:dev
    # or
    npm run genkit:watch
    ```
    Ensure your `GOOGLE_API_KEY` is correctly set in `.env.local` for Genkit to start properly.

2.  **Run the Next.js app:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) (or your configured port) in your browser.

## Building for Production

```bash
npm run build
```

## Deployment

This app is well-suited for deployment on platforms like [Vercel](https://vercel.com) or [Netlify](https://www.netlify.com/).

### Vercel Deployment Checklist (Crucial for Google Sign-In)

When deploying to Vercel, pay close attention to the following for Google Sign-In and other Firebase/Google services to work correctly:

1.  **Authorized Domains in Firebase:**
    *   Go to your Firebase Project > Authentication > Settings > Authorized domains.
    *   **Add your Vercel production domain:** e.g., `your-app-name.vercel.app`.
    *   **Add Vercel preview domains:** Vercel generates unique URLs for preview deployments. You might need to add a wildcard or common patterns if you use previews extensively, or add them as they are generated. Common patterns include:
        *   `your-project-name-git-your-branch-your-org.vercel.app`
        *   `your-project-name-uniquehash-your-org.vercel.app`
    *   If Google Sign-In still fails, the popup window might show the exact URL that needs to be authorized.

2.  **Environment Variables on Vercel:**
    *   Go to your Vercel Project Dashboard > Settings > Environment Variables.
    *   Add all the variables from your `.env.local` template:
        *   `NEXT_PUBLIC_FIREBASE_API_KEY`
        *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
        *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
        *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
        *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
        *   `NEXT_PUBLIC_FIREBASE_APP_ID`
        *   `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
        *   `GOOGLE_API_KEY`
        *   `GOOGLE_CLOUD_PROJECT` (set to your Firebase Project ID)
    *   Ensure these are **NOT** prefixed with `NEXT_PUBLIC_` unless they are intended to be exposed to the client (like the Firebase SDK config keys). `GOOGLE_API_KEY` and `GOOGLE_CLOUD_PROJECT` are typically server-side. Vercel handles the distinction based on the `NEXT_PUBLIC_` prefix for Next.js projects.

3.  **Redeploy:** After adding authorized domains or updating environment variables, redeploy your Vercel application for the changes to take effect.

If issues persist, check the browser console for specific error messages when attempting Google Sign-In on your Vercel deployment.

## PWA Notes

*   Place app icons (e.g., `icon-192x192.png`, `icon-512x512.png`) in the `/public/icons/` directory.
*   Customize `public/manifest.json` and `theme-color` in `src/app/layout.tsx` as needed.
