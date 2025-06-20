"use client";

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Send, ArrowLeft, Target, CheckCircle, KeyRound } from 'lucide-react';
import { sendPasswordReset } from '@/lib/password-reset';

const ForgotPasswordPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await sendPasswordReset(email.trim());
      setSuccess(true);
    } catch (error: any) {
      console.error('Send password reset error:', error);
      setError(error.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setSuccess(false);
    setEmail('');
    setError(null);
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-primary/10 via-background to-accent/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="backdrop-blur-sm bg-card/90 border border-border/50 shadow-2xl">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center space-y-6 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">Check Your Email</h2>
                  <p className="text-muted-foreground">
                    We've sent password reset instructions to <strong>{email}</strong>
                  </p>
                </div>
                
                <div className="w-full space-y-4 pt-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">Next Steps:</h3>
                    <ol className="text-sm text-green-800 dark:text-green-200 space-y-1 list-decimal list-inside">
                      <li>Check your email inbox</li>
                      <li>Click the "Reset Password" link</li>
                      <li>Enter your new password</li>
                      <li>Sign in with your new password</li>
                    </ol>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <p>The reset link will expire in 1 hour for security reasons.</p>
                    <p>Don't see the email? Check your spam folder.</p>
                  </div>
                </div>

                <div className="w-full space-y-3 pt-4">
                  <Button
                    onClick={handleTryAgain}
                    variant="outline"
                    className="w-full h-12 border-2 border-border hover:border-primary/50 bg-background hover:bg-accent/5 transition-all duration-200"
                  >
                    Send to Different Email
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Remember your password?{' '}
                      <Link 
                        href="/auth/login" 
                        className="font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Sign in here
                      </Link>
                    </p>
                  </div>
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
            Reset Password
          </h1>
          <p className="text-muted-foreground">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-card/90 border border-border/50 shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-foreground">Forgot Password?</CardTitle>
            <CardDescription className="text-muted-foreground">
              No worries! We'll help you reset your password
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-8">
            {error && (
              <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <Mail className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSendPasswordReset} className="space-y-6">
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
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Send className="h-4 w-4" />
                    <span>Send Reset Link</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Info section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                Password Reset Process
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• We'll send a secure reset link to your email</li>
                <li>• The link expires in 1 hour for security</li>
                <li>• You can set a new password after clicking the link</li>
                <li>• Your account will remain secure during this process</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or try another method</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="h-12 border-2 border-border hover:border-primary/50 bg-background hover:bg-accent/5 transition-all duration-200"
                >
                  <Link href="/auth/login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Link>
                </Button>
                
                <Button
                  asChild
                  variant="outline"
                  className="h-12 border-2 border-border hover:border-primary/50 bg-background hover:bg-accent/5 transition-all duration-200"
                >
                  <Link href="/auth/email-link">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Link
                  </Link>
                </Button>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground leading-relaxed">
              Having trouble?{' '}
              <a href="#" className="text-primary hover:text-primary/80 transition-colors">
                Contact Support
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage; 