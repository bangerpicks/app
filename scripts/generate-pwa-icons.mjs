/**
 * Generates public/icon-192.png and icon-512.png from public/app-logo.svg (needs sharp).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = join(root, 'public', 'app-logo.svg')

async function main() {
  const sharp = (await import('sharp')).default
  const svg = readFileSync(svgPath)
  for (const size of [192, 512]) {
    const out = join(root, 'public', `icon-${size}.png`)
    await sharp(svg).resize(size, size).png().toFile(out)
    console.log('wrote', out)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})