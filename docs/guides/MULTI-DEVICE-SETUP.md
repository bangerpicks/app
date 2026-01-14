# Multi-Device Development Setup Guide

## 🎯 Problem Solved

This guide addresses the issue of sharing a project between multiple devices (desktop and laptop) where sharing `node_modules` causes:
- **EISDIR errors** during builds
- **Symlink issues** on Windows
- **File system conflicts** between devices
- **Build failures** due to corrupted dependencies

## ✅ Solution: Git-Based Workflow

Each device should have its **own local copy** of the project with **separate `node_modules`** directories. Git syncs the code, not the dependencies.

---

## 🚀 Initial Setup (First Time)

### On Your Primary Device (Desktop)

1. **Initialize Git** (if not already done):
   ```powershell
   git init
   ```

2. **Create initial commit**:
   ```powershell
   git add .
   git commit -m "Initial commit"
   ```

3. **Set up remote repository** (GitHub, GitLab, etc.):
   ```powershell
   # Create a repository on GitHub/GitLab, then:
   git remote add origin <your-repo-url>
   git branch -M main
   git push -u origin main
   ```

### On Your Secondary Device (Laptop)

1. **Clone the repository**:
   ```powershell
   git clone <your-repo-url> "Banger Picks"
   cd "Banger Picks"
   ```

2. **Install dependencies** (creates fresh `node_modules`):
   ```powershell
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env.local` (if it exists)
   - Or create `.env.local` with your Firebase/API keys
   - **Note**: `.env.local` is in `.gitignore` and won't be synced

---

## 🔄 Daily Workflow

### When Starting Work on a Device

1. **Pull latest changes**:
   ```powershell
   git pull
   ```

2. **Check if dependencies changed**:
   ```powershell
   # If package.json or package-lock.json changed, reinstall:
   npm install
   ```

3. **Start development**:
   ```powershell
   npm run dev
   ```

### When Finishing Work on a Device

1. **Commit your changes**:
   ```powershell
   git add .
   git commit -m "Your commit message"
   git push
   ```

2. **Or if you're not ready to commit**:
   ```powershell
   git stash  # Saves changes temporarily
   ```

---

## 🛠️ Helper Scripts

We've added helpful npm scripts to `package.json`:

### `npm run setup`
Fresh install with type checking:
```powershell
npm run setup
```

### `npm run clean`
Remove build artifacts and dependencies:
```powershell
npm run clean
```

### `npm run clean:install`
Clean everything and reinstall (useful when switching devices):
```powershell
npm run clean:install
```

### `npm run fresh`
Complete fresh start: clean, install, and build:
```powershell
npm run fresh
```

---

## ⚠️ Important Rules

### ✅ DO:
- ✅ **Always pull before starting work**
- ✅ **Each device has its own `node_modules`**
- ✅ **Commit and push regularly**
- ✅ **Use `.env.local` for environment variables** (not tracked by Git)
- ✅ **Run `npm install` after pulling if `package.json` changed**

### ❌ DON'T:
- ❌ **Never share `node_modules` between devices**
- ❌ **Never commit `node_modules`** (already in `.gitignore`)
- ❌ **Never commit `.env.local`** (contains secrets)
- ❌ **Never commit `.next` build folder** (already in `.gitignore`)
- ❌ **Don't work on the same files simultaneously** (use branches for parallel work)

---

## 🔧 Troubleshooting

### Build Errors After Switching Devices

If you get build errors after pulling changes:

```powershell
# Clean and reinstall
npm run clean:install

# Then try building
npm run build
```

### "EISDIR: illegal operation on a directory" Error

This happens when `node_modules` is corrupted or shared. Fix:

```powershell
# Remove node_modules completely
npm run clean

# Reinstall fresh
npm install
```

### Merge Conflicts

If you have conflicts when pulling:

```powershell
# See what files have conflicts
git status

# Resolve conflicts manually, then:
git add .
git commit -m "Resolved merge conflicts"
git push
```

### Forgot to Pull Before Starting Work

If you've already made changes but forgot to pull:

```powershell
# Stash your changes
git stash

# Pull latest
git pull

# Reapply your changes
git stash pop

# Resolve any conflicts, then commit
git add .
git commit -m "Your changes"
git push
```

---

## 📁 What Gets Synced vs. What Doesn't

### ✅ Synced via Git:
- Source code (`src/`)
- Configuration files (`package.json`, `tsconfig.json`, etc.)
- Documentation (`docs/`, `README.md`)
- Public assets (`public/`)
- Firebase config (if committed)

### ❌ NOT Synced (Local to Each Device):
- `node_modules/` - Each device installs its own
- `.next/` - Build output, regenerated on each device
- `.env.local` - Environment variables (secrets)
- `*.tsbuildinfo` - TypeScript build cache
- `.firebase/` - Firebase local cache

---

## 🔐 Environment Variables Setup

### On Each Device:

1. **Create `.env.local`** (if it doesn't exist):
   ```powershell
   # Copy from example if available
   copy .env.example .env.local
   
   # Or create manually
   ```

2. **Add your secrets**:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
   # ... etc
   ```

3. **Verify it's ignored**:
   ```powershell
   git status
   # .env.local should NOT appear in the list
   ```

---

## 🎯 Best Practices

1. **Branch Strategy** (for parallel work):
   ```powershell
   # Create a feature branch
   git checkout -b feature/my-feature
   
   # Work on it, commit, push
   git push -u origin feature/my-feature
   
   # Merge to main when done
   ```

2. **Regular Commits**:
   - Commit small, logical changes
   - Write clear commit messages
   - Push frequently to avoid conflicts

3. **Before Major Changes**:
   ```powershell
   # Always pull first
   git pull
   
   # Create a branch for your work
   git checkout -b feature/your-feature
   ```

4. **Keep Dependencies Updated**:
   ```powershell
   # After pulling, if package.json changed:
   npm install
   ```

---

## 📝 Quick Reference

### First Time Setup (New Device)
```powershell
git clone <repo-url> "Banger Picks"
cd "Banger Picks"
npm install
# Create .env.local with your secrets
```

### Daily Start
```powershell
git pull
npm install  # Only if package.json changed
npm run dev
```

### Daily End
```powershell
git add .
git commit -m "Description of changes"
git push
```

### Fix Build Issues
```powershell
npm run clean:install
npm run build
```

---

## 🆘 Still Having Issues?

If you continue to experience problems:

1. **Verify Git is working**:
   ```powershell
   git status
   git log --oneline -5
   ```

2. **Check Node.js version** (should be 18+):
   ```powershell
   node --version
   ```

3. **Verify .gitignore**:
   ```powershell
   cat .gitignore
   # Should include node_modules, .next, .env.local
   ```

4. **Nuclear option** (complete fresh start):
   ```powershell
   npm run clean
   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   npm install
   ```

---

**Remember**: Each device = separate `node_modules`. Git = code sync. This is the key to avoiding file system conflicts! 🎉
