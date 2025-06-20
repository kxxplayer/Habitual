import { auth } from '@/lib/firebase';
import { 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  ActionCodeSettings 
} from 'firebase/auth';
import { ENV_CONFIG } from './env-check';

// Action code settings for email link authentication
const getActionCodeSettings = (): ActionCodeSettings => {
  // Use your Firebase project's hosting domain
  const baseUrl = ENV_CONFIG.IS_PRODUCTION 
    ? `https://${ENV_CONFIG.FIREBASE_PROJECT_ID}.firebaseapp.com`
    : 'http://localhost:3000';

  return {
    // URL must be whitelisted in Firebase Console -> Authentication -> Sign-in method -> Authorized domains
    url: `${baseUrl}/auth/email-link-signin`,
    handleCodeInApp: true, // This must be true for email link authentication
    iOS: {
      bundleId: 'com.grovia.habitual', // Your iOS bundle ID
    },
    android: {
      packageName: 'com.grovia.habitual', // Your Android package name
      installApp: true,
      minimumVersion: '12',
    },
    // Use Firebase Hosting domain instead of Dynamic Links
    dynamicLinkDomain: undefined, // Don't use this - it's deprecated
  };
};

/**
 * Send an authentication link to the user's email
 */
export const sendEmailSignInLink = async (email: string): Promise<void> => {
  try {
    const actionCodeSettings = getActionCodeSettings();
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    
    // Save the email locally to complete sign-in on the same device
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('emailForSignIn', email);
    }
    
    console.log('Email link sent successfully to:', email);
  } catch (error: any) {
    console.error('Error sending email link:', error);
    throw new Error(getEmailLinkErrorMessage(error.code));
  }
};

/**
 * Check if the current URL is a sign-in with email link
 */
export const isEmailLinkSignIn = (url?: string): boolean => {
  const linkToCheck = url || (typeof window !== 'undefined' ? window.location.href : '');
  return isSignInWithEmailLink(auth, linkToCheck);
};

/**
 * Complete the sign-in with email link
 */
export const completeEmailSignIn = async (email: string, emailLink?: string): Promise<void> => {
  try {
    const linkToUse = emailLink || (typeof window !== 'undefined' ? window.location.href : '');
    
    if (!isSignInWithEmailLink(auth, linkToUse)) {
      throw new Error('Invalid email link');
    }

    await signInWithEmailLink(auth, email, linkToUse);
    
    // Clear the email from local storage
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('emailForSignIn');
    }
    
    console.log('Successfully signed in with email link');
  } catch (error: any) {
    console.error('Error completing email sign-in:', error);
    throw new Error(getEmailLinkErrorMessage(error.code));
  }
};

/**
 * Get the stored email for sign-in (if user is completing on same device)
 */
export const getStoredEmailForSignIn = (): string | null => {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('emailForSignIn');
  }
  return null;
};

/**
 * Clear stored email for sign-in
 */
export const clearStoredEmailForSignIn = (): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('emailForSignIn');
  }
};

/**
 * Get user-friendly error messages for email link authentication
 */
const getEmailLinkErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/missing-email':
      return 'Email address is required.';
    case 'auth/invalid-action-code':
      return 'The email link is invalid or has expired. Please request a new one.';
    case 'auth/expired-action-code':
      return 'The email link has expired. Please request a new one.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/operation-not-allowed':
      return 'Email link sign-in is not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password is too weak.';
    case 'auth/too-many-requests':
      return 'Too many requests. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for email link authentication.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}; 