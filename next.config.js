const { execSync } = require('child_process')

function resolveAppVersion() {
  try {
    const version = require('./package.json').version
    if (typeof version === 'string' && version.trim()) return version.trim()
  } catch {
    // package.json unreadable
  }
  return process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'
}

function resolveGitSha() {
  try {
    const sha = execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    })
      .toString()
      .trim()
    if (sha) return sha
  } catch {
    // git missing, or this is not a repository
  }
  return process.env.NEXT_PUBLIC_GIT_SHA || 'unknown'
}

function resolveBuildDate() {
  try {
    return new Date().toISOString().slice(0, 10)
  } catch {
    return process.env.NEXT_PUBLIC_BUILD_DATE || 'unknown'
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
    NEXT_PUBLIC_GIT_SHA: resolveGitSha(),
    NEXT_PUBLIC_BUILD_DATE: resolveBuildDate(),
  },
  productionBrowserSourceMaps: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
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
