// next.config.mjs
import nextBundleAnalyzer from '@next/bundle-analyzer';
import withPWAInit from 'next-pwa';

const isDev = process.env.NODE_ENV === 'development';

// Bundle Analyzer configuration
const withBundleAnalyzer = nextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// PWA configuration
const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev, // Disable PWA in development mode
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove 'output: export' - it's incompatible with PWA
  // If you need static export, you'll have to choose between PWA or static export
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Development settings
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Allowed dev origins from your TypeScript config
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' 
              ? 'https://9000-firebase-studio-1747227899807.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev https://3000-firebase-studio-1747227899807.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev'
              : '',
          },
        ],
      },
    ];
  },
};

// Apply both PWA and Bundle Analyzer plugins
export default withBundleAnalyzer(withPWA(nextConfig));