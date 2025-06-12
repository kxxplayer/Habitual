// next.config.mjs
import nextBundleAnalyzer from '@next/bundle-analyzer';
import withPWAInit from 'next-pwa'; // <-- IMPORT next-pwa

const withBundleAnalyzer = nextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// -- ADD THIS PWA CONFIGURATION --
const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development mode
});
// ---------------------------------

// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your existing next config
  output: 'export', // <-- ADD THIS LINE
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig; // Adjust if you use plugins like PWA/BundleAnalyzer