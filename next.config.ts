// next.config.ts
import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const isDev = process.env.NODE_ENV !== 'production';

const withPWA = withPWAInit({
  dest: 'public',
  disable: isDev,
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
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
  // This property is now at the top level
  allowedDevOrigins: [
    'https://9000-firebase-studio-1747227899807.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev',
    'https://3000-firebase-studio-1747227899807.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev',
  ],
};

export default withPWA(nextConfig);