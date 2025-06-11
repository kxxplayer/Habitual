"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppPageLayout from '@/components/layout/AppPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Loader2, UserCircle2 } from 'lucide-react';

const ProfilePage: NextPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        router.push('/auth/login');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <AppPageLayout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </AppPageLayout>
    );
  }

  if (!user) {
    return (
      <AppPageLayout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout onAddNew={() => router.push('/?action=addHabit')}>
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center">
            <UserCircle2 className="mr-2 h-6 w-6 text-primary" /> Your Profile
          </CardTitle>
          <CardDescription>View your account details.</CardDescription>
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
        </CardContent>
      </Card>
    </AppPageLayout>
  );
};

export default ProfilePage;