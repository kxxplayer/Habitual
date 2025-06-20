import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, linkWithPopup, signInWithCredential, type User, type UserCredential } from 'firebase/auth';
import { auth } from './firebase';

/**
 * Google authentication service for web and Capacitor
 */

// Create Google Auth Provider instance
const googleProvider = new GoogleAuthProvider();

// Configure Google Auth Provider
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Set custom parameters
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in with Google using popup (recommended for web)
 */
export const signInWithGooglePopup = async (): Promise<UserCredential> => {
  try {
    console.log('🔄 Starting Google sign-in with popup...');
    
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    console.log('✅ Google sign-in successful:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    });
    
    return result;
  } catch (error: any) {
    console.error('❌ Google sign-in popup failed:', error);
    throw new Error(getGoogleAuthErrorMessage(error.code));
  }
};

/**
 * Sign in with Google using redirect (better for mobile/Capacitor)
 */
export const signInWithGoogleRedirect = async (): Promise<void> => {
  try {
    console.log('🔄 Starting Google sign-in with redirect...');
    await signInWithRedirect(auth, googleProvider);
  } catch (error: any) {
    console.error('❌ Google sign-in redirect failed:', error);
    throw new Error(getGoogleAuthErrorMessage(error.code));
  }
};

/**
 * Get result from Google redirect sign-in
 */
export const getGoogleRedirectResult = async (): Promise<UserCredential | null> => {
  try {
    console.log('🔄 Checking for Google redirect result...');
    
    const result = await getRedirectResult(auth);
    
    if (result) {
      const user = result.user;
      console.log('✅ Google redirect sign-in successful:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
    } else {
      console.log('ℹ️ No Google redirect result found');
    }
    
    return result;
  } catch (error: any) {
    console.error('❌ Google redirect result failed:', error);
    throw new Error(getGoogleAuthErrorMessage(error.code));
  }
};

/**
 * Sign in with Google using redirect method (for mobile/Capacitor apps)
 */
export const signInWithGoogleCapacitor = async (): Promise<UserCredential | null> => {
  try {
    console.log('🔄 Starting Google sign-in with redirect for mobile...');
    
    // Use redirect method for mobile devices
    await signInWithGoogleRedirect();
    
    // Return null as the result will be available via getGoogleRedirectResult
    console.log('🔄 Redirect initiated, result will be available via getGoogleRedirectResult');
    return null;
  } catch (error: any) {
    console.error('❌ Google sign-in with redirect failed:', error);
    throw new Error(getGoogleAuthErrorMessage(error.code) || error.message);
  }
};

/**
 * Auto sign-in with Google (uses Capacitor plugin for mobile, popup for web)
 */
export const signInWithGoogle = async (): Promise<UserCredential | null> => {
  try {
    // Detect if we're in a Capacitor environment
    const isCapacitor = !!(window as any).Capacitor;
    
    if (isCapacitor) {
      console.log('📱 Capacitor detected, using native Google Auth');
      return await signInWithGoogleCapacitor();
    } else {
      console.log('🌐 Web environment detected, using popup method');
      return await signInWithGooglePopup();
    }
  } catch (error: any) {
    console.error('❌ Google sign-in failed:', error);
    
    // If popup fails (blocked), try redirect as fallback
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      console.log('🔄 Popup blocked, falling back to redirect...');
      await signInWithGoogleRedirect();
      return null;
    }
    
    throw error;
  }
};

/**
 * Link Google account to existing user
 */
export const linkGoogleAccount = async (user: User): Promise<UserCredential> => {
  try {
    console.log('🔄 Linking Google account to existing user...');
    
    const result = await linkWithPopup(user, googleProvider);
    console.log('✅ Google account linked successfully');
    
    return result;
  } catch (error: any) {
    console.error('❌ Google account linking failed:', error);
    throw new Error(getGoogleAuthErrorMessage(error.code));
  }
};

/**
 * Get user-friendly error messages for Google Auth errors
 */
const getGoogleAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups for this site and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in popup is already open. Please close it and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email address but different sign-in credentials. Please sign in using your original method.';
    case 'auth/credential-already-in-use':
      return 'This Google account is already linked to another user.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled. Please contact support.';
    case 'auth/invalid-credential':
      return 'The Google sign-in credential is invalid or expired. Please try again.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/network-request-failed':
      return 'Network error occurred. Please check your internet connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait a moment and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in. Please contact support.';
    default:
      return `Google sign-in failed: ${errorCode}. Please try again.`;
  }
}; 