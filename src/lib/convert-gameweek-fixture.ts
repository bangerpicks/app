import type { MatchCardData, FormResult } from '@/types/dashboard'
import type { GameweekFixtureData } from '@/lib/admin'
import { formatMatchKickoffTime } from '@/lib/locale-format'
import {
  mapApiFootballStatusToMatchStatus,
  venueFromApiFootball,
} from '@/lib/match-card-display'
import { marketOddsFromFirestoreData } from '@/lib/market-odds-firestore'
import type { Locale } from '@/i18n/config'

export function convertGameweekFixtureToMatchCard(
  fixtureData: GameweekFixtureData,
  locale: Locale = 'en'
): MatchCardData {
  const fixture = fixtureData.fixture.fixture
  const fixtureDate = new Date(fixture.date)
  const matchStatus = mapApiFootballStatusToMatchStatus(fixture.status.short)

  const score =
    fixtureData.fixture.goals.home !== null && fixtureData.fixture.goals.away !== null
      ? {
          home: fixtureData.fixture.goals.home,
          away: fixtureData.fixture.goals.away,
        }
      : undefined

  const minute = fixture.status.elapsed ?? undefined

  return {
    fixtureId: fixtureData.fixtureId,
    league: {
      id: fixtureData.league.id,
      name: fixtureData.league.name,
      logo: fixtureData.league.logo,
    },
    venue: venueFromApiFootball(fixture.venue),
    date: fixtureDate,
    time: formatMatchKickoffTime(fixtureDate, locale),
    homeTeam: {
      id: fixtureData.teams.home.id,
      name: fixtureData.teams.home.name,
      logo: fixtureData.teams.home.logo,
      form: [] as FormResult[],
    },
    awayTeam: {
      id: fixtureData.teams.away.id,
      name: fixtureData.teams.away.name,
      logo: fixtureData.teams.away.logo,
      form: [] as FormResult[],
    },
    matchStatus,
    minute,
    score,
    whyItMatters: fixtureData.whyItMatters,
    whyItMatters_esMX: fixtureData.whyItMatters_esMX,
    officialPick: fixtureData.officialPick,
    officialConfidence: fixtureData.officialConfidence,
    marketOdds: marketOddsFromFirestoreData(fixtureData.marketOdds),
  }
}