"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut, type User, onAuthStateChanged } from 'firebase/auth';
import AppPageLayout from '@/components/layout/AppPageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, UserCircle, Palette, BellRing, LogOut, CheckCircle, XCircle } from 'lucide-react';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';
import { Label } from '@/components/ui/label';
import { requestNotificationPermission, isNotificationSupported, getNotificationPermission } from '@/lib/notification-manager';
import { useToast } from '@/hooks/use-toast';

const SettingsPage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = React.useState(false);
  const [notificationStatus, setNotificationStatus] = React.useState<'unsupported' | 'default' | 'granted' | 'denied'>('default');

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

  React.useEffect(() => {
    // Check notification permission status on mount
    if (isNotificationSupported()) {
      setNotificationStatus(getNotificationPermission() as any);
    } else {
      setNotificationStatus('unsupported');
    }
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      router.push('/auth/login');
    } catch (error: any) {
      console.error("Sign Out Failed:", error.message || "Could not sign out.");
      toast({
        title: 'Sign Out Failed',
        description: error.message || 'Could not sign out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleEnableNotifications = async () => {
    setIsEnablingNotifications(true);
    
    try {
      const result = await requestNotificationPermission();
      
      if (result.success) {
        toast({
          title: 'Notifications Enabled!',
          description: result.message,
        });
        setNotificationStatus('granted');
      } else {
        toast({
          title: 'Error Enabling Notifications',
          description: result.error,
          variant: 'destructive',
        });
        // Update status based on current permission
        setNotificationStatus(getNotificationPermission() as any);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: 'Error Enabling Notifications',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  const getNotificationButtonText = () => {
    switch (notificationStatus) {
      case 'granted':
        return 'Notifications Enabled';
      case 'denied':
        return 'Enable in Browser Settings';
      case 'unsupported':
        return 'Not Supported';
      default:
        return 'Enable Notifications';
    }
  };

  const getNotificationStatusIcon = () => {
    switch (notificationStatus) {
      case 'granted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'unsupported':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <BellRing className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationDescription = () => {
    switch (notificationStatus) {
      case 'granted':
        return "You'll receive reminders for your habits.";
      case 'denied':
        return "Notifications are blocked. Please enable them in your browser settings.";
      case 'unsupported':
        return "Your browser doesn't support push notifications.";
      default:
        return "Click 'Enable' to receive reminders for your tasks. You may need to grant permission in your browser.";
    }
  };

  if (isLoadingAuth) {
    return (
      <AppPageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout>
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-2xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and app preferences.
          </p>
        </div>

        <Card className="animate-card-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <UserCircle className="mr-2 h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>Manage your account settings and data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base font-medium">Email</Label>
                <p className="text-sm text-muted-foreground">{authUser?.email}</p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full"
            >
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
                  {getNotificationStatusIcon()}
                  <div className="ml-3">
                    <Label className="text-base font-medium">Reminders</Label>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant={notificationStatus === 'granted' ? 'default' : 'outline'}
                  onClick={handleEnableNotifications}
                  disabled={isEnablingNotifications || notificationStatus === 'unsupported' || notificationStatus === 'denied'}
                >
                  {isEnablingNotifications && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {getNotificationButtonText()}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 pl-7">
                {getNotificationDescription()}
              </p>
              {notificationStatus === 'denied' && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 pl-7">
                  Go to your browser settings → Site Settings → Notifications to enable.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppPageLayout>
  );
};

export default SettingsPage;