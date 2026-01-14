# Moving Project from SSD - What to Move

## ✅ MOVE These (Essential Project Files)

Move the **entire project folder** `E:\Banger Picks` to your new location, BUT **exclude** the items listed below.

### What to Move:
- ✅ **All source code** (`src/` folder)
- ✅ **Configuration files** (`package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`)
- ✅ **Public assets** (`public/` folder)
- ✅ **Documentation** (`docs/`, `README.md`, `MULTI-DEVICE-SETUP.md`, etc.)
- ✅ **Scripts** (`scripts/` folder)
- ✅ **Brand assets** (`brand-info/` folder)
- ✅ **Git files** (`.git/` folder, `.gitignore`)
- ✅ **Firebase config** (`firebase.txt` if needed)
- ✅ **Legacy files** (`legacy/` folder - if you want to keep it)

## ❌ DO NOT MOVE These (Regenerate on New Location)

These will be recreated when you run `npm install`:

- ❌ **`node_modules/`** - DELETE this, will be regenerated
- ❌ **`.next/`** - Build output, will be regenerated
- ❌ **`package-lock.json`** - Will be regenerated (optional to move, but better to regenerate)
- ❌ **`*.tsbuildinfo`** - TypeScript build cache
- ❌ **`.cursor/`** - IDE cache (optional)

## 📋 Step-by-Step Instructions

### Option 1: Move Everything, Then Clean (Easiest)

1. **Copy the entire folder** `E:\Banger Picks` to your new location (e.g., `C:\Projects\Banger Picks`)

2. **In the new location, delete these folders/files**:
   ```powershell
   cd "C:\Projects\Banger Picks"  # or wherever you moved it
   
   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
   Remove-Item -Force *.tsbuildinfo -ErrorAction SilentlyContinue
   ```

3. **Install fresh dependencies**:
   ```powershell
   npm install
   ```

4. **Test the build**:
   ```powershell
   npm run build
   ```

### Option 2: Selective Copy (More Careful)

1. **Create new project folder** on your main drive:
   ```powershell
   New-Item -ItemType Directory -Path "C:\Projects\Banger Picks"
   cd "C:\Projects\Banger Picks"
   ```

2. **Copy only essential files**:
   ```powershell
   # From E:\Banger Picks, copy:
   Copy-Item -Recurse "E:\Banger Picks\src" .
   Copy-Item -Recurse "E:\Banger Picks\public" .
   Copy-Item -Recurse "E:\Banger Picks\docs" .
   Copy-Item -Recurse "E:\Banger Picks\scripts" .
   Copy-Item -Recurse "E:\Banger Picks\brand-info" .
   Copy-Item -Recurse "E:\Banger Picks\.git" .
   Copy-Item "E:\Banger Picks\package.json" .
   Copy-Item "E:\Banger Picks\tsconfig.json" .
   Copy-Item "E:\Banger Picks\next.config.js" .
   Copy-Item "E:\Banger Picks\tailwind.config.ts" .
   Copy-Item "E:\Banger Picks\postcss.config.js" .
   Copy-Item "E:\Banger Picks\.gitignore" .
   Copy-Item "E:\Banger Picks\README.md" .
   Copy-Item "E:\Banger Picks\*.md" .
   ```

3. **Install dependencies**:
   ```powershell
   npm install
   ```

4. **Test**:
   ```powershell
   npm run build
   ```

## 🎯 Recommended Location

Move to a standard location like:
- `C:\Projects\Banger Picks`
- `C:\Users\YourName\Projects\Banger Picks`
- `C:\Dev\Banger Picks`

**Avoid**: External drives, network drives, or drives with special file system configurations.

## ✅ After Moving

1. **Verify Git still works**:
   ```powershell
   git status
   ```

2. **Update Git safe directory** (if needed):
   ```powershell
   git config --global --add safe.directory "C:\Projects\Banger Picks"
   ```

3. **Install dependencies**:
   ```powershell
   npm install
   ```

4. **Test build**:
   ```powershell
   npm run build
   ```

5. **If build succeeds**, you're done! 🎉

## 🔄 If You Have a Remote Repository

After moving, if you've already pushed to a remote:

```powershell
# The .git folder contains all the remote info, so you should be fine
# Just verify:
git remote -v

# If you need to update the remote URL:
git remote set-url origin <your-new-repo-url>
```

## 📝 Quick Checklist

- [ ] Project folder copied to new location
- [ ] `node_modules/` deleted
- [ ] `.next/` deleted  
- [ ] `package-lock.json` deleted (optional)
- [ ] `npm install` completed successfully
- [ ] `npm run build` works
- [ ] Git still works (`git status`)
- [ ] Development server works (`npm run dev`)

---

**The key is**: Move the source code and config files, but **regenerate** `node_modules` and build artifacts on the new drive. This ensures a clean, working installation without file system issues!
