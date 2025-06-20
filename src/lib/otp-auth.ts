import { auth } from '@/lib/firebase';
import { 
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  PhoneAuthProvider,
  signInWithCredential,
  linkWithCredential,
  User
} from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    recaptchaWidgetId?: number;
  }
}

/**
 * Initialize reCAPTCHA verifier for phone authentication
 */
export const initializeRecaptcha = (containerId: string): Promise<RecaptchaVerifier> => {
  return new Promise((resolve, reject) => {
    try {
      // Clean up existing verifier if it exists
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }

      const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'normal',
        callback: (response: string) => {
          console.log('reCAPTCHA solved:', response);
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        },
        'error-callback': (error: any) => {
          console.error('reCAPTCHA error:', error);
          reject(new Error('reCAPTCHA verification failed'));
        }
      });

      // Store verifier globally for cleanup
      window.recaptchaVerifier = recaptchaVerifier;

      // Render the reCAPTCHA
      recaptchaVerifier.render().then((widgetId: number) => {
        window.recaptchaWidgetId = widgetId;
        console.log('reCAPTCHA rendered successfully');
        resolve(recaptchaVerifier);
      }).catch((error) => {
        console.error('Failed to render reCAPTCHA:', error);
        reject(error);
      });

    } catch (error) {
      console.error('Failed to initialize reCAPTCHA:', error);
      reject(error);
    }
  });
};

/**
 * Send OTP to phone number
 */
export const sendOTP = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
  try {
    // Ensure phone number is in international format
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    
    console.log('Sending OTP to:', formattedPhoneNumber);
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, recaptchaVerifier);
    
    console.log('OTP sent successfully');
    return confirmationResult;
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    throw new Error(getOTPErrorMessage(error.code));
  }
};

/**
 * Verify OTP and sign in
 */
export const verifyOTP = async (confirmationResult: ConfirmationResult, otp: string): Promise<User> => {
  try {
    const result = await confirmationResult.confirm(otp);
    console.log('OTP verified successfully:', result.user.phoneNumber);
    return result.user;
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    throw new Error(getOTPErrorMessage(error.code));
  }
};

/**
 * Link phone number to existing account
 */
export const linkPhoneToAccount = async (user: User, phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<void> => {
  try {
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, recaptchaVerifier);
    
    // This would require additional UI to get the OTP
    // For now, we'll just return the confirmation result
    throw new Error('Phone linking requires additional OTP verification step');
  } catch (error: any) {
    console.error('Error linking phone to account:', error);
    throw new Error(getOTPErrorMessage(error.code));
  }
};

/**
 * Clean up reCAPTCHA verifier
 */
export const cleanupRecaptcha = (): void => {
  try {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      delete window.recaptchaVerifier;
    }
    if (window.recaptchaWidgetId !== undefined) {
      delete window.recaptchaWidgetId;
    }
  } catch (error) {
    console.error('Error cleaning up reCAPTCHA:', error);
  }
};

/**
 * Format phone number to international format
 */
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it doesn't start with +, add country code
  if (!phoneNumber.startsWith('+')) {
    // Default to US (+1) if no country code provided
    // You can modify this based on your target regions
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    } else {
      // Return as-is with + prefix for other countries
      return `+${digits}`;
    }
  }
  
  return phoneNumber;
};

/**
 * Validate phone number format
 */
export const validatePhoneNumber = (phoneNumber: string): {
  isValid: boolean;
  formatted: string;
  error?: string;
} => {
  const digits = phoneNumber.replace(/\D/g, '');
  
  if (digits.length < 10) {
    return {
      isValid: false,
      formatted: phoneNumber,
      error: 'Phone number must be at least 10 digits'
    };
  }
  
  if (digits.length > 15) {
    return {
      isValid: false,
      formatted: phoneNumber,
      error: 'Phone number is too long'
    };
  }
  
  const formatted = formatPhoneNumber(phoneNumber);
  
  return {
    isValid: true,
    formatted,
  };
};

/**
 * Get user-friendly error messages for OTP operations
 */
const getOTPErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-phone-number':
      return 'Invalid phone number format. Please enter a valid phone number.';
    case 'auth/missing-phone-number':
      return 'Phone number is required.';
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded. Please try again later.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/operation-not-allowed':
      return 'Phone authentication is not enabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many requests. Please try again later.';
    case 'auth/invalid-verification-code':
      return 'Invalid verification code. Please check and try again.';
    case 'auth/invalid-verification-id':
      return 'Invalid verification ID. Please request a new code.';
    case 'auth/code-expired':
      return 'Verification code has expired. Please request a new one.';
    case 'auth/session-expired':
      return 'Session expired. Please try again.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed. Please try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/app-not-authorized':
      return 'App not authorized for phone authentication.';
    case 'auth/invalid-app-credential':
      return 'Invalid app credentials.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Country codes for phone number input
 */
export const COUNTRY_CODES = [
  { code: '+1', country: 'US/CA', flag: '🇺🇸', name: 'United States / Canada' },
  { code: '+44', country: 'UK', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: '+7', country: 'RU', flag: '🇷🇺', name: 'Russia' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+82', country: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
]; 