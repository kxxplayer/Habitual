
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
    *   Copy the Firebase configuration (apiKey, authDomain, etc.).
    *   Enable Email/Password and Google sign-in methods in Firebase Authentication > Sign-in method.
    *   Add your development domain (e.g., `localhost`) and your Vercel deployment domains to Firebase Authentication > Settings > Authorized domains.

4.  **Set up Google AI API Key (for Genkit):**
    *   Go to [Google AI Studio (formerly MakerSuite)](https://aistudio.google.com/).
    *   Create or get an API key.

5.  **Configure Environment Variables:**
    *   Create a `.env.local` file in the root of your project (this file should be in `.gitignore`).
    *   Copy the content from `.env` (if it exists) or use the following template:
        ```
        NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
        NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
        NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

        GOOGLE_API_KEY=your_google_ai_api_key
        GOOGLE_CLOUD_PROJECT=your_firebase_project_id 
        ```
    *   Replace the placeholder values with your actual Firebase config, Google AI API key, and ensure `GOOGLE_CLOUD_PROJECT` is set to your Firebase Project ID.

### Running the Development Server

1.  **Run Genkit (in a separate terminal, optional but needed for AI features):**
    ```bash
    npm run genkit:dev
    # or
    npm run genkit:watch
    ```

2.  **Run the Next.js app:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:9002](http://localhost:9002) (or your configured port) in your browser.

## Building for Production

```bash
npm run build
```

## Deployment

This app is well-suited for deployment on platforms like [Vercel](https://vercel.com) or [Netlify](https://www.netlify.com/).
Ensure your environment variables (Firebase config, Google AI API key, Google Cloud Project ID) are set up on your hosting platform.

## PWA Notes

*   Place app icons (e.g., `icon-192x192.png`, `icon-512x512.png`) in the `/public/icons/` directory.
*   Customize `public/manifest.json` and `theme-color` in `src/app/layout.tsx` as needed.

