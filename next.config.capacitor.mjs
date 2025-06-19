// next.config.capacitor.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is required for Capacitor builds
  output: 'export',
  
  // This is required for static exports
  images: {
    unoptimized: true,
  },

  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
    };
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };
    return config;
  },
};

export default nextConfig;