
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// import { getFirestore, type Firestore } from 'firebase/firestore'; // Uncomment if you use Firestore
// import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Uncomment if you use Storage

// Your web app's Firebase configuration
// These values are loaded from your .env.local file
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

// Ensure Firebase is initialized only on the client side or once.
if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} else {
  // Fallback for server-side, though client-side init is primary for Auth
  // This might need adjustment depending on full SSR/SSG strategy for Firebase
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
}


auth = getAuth(app);
// db = getFirestore(app); // Uncomment if you use Firestore
// storage = getStorage(app); // Uncomment if you use Storage

export { app, auth /*, db, storage */ };
