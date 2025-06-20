"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Phone, MessageSquare, ArrowLeft, Target, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { 
  initializeRecaptcha, 
  sendOTP, 
  verifyOTP, 
  cleanupRecaptcha, 
  validatePhoneNumber,
  COUNTRY_CODES 
} from '@/lib/otp-auth';
import { onAuthStateChanged, type ConfirmationResult, type RecaptchaVerifier } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';

const OTPLoginPage = () => {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [isRecaptchaLoaded, setIsRecaptchaLoaded] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isDevMode, setIsDevMode] = useState(false);

  // Monitor authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && step === 'success') {
        console.log('User authenticated via OTP, redirecting to home:', user.phoneNumber);
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router, step]);

  // Initialize reCAPTCHA on component mount
  useEffect(() => {
    const setupRecaptcha = async () => {
      try {
        // Wait a bit for the DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const verifier = await initializeRecaptcha('recaptcha-container', isDevMode);
        setRecaptchaVerifier(verifier);
        setIsRecaptchaLoaded(true);
        setError(null); // Clear any previous errors
      } catch (error: any) {
        console.error('Failed to initialize reCAPTCHA:', error);
        setError(error.message || 'Failed to initialize security verification. Please refresh the page.');
        setIsRecaptchaLoaded(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(setupRecaptcha, 200);

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      cleanupRecaptcha();
    };
  }, [isDevMode]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !recaptchaVerifier) return;

    const phoneValidation = validatePhoneNumber(countryCode + phoneNumber);
    if (!phoneValidation.isValid) {
      setError(phoneValidation.error || 'Invalid phone number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await sendOTP(phoneValidation.formatted, recaptchaVerifier);
      setConfirmationResult(result);
      setStep('otp');
      setResendTimer(60); // 60 second cooldown
      console.log('OTP sent to:', phoneValidation.formatted);
    } catch (error: any) {
      console.error('Send OTP error:', error);
      setError(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || !confirmationResult) return;

    setIsLoading(true);
    setError(null);

    try {
      const user = await verifyOTP(confirmationResult, otp);
      setStep('success');
      console.log('OTP verified successfully for:', user.phoneNumber);
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      setError(error.message || 'Invalid OTP. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!recaptchaVerifier || resendTimer > 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const phoneValidation = validatePhoneNumber(countryCode + phoneNumber);
      const result = await sendOTP(phoneValidation.formatted, recaptchaVerifier);
      setConfirmationResult(result);
      setResendTimer(60);
      console.log('OTP resent to:', phoneValidation.formatted);
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      setError(error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtp('');
      setError(null);
    } else {
      router.push('/auth/login');
    }
  };

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-primary/10 via-background to-accent/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="backdrop-blur-sm bg-card/90 border border-border/50 shadow-2xl">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Phone Verified!</h2>
                <p className="text-muted-foreground">
                  You've successfully signed in with your phone number.
                </p>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redirecting to your dashboard...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-primary/10 via-background to-accent/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 dark:bg-primary/10 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-accent/20 dark:bg-accent/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-32 left-32 w-28 h-28 bg-primary/15 dark:bg-primary/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-36 h-36 bg-accent/15 dark:bg-accent/5 rounded-full blur-xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-2xl mb-4 shadow-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            {step === 'phone' ? 'Phone Sign In' : 'Verify OTP'}
          </h1>
          <p className="text-muted-foreground">
            {step === 'phone' 
              ? 'Enter your phone number to receive a verification code'
              : 'Enter the 6-digit code sent to your phone'
            }
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-card/90 border border-border/50 shadow-2xl">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2 h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <CardTitle className="text-2xl font-semibold text-foreground">
                  {step === 'phone' ? 'Enter Phone Number' : 'Verify Code'}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {step === 'phone' 
                    ? 'We\'ll send you a secure verification code'
                    : `Code sent to ${countryCode} ${phoneNumber}`
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-8">
            {error && (
              <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {step === 'phone' ? (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                    Phone Number
                  </Label>
                  <div className="flex space-x-2">
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="w-24 h-12 bg-background border-2 border-border focus:border-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map((country) => (
                          <SelectItem value={country.code} key={country.code}>
                            <div className="flex items-center space-x-2">
                              <span>{country.flag}</span>
                              <span>{country.code}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1 relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Enter your phone number"
                        className="pl-10 h-12 bg-background border-2 border-border focus:border-primary"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Format: {countryCode === '+91' ? '98765 43210' : countryCode === '+1' ? '(555) 123-4567' : 'Enter without country code'}
                  </p>
                </div>

                {/* reCAPTCHA container */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Security Verification</Label>
                  <div 
                    id="recaptcha-container" 
                    className="flex justify-center p-4 border-2 border-dashed border-border rounded-lg bg-background/50 min-h-[78px]"
                  >
                    {!isRecaptchaLoaded && !error && (
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading security verification...</span>
                      </div>
                    )}
                    {error && !isRecaptchaLoaded && (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">Security verification failed</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setError(null);
                            setIsRecaptchaLoaded(false);
                            try {
                              await new Promise(resolve => setTimeout(resolve, 100));
                              const verifier = await initializeRecaptcha('recaptcha-container', isDevMode);
                              setRecaptchaVerifier(verifier);
                              setIsRecaptchaLoaded(true);
                            } catch (error: any) {
                              setError(error.message || 'Failed to initialize security verification.');
                            }
                          }}
                          className="text-xs"
                        >
                          Try Again
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !phoneNumber.trim() || !isRecaptchaLoaded}
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending Code...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Send Verification Code</span>
                    </div>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium text-foreground">
                    Verification Code
                  </Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      className="pl-10 h-12 bg-background border-2 border-border focus:border-primary text-center text-lg tracking-widest font-mono"
                      maxLength={6}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the 6-digit code sent to your phone
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Verify Code</span>
                    </div>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Didn't receive the code?
                  </p>
                  <Button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0 || isLoading}
                    variant="outline"
                    className="h-10 border-2 border-border hover:border-primary/50 bg-background hover:bg-accent/5 transition-all duration-200"
                  >
                    {resendTimer > 0 ? (
                      <span>Resend in {resendTimer}s</span>
                    ) : (
                      <span>Resend Code</span>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Enhanced info section with testing guide */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                Phone Authentication Setup
              </h3>
              
              <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                <div>
                  <p className="font-medium mb-1">🔒 Security Features:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• Your phone number is kept secure and private</li>
                    <li>• Verification codes expire after 5 minutes</li>
                    <li>• SMS rates may apply from your carrier</li>
                  </ul>
                </div>
                
                <div>
                  <p className="font-medium mb-1">🧪 For Testing:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• Enable development mode below for test numbers</li>
                    <li>• Configure test numbers in Firebase Console</li>
                    <li>• No SMS charges during testing</li>
                  </ul>
                </div>
                
                <div>
                  <p className="font-medium mb-1">⚙️ Firebase Console Setup:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• Authentication → Sign-in method → Phone enabled</li>
                    <li>• Add test numbers in "Phone numbers for testing"</li>
                    <li>• Ensure localhost is in authorized domains</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Development mode toggle */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    🛠️ Development Mode
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDevMode(!isDevMode)}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                      isDevMode ? "bg-yellow-600" : "bg-gray-300 dark:bg-gray-600"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                        isDevMode ? "translate-x-5" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
                
                {isDevMode && (
                  <div className="space-y-2">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Bypasses reCAPTCHA for testing. Use these test numbers:
                    </p>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="bg-yellow-100 dark:bg-yellow-800/30 p-2 rounded">
                        <span className="font-medium">🇮🇳 India:</span> +91 98765-43210 (Code: 123456)
                      </div>
                      <div className="bg-yellow-100 dark:bg-yellow-800/30 p-2 rounded">
                        <span className="font-medium">🇺🇸 US:</span> +1 650-555-3434 (Code: 123456)
                      </div>
                    </div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Configure these in Firebase Console → Authentication → Phone numbers for testing
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Prefer a different method?{' '}
                <Link 
                  href="/auth/login" 
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Back to all options
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OTPLoginPage; 