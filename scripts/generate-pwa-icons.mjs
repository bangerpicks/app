/**
 * Rasterizes the square app mark (public/app-logo.svg) for install / home-screen PNGs.
 * Re-run after changing app-logo.svg: npm run ops:generate-pwa-icons
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PWA_ICON_SOURCE = 'app-logo.svg'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = join(root, 'public', PWA_ICON_SOURCE)

async function main() {
  const sharp = (await import('sharp')).default
  const svg = readFileSync(svgPath)
  for (const { size, outName } of [
    { size: 180, outName: 'apple-touch-icon.png' },
    { size: 192, outName: 'icon-192.png' },
    { size: 512, outName: 'icon-512.png' },
  ]) {
    const out = join(root, 'public', outName)
    await sharp(svg).resize(size, size).png().toFile(out)
    console.log('wrote', out)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})