import { auth } from '@/lib/firebase';
import { 
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  ActionCodeSettings 
} from 'firebase/auth';
import { ENV_CONFIG } from './env-check';

// Action code settings for password reset emails
const getPasswordResetActionCodeSettings = (): ActionCodeSettings => {
  const baseUrl = ENV_CONFIG.IS_PRODUCTION 
    ? `https://${ENV_CONFIG.FIREBASE_PROJECT_ID}.firebaseapp.com`
    : 'http://localhost:3000';

  return {
    // URL where users will be redirected to reset their password
    url: `${baseUrl}/auth/reset-password`,
    handleCodeInApp: true,
    iOS: {
      bundleId: 'com.grovia.habitual',
    },
    android: {
      packageName: 'com.grovia.habitual',
      installApp: true,
      minimumVersion: '12',
    },
  };
};

/**
 * Send a password reset email to the user
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    const actionCodeSettings = getPasswordResetActionCodeSettings();
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    
    console.log('Password reset email sent successfully to:', email);
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    throw new Error(getPasswordResetErrorMessage(error.code));
  }
};

/**
 * Verify a password reset code
 */
export const verifyPasswordResetToken = async (code: string): Promise<string> => {
  try {
    const email = await verifyPasswordResetCode(auth, code);
    console.log('Password reset code verified for:', email);
    return email;
  } catch (error: any) {
    console.error('Error verifying password reset code:', error);
    throw new Error(getPasswordResetErrorMessage(error.code));
  }
};

/**
 * Complete the password reset with new password
 */
export const completePasswordReset = async (code: string, newPassword: string): Promise<void> => {
  try {
    await confirmPasswordReset(auth, code, newPassword);
    console.log('Password reset completed successfully');
  } catch (error: any) {
    console.error('Error completing password reset:', error);
    throw new Error(getPasswordResetErrorMessage(error.code));
  }
};

/**
 * Get user-friendly error messages for password reset operations
 */
const getPasswordResetErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/missing-email':
      return 'Email address is required.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/invalid-action-code':
      return 'The password reset link is invalid or has expired. Please request a new one.';
    case 'auth/expired-action-code':
      return 'The password reset link has expired. Please request a new one.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password (at least 6 characters).';
    case 'auth/too-many-requests':
      return 'Too many password reset requests. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for password reset.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Password strength validation
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  strength: number;
  label: string;
  color: string;
  requirements: string[];
} => {
  const requirements = [];
  let strength = 0;

  if (password.length >= 6) {
    strength++;
  } else {
    requirements.push('At least 6 characters');
  }

  if (password.length >= 8) {
    strength++;
  } else if (password.length >= 6) {
    requirements.push('8+ characters recommended');
  }

  if (/[A-Z]/.test(password)) {
    strength++;
  } else {
    requirements.push('One uppercase letter');
  }

  if (/[0-9]/.test(password)) {
    strength++;
  } else {
    requirements.push('One number');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    strength++;
  } else {
    requirements.push('One special character');
  }

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  return {
    isValid: password.length >= 6,
    strength: Math.min(strength, 5),
    label: labels[Math.min(strength - 1, 4)] || 'Very Weak',
    color: colors[Math.min(strength - 1, 4)] || 'bg-red-500',
    requirements: requirements,
  };
}; 