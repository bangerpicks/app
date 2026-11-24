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

function resolveSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://bangerpicks.com'
  return String(raw).trim().replace(/\/+$/, '')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
    NEXT_PUBLIC_GIT_SHA: resolveGitSha(),
    NEXT_PUBLIC_BUILD_DATE: resolveBuildDate(),
    NEXT_PUBLIC_SITE_URL: resolveSiteUrl(),
  },
  productionBrowserSourceMaps: false,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'media.api-sports.io', pathname: '/**' },
      { protocol: 'https', hostname: '**.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com', pathname: '/**' },
      { protocol: 'https', hostname: 'graph.facebook.com', pathname: '/**' },
    ],
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
    
    if (process.platform === 'win32') {
      config.cache = false
    }
    
    return config
  },
}

module.exports = nextConfig
