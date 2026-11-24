import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPwaManifestId } from '../src/lib/site-url.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('PWA assets and iOS install metadata', () => {
  it('includes apple-touch-icon.png in public', () => {
    assert.ok(existsSync(join(root, 'public', 'apple-touch-icon.png')))
  })

  it('manifest has scope and id', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'public', 'manifest.json'), 'utf8'))
    assert.equal(manifest.scope, '/')
    assert.equal(manifest.id, getPwaManifestId({}))
  })

  it('manifest install icons are PNGs from app-logo (not wordmark logo.svg)', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'public', 'manifest.json'), 'utf8'))
    const icons = manifest.icons ?? []
    assert.ok(icons.length >= 3)
    for (const icon of icons) {
      assert.match(icon.src, /^\/(apple-touch-icon|icon-\d+)\.png$/)
    }
    const script = readFileSync(join(root, 'scripts', 'generate-pwa-icons.mjs'), 'utf8')
    assert.match(script, /app-logo\.svg/)
  })

  it('root layout configures appleWebApp', () => {
    const layout = readFileSync(join(root, 'src', 'app', 'layout.tsx'), 'utf8')
    assert.match(layout, /appleWebApp:/)
    assert.match(layout, /apple-touch-icon\.png/)
    assert.match(layout, /app-logo\.svg/)
  })
})