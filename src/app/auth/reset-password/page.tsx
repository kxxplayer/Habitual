"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Target, KeyRound } from 'lucide-react';
import { verifyPasswordResetToken, completePasswordReset, validatePasswordStrength } from '@/lib/password-reset';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Monitor authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && success) {
        // User is signed in after password reset
        console.log('Password reset successful, user signed in:', user.email);
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router, success]);

  // Verify the reset code on component mount
  useEffect(() => {
    const verifyCode = async () => {
      const resetCode = searchParams.get('oobCode');
      
      if (!resetCode) {
        setError('Invalid password reset link. Please request a new one.');
        setIsLoading(false);
        return;
      }

      try {
        const userEmail = await verifyPasswordResetToken(resetCode);
        setEmail(userEmail);
        setCode(resetCode);
      } catch (error: any) {
        console.error('Password reset code verification error:', error);
        setError(error.message || 'Invalid or expired reset link. Please request a new one.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyCode();
  }, [searchParams]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter a new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      await completePasswordReset(code, password);
      setSuccess(true);
    } catch (error: any) {
      console.error('Password reset completion error:', error);
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const passwordValidation = validatePasswordStrength(password);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-primary/10 via-background to-accent/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-primary/10 via-background to-accent/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="backdrop-blur-sm bg-card/90 border border-border/50 shadow-2xl">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Password Reset Successful!</h2>
                <p className="text-muted-foreground">
                  Your password has been updated. You'll be redirected to your dashboard shortly.
                </p>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redirecting...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state or reset form
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
            Set New Password
          </h1>
          <p className="text-muted-foreground">
            {email ? `Reset password for ${email}` : 'Create a strong new password'}
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-card/90 border border-border/50 shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-foreground">
              {error && !email ? 'Reset Link Invalid' : 'New Password'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {error && !email 
                ? 'There was an issue with your reset link'
                : 'Choose a strong password for your account'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-8">
            {error && (
              <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {email && !error ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your new password"
                      className="pl-10 pr-10 h-12 bg-background border-2 border-border focus:border-primary"
                      required
                      disabled={isResetting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password strength indicator */}
                  {password && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={cn("h-2 rounded-full transition-all duration-300", passwordValidation.color)}
                            style={{ width: `${(passwordValidation.strength / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground min-w-16">
                          {passwordValidation.label}
                        </span>
                      </div>
                      {passwordValidation.requirements.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Missing: {passwordValidation.requirements.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="pl-10 pr-10 h-12 bg-background border-2 border-border focus:border-primary"
                      required
                      disabled={isResetting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-sm text-red-500">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isResetting || !password || !confirmPassword || password !== confirmPassword || !passwordValidation.isValid}
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isResetting ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Resetting Password...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <KeyRound className="h-4 w-4" />
                      <span>Reset Password</span>
                    </div>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Button
                  asChild
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Link href="/auth/forgot-password">
                    Request New Reset Link
                  </Link>
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Or{' '}
                    <Link 
                      href="/auth/login" 
                      className="font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      back to sign in
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage; 