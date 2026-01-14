# Reinstalling Node.js

## Current Situation
Node.js is not currently installed on your system. You need to reinstall it.

## Quick Install Options

### Option 1: Install Node.js 20 LTS (Recommended for Next.js 14)

**Download and Install:**
1. Go to: https://nodejs.org/
2. Download **Node.js 20.x LTS** (the version with "LTS" label)
3. Run the installer
4. **Restart your PowerShell/terminal** after installation
5. Verify: `node --version` (should show v20.x.x)

### Option 2: Use winget (Command Line)

```powershell
# Install Node.js 20 LTS
winget install OpenJS.NodeJS.LTS

# After installation, close and reopen PowerShell, then:
node --version
npm --version
```

**Note:** The LTS version from winget might install Node.js 24. If that happens, you can:
- Manually download Node.js 20 from nodejs.org
- Or try using pnpm instead (see below)

### Option 3: Use pnpm (Alternative - Might Avoid the Issue)

If you want to try a different package manager that might avoid the EISDIR issue:

```powershell
# First, install Node.js (any version)
winget install OpenJS.NodeJS.LTS

# Then install pnpm
npm install -g pnpm

# Use pnpm instead of npm
pnpm install
pnpm run build
```

## After Installation

1. **Close and reopen PowerShell** (important for PATH to update)

2. **Verify installation:**
   ```powershell
   node --version
   npm --version
   ```

3. **Navigate to your project:**
   ```powershell
   cd "E:\Banger Picks"
   ```

4. **Install dependencies:**
   ```powershell
   npm install
   ```

5. **Test the build:**
   ```powershell
   npm run build
   ```

## If Build Still Fails

If you still get EISDIR errors after installing Node.js 20:
- Try Option 3 (pnpm)
- Or consider moving the project to C:\ drive

## Quick Command Reference

```powershell
# Check Node.js version
node --version

# Check npm version  
npm --version

# Install dependencies
npm install

# Clean install
npm run clean:install

# Build project
npm run build

# Development server
npm run dev
```
