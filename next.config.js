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
    // Fix for Windows symlink issues - disable symlink resolution
    config.resolve.symlinks = false
    
    // Disable filesystem cache completely to avoid EISDIR errors on Windows
    // This is a workaround for webpack's PackFileCacheStrategy readlink issue on Windows
    config.cache = false
    
    return config
  },
}

module.exports = nextConfig
