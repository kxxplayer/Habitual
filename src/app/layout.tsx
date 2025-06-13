import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}