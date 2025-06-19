"use client";

import Link from 'next/link';
import { Target, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import ThemeToggleButton from '@/components/theme/ThemeToggleButton';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import React from 'react';

const BUILD_VERSION = '1.1.5'; // Update this manually for each release
const BUILD_TIMESTAMP = new Date().toLocaleString(); // Will be set at build time

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
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container flex h-16 items-center max-w-2xl">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold">GroviaHabits</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggleButton />
          <span className="ml-4 text-xs text-muted-foreground" style={{fontFamily: 'monospace'}}>
            v{BUILD_VERSION} | {BUILD_TIMESTAMP}
          </span>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;