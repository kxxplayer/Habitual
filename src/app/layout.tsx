"use client";

import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ErrorBoundary } from 'react-error-boundary';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert" className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-destructive/10 border border-destructive rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-semibold text-destructive mb-2">Something went wrong!</h2>
        <pre className="text-sm bg-background/50 p-3 rounded mb-4 overflow-x-auto">
          {error.message}
        </pre>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// This metadata object is the single source of truth for your app's icons.
// Next.js will automatically generate the correct <link> tags from this.
export const metadata: Metadata = {
  title: 'Habitual',
  description: 'Improve your habits, one day at a time.',
  manifest: '/manifest.json',
  icons: {
    // Main icon for browsers and Android PWA
    icon: '/icons/icon-192x192.png', 
    // Icon for Apple devices when added to home screen
    apple: '/icons/apple-touch-icon.png', 
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default", 
    title: "Habitual",
  },
};

export const viewport: Viewport = {
  themeColor: '#3498db', 
  initialScale: 1,
  width: 'device-width',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* All icon <link> tags are now handled by the metadata object above. */}
        {/* Do NOT add any manual <link rel="icon"> or <link rel="apple-touch-icon"> tags here. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          defaultTheme="theme-calm-blue"
          storageKey="habitual-theme-multi"
        >
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => window.location.reload()}
          >
            {children}
          </ErrorBoundary>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}