
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
  manifest: '/manifest.json', // Link to the web app manifest
  icons: {
    apple: "/icons/icon-192x192.png", // Basic apple touch icon
  }
};

// Add viewport configuration for PWA theme colors, etc.
export const viewport: Viewport = {
  themeColor: '#3498db', // Matches manifest.json theme_color
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Standard PWA meta tags. Many are covered by Next.js Metadata API now. */}
        {/* <link rel="apple-touch-icon" href="/icons/icon-192x192.png"></link> */}
        {/* theme-color is now handled by `viewport` export */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          defaultTheme="theme-calm-blue"
          storageKey="habitual-theme"
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
