"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut, type User, onAuthStateChanged } from 'firebase/auth';
import AppPageLayout from '@/components/layout/AppPageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, UserCircle, CalendarDays, Palette, BellRing, Settings as SettingsIcon, LogOut } from 'lucide-react';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { requestPermissions } from '@/lib/notification-manager'; // Corrected import name
import { toast } from "@/hooks/use-toast";

const SettingsPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        router.push('/auth/login');
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      router.push('/auth/login');
    } catch (error: any) {
      console.error("Sign Out Failed:", error.message || "Could not sign out.");
      toast({ title: "Sign Out Failed", description: "An error occurred while signing out.", variant: "destructive" });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermissions(); // Use the corrected function name
    if (granted) {
        toast({
            title: 'Notifications Enabled',
            description: 'You will now receive reminders for your habits.',
        });
    } else {
        toast({
            title: 'Notifications Blocked',
            description: 'Please enable notifications in your device or browser settings.',
            variant: 'destructive',
        });
    }
  };

  const accountSettingsItems = [
    { href: '/profile', label: 'Profile', icon: UserCircle },
    { href: '/calendar', label: 'Calendar View', icon: CalendarDays },
  ];

  if (isLoadingAuth || !authUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <AppPageLayout onAddNew={() => router.push('/?action=addHabit')}>
      <div className="flex items-center mb-6">
        <SettingsIcon className="mr-3 h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage preferences and account.</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="animate-card-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
            <CardDescription>Manage your profile and linked data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accountSettingsItems.map((item) => (
              <Link key={item.label} href={item.href} passHref legacyBehavior={false}>
                <Button variant="outline" className="w-full justify-start text-base py-6">
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            ))}
            <Separator className="my-4" />
            <Button onClick={handleSignOut} variant="destructive" className="w-full text-base py-6" disabled={isSigningOut}>
              {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-card-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">App Preferences</CardTitle>
            <CardDescription>Customize the look and feel of Habitual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <Palette className="mr-3 h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-medium">App Theme</Label>
              </div>
              <ThemeToggleButton />
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BellRing className="mr-3 h-5 w-5 text-muted-foreground" />
                  <Label className="text-base font-medium">Reminders</Label>
                </div>
                <Button size="sm" variant="outline" onClick={handleRequestPermission}>
                  Enable Notifications
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 pl-8">
                Click "Enable" to receive reminders for your tasks. You may need to grant permission.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppPageLayout>
  );
};

export default SettingsPage;