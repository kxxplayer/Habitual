// next.config.mjs

import nextBundleAnalyzer from '@next/bundle-analyzer';
import withPWAInit from 'next-pwa';

const isDev = process.env.NODE_ENV === 'development';

const withBundleAnalyzer = nextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = withPWAInit({
  dest: 'public',
  disable: isDev,
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The 'output: export' line has been REMOVED.
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default withPWA(withBundleAnalyzer(nextConfig));