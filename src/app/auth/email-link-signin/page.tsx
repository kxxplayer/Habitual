"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, CheckCircle, AlertCircle, Target } from 'lucide-react';
import { 
  isEmailLinkSignIn, 
  completeEmailSignIn, 
  getStoredEmailForSignIn, 
  clearStoredEmailForSignIn 
} from '@/lib/email-link-auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const EmailLinkSignInPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);

  // Monitor authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && success) {
        // User is signed in and we just completed the email link sign-in
        console.log('Email link sign-in successful, redirecting to home:', user.email);
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router, success]);

  useEffect(() => {
    const handleEmailLinkSignIn = async () => {
      try {
        // Check if this is an email link sign-in
        if (!isEmailLinkSignIn()) {
          setError('Invalid sign-in link. Please check your email and try again.');
          setIsLoading(false);
          return;
        }

        // Try to get the stored email first
        const storedEmail = getStoredEmailForSignIn();
        
        if (storedEmail) {
          // Complete sign-in automatically with stored email
          setEmail(storedEmail);
          await completeEmailSignIn(storedEmail);
          setSuccess(true);
        } else {
          // Need user to provide email
          setNeedsEmail(true);
        }
      } catch (error: any) {
        console.error('Email link sign-in error:', error);
        setError(error.message || 'Failed to complete sign-in. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    handleEmailLinkSignIn();
  }, []);

  const handleManualEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      await completeEmailSignIn(email.trim());
      setSuccess(true);
    } catch (error: any) {
      console.error('Manual email sign-in error:', error);
      setError(error.message || 'Failed to complete sign-in. Please check your email and try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleTryAgain = () => {
    clearStoredEmailForSignIn();
    router.push('/auth/email-link');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-primary/10 via-background to-accent/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Completing sign-in...</p>
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
                <h2 className="text-2xl font-semibold text-foreground">Sign-in Successful!</h2>
                <p className="text-muted-foreground">
                  Welcome to GroviaHabits. You'll be redirected to your dashboard shortly.
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
            Complete Sign-in
          </h1>
          <p className="text-muted-foreground">
            {needsEmail ? 'Enter your email to complete sign-in' : 'Completing your email link sign-in'}
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-card/90 border border-border/50 shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-foreground">
              {needsEmail ? 'Verify Your Email' : 'Sign-in Error'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {needsEmail 
                ? 'Please enter the email address where you received the sign-in link'
                : 'There was an issue completing your sign-in'
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

            {needsEmail ? (
              <form onSubmit={handleManualEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="pl-10 h-12 bg-background border-2 border-border focus:border-primary"
                      required
                      disabled={isSigningIn}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSigningIn || !email.trim()}
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isSigningIn ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Completing Sign-in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Complete Sign-in</span>
                    </div>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleTryAgain}
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Request New Sign-in Link
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Or try signing in with{' '}
                    <a 
                      href="/auth/login" 
                      className="font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      email and password
                    </a>
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

export default EmailLinkSignInPage; 