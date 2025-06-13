// next.config.mjs
import nextBundleAnalyzer from '@next/bundle-analyzer';
import nextPWA from 'next-pwa';

// Configure the PWA plugin
const withPWA = nextPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

// Configure the bundle analyzer
const withBundleAnalyzer = nextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The correct top-level config for the cross-origin issue
  allowedDevOrigins: ["*.cloudworkstations.dev"],
  
  // Your other configurations
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

// Compose the plugins correctly
export default withPWA(withBundleAnalyzer(nextConfig));