
"use client";

import * as React from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut, type User, onAuthStateChanged } from 'firebase/auth';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, UserCircle, CalendarDays, BellRing, Palette, Bell, Settings as SettingsIcon, LogOut, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';
import { Label } from '@/components/ui/label';
import AppImprovementDialog from '@/components/app_suggestions/AppImprovementDialog';
import { Separator } from '@/components/ui/separator';

const SettingsPage: NextPage = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission | null>(null);
  const [isAppImprovementDialogOpen, setIsAppImprovementDialogOpen] = React.useState(false);

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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      console.log("Signed Out from Settings");
      router.push('/auth/login');
    } catch (error: any) {
      console.error("Sign Out Failed:", error.message || "Could not sign out.");
    } finally {
      setIsSigningOut(false); 
    }
  };

  const accountSettingsItems = [
    { href: '/profile', label: 'Profile', icon: UserCircle },
    { href: '/calendar', label: 'Calendar View', icon: CalendarDays },
  ];

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 h-[97vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 h-[97vh]">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4 h-[97vh]">
      <div className={cn(
        "bg-card/95 backdrop-blur-sm text-foreground shadow-xl rounded-xl flex flex-col mx-auto h-full",
        "w-full max-w-sm",     
        "md:max-w-md",                   
        "lg:max-w-lg"                     
      )}>
        <AppHeader />
        <ScrollArea className="flex-grow min-h-0">
          <div className="flex flex-col min-h-full">
            <main className="px-3 sm:px-4 py-4 flex-grow">
              <div className="flex items-center mb-4">
                <SettingsIcon className="mr-3 h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold text-primary">Settings</h2>
                  <p className="text-sm text-muted-foreground">Manage preferences and account.</p>
                </div>
              </div>

              <Card className="mb-4 shadow-md rounded-lg">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-semibold text-primary">Account &amp; Data</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-2">
                  {accountSettingsItems.map((item) => (
                    <Link key={item.label} href={item.href} passHref legacyBehavior={false}>
                      <Button variant="outline" className="w-full justify-start text-sm py-2 h-auto">
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                  <Separator className="my-2" />
                  <Button onClick={handleSignOut} variant="destructive" className="w-full text-sm py-2 h-auto" disabled={isSigningOut}>
                    {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                    Sign Out
                  </Button>
                </CardContent>
              </Card>

              <Card className="mb-4 shadow-md rounded-lg">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-semibold text-primary">App Preferences</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-sm py-2 h-auto"
                    onClick={() => setIsAppImprovementDialogOpen(true)}
                  >
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    AI App Advisor
                  </Button>
                  <div className="p-3 border rounded-md space-y-1.5 bg-background shadow-sm">
                    <Label className="text-sm font-medium flex items-center"><Palette className="mr-2 h-4 w-4" />Change Theme</Label>
                    <ThemeToggleButton />
                    <p className="text-xs text-muted-foreground">Cycle through available app themes.</p>
                  </div>
                  <div className="p-3 border rounded-md space-y-1.5 bg-background shadow-sm">
                    <Label className="text-sm font-medium flex items-center"><BellRing className="mr-2 h-4 w-4" />Reminders</Label>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs">
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
                        <Button size="sm" variant="outline" onClick={handleRequestNotificationPermission} className="w-full text-xs h-8">
                            Enable Notifications
                        </Button>
                    )}
                    {notificationPermission === 'denied' && <p className="text-xs text-muted-foreground mt-1">Notifications are blocked. Please enable them in your browser settings.</p>}
                    {notificationPermission === 'granted' && <p className="text-xs text-muted-foreground mt-1">Reminders can be set per habit.</p>}
                  </div>
                </CardContent>
              </Card>

            </main>
            <footer className="py-3 text-center text-xs text-muted-foreground border-t shrink-0 mt-auto">
              <p>&copy; {new Date().getFullYear()} Habitual.</p>
            </footer>
          </div>
        </ScrollArea>
        <BottomNavigationBar />
      </div>
    </div>
    <AppImprovementDialog 
        isOpen={isAppImprovementDialogOpen} 
        onClose={() => setIsAppImprovementDialogOpen(false)} 
    />
    </>
  );
};

export default SettingsPage;
