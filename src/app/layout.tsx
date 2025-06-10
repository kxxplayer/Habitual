
import type {Metadata, Viewport} from 'next';
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

export const metadata: Metadata = {
  title: 'Habitual',
  description: 'Improve your habits, one day at a time.',
  manifest: '/manifest.json',
  icons: {
    icon: "/icons/icon-192x192.png", // Default icon
    shortcut: "/icons/icon-96x96.png", // For PWA shortcuts
    apple: "/icons/apple-touch-icon.png", // Specific for Apple devices
    other: [
      { rel: 'icon', url: '/icons/icon-32x32.png', sizes: '32x32' },
      { rel: 'icon', url: '/icons/icon-16x16.png', sizes: '16x16' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default", // or "black-translucent"
    title: "Habitual",
  },
};

export const viewport: Viewport = {
  themeColor: '#3498db', 
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <meta name="application-name" content="Habitual" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Habitual" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3498db" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" /> 
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" /> 

        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        
        {/* Preconnect to Firebase and Google Fonts if used directly often */}
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://www.googleapis.com" />
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                      console.log('Service Worker registered with scope:', registration.scope);
                    })
                    .catch(error => {
                      console.error('Service Worker registration failed:', error);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
