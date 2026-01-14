/**
 * API-Football integration utility
 * Handles fetching fixtures, leagues, and other data from API-Football
 */

import { getCachedFixtureSearch, saveCachedFixtureSearch } from './admin'

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io'

/**
 * Get API key from environment variable
 */
function getApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_API_FOOTBALL_KEY environment variable is not set')
  }
  return apiKey
}

/**
 * Make a request to API-Football
 * 
 * @param endpoint - API endpoint (e.g., '/fixtures')
 * @param params - Query parameters
 * @returns Promise<any> - API response
 */
async function apiRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  try {
    console.log('[api-football] apiRequest called:', { endpoint, params })
    const apiKey = getApiKey()
    console.log('[api-football] API key present:', !!apiKey, 'Length:', apiKey?.length || 0)
    
    // Build query string
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          // For arrays, join with hyphen (API-Football format for multiple IDs)
          queryParams.append(key, value.join('-'))
        } else {
          queryParams.append(key, String(value))
        }
      }
    })
    
    const url = `${API_FOOTBALL_BASE_URL}${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    console.log('[api-football] Request URL:', url)
    console.log('[api-football] Query params:', queryParams.toString())
    
    console.log('[api-football] Making fetch request...')
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apisports-key': apiKey,
      },
    })
    
    console.log('[api-football] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[api-football] Request failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
      })
      throw new Error(`API-Football request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    console.log('[api-football] Parsing JSON response...')
    const data = await response.json()
    console.log('[api-football] Response data:', {
      hasResponse: !!data.response,
      responseType: typeof data.response,
      responseIsArray: Array.isArray(data.response),
      responseLength: data.response?.length || 0,
      hasErrors: !!data.errors,
      errors: data.errors,
      results: data.results,
      fullData: JSON.stringify(data),
    })
    
    // Check for API errors (API-Football returns errors as an object with keys)
    if (data.errors) {
      const errorKeys = Object.keys(data.errors)
      if (errorKeys.length > 0) {
        console.error('[api-football] API returned errors:', data.errors)
        const errorMessages = errorKeys.map(key => `${key}: ${data.errors[key]}`).join(', ')
        throw new Error(`API-Football errors: ${errorMessages}`)
      }
    }
    
    // Log if no results but request was successful
    if (data.results === 0) {
      console.warn('[api-football] API returned 0 results for the query')
    }
    
    console.log('[api-football] Request successful, returning data')
    return data
  } catch (error) {
    console.error('[api-football] apiRequest error:', error)
    console.error('[api-football] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    throw error
  }
}

/**
 * Fixture data structure from API-Football
 */
export interface APIFootballFixture {
  fixture: {
    id: number
    referee: string | null
    timezone: string
    date: string
    timestamp: number
    venue: {
      id: number | null
      name: string
      city: string
    }
    status: {
      long: string
      short: string
      elapsed: number | null
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string | null
    season: number
    round: string
  }
  teams: {
    home: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
    away: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: {
      home: number | null
      away: number | null
    }
    fulltime: {
      home: number | null
      away: number | null
    }
    extratime: {
      home: number | null
      away: number | null
    }
    penalty: {
      home: number | null
      away: number | null
    }
  }
}

/**
 * League data structure from API-Football
 */
export interface APIFootballLeague {
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string | null
  }
  seasons: Array<{
    year: number
    start: string
    end: string
    current: boolean
  }>
}

/**
 * Calculate the season year based on a date
 * Season typically starts in August, so dates from Aug-Dec use current year, Jan-Jul use previous year
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Season year (e.g., 2024 for 2024-2025 season)
 */
function calculateSeason(dateString: string): number {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-12
  
  // Most football seasons run from August to May
  // So if the date is Jan-Jul, we're in the second half of the season (use previous year)
  // If the date is Aug-Dec, we're in the first half of the season (use current year)
  if (month >= 8) {
    return year
  } else {
    return year - 1
  }
}

/**
 * Search fixtures by date range and optional filters
 * 
 * @param params - Search parameters
 * @returns Promise<APIFootballFixture[]> - Array of fixtures
 */
export async function searchFixtures(params: {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
  league?: number
  team?: number
  status?: string
  timezone?: string
  season?: number // Optional season year (will be calculated from 'from' date if not provided)
}): Promise<APIFootballFixture[]> {
  try {
    console.log('[api-football] searchFixtures called with params:', params)
    
    const apiParams: any = {
      from: params.from,
      to: params.to,
    }
    
    // Only include season if league is specified (API-Football requires league with season)
    if (params.league) {
      const season = params.season ?? calculateSeason(params.from)
      apiParams.league = params.league
      apiParams.season = season
    }
    
    // Add optional parameters
    if (params.team) {
      apiParams.team = params.team
    }
    if (params.status) {
      apiParams.status = params.status
    }
    if (params.timezone) {
      apiParams.timezone = params.timezone
    }
    
    console.log('[api-football] API params:', apiParams)
    
    // Check cache first (only for date/league searches, not team/status filters)
    if (!params.team && !params.status) {
      const cached = await getCachedFixtureSearch(params.from, params.to, params.league)
      if (cached) {
        console.log('[api-football] Returning cached fixtures:', cached.length)
        return cached
      }
      console.log('[api-football] No cache found, calling API...')
    }
    
    // Call API with season parameter
    const response = await apiRequest('/fixtures', apiParams)
    console.log('[api-football] Raw API response:', response)
    console.log('[api-football] Response type:', typeof response)
    console.log('[api-football] Response.response:', response?.response)
    console.log('[api-football] Response.response type:', typeof response?.response)
    console.log('[api-football] Response.response is array:', Array.isArray(response?.response))
    console.log('[api-football] Response.response length:', response?.response?.length)
    
    const fixtures = response.response || []
    console.log('[api-football] Returning fixtures:', fixtures)
    console.log('[api-football] Fixtures length:', fixtures.length)
    
    // Save to cache (only for date/league searches, not team/status filters)
    if (!params.team && !params.status && fixtures.length > 0) {
      await saveCachedFixtureSearch(params.from, params.to, params.league, fixtures)
      console.log('[api-football] Saved fixtures to cache')
    }
    
    return fixtures
  } catch (error) {
    console.error('[api-football] Error searching fixtures:', error)
    throw error
  }
}

/**
 * Get a single fixture by ID
 * 
 * @param fixtureId - The fixture ID
 * @returns Promise<APIFootballFixture | null> - Fixture data or null if not found
 */
export async function getFixtureById(fixtureId: number): Promise<APIFootballFixture | null> {
  try {
    const response = await apiRequest('/fixtures', { id: fixtureId })
    const fixtures = response.response || []
    return fixtures.length > 0 ? fixtures[0] : null
  } catch (error) {
    console.error('Error fetching fixture:', error)
    throw error
  }
}

/**
 * Get multiple fixtures by IDs
 * 
 * @param fixtureIds - Array of fixture IDs
 * @returns Promise<APIFootballFixture[]> - Array of fixtures
 */
export async function getFixturesByIds(fixtureIds: number[]): Promise<APIFootballFixture[]> {
  try {
    if (fixtureIds.length === 0) {
      return []
    }
    
    // API-Football accepts multiple IDs via hyphen-separated string
    const response = await apiRequest('/fixtures', { ids: fixtureIds.join('-') })
    return response.response || []
  } catch (error) {
    console.error('Error fetching fixtures:', error)
    throw error
  }
}

/**
 * Get available leagues
 * 
 * @param season - Optional season year (e.g., 2024)
 * @returns Promise<APIFootballLeague[]> - Array of leagues
 */
export async function getLeagues(season?: number): Promise<APIFootballLeague[]> {
  try {
    const params: Record<string, any> = {}
    if (season) {
      params.season = season
    }
    
    const response = await apiRequest('/leagues', params)
    return response.response || []
  } catch (error) {
    console.error('Error fetching leagues:', error)
    throw error
  }
}

/**
 * Get popular/major leagues for fixture search
 * Returns a curated list of major leagues with their IDs
 */
export function getMajorLeagues(): Array<{ id: number; name: string; country: string }> {
  return [
    { id: 39, name: 'Premier League', country: 'England' },
    { id: 140, name: 'La Liga', country: 'Spain' },
    { id: 78, name: 'Bundesliga', country: 'Germany' },
    { id: 135, name: 'Serie A', country: 'Italy' },
    { id: 61, name: 'Ligue 1', country: 'France' },
    { id: 203, name: 'Süper Lig', country: 'Turkey' },
    { id: 262, name: 'Liga MX', country: 'Mexico' },
    { id: 253, name: 'MLS', country: 'USA' },
    { id: 88, name: 'Eredivisie', country: 'Netherlands' },
    { id: 71, name: 'Serie A', country: 'Brazil' },
    { id: 235, name: 'Premier League', country: 'Russia' },
    { id: 307, name: 'Saudi Pro League', country: 'Saudi Arabia' },
  ]
}

/**
 * Get league standings/table
 * 
 * @param leagueId - League ID
 * @param season - Season year (e.g., 2024)
 * @returns Promise with standings data (team positions and form)
 */
export async function getStandings(leagueId: number, season: number): Promise<Array<{
  team: { id: number; name: string; logo: string }
  rank: number
  points: number
  goalsDiff: number
  form: string // Form string like "WWDLW"
}>> {
  try {
    const response = await apiRequest('/standings', {
      league: leagueId,
      season,
    })
    
    // API-Football returns standings in groups (for leagues with multiple groups like Champions League)
    // For most leagues, there's only one group
    const standings = response.response?.[0]?.league?.standings?.[0] || []
    
    return standings.map((team: any) => ({
      team: {
        id: team.team.id,
        name: team.team.name,
        logo: team.team.logo,
      },
      rank: team.rank,
      points: team.points,
      goalsDiff: team.goalsDiff,
      form: team.form || '', // Form string (e.g., "WWDLW")
    }))
  } catch (error) {
    console.error('[api-football] Error fetching standings:', error)
    // Don't throw - standings are optional
    return []
  }
}

/**
 * Refresh fixtures for all major leagues for the next N days
 * Calls searchFixtures for each major league and saves results to cache
 * 
 * @param days - Number of days ahead to fetch fixtures for (default: 10)
 * @param onProgress - Optional callback for progress updates (league name, fixture count)
 * @returns Promise with total fixtures, leagues processed, and any errors
 */
export async function refreshMajorLeaguesFixtures(
  days: number = 10,
  onProgress?: (league: string, fixtures: number) => void
): Promise<{
  totalFixtures: number
  leaguesProcessed: number
  errors: string[]
}> {
  const majorLeagues = getMajorLeagues()
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + days)

  // Format dates as YYYY-MM-DD
  const fromDate = today.toISOString().split('T')[0]
  const toDate = endDate.toISOString().split('T')[0]

  let totalFixtures = 0
  let leaguesProcessed = 0
  const errors: string[] = []

  console.log(`[api-football] Refreshing fixtures for ${majorLeagues.length} leagues from ${fromDate} to ${toDate}`)

  // Calculate season from the start date
  const season = calculateSeason(fromDate)
  console.log(`[api-football] Using season: ${season} for date range ${fromDate} to ${toDate}`)

  // Process each league sequentially to avoid rate limits
  for (const league of majorLeagues) {
    try {
      console.log(`[api-football] Fetching fixtures for ${league.name} (${league.country}) - Season ${season}`)
      
      const fixtures = await searchFixtures({
        from: fromDate,
        to: toDate,
        league: league.id,
        timezone: 'UTC',
        season, // Include season parameter
      })

      totalFixtures += fixtures.length
      leaguesProcessed++
      
      if (onProgress) {
        onProgress(`${league.name} (${league.country})`, fixtures.length)
      }

      console.log(`[api-football] Fetched ${fixtures.length} fixtures for ${league.name}`)
    } catch (error: any) {
      const errorMsg = `Error fetching ${league.name}: ${error.message || 'Unknown error'}`
      console.error(`[api-football] ${errorMsg}`)
      errors.push(errorMsg)
    }
  }

  console.log(`[api-football] Refresh complete: ${totalFixtures} fixtures from ${leaguesProcessed} leagues, ${errors.length} errors`)

  return {
    totalFixtures,
    leaguesProcessed,
    errors,
  }
}
