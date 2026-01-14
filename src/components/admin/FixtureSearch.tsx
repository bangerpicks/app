'use client'

import { useState, useEffect } from 'react'
import { APIFootballFixture, searchFixtures, getMajorLeagues, getStandings } from '@/lib/api-football'
import { FixtureCard } from './FixtureCard'
import { SelectedFixtures } from './SelectedFixtures'
import { Search, Loader2, AlertCircle } from 'lucide-react'

interface FixtureSearchProps {
  onSelectFixture: (fixture: APIFootballFixture) => void
  onDeselectFixture: (fixtureId: number) => void
  selectedFixtures: APIFootballFixture[]
  maxSelections?: number
  fromDate: string // YYYY-MM-DD format (required from parent)
  toDate: string // YYYY-MM-DD format (required from parent)
  onSearchResultsChange?: (fixtures: APIFootballFixture[]) => void // Callback when search results change
}

// Helper to calculate season from date
function calculateSeason(dateString: string): number {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return month >= 8 ? year : year - 1
}

export function FixtureSearch({
  onSelectFixture,
  onDeselectFixture,
  selectedFixtures,
  maxSelections = 10,
  fromDate,
  toDate,
  onSearchResultsChange,
}: FixtureSearchProps) {
  const [selectedLeague, setSelectedLeague] = useState<number | ''>('')
  const [searchResults, setSearchResults] = useState<APIFootballFixture[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teamPositions, setTeamPositions] = useState<Map<number, number>>(new Map()) // teamId -> position

  const majorLeagues = getMajorLeagues()
  const selectedFixtureIds = selectedFixtures.map((f) => f.fixture.id)
  const canSelectMore = selectedFixtures.length < maxSelections

  // Log when dates change
  useEffect(() => {
    console.log('[FixtureSearch] fromDate changed:', fromDate)
  }, [fromDate])

  useEffect(() => {
    console.log('[FixtureSearch] toDate changed:', toDate)
  }, [toDate])

  useEffect(() => {
    console.log('[FixtureSearch] selectedLeague changed:', selectedLeague)
  }, [selectedLeague])

  const handleSearch = async () => {
    console.log('[FixtureSearch] handleSearch called')
    console.log('[FixtureSearch] Current state:', {
      fromDate,
      toDate,
      selectedLeague,
      selectedFixtureIds,
      selectedFixturesCount: selectedFixtures.length,
    })

    if (!fromDate || !toDate) {
      console.warn('[FixtureSearch] Missing dates - fromDate:', fromDate, 'toDate:', toDate)
      setError('Gameweek start and end dates must be set first')
      return
    }

    // API-Football requires at least one filter (league, team, etc.) when using date ranges
    if (!selectedLeague) {
      setError('Please select a league to search. API-Football requires a league filter for date range searches.')
      return
    }

    console.log('[FixtureSearch] Starting search with params:', {
      from: fromDate,
      to: toDate,
      league: selectedLeague || undefined,
      timezone: 'UTC',
    })

    setLoading(true)
    setError(null)

    try {
      const searchParams = {
        from: fromDate,
        to: toDate,
        league: selectedLeague || undefined,
        timezone: 'UTC',
      }
      console.log('[FixtureSearch] Calling searchFixtures with:', searchParams)
      
      const results = await searchFixtures(searchParams)
      
      console.log('[FixtureSearch] searchFixtures returned:', {
        resultsCount: results?.length || 0,
        results: results,
        isArray: Array.isArray(results),
      })

      // Filter out fixtures that are already selected
      console.log('[FixtureSearch] Filtering results - selectedFixtureIds:', selectedFixtureIds)
      const availableResults = results.filter(
        (fixture) => !selectedFixtureIds.includes(fixture.fixture.id)
      )
      console.log('[FixtureSearch] After filtering:', {
        originalCount: results.length,
        availableCount: availableResults.length,
        filteredOut: results.length - availableResults.length,
      })

      setSearchResults(availableResults)
      console.log('[FixtureSearch] Search results set, count:', availableResults.length)
      
      // Fetch standings if a league is selected
      if (selectedLeague && results.length > 0) {
        try {
          const season = calculateSeason(fromDate)
          console.log('[FixtureSearch] Fetching standings for league:', selectedLeague, 'season:', season)
          const standings = await getStandings(selectedLeague, season)
          
          // Create a map of team ID to position
          const positionsMap = new Map<number, number>()
          standings.forEach((team) => {
            positionsMap.set(team.team.id, team.rank)
          })
          setTeamPositions(positionsMap)
          console.log('[FixtureSearch] Loaded positions for', positionsMap.size, 'teams')
        } catch (err) {
          console.warn('[FixtureSearch] Could not load standings:', err)
          // Standings are optional, so we continue even if they fail
        }
      } else {
        setTeamPositions(new Map())
      }
      
      // Notify parent of search results (including all results, not just available)
      if (onSearchResultsChange) {
        onSearchResultsChange(results) // Pass all results, not just available ones
      }

      if (availableResults.length === 0) {
        console.warn('[FixtureSearch] No available fixtures after filtering')
        if (results.length > 0) {
          console.log('[FixtureSearch] All fixtures were already selected')
          setError('All fixtures from the search are already selected. Deselect some to see them again.')
        } else {
          console.log('[FixtureSearch] No fixtures found in API response')
          console.log('[FixtureSearch] Search params were:', { fromDate, toDate, selectedLeague })
          // Provide helpful error message
          const errorMsg = selectedLeague 
            ? `No fixtures found for ${fromDate} to ${toDate} in the selected league. Try a different date range or select "All Leagues".`
            : `No fixtures found for ${fromDate} to ${toDate}. Try a different date range or select a specific league.`
          setError(errorMsg)
        }
      } else {
        console.log('[FixtureSearch] Search successful, displaying', availableResults.length, 'fixtures')
        setError(null) // Clear any previous errors
      }
    } catch (err: any) {
      console.error('[FixtureSearch] Error searching fixtures:', err)
      console.error('[FixtureSearch] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        fullError: err,
      })
      const errorMessage =
        err.message?.includes('rate limit') || err.message?.includes('429')
          ? 'API rate limit reached. Please try again later.'
          : err.message || 'Failed to search fixtures. Please try again.'
      console.error('[FixtureSearch] Setting error message:', errorMessage)
      setError(errorMessage)
      setSearchResults([])
    } finally {
      console.log('[FixtureSearch] Search completed, setting loading to false')
      setLoading(false)
    }
  }

  const handleSelectFixture = (fixture: APIFootballFixture) => {
    if (selectedFixtures.length >= maxSelections) {
      setError(`Maximum ${maxSelections} fixtures allowed`)
      return
    }
    onSelectFixture(fixture)
    // Remove from search results
    setSearchResults((prev) =>
      prev.filter((f) => f.fixture.id !== fixture.fixture.id)
    )
  }

  const handleDeselectFixture = (fixtureId: number) => {
    onDeselectFixture(fixtureId)
  }

  // Log component state on render
  console.log('[FixtureSearch] Component render:', {
    fromDate,
    toDate,
    selectedLeague,
    searchResultsCount: searchResults.length,
    selectedFixturesCount: selectedFixtures.length,
    loading,
    error,
    canSelectMore,
    maxSelections,
  })

  return (
    <div className="space-y-4">
      <div className="bg-midnight-violet border border-lime-yellow rounded-[10px] p-4">
        <h3 className="text-lg font-bold text-ivory mb-4">Search Fixtures</h3>

        <div className="mb-4">
          <p className="text-sm text-ivory opacity-70 mb-4">
            Searching fixtures from <span className="font-medium">{fromDate}</span> to <span className="font-medium">{toDate}</span>
            {' '}(using gameweek start/end dates)
          </p>
          
          <div>
            <label className="block text-sm text-ivory mb-2">
              League Filter <span className="text-cinnabar">*</span>
            </label>
            <select
              value={selectedLeague}
              onChange={(e) =>
                setSelectedLeague(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
              required
            >
              <option value="">Select a league (required)</option>
              {majorLeagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name} ({league.country})
                </option>
              ))}
            </select>
            <p className="text-xs text-ivory opacity-70 mt-1">
              A league must be selected to search fixtures
            </p>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full md:w-auto px-6 py-2 bg-lime-yellow text-midnight-violet font-bold rounded-[10px] hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Searching...
            </>
          ) : (
            <>
              <Search size={18} />
              Search Fixtures
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-cinnabar bg-opacity-20 border border-cinnabar rounded-[10px] flex items-center gap-2">
            <AlertCircle size={18} className="text-cinnabar" />
            <p className="text-sm text-cinnabar">{error}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-midnight-violet border border-lime-yellow rounded-[10px] p-4">
            <h3 className="text-lg font-bold text-ivory mb-4">
              Search Results ({searchResults.length})
            </h3>
            {searchResults.length === 0 && !loading && (
              <p className="text-ivory opacity-50 text-sm">
                {error
                  ? 'No results to display'
                  : 'Search for fixtures using the form above'}
              </p>
            )}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {searchResults.map((fixture) => (
                <FixtureCard
                  key={fixture.fixture.id}
                  fixture={fixture}
                  isSelected={selectedFixtureIds.includes(fixture.fixture.id)}
                  onSelect={() => handleSelectFixture(fixture)}
                  onDeselect={() => handleDeselectFixture(fixture.fixture.id)}
                  disabled={!canSelectMore}
                  homeTeamPosition={teamPositions.get(fixture.teams.home.id)}
                  awayTeamPosition={teamPositions.get(fixture.teams.away.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <SelectedFixtures
            fixtures={selectedFixtures}
            onRemove={handleDeselectFixture}
          />
        </div>
      </div>
    </div>
  )
}
