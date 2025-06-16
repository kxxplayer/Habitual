// next.config.mjs
import withPWAInit from 'next-pwa';
import nextBundleAnalyzer from '@next/bundle-analyzer';

// PWA Configuration
const isDev = process.env.NODE_ENV !== 'production';
const withPWA = withPWAInit({
  dest: 'public',
  disable: isDev,
});

// Bundle Analyzer Configuration
const withBundleAnalyzer = nextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this line to enable static export
  //output: 'export',

  // Your existing configurations from both files
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // This makes sure your images work in the exported app
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // This is a development-only setting and can be kept
  allowedDevOrigins: [
    'https://9000-firebase-studio-1747227899807.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev',
    'https://3000-firebase-studio-1747227899807.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev',
  ],
};

// Wrap the final config with both plugins
export default withBundleAnalyzer(withPWA(nextConfig));