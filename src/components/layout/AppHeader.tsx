"use client";

import Link from 'next/link';
import Image from 'next/image';
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
      className="shrink-0 sticky top-0 z-40 w-full bg-gradient-to-r from-primary/5 via-background/80 to-accent/5 backdrop-blur-md border-b border-border/30 shadow-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="w-full max-w-2xl mx-auto flex h-12 items-center px-3 sm:px-4">
        <Link href="/" className="mr-4 flex items-center space-x-2 group transition-all duration-300 hover:scale-105">
          <div className="relative">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent shadow-md group-hover:shadow-lg transition-all duration-300 p-0.5">
              <Image 
                src="/icons/icon-512x512.png" 
                alt="GroviaHabits" 
                width={24}
                height={24}
                className="w-6 h-6 rounded-full object-cover"
              />
            </div>
            <Sparkles className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 text-accent animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              GroviaHabits
            </span>
            <span className="text-xs text-muted-foreground -mt-0.5">Build Better You</span>
          </div>
        </Link>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50">
            <Zap className="h-2.5 w-2.5 text-accent animate-pulse" />
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