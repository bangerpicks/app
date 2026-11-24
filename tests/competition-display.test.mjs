import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveCompetitionCardSubtitle,
  resolveCompetitionDisplayName,
} from '../src/lib/competition-display.mjs'

const competition = {
  competitionId: 'midweek',
  displayName: 'Midweek Mayhem',
  displayName_esMX: 'Caos entre semana',
  tagline: 'Midweek league slate',
  tagline_esMX: 'Liga entre semana',
  kind: 'league',
  visibility: 'public',
  status: 'active',
}

test('English subtitle ignores Spanish-only gameweek description', () => {
  const subtitle = resolveCompetitionCardSubtitle(
    competition,
    { description: 'Caos Entre Semana 1' },
    'en'
  )
  assert.equal(subtitle, 'Midweek league slate')
})

test('English falls back to i18n when no tagline', () => {
  const subtitle = resolveCompetitionCardSubtitle(
    { ...competition, tagline: undefined },
    { description: 'Caos Entre Semana 1' },
    'en'
  )
  assert.equal(subtitle, undefined)
})

test('Spanish uses tagline_esMX when set', () => {
  const subtitle = resolveCompetitionCardSubtitle(competition, {}, 'es-MX')
  assert.equal(subtitle, 'Liga entre semana')
})

test('Spanish falls back to gameweek description when no taglines', () => {
  const subtitle = resolveCompetitionCardSubtitle(
    { ...competition, tagline: undefined, tagline_esMX: undefined },
    { description: 'Caos Entre Semana 1' },
    'es-MX'
  )
  assert.equal(subtitle, 'Caos Entre Semana 1')
})

test('resolveCompetitionDisplayName respects locale', () => {
  assert.equal(resolveCompetitionDisplayName(competition, 'en'), 'Midweek Mayhem')
  assert.equal(resolveCompetitionDisplayName(competition, 'es-MX'), 'Caos entre semana')
})