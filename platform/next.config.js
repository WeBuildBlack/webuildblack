/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include course markdown files in serverless function bundles
  experimental: {
    outputFileTracingIncludes: {
      '/**': ['./courses/**/*'],
    },
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

module.exports = nextConfig;
