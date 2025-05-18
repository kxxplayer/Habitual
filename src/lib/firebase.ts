
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// import { getFirestore, type Firestore } from 'firebase/firestore'; // Uncomment if you use Firestore
// import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Uncomment if you use Storage

// Your web app's Firebase configuration
// It's highly recommended to store these in environment variables
// For Next.js, prefix them with NEXT_PUBLIC_
// Example .env.local file:
// NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
// NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
// NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id (optional)

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
// let db: Firestore; // Uncomment if you use Firestore
// let storage: FirebaseStorage; // Uncomment if you use Storage

if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
} else if (typeof window !== 'undefined') {
  app = getApp();
} else {
  // Handle server-side case or ensure this only runs on client
  // For simpler client-side only init, the check for getApps().length might be enough.
  // If server-side rendering needs Firebase admin, that's a different setup.
  // For now, this ensures app is initialized only on client.
  // A more robust solution might involve a context or a dedicated init function.
  // Placeholder for app if window is undefined during SSR, may need refinement based on usage
  app = getApps().length ? getApp() : initializeApp(firebaseConfig); // Fallback, careful with SSR
}

auth = getAuth(app);
// db = getFirestore(app); // Uncomment if you use Firestore
// storage = getStorage(app); // Uncomment if you use Storage

export { app, auth /*, db, storage */ }; // Adjust exports based on what you use
