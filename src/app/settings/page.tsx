
"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, UserCircle, CalendarDays, BellRing, Palette, Bell, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';
import { Label } from '@/components/ui/label'; // Added import

const SettingsPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission | null>(null);

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
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('denied');
    }
  }, []);

  const handleRequestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
          console.log('Notification permission status:', permission);
        });
      }
    }
  };

  const settingsItems = [
    { href: '/profile', label: 'Profile', icon: UserCircle },
    { href: '/calendar', label: 'Calendar View', icon: CalendarDays },
  ];

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
     <div className={cn(
        "min-h-screen p-2 sm:p-4 flex items-center justify-center",
      )}>
      <div className={cn(
        "bg-card text-foreground shadow-xl rounded-xl flex flex-col overflow-hidden mx-auto",
        "w-full max-w-md h-full max-h-[90vh] sm:max-h-[850px]",
        "md:max-w-lg md:max-h-[85vh]",
        "lg:max-w-2xl lg:max-h-[80vh]"
      )}>
        <header className="p-4 border-b">
           <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary flex items-center">
              <SettingsIcon className="mr-2 h-5 w-5" /> Settings
            </h1>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-1 h-4 w-4" /> Home
              </Link>
            </Button>
          </div>
        </header>
        <div className="flex-grow overflow-y-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">App Settings</CardTitle>
              <CardDescription>Manage your application preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsItems.map((item) => (
                <Link key={item.label} href={item.href} passHref legacyBehavior>
                  <a className={cn(buttonVariants({variant: "outline"}), "w-full justify-start text-base py-3")}>
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </a>
                </Link>
              ))}

              <div className="p-3 border rounded-md space-y-2">
                <Label className="text-base font-medium flex items-center"><Palette className="mr-3 h-5 w-5" />Change Theme</Label>
                <ThemeToggleButton />
                <p className="text-xs text-muted-foreground">Cycle through available app themes.</p>
              </div>
              
              <div className="p-3 border rounded-md space-y-2">
                <Label className="text-base font-medium flex items-center"><BellRing className="mr-3 h-5 w-5" />Reminders</Label>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm">
                        <Bell className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Notification Status:</span>
                        <span className={cn("ml-1 font-semibold", 
                            notificationPermission === 'granted' ? 'text-green-600' :
                            notificationPermission === 'denied' ? 'text-red-600' : 'text-yellow-600'
                        )}>
                            {notificationPermission ? notificationPermission.charAt(0).toUpperCase() + notificationPermission.slice(1) : 'Checking...'}
                        </span>
                    </div>
                </div>
                {(notificationPermission === 'default' || notificationPermission === 'denied') && (
                    <Button size="sm" variant="outline" onClick={handleRequestNotificationPermission} className="w-full">
                        Enable Notifications
                    </Button>
                )}
                {notificationPermission === 'denied' && <p className="text-xs text-muted-foreground mt-1">Notifications are blocked. Please enable them in your browser settings for Habitual to send reminders.</p>}
                 {notificationPermission === 'granted' && <p className="text-xs text-muted-foreground mt-1">Reminders can be set per habit from the habit's menu.</p>}
              </div>

            </CardContent>
          </Card>
        </div>
         <footer className="py-3 text-center text-xs text-muted-foreground border-t">
            <p>&copy; {new Date().getFullYear()} Habitual.</p>
        </footer>
      </div>
    </div>
  );
};

export default SettingsPage;
