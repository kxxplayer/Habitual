
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBTMmYwSbAjFxnNvIqVsV0MQxjudWEY8KI", // <-- New Key
  authDomain: "habitual-ucw41.firebaseapp.com", // <-- New Auth Domain
  projectId: "habitual-ucw41", // <-- New Project ID
  storageBucket: "habitual-ucw41.firebasestorage.app", // <-- New Storage Bucket
  messagingSenderId: "543466575094", // <-- New Sender ID
  appId: "1:543466575094:web:560f3338f2bfad668948d7", // <-- New App ID
  measurementId: "..." // <-- New Measurement ID
};

let app: FirebaseApp;
if (typeof window !== 'undefined') {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} else {
  // Fallback for server-side if necessary, though auth is client-side
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };

