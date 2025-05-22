
"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { Loader2, LogOut, ArrowLeft } from 'lucide-react';

const ProfilePage: NextPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        router.push('/auth/login'); // Redirect if not logged in
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      console.log("Signed Out");
      router.push('/auth/login');
    } catch (error: any) {
      console.error("Sign Out Failed:", error.message || "Could not sign out.");
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!user) { // Should be caught by redirect in useEffect, but as a fallback
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader> <CardTitle>Profile Access Denied</CardTitle> </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You need to be logged in to view your profile.</p>
            <Button asChild className="w-full"> <Link href="/auth/login">Go to Login</Link> </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Your Profile</CardTitle>
          <CardDescription>Manage your account details and session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">User Email (ID)</Label>
            <div id="email" className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
              {user.email}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Password</Label>
            <div className="rounded-md border border-dashed border-input bg-input/30 p-3 text-xs text-muted-foreground">
              For security reasons, your password cannot be displayed.
            </div>
          </div>
          <Button onClick={handleSignOut} className="w-full" disabled={isSigningOut}>
            {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Sign Out
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-4 text-sm">
          <Button variant="outline" asChild className="w-full">
            <Link href="/" className="flex items-center"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ProfilePage;
