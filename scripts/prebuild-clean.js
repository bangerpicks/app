const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const lockFile = path.join(root, '.dev-server.lock')
const nextDir = path.join(root, '.next')

if (fs.existsSync(lockFile)) {
  let detail = ''
  try {
    detail = fs.readFileSync(lockFile, 'utf8').trim()
  } catch {
  // ignore
  }
  console.error(
    '\n⚠  prebuild: skipped cleaning .next — npm run dev is still running.',
    detail ? `(${detail})` : '',
    '\n   Stop the dev server (Ctrl+C), then run build/deploy again.',
    '\n   If pages 404 in dev, stop dev, delete .next, and run npm run dev.\n'
  )
  process.exit(1)
}

try {
  fs.rmSync(nextDir, { recursive: true, force: true })
} catch {
  // .next missing or locked
}