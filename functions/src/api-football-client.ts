import type { APIFootballFixture } from './api-football-types'

export const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io'
export const API_FOOTBALL_BATCH_SIZE = 20

export class ApiFootballRateLimitError extends Error {
  readonly httpStatus = 429

  constructor(message = 'API-Football rate limit (429)') {
    super(message)
    this.name = 'ApiFootballRateLimitError'
  }
}

let rateLimitWarningLogged = false

/** Reset per scheduled tick so we log at most one WARNING per invocation */
export function resetApiFootballRateLimitWarning(): void {
  rateLimitWarningLogged = false
}

export function logApiFootballRateLimitWarning(functionName: string, detail?: string): void {
  if (rateLimitWarningLogged) {
    return
  }
  rateLimitWarningLogged = true
  console.warn(
    `[${functionName}] API-Football rate limited (429); skipping remaining API calls this tick${detail ? `: ${detail}` : ''}`
  )
}

type FetchLike = typeof fetch

function parseApiFootballFixtures(data: { errors?: Record<string, string>; response?: APIFootballFixture[] }): APIFootballFixture[] {
  if (data.errors) {
    const errorKeys = Object.keys(data.errors)
    if (errorKeys.length > 0) {
      const errorMessages = errorKeys.map((key) => `${key}: ${data.errors![key]}`).join(', ')
      throw new Error(`API-Football errors: ${errorMessages}`)
    }
  }
  return data.response || []
}

async function fetchFixturesChunk(
  apiKey: string,
  fixtureIds: number[],
  fetchFn: FetchLike
): Promise<APIFootballFixture[]> {
  if (fixtureIds.length === 0) {
    return []
  }

  const ids = fixtureIds.join('-')
  const url = `${API_FOOTBALL_BASE_URL}/fixtures?ids=${ids}`

  const response = await fetchFn(url, {
    method: 'GET',
    headers: {
      'x-apisports-key': apiKey,
    },
  })

  if (response.status === 429) {
    throw new ApiFootballRateLimitError()
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API-Football request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = (await response.json()) as { errors?: Record<string, string>; response?: APIFootballFixture[] }
  return parseApiFootballFixtures(data)
}

/**
 * Fetch fixtures in batches of up to 20 IDs (API-Football limit).
 * Stops and throws ApiFootballRateLimitError on 429 without retrying.
 */
export async function fetchFixturesByIdsBatched(
  apiKey: string,
  fixtureIds: number[],
  fetchFn: FetchLike = fetch
): Promise<APIFootballFixture[]> {
  const uniqueIds = [...new Set(fixtureIds)]
  const results: APIFootballFixture[] = []

  for (let i = 0; i < uniqueIds.length; i += API_FOOTBALL_BATCH_SIZE) {
    const chunk = uniqueIds.slice(i, i + API_FOOTBALL_BATCH_SIZE)
    const batch = await fetchFixturesChunk(apiKey, chunk, fetchFn)
    results.push(...batch)
  }

  return results
}

export async function apiFootballGet(
  apiKey: string,
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  fetchFn: FetchLike = fetch
): Promise<unknown> {
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value))
    }
  })

  const url = `${API_FOOTBALL_BASE_URL}${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

  const response = await fetchFn(url, {
    method: 'GET',
    headers: {
      'x-apisports-key': apiKey,
    },
  })

  if (response.status === 429) {
    throw new ApiFootballRateLimitError()
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API-Football request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = (await response.json()) as { errors?: Record<string, string>; response?: unknown }
  if (data.errors) {
    const errorKeys = Object.keys(data.errors)
    if (errorKeys.length > 0) {
      const errorMessages = errorKeys.map((key) => `${key}: ${data.errors![key]}`).join(', ')
      throw new Error(`API-Football errors: ${errorMessages}`)
    }
  }

  return data
}
