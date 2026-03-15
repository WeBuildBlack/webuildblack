/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow reading course markdown files from parent courses/ directory
  experimental: {
    outputFileTracingIncludes: {
      '/**': ['../courses/**/*'],
    },
  },
  // Ensure markdown/MDX files from courses/ are watchable in dev
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

module.exports = nextConfig;
