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
  output: 'export',
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
    ],
  },
  allowedDevOrigins: [
    'https://9000-firebase-studio-1747227899807.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev',
    'https://3000-firebase-studio-1747227899807.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev',
  ],
  // ✅ Add this to prevent missing Jaeger module error
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
    };
  
    config.module.rules.push({
      test: /node_modules[\\/]handlebars[\\/]/,
      parser: { requireEnsure: false },
    });
  
    return config;
  }  
};

// Wrap the final config with both plugins
export default withBundleAnalyzer(withPWA(nextConfig));
