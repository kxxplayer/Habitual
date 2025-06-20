// Environment configuration for both web and mobile builds
export const ENV_CONFIG = {
  // Firebase Configuration
  FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyALfOMRMabKD-5S6Y2BMmNsl6TLUz5X8to',
  FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'habitual-ucw41.firebaseapp.com',
  FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'habitual-ucw41',
  FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'habitual-ucw41.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '543466575094',
  FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:543466575094:android:48638380b2bf26a28948d7',
  FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  
  // Google AI Configuration - MUST be set in .env.local
  GOOGLE_AI_KEY: process.env.NEXT_PUBLIC_GOOGLE_AI_KEY || '',
  
  // Check if we're in Capacitor environment
  IS_CAPACITOR: typeof window !== 'undefined' && !!(window as any).Capacitor,
  
  // Check if we're in production
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};

// Validation function
export function validateEnvironment() {
  const missingVars: string[] = [];
  
  if (!ENV_CONFIG.GOOGLE_AI_KEY) {
    missingVars.push('NEXT_PUBLIC_GOOGLE_AI_KEY');
  }
  
  if (missingVars.length > 0) {
    console.warn('Missing environment variables:', missingVars);
    if (ENV_CONFIG.IS_PRODUCTION) {
      console.error('Critical environment variables missing in production');
    }
  }
  
  return missingVars.length === 0;
}