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
  disable: isDev,
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Or your desired limit
    },
  },
};

export default withPWA(withBundleAnalyzer(nextConfig));