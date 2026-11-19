import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const ROOT = path.resolve('.')
const MSG_DIR = path.join(ROOT, 'src/messages')

function loadMessages() {
  const en = JSON.parse(fs.readFileSync(path.join(MSG_DIR, 'en.json'), 'utf8'))
  const es = JSON.parse(fs.readFileSync(path.join(MSG_DIR, 'es-MX.json'), 'utf8'))
  return { en, es }
}

function flatten(obj, prefix = '') {
  const out = []
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, p))
    else out.push(p)
  }
  return out
}

function hasKey(messages, dotPath) {
  const parts = dotPath.split('.')
  let cur = messages
  for (const p of parts) {
    if (!cur || typeof cur !== 'object' || !(p in cur)) return false
    cur = cur[p]
  }
  return typeof cur === 'string'
}

function walkSrc(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      if (name !== 'node_modules') walkSrc(full, acc)
    } else if (/\.(tsx|ts)$/.test(name)) acc.push(full)
  }
  return acc
}

const MOJIBAKE = /(?:Ã.|Â.|â€|ðŸ|âš½|\uFFFD)/

function scanMojibake(obj, fileLabel, hits = []) {
  if (typeof obj === 'string' && MOJIBAKE.test(obj)) hits.push({ file: fileLabel, value: obj.slice(0, 120) })
  else if (obj && typeof obj === 'object')
    for (const v of Object.values(obj)) scanMojibake(v, fileLabel, hits)
  return hits
}

const { en, es } = loadMessages()
const enFlat = new Set(flatten(en))
const esFlat = new Set(flatten(es))
const onlyEn = [...enFlat].filter((k) => !esFlat.has(k))
const onlyEs = [...esFlat].filter((k) => !enFlat.has(k))

let head = null
try {
  const raw = execSync('git show HEAD:src/messages/en.json', { encoding: 'utf8' }).replace(/^\uFEFF/, '')
  head = JSON.parse(raw)
} catch {
  /* no git */
}
const headFlat = head ? new Set(flatten(head)) : new Set()
const missingVsHead = head ? [...headFlat].filter((k) => !enFlat.has(k)) : []

const files = walkSrc(path.join(ROOT, 'src'))
const keyUseRe =
  /useTranslations\(\s*['"]([^'"]+)['"]\s*\)[\s\S]*?(?=\nexport |\nfunction |\nconst [A-Z]|\Z)/g
const tCallRe = /\bt(?:Common|Admin|Dashboard|Onboarding|Rankings|Referral|Shop|Auth|Picks|Settings)?\(\s*['"]([^'"]+)['"]/g

const missing = { en: new Set(), es: new Set() }

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  if (!src.includes('useTranslations')) continue

  const nsBlocks = [...src.matchAll(/useTranslations\(\s*['"]([^'"]+)['"]\s*\)/g)]
  const nsVars = [...src.matchAll(/const\s+(t\w*)\s*=\s*useTranslations\(\s*['"]([^'"]+)['"]\s*\)/g)]
  const varToNs = Object.fromEntries(nsVars.map((m) => [m[1], m[2]]))

  const calls = [...src.matchAll(/\b(t\w*)\(\s*['"]([^'"]+)['"]/g)]
  for (const m of calls) {
    const varName = m[1]
    let ns = varToNs[varName]
    if (!ns) {
      if (varName === 't') {
        const first = nsVars.find(([v]) => v === 't')
        ns = first ? first[2] : nsBlocks[0]?.[1]
      } else continue
    }
    const dot = `${ns}.${m[2]}`
    if (!hasKey(en, dot)) missing.en.add(`${dot} (${path.relative(ROOT, file)})`)
    if (!hasKey(es, dot)) missing.es.add(`${dot} (${path.relative(ROOT, file)})`)
  }
}

const mojibake = [
  ...scanMojibake(en, 'en.json'),
  ...scanMojibake(es, 'es-MX.json'),
]

console.log('=== Key parity (en vs es-MX) ===')
console.log('Only in en:', onlyEn.length ? onlyEn.join(', ') : 'none')
console.log('Only in es:', onlyEs.length ? onlyEs.join(', ') : 'none')

console.log('\n=== Missing vs HEAD en.json ===')
console.log(missingVsHead.length ? missingVsHead.join('\n') : 'none')

console.log('\n=== Missing keys used in code (en) ===')
console.log([...missing.en].sort().join('\n') || 'none')

console.log('\n=== Missing keys used in code (es-MX) ===')
console.log([...missing.es].sort().join('\n') || 'none')

console.log('\n=== Mojibake in message files ===')
if (!mojibake.length) console.log('none')
else mojibake.forEach((h) => console.log(h.file, JSON.stringify(h.value)))