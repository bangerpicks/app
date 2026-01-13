/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api-football.com', 'media.api-sports.io'],
  },
  // Disable output file tracing which can cause EISDIR errors on Windows
  experimental: {
    outputFileTracingExcludes: {
      '*': ['**/*'],
    },
  },
  webpack: (config, { isServer }) => {
    // Fix for Windows symlink issues
    config.resolve.symlinks = false
    // Disable webpack cache to avoid EISDIR errors on Windows
    config.cache = false
    return config
  },
}

module.exports = nextConfig
