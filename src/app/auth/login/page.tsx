
"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleIcon } from '@/components/ui/icons';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { Loader2, Mail, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: NextPage = () => {
  const router = useRouter();
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onEmailLogin: SubmitHandler<LoginFormValues> = async (data) => {
    setIsEmailLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      console.log("Login Successful!");
      router.push('/');
    } catch (error: any) {
      console.error("Login Failed:", error.message || "Invalid email or password.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      console.log("Google Login Successful!");
      router.push('/');
    } catch (error: any) {
      console.error("Google Sign-In Failed:", error.message || "Could not sign in with Google.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription className="font-light">Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onEmailLogin)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="m@example.com" {...register("email")} className="pl-10" />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" {...register("password")} className="pl-10" />
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button variant="neutralBlue" type="submit" className="w-full" disabled={isEmailLoading}>
              {isEmailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </CardContent>
        </form>
        <CardContent className="pb-4 pt-0">
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"> <span className="w-full border-t" /> </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground"> Or continue with </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
            {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
            Login with Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 text-sm">
          <Link href="/auth/register" className="text-primary hover:underline">
            Don&apos;t have an account? Sign Up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
