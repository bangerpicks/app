/*
  Enhanced API Module for Multi-League Support — api-leagues.js
  Extends the existing API functionality to support league-specific operations
*/

import { af } from './api-football.js';
import { db, firestoreReady, currentUser } from './auth.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// Enhanced fixture fetching with league support
export async function getFixturesForLeague(leagueId, dateRange = null) {
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      throw new Error('Database not available');
    }

    // Get league information
    const leagueRef = doc(firestoreDb, 'leagues', leagueId);
    const leagueDoc = await getDoc(leagueRef);
    
    if (!leagueDoc.exists()) {
      throw new Error('League not found');
    }

    const league = leagueDoc.data();
    
    // If no date range specified, use current weekend
    if (!dateRange) {
      const { from, to } = getWeekendRange();
      dateRange = { from, to };
    }

    // Fetch fixtures for the league and date range
    const fixtures = await fetchLeagueFixtures(league, dateRange);
    
    return fixtures;
  } catch (error) {
    console.error('Error fetching fixtures for league:', error);
    throw error;
  }
}

// Fetch fixtures for a specific league
async function fetchLeagueFixtures(league, dateRange) {
  try {
    // Use API-Football to get fixtures for the league
    const params = {
      league: league.apiFootballId || league.id, // Use API-Football league ID if available
      season: league.season || '2024',
      from: dateRange.from,
      to: dateRange.to
    };

    console.log('Fetching league fixtures with params:', params);
    
    const response = await af.get('/fixtures', params);
    const fixtures = response.response || [];
    
    // Sort by date
    fixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
    
    console.log(`Found ${fixtures.length} fixtures for league ${league.name}`);
    return fixtures;
    
  } catch (error) {
    console.error('Error fetching league fixtures from API:', error);
    throw error;
  }
}

// Get all available leagues from API-Football
export async function getAvailableLeagues() {
  try {
    const response = await af.get('/leagues');
    const leagues = response.response || [];
    
    // Filter for active leagues and sort by popularity/name
    const activeLeagues = leagues
      .filter(league => league.league.type === 'League' && league.seasons.some(s => s.current))
      .sort((a, b) => a.league.name.localeCompare(b.league.name));
    
    return activeLeagues;
  } catch (error) {
    console.error('Error fetching available leagues:', error);
    throw error;
  }
}

// Get leagues by country
export async function getLeaguesByCountry(country) {
  try {
    const response = await af.get('/leagues', { country });
    const leagues = response.response || [];
    
    // Filter for active leagues
    const activeLeagues = leagues.filter(league => 
      league.league.type === 'League' && 
      league.seasons.some(s => s.current)
    );
    
    return activeLeagues;
  } catch (error) {
    console.error('Error fetching leagues by country:', error);
    throw error;
  }
}

// Get current season for a league
export async function getLeagueSeason(leagueId) {
  try {
    const response = await af.get('/leagues', { id: leagueId });
    const league = response.response?.[0];
    
    if (!league) {
      throw new Error('League not found');
    }
    
    // Get current season
    const currentSeason = league.seasons.find(s => s.current);
    return currentSeason || league.seasons[league.seasons.length - 1];
    
  } catch (error) {
    console.error('Error fetching league season:', error);
    throw error;
  }
}

// Enhanced fixture loading that supports league context
export async function loadFixturesWithLeagueContext(leagueId = null, weekId = null) {
  try {
    let fixtures = [];
    
    if (leagueId) {
      // Load fixtures for specific league
      const dateRange = weekId ? parseWeekId(weekId) : null;
      fixtures = await getFixturesForLeague(leagueId, dateRange);
    } else {
      // Load default fixtures (existing behavior)
      fixtures = await fetchWeekendTop10();
    }
    
    return {
      fixtures,
      leagueId,
      weekId,
      loadedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error loading fixtures with league context:', error);
    throw error;
  }
}

// Parse week ID to get date range
function parseWeekId(weekId) {
  // Expected format: "2024-01-15_2024-01-21" or similar
  const parts = weekId.split('_');
  if (parts.length === 2) {
    return {
      from: parts[0],
      to: parts[1]
    };
  }
  return null;
}

// Get weekend range (helper function)
function getWeekendRange(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay();
  const diffToFri = (5 - day + 7) % 7;
  const friday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToFri);
  const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2);
  const toISO = (x) => x.toISOString().slice(0, 10);
  return { from: toISO(friday), to: toISO(sunday) };
}

// Import the existing fetchWeekendTop10 function
async function fetchWeekendTop10() {
  // This would be imported from the existing api.js
  // For now, we'll return an empty array to avoid circular dependencies
  return [];
}

// Get league standings
export async function getLeagueStandings(leagueId, season = null) {
  try {
    const params = {
      league: leagueId,
      season: season || '2024'
    };
    
    console.log(`getLeagueStandings: Fetching for league ${leagueId}, season ${season}`);
    console.log(`getLeagueStandings: API params:`, params);
    
    const response = await af.get('/standings', params);
    console.log(`getLeagueStandings: Raw API response:`, response);
    
    const standings = response.response || [];
    console.log(`getLeagueStandings: Processed standings:`, standings);
    console.log(`getLeagueStandings: Standings length:`, standings.length);
    
    return standings;
  } catch (error) {
    console.error('Error fetching league standings:', error);
    throw error;
  }
}

// Get league teams
export async function getLeagueTeams(leagueId, season = null) {
  try {
    const params = {
      league: leagueId,
      season: season || '2024'
    };
    
    const response = await af.get('/teams', params);
    const teams = response.response || [];
    
    return teams;
  } catch (error) {
    console.error('Error fetching league teams:', error);
    throw error;
  }
}

// Search for leagues by name
export async function searchLeagues(query) {
  try {
    const allLeagues = await getAvailableLeagues();
    
    const searchTerm = query.toLowerCase();
    const results = allLeagues.filter(league => 
      league.league.name.toLowerCase().includes(searchTerm) ||
      league.country.name.toLowerCase().includes(searchTerm)
    );
    
    return results;
  } catch (error) {
    console.error('Error searching leagues:', error);
    throw error;
  }
}

// Get popular leagues (top leagues by country)
export async function getPopularLeagues() {
  try {
    const popularLeagueIds = [
      39, // Premier League (England)
      140, // La Liga (Spain)
      135, // Serie A (Italy)
      78, // Bundesliga (Germany)
      61, // Ligue 1 (France)
      88, // Eredivisie (Netherlands)
      94, // Primeira Liga (Portugal)
      119, // Scottish Premiership
      197, // Turkey Super Lig
      203, // Greece Super League
    ];
    
    const leagues = [];
    
    for (const leagueId of popularLeagueIds) {
      try {
        const response = await af.get('/leagues', { id: leagueId });
        const league = response.response?.[0];
        if (league) {
          leagues.push(league);
        }
      } catch (error) {
        console.warn(`Failed to fetch popular league ${leagueId}:`, error);
      }
    }
    
    return leagues;
  } catch (error) {
    console.error('Error fetching popular leagues:', error);
    throw error;
  }
}
