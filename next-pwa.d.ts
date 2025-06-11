// next-pwa.d.ts

declare module 'next-pwa' {
    import type { NextConfig } from 'next';
  
    // Define the types for the PWA configuration object
    interface PWAConfig {
      dest: string;
      disable?: boolean;
      register?: boolean;
      skipWaiting?: boolean;
      // You can add other next-pwa options here if you use them
      // For example: sw?: string;
    }
  
    // Define the function signature for the 'next-pwa' default export
    function withPWA(config: PWAConfig): (nextConfig?: NextConfig) => NextConfig;
    
    export = withPWA;
  }