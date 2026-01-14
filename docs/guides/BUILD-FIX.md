# Build Error Fix: EISDIR readlink Issue

## The Problem

You're experiencing `EISDIR: illegal operation on a directory, readlink` errors during Next.js builds. This is a known compatibility issue between:
- **Next.js 14** 
- **Node.js 22**
- **Windows** (especially on external/SSD drives)

## Root Cause

Webpack's dependency resolution is trying to use `readlink()` on regular files, which fails on Windows file systems. This happens even with fresh `node_modules` installations.

## Solutions (Try in Order)

### Solution 1: Use Node.js 20 LTS (Recommended)

This is the most reliable fix:

1. **Install Node.js 20 LTS**:
   - Download from [nodejs.org](https://nodejs.org/)
   - Install Node.js 20.x LTS
   - Verify: `node --version` (should show v20.x.x)

2. **Clean and reinstall**:
   ```powershell
   npm run clean:install
   npm run build
   ```

### Solution 2: Use pnpm Instead of npm

pnpm handles file system operations differently and may avoid this issue:

1. **Install pnpm**:
   ```powershell
   npm install -g pnpm
   ```

2. **Remove npm's node_modules**:
   ```powershell
   npm run clean
   ```

3. **Install with pnpm**:
   ```powershell
   pnpm install
   pnpm run build
   ```

### Solution 3: Use WSL (Windows Subsystem for Linux)

Build inside WSL to avoid Windows file system issues:

1. **Install WSL** (if not already installed)
2. **Clone project in WSL**:
   ```bash
   git clone <your-repo-url> "Banger Picks"
   cd "Banger Picks"
   npm install
   npm run build
   ```

### Solution 4: Temporary Workaround - Use Development Mode

If you only need to develop (not build for production):

```powershell
npm run dev
```

Development mode uses a different build process that may not trigger this error.

## Current Configuration

We've already configured `next.config.js` with:
- ✅ Symlinks disabled
- ✅ Webpack cache disabled
- ✅ Output file tracing excluded

These help but don't fully resolve the Node.js 22 compatibility issue.

## Verification

After applying a solution, verify:

```powershell
# Check Node version
node --version

# Clean install
npm run clean:install

# Test build
npm run build
```

## Why This Happens

- **Node.js 22** introduced changes to file system handling
- **Webpack** in Next.js 14 uses `readlink()` during dependency resolution
- **Windows** file systems don't support `readlink()` on regular files the same way Unix does
- **External/SSD drives** may have additional file system quirks

## Long-term Fix

The proper fix requires:
- Upgrading to **Next.js 15+** (better Windows support)
- OR downgrading to **Node.js 20 LTS** (more stable)
- OR waiting for webpack/Next.js patches

## Recommendation

**Use Node.js 20 LTS** - it's the most stable solution and recommended for Next.js 14 projects.
