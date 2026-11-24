import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_SITE_ORIGIN,
  getSiteOrigin,
  getPwaManifestId,
} from '../src/lib/site-url.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('site URL (canonical domain)', () => {
  it('defaults to bangerpicks.com apex', () => {
    assert.equal(DEFAULT_SITE_ORIGIN, 'https://bangerpicks.com')
    assert.equal(getSiteOrigin({}), DEFAULT_SITE_ORIGIN)
    assert.equal(getPwaManifestId({}), 'https://bangerpicks.com/')
  })

  it('strips trailing slashes from NEXT_PUBLIC_SITE_URL', () => {
    assert.equal(
      getSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'https://bangerpicks.com///' }),
      'https://bangerpicks.com'
    )
  })

  it('manifest id and robots.txt sitemap match canonical origin', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'public', 'manifest.json'), 'utf8'))
    assert.equal(manifest.id, getPwaManifestId({}))

    const robots = readFileSync(join(root, 'public', 'robots.txt'), 'utf8')
    assert.match(robots, /Sitemap: https:\/\/bangerpicks\.com\/sitemap\.xml/)
  })
})