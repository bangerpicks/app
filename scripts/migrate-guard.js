/**
 * Shared guards for one-shot Firestore migrations.
 *
 * Default is dry-run. Writes require --apply and --project.
 * Production writes are refused unless --project banger-picks.
 * Any run without FIRESTORE_EMULATOR_HOST is refused unless --project banger-picks.
 */

function parseMigrateArgs(argv) {
  let apply = false
  let dryRun = false
  let allowSkips = false
  let project = null
  let out = null

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--apply') {
      apply = true
    } else if (arg === '--allow-skips') {
      allowSkips = true
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--out') {
      out = argv[i + 1]
      i += 1
    } else if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length)
    } else if (arg === '--project') {
      project = argv[i + 1]
      i += 1
    } else if (arg.startsWith('--project=')) {
      project = arg.slice('--project='.length)
    } else if (arg === '--help' || arg === '-h') {
      return { help: true, apply: false, project: null }
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (apply && dryRun) {
    throw new Error('Pass only one of --dry-run or --apply')
  }

  return { help: false, apply, allowSkips, project, out }
}

function assertMigrateAllowed({ apply, project }) {
  const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
  if (!emulator && project !== 'banger-picks') {
    throw new Error(
      'Refusing to run. Set FIRESTORE_EMULATOR_HOST, or pass --project banger-picks.'
    )
  }
  if (apply && !project) {
    throw new Error('--apply requires --project <id>. Production must use --project banger-picks.')
  }
  if (apply && !emulator && project !== 'banger-picks') {
    throw new Error('--apply against production requires --project banger-picks.')
  }
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stable(value[key])
        return acc
      }, {})
  }
  return value
}

function sameValue(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right))
}

module.exports = {
  parseMigrateArgs,
  assertMigrateAllowed,
  sameValue,
}
