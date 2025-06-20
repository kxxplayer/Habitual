"use client";

import Link from 'next/link';
import { Target, Sparkles, Zap } from 'lucide-react';
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
      className="shrink-0 sticky top-0 z-40 w-full bg-gradient-to-r from-primary/10 via-background/95 to-accent/10 backdrop-blur-md border-b border-border/50 shadow-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container flex h-14 items-center max-w-2xl">
        <Link href="/" className="mr-6 flex items-center space-x-3 group transition-all duration-300 hover:scale-105">
          <div className="relative">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent shadow-md group-hover:shadow-lg transition-all duration-300">
              <Target className="h-4 w-4 text-white" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-accent animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              GroviaHabits
            </span>
            <span className="text-xs text-muted-foreground -mt-1">Build Better You</span>
          </div>
        </Link>
        
        <div className="flex flex-1 items-center justify-end space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
            <Zap className="h-3 w-3 text-accent animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Stay Focused</span>
          </div>
          <ThemeToggleButton />
        </div>
      </div>
      
      {/* Subtle animated gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse"></div>
    </header>
  );
};

export default AppHeader;