import test from 'node:test'
import assert from 'node:assert/strict'

// Keep in sync with src/lib/official-preview.ts
function officialPickLabel(pick, homeTeamName, awayTeamName) {
  if (pick === 'H') return homeTeamName
  if (pick === 'A') return awayTeamName
  return 'Draw'
}

function formatGafferPreviewLine(pick, confidence, homeTeamName, awayTeamName) {
  if (!pick || !confidence) return null
  const pickLabel = officialPickLabel(pick, homeTeamName, awayTeamName)
  return `Gaffer: ${pickLabel} · ${confidence}`
}

test('formatGafferPreviewLine resolves home pick to team name', () => {
  assert.equal(
    formatGafferPreviewLine('H', 'Lean', 'Germany', 'France'),
    'Gaffer: Germany · Lean'
  )
})

test('formatGafferPreviewLine uses Draw label', () => {
  assert.equal(
    formatGafferPreviewLine('D', 'Toss-up', 'Germany', 'France'),
    'Gaffer: Draw · Toss-up'
  )
})

test('formatGafferPreviewLine hidden when pick or confidence missing', () => {
  assert.equal(formatGafferPreviewLine(undefined, 'Strong', 'A', 'B'), null)
  assert.equal(formatGafferPreviewLine('A', undefined, 'A', 'B'), null)
})
