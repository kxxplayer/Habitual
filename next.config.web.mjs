// next.config.web.mjs - For web/Vercel builds with API routes
import withPWAInit from 'next-pwa';
import nextBundleAnalyzer from '@next/bundle-analyzer';

const isDev = process.env.NODE_ENV !== 'production';

const withPWA = withPWAInit({
  dest: 'public',
  disable: isDev,
  register: true,
  skipWaiting: true,
});

const withBundleAnalyzer = nextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

console.log('🌐 WEB BUILD: API routes enabled, no static export');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NO output: 'export' - this enables API routes
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  allowedDevOrigins: [
    'https://9000-firebase-studio-1747227899807.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev',
    'https://3000-firebase-studio-1747227899807.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev',
  ],
  
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
      'fs': false,
      'net': false,
      'tls': false,
    };
    
    config.module.rules.push({
      test: /node_modules[\\/]handlebars[\\/]/,
      parser: { requireEnsure: false },
    });
    
    return config;
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default withBundleAnalyzer(withPWA(nextConfig));