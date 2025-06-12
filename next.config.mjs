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

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your existing next config
  typescript: {
    ignoreBuildErrors: true, //
  },
  eslint: {
    ignoreDuringBuilds: true, //
  },
};

// Wrap your config with both withPWA and withBundleAnalyzer
export default withBundleAnalyzer(withPWA(nextConfig));