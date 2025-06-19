"use client";

import Link from 'next/link';
import { Target, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import React from 'react';

const AppHeader = () => {
  const pathname = usePathname();

  React.useEffect(() => {
    if (Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      });

      PushNotifications.addListener('registration', token => {
        // Send token to your backend
      });

      PushNotifications.addListener('pushNotificationReceived', notification => {
        // Handle notification
      });
    }
    // No PushNotifications on web
  }, []);

  return (
    <header 
      className="shrink-0 sticky top-0 z-40 w-full bg-background/80 backdrop-blur-sm border-b"
      style={{ paddingTop: 'env(safe-area-inset-top)' }} // <-- Add this line
    >
      <div className="container flex h-16 items-center max-w-2xl">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold">GroviaHabits</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;