import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  hasWeeklyRankingsTableRows,
  mergeWeeklyRankingsWithStandings,
  shouldShowWeeklyStandingsEmpty,
} from '../src/lib/weekly-rankings-merge.mjs'

describe('mergeWeeklyRankingsWithStandings', () => {
  const liveRows = [
    {
      userId: 'u1',
      displayName: 'Alice',
      photoURL: 'https://lh3.googleusercontent.com/alice.jpg',
      rank: 1,
      weeklyPoints: 0,
      points: 100,
      isCurrentUser: true,
      matchPredictions: [
        { fixtureId: 1, prediction: 'H', correct: null },
        { fixtureId: 2, prediction: 'D', correct: null },
      ],
    },
    {
      userId: 'u2',
      displayName: 'Bob',
      photoURL: null,
      rank: 1,
      weeklyPoints: 0,
      points: 50,
      matchPredictions: [{ fixtureId: 1, prediction: 'A', correct: null }],
    },
  ]

  it('returns live rows with picks when standings are missing (pre-kickoff)', () => {
    const merged = mergeWeeklyRankingsWithStandings(null, liveRows)
    assert.equal(merged.length, 2)
    assert.equal(merged[0].userId, 'u1')
    assert.equal(merged[0].matchPredictions.length, 2)
    assert.equal(merged[0].photoURL, 'https://lh3.googleusercontent.com/alice.jpg')
    assert.equal(merged[0].weeklyPoints, 0)
  })

  it('uses standings rank and points while keeping live picks and avatars', () => {
    const standings = [
      {
        userId: 'u2',
        displayName: 'Bob',
        photoURL: 'https://cdn/wrong.jpg',
        rank: 1,
        points: 12,
        weeklyPoints: 12,
      },
      {
        userId: 'u1',
        displayName: 'Alice',
        photoURL: null,
        rank: 2,
        points: 8,
        weeklyPoints: 8,
      },
    ]
    const merged = mergeWeeklyRankingsWithStandings(standings, liveRows)
    assert.equal(merged.length, 2)
    assert.equal(merged[0].userId, 'u2')
    assert.equal(merged[0].weeklyPoints, 12)
    assert.equal(merged[0].matchPredictions.length, 1)
    assert.equal(merged[0].photoURL, null)
    assert.equal(merged[1].userId, 'u1')
    assert.equal(merged[1].weeklyPoints, 8)
    assert.equal(merged[1].photoURL, 'https://lh3.googleusercontent.com/alice.jpg')
    assert.equal(merged[1].matchPredictions[0].prediction, 'H')
  })

  it('prefers live favorite-player photo over standings placeholder', () => {
    const standings = [
      {
        userId: 'u1',
        displayName: 'Alice',
        photoURL: '',
        rank: 1,
        points: 3,
      },
    ]
    const merged = mergeWeeklyRankingsWithStandings(standings, liveRows)
    const alice = merged.find((r) => r.userId === 'u1')
    assert.equal(alice.photoURL, 'https://lh3.googleusercontent.com/alice.jpg')
  })
})

describe('shouldShowWeeklyStandingsEmpty (merged rankings)', () => {
  it('shows empty only when there are no rows and not loading', () => {
    assert.equal(shouldShowWeeklyStandingsEmpty([], false), true)
    assert.equal(shouldShowWeeklyStandingsEmpty(undefined, false), true)
    assert.equal(shouldShowWeeklyStandingsEmpty([], true), false)
    assert.equal(
      shouldShowWeeklyStandingsEmpty(
        mergeWeeklyRankingsWithStandings(null, [{ userId: 'a', rank: 1 }]),
        false
      ),
      false
    )
  })
})

describe('hasWeeklyRankingsTableRows', () => {
  it('is true only for a non-empty array', () => {
    assert.equal(hasWeeklyRankingsTableRows(undefined), false)
    assert.equal(hasWeeklyRankingsTableRows([]), false)
    assert.equal(hasWeeklyRankingsTableRows([{ userId: 'a' }]), true)
  })
})