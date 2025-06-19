// next.config.mjs
import withPWAInit from 'next-pwa';
import nextBundleAnalyzer from '@next/bundle-analyzer';

const isDev = process.env.NODE_ENV !== 'production';

const withPWA = withPWAInit({
  dest: 'public',
  disable: isDev,
});

const withBundleAnalyzer = nextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  webpack: (config, { isServer }) => {
    // Ignore certain modules that cause warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
    };
    
    // Ignore handlebars require.extensions warning
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };
    
    return config;
  },
  images: {
    unoptimized: true,
  }
  // Your other config options here
};

export default nextConfig;