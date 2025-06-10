
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
    *   If Google Sign-In still fails, the popup window might show the exact URL that needs to be authorized. Check the browser console for the logged hostname if you've enabled debug logging in the `handleGoogleSignIn` function.

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

## PWA and App Store Publishing

Habitual is a Progressive Web App (PWA), which means it can be installed on devices directly from the browser and offers an app-like experience.

### PWA Notes

*   **Icons**: Ensure you have a comprehensive set of app icons in the `/public/icons/` directory. Key sizes include:
    *   `icon-72x72.png`
    *   `icon-96x96.png`
    *   `icon-128x128.png`
    *   `icon-144x144.png`
    *   `icon-152x152.png`
    *   `icon-192x192.png` (maskable recommended)
    *   `icon-384x384.png`
    *   `icon-512x512.png` (maskable recommended)
    *   `apple-touch-icon.png` (typically 180x180 or 192x192)
    *   `icon-16x16.png` and `icon-32x32.png` (for favicons)
*   **Manifest**: The `public/manifest.json` file is configured with necessary PWA properties.
*   **Service Worker**: A service worker (`public/sw.js`) is included for basic offline caching of the app shell and static assets. For more advanced caching, especially with Next.js, consider using a library like `next-pwa` which leverages Workbox.

### Publishing to App Stores

You can package your PWA for submission to app stores like Google Play (Android) and the Apple App Store (iOS). This usually involves wrapping your web app in a native shell.

**General Steps & Tools:**

1.  **Ensure PWA is Solid**:
    *   Your PWA should be installable, work offline (at least the basic shell), be responsive, and perform well.
    *   Test thoroughly using tools like Lighthouse in Chrome DevTools.

2.  **Use a PWA Packaging Tool**:
    *   **PWABuilder ([pwabuilder.com](https://www.pwabuilder.com/))**: This Microsoft-backed tool is excellent for packaging PWAs for various platforms, including:
        *   **Android (Google Play Store)**: PWABuilder can generate a Trusted Web Activity (TWA) project, which is Google's recommended way to list high-quality PWAs in the Play Store.
        *   **iOS (Apple App Store)**: PWABuilder can help create an Xcode project. However, Apple's guidelines are stricter, and your PWA might need to offer significant unique functionality beyond what a website can provide.
        *   **Windows (Microsoft Store)**.
    *   **Capacitor ([capacitorjs.com](https://capacitorjs.com/))**: An open-source project that allows you to build web apps that run natively on iOS, Android, and the Web. It provides more access to native device features if needed.
    *   **Manually wrapping in a WebView**: This is possible but more complex and generally less feature-rich than using dedicated tools.

**Android (Google Play Store) Specifics:**

*   Generate an Android project using PWABuilder (TWA).
*   You'll need Android Studio to build the `.apk` or `.aab` (Android App Bundle) file.
*   Sign your app.
*   Create a Google Play Developer account and submit your app.

**iOS (Apple App Store) Specifics:**

*   Apple's review process for PWAs can be more stringent. Your app needs to feel like a "real" app and not just a website in a container.
*   Use PWABuilder or Capacitor to generate an Xcode project.
*   You'll need a Mac with Xcode and an Apple Developer Program membership.
*   Build and test your app on iOS devices/simulators.
*   Submit to App Store Connect.
*   Consider adding native-like navigation, offline capabilities, and potentially some native features (if using Capacitor) to improve chances of approval.

**Important Considerations:**

*   **Offline Experience**: A robust offline experience is crucial for app store approval.
*   **Performance**: Ensure your PWA loads quickly and performs well.
*   **App Store Guidelines**: Familiarize yourself with the specific guidelines of each app store (Google Play Store and Apple App Store).
*   **Updates**: When you update your web app, users who installed it via an app store wrapper might not get the update immediately. The wrapper might need to be updated and resubmitted, or it might be configured to load the latest web content (common with TWAs).
*   **`next-pwa`**: For a Next.js project, using the `next-pwa` package can simplify service worker generation and PWA configuration, integrating well with the Next.js build process using Workbox. If you adopt `next-pwa`, you would typically remove the manual service worker registration in `layout.tsx` and the `public/sw.js` file, as `next-pwa` handles this.
```