"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

// Import correct Firebase modules
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { requestPermissions } from '@/lib/notification-manager';
import { toast } from '@/hooks/use-toast';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';
import { Loader2 } from 'lucide-react';

const SettingsPage: NextPage = () => {
    const router = useRouter();
    // State for user and loading status
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const { theme } = useTheme();

    // Use Firebase's onAuthStateChanged to get the current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/auth/login');
            }
            setLoading(false);
        });
        
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [router]);
    
    const handleRequestPermission = async () => {
        const granted = await requestPermissions();
        setNotificationsEnabled(granted);
        if (granted) {
            toast({
                title: 'Notifications Enabled',
                description: 'You will now receive reminders for your habits.',
            });
        } else {
            toast({
                title: 'Notifications Blocked',
                description: 'Please enable notifications in your device settings.',
                variant: 'destructive',
            });
        }
    };

    // Implement logout using Firebase signOut
    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/auth/login');
        } catch (error) {
            console.error("Error signing out: ", error);
            toast({
                title: 'Logout Failed',
                description: 'An error occurred while signing out.',
                variant: 'destructive',
            });
        }
    };
    
    if (loading || !user) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>Manage your account and app settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Account</h3>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                            <span id="email" className="text-sm">{user.email}</span>
                        </div>
                         <Button variant="outline" onClick={handleLogout} className="w-full">
                            Sign Out
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Theme</h3>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <Label htmlFor="theme-switcher">
                                Appearance
                                <p className="text-xs text-muted-foreground">Switch between light and dark mode.</p>
                            </Label>
                            <ThemeToggleButton />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Notifications</h3>
                        <Separator />
                        <div className="flex items-center justify-between">
                             <Label htmlFor="notification-switch">
                                Enable Reminders
                                <p className="text-xs text-muted-foreground">Get notifications for your habits.</p>
                            </Label>
                             <Switch
                                id="notification-switch"
                                checked={notificationsEnabled}
                                onCheckedChange={handleRequestPermission}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SettingsPage;