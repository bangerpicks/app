/*
  App bootstrap — app.js
  • Wires UI → auth, API, Firestore
  • Renders match cards, handles selection
  • Saves predictions and triggers awarding checks periodically
*/

import { onUserChanged, currentUser, isFirestoreReady, waitForFirestore, firestoreReady, safeFirebaseOperation } from './auth.js';
import { fetchWeekendTop10, getCurrentDashboardWeekId, formatWeekDisplay, getWeekName } from './api.js';
import { savePredictions, ensureUserDoc, checkAndAwardForUser, getPredictionsForUserFixtures } from './scoring.js';
// doc and getDoc imports removed - no longer needed for week navigation
import { bindLogoutButton } from './auth.js';
import { getCurrentLeague, loadCurrentLeague, setCurrentLeague } from './leagues.js';
import { getLeagueStandings } from './api-leagues.js';

const matchesEl = document.getElementById('matches');
const matchesEmptyEl = document.getElementById('matches-empty');
const matchesErrorEl = document.getElementById('matches-error');
const matchesLoadingEl = document.getElementById('matches-loading');
// const rankingsBody = document.getElementById('rankings-body');
// const rankingsEmpty = document.getElementById('rankings-empty');
const submitBtn = document.getElementById('btn-submit');
const refreshBtn = document.getElementById('btn-refresh');
const refreshPositionsBtn = document.getElementById('btn-refresh-positions');
let logoutLink = document.getElementById('logout-link');

// Ensure logoutLink exists, if not create it dynamically
if (!logoutLink) {
  console.warn('logout-link element not found, creating dynamically');
  const userPanel = document.getElementById('user-panel');
  if (userPanel) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-link';
    logoutBtn.className = 'btn ghost hidden';
    logoutBtn.textContent = 'Log out';
    userPanel.appendChild(logoutBtn);
    // Update the reference
    logoutLink = logoutBtn;
    // Bind the logout functionality
    bindLogoutButton(logoutBtn);
  }
}

// Current week display element
const currentWeekText = document.getElementById('current-week-text');

let choices = {}; // { fixtureId: 'H'|'D'|'A' }
let unsubs = [];
let loadMatchesRequestId = 0; // Guards against overlapping loads rendering twice
let currentWeekId = null; // Track current week
let currentFixtures = [];
let lastLoadMatchesCall = 0; // Track last loadMatches call time
const LOAD_MATCHES_DEBOUNCE_MS = 1000; // Minimum time between loadMatches call time
let currentLeague = null; // Track current league context
let teamPositionsCache = {}; // Cache for team positions { teamId: position }
let teamPositionsCacheExpiry = 0; // Cache expiry timestamp
const TEAM_POSITIONS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache TTL

function clearUnsubs() { unsubs.forEach(fn => fn && fn()); unsubs = []; }

// Helper function to get dynamic position class based on rank and total teams
function getDynamicPositionClass(rank, totalTeams) {
  console.log(`getDynamicPositionClass called with: rank=${rank}, totalTeams=${totalTeams}`);
  
  if (!rank || !totalTeams || totalTeams <= 0) {
    console.log(`Invalid parameters, returning position-unknown`);
    return 'position-unknown';
  }
  
  // Calculate percentage based on rank (lower rank = better position = lower percentage)
  const percentage = (rank / totalTeams) * 100;
  console.log(`Calculated percentage: ${percentage.toFixed(1)}%`);
  
  if (percentage <= 15) {
    console.log(`Returning position-top (green)`);
    return 'position-top'; // Top 15% - Green
  } else if (percentage <= 30) {
    console.log(`Returning position-upper (light green)`);
    return 'position-upper'; // 15-30% - Light green
  } else if (percentage <= 45) {
    console.log(`Returning position-mid-upper (yellow-green)`);
    return 'position-mid-upper'; // 30-45% - Yellow-green
  } else if (percentage <= 60) {
    console.log(`Returning position-mid (bright green)`);
    return 'position-mid'; // 45-60% - Yellow
  } else if (percentage <= 75) {
    console.log(`Returning position-mid-lower (lime green)`);
    return 'position-mid-lower'; // 60-75% - Lime green
  } else if (percentage <= 90) {
    console.log(`Returning position-lower (yellow)`);
    return 'position-lower'; // 75-90% - Orange
  } else {
    console.log(`Returning position-bottom (red)`);
    return 'position-bottom'; // Bottom 10% - Red
  }
}

// Fetch and cache team positions for the current league
async function fetchTeamPositions() {
  try {
    console.log('=== fetchTeamPositions: Starting ===');
    
    // Check if cache is still valid
    console.log('Cache check - expiry:', new Date(teamPositionsCacheExpiry), 'current time:', new Date());
    console.log('Cache check - expiry > now:', teamPositionsCacheExpiry > Date.now());
    console.log('Cache check - has data:', Object.keys(teamPositionsCache).length > 0);
    
    if (teamPositionsCacheExpiry > Date.now() && Object.keys(teamPositionsCache).length > 0) {
      console.log('Using cached team positions, cache valid until:', new Date(teamPositionsCacheExpiry));
      return teamPositionsCache;
    }
    
    console.log('Cache expired or empty, fetching fresh data...');

    // Try to get league ID from multiple sources
    let leagueId = null;
    let season = new Date().getFullYear().toString(); // Use current year as default

    // First try: Check if we have fixtures and can determine league from them (highest priority)
    if (currentFixtures && currentFixtures.length > 0) {
      const firstFixture = currentFixtures[0];
      console.log('First fixture league info:', firstFixture.league);
      
      if (firstFixture.league && firstFixture.league.id) {
        leagueId = firstFixture.league.id;
        console.log('✓ Using league ID from fixtures (highest priority):', leagueId);
        
        // Try to detect season from fixture date
        if (firstFixture.fixture && firstFixture.fixture.date) {
          const fixtureDate = new Date(firstFixture.fixture.date);
          const fixtureYear = fixtureDate.getFullYear();
          const currentYear = new Date().getFullYear();
          
          // Be more conservative with season detection
          if (fixtureYear === currentYear) {
            season = fixtureYear.toString();
            console.log(`✓ Detected season ${season} from fixture date: ${firstFixture.fixture.date}`);
          } else if (fixtureYear === currentYear + 1) {
            // If fixture is next year, try current year first, then next year
            season = currentYear.toString();
            console.log(`Fixture date ${fixtureYear} is next year, will try current season ${currentYear} first`);
          } else {
            season = currentYear.toString();
            console.log(`Fixture date ${fixtureYear} seems unusual, using current year ${currentYear}`);
          }
        }
      }
    }

    // Second try: Get from current league context (only if no fixture league found)
    if (!leagueId) {
      const league = getCurrentLeague();
      console.log('Current league from getCurrentLeague():', league);
      
      if (league && league.apiFootballId) {
        leagueId = league.apiFootballId;
        season = league.season || season;
        console.log('✓ Using league ID from current league context:', leagueId, 'season:', season);
      }
    }
    
    // Third try: Use default Liga MX ID if we're showing Mexican fixtures
    if (!leagueId && currentFixtures && currentFixtures.length > 0) {
      const firstFixture = currentFixtures[0];
      if (firstFixture.league && firstFixture.league.name && 
          firstFixture.league.name.toLowerCase().includes('liga mx')) {
        leagueId = 262; // Liga MX API Football ID
        season = season; // Keep detected season
        console.log('✓ Using default Liga MX league ID:', leagueId, 'season:', season);
      }
    }

    // Fourth try: Use Premier League as default if no other league detected
    if (!leagueId) {
      leagueId = 39; // Premier League API Football ID
      season = season; // Keep detected season
      console.log('✓ Using default Premier League ID:', leagueId, 'season:', season);
    }

    if (!leagueId) {
      console.log('✗ No league ID available, skipping team positions');
      return {};
    }

    // Fetch standings from API
    console.log(`=== Fetching standings for league ${leagueId}, season ${season} ===`);
    let standings = await getLeagueStandings(leagueId, season);
    
    // If no standings for current season, try previous season
    if ((!standings || standings.length === 0) && season === new Date().getFullYear().toString()) {
      const previousSeason = (new Date().getFullYear() - 1).toString();
      console.log(`No standings for ${season}, trying ${previousSeason} season...`);
      standings = await getLeagueStandings(leagueId, previousSeason);
      
      // If still no standings, try the season before that
      if ((!standings || standings.length === 0)) {
        const twoSeasonsAgo = (new Date().getFullYear() - 2).toString();
        console.log(`No standings for ${previousSeason}, trying ${twoSeasonsAgo} season...`);
        standings = await getLeagueStandings(leagueId, twoSeasonsAgo);
      }
    }
    
    // If still no standings and we have a fixture year, try that
    if ((!standings || standings.length === 0) && firstFixture.fixture && firstFixture.fixture.date) {
      const fixtureDate = new Date(firstFixture.fixture.date);
      const fixtureYear = fixtureDate.getFullYear();
      if (fixtureYear !== parseInt(season)) {
        console.log(`No standings for detected season ${season}, trying fixture year ${fixtureYear}...`);
        standings = await getLeagueStandings(leagueId, fixtureYear.toString());
      }
    }
    
    // Additional fallback: try current year - 1 if we're in the first half of the year
    if ((!standings || standings.length === 0)) {
      const currentMonth = new Date().getMonth() + 1; // January = 1
      if (currentMonth <= 6) { // First half of year, try previous season
        const fallbackSeason = (new Date().getFullYear() - 1).toString();
        console.log(`No standings found, trying fallback season ${fallbackSeason} (current month: ${currentMonth})...`);
        standings = await getLeagueStandings(leagueId, fallbackSeason);
      }
    }
    
    if (!standings || standings.length === 0) {
      console.log('✗ No standings available for league:', leagueId, 'in seasons', season, 'or', (new Date().getFullYear() - 1).toString());
      return {};
    }
    
    // Additional debugging: Check if standings have actual data
    let hasTeamData = false;
    standings.forEach((group, index) => {
      if (group.standings && Array.isArray(group.standings) && group.standings.length > 0) {
        hasTeamData = true;
      } else if (group.league && group.league.standings && Array.isArray(group.league.standings) && group.league.standings.length > 0) {
        hasTeamData = true;
      }
    });
    
    if (!hasTeamData) {
      console.log('⚠️ Standings array exists but contains no team data');
      console.log('Standings structure:', JSON.stringify(standings, null, 2));
    }

    // Debug: Log the structure of the first group to understand the data format
    if (standings.length > 0) {
      if (standings[0].league) {
        if (standings[0].league.standings) {
          if (standings[0].league.standings.length > 0) {
            // Only log if there's an issue
            const firstStanding = standings[0].league.standings[0];
            if (firstStanding && typeof firstStanding === 'object') {
              const keys = Object.keys(firstStanding);
              if (keys.length > 0 && keys.every(key => !isNaN(parseInt(key)))) {
                console.log(`Found ${keys.length} team standings in unusual numeric key format`);
              }
            }
          }
        }
      }
    }

    // Debug: Log the structure of the first group to understand the data format
    if (standings.length > 0) {
      if (standings[0].league) {
        if (standings[0].league.standings) {
          if (standings[0].league.standings.length > 0) {
            // Only log if there's an issue
            const firstStanding = standings[0].league.standings[0];
            if (firstStanding && typeof firstStanding === 'object') {
              const keys = Object.keys(firstStanding);
              if (keys.length > 0 && keys.every(key => !isNaN(parseInt(key)))) {
                console.log(`Found ${keys.length} team standings in unusual numeric key format`);
              }
            }
          }
        }
      }
    }

    // Process standings data
    const positions = {};
    let totalTeams = 0; // Track total number of teams for dynamic scaling
    
    standings.forEach((group, groupIndex) => {
      // The API returns standings in different possible structures
      let teamStandings = [];
      
      if (group.standings && Array.isArray(group.standings)) {
        // Direct standings array
        teamStandings = group.standings;
      } else if (group.league && group.league.standings && Array.isArray(group.league.standings)) {
        // Standings nested under league object
        teamStandings = group.league.standings;
      } else if (Array.isArray(group)) {
        // Standings might be directly an array
        teamStandings = group;
      }
      
      // Count total teams for dynamic scaling
      // For the unusual numeric key structure, we need to count the actual teams, not the groups
      if (teamStandings.length > 0 && typeof teamStandings[0] === 'object' && teamStandings[0] !== null) {
        const firstItem = teamStandings[0];
        const firstItemKeys = Object.keys(firstItem);
        
        // Check if this is the unusual numeric key structure
        if (firstItemKeys.length > 0 && firstItemKeys.every(key => !isNaN(parseInt(key)))) {
          // For numeric key structure, count the actual teams
          totalTeams = firstItemKeys.length;
          console.log(`Group ${groupIndex}: Detected numeric key structure with ${totalTeams} teams`);
        } else {
          // Normal structure, add the count
          totalTeams += teamStandings.length;
          console.log(`Group ${groupIndex}: teamStandings.length = ${teamStandings.length}, totalTeams now = ${totalTeams}`);
        }
      } else {
        // Normal structure, add the count
        totalTeams += teamStandings.length;
        console.log(`Group ${groupIndex}: teamStandings.length = ${teamStandings.length}, totalTeams now = ${totalTeams}`);
      }
      
      // Handle the unusual case where teamStandings is an array with numeric keys
      // This suggests the data structure is different than expected
      if (teamStandings.length > 0 && typeof teamStandings[0] === 'object' && teamStandings[0] !== null) {
        const firstItem = teamStandings[0];
        const firstItemKeys = Object.keys(firstItem);
        
        // Check if this is the unusual numeric key structure
        if (firstItemKeys.length > 0 && firstItemKeys.every(key => !isNaN(parseInt(key)))) {
          console.log('⚠️ Detected unusual numeric key structure, attempting to extract team data...');
          
          // Try to extract team data from each numeric key
          firstItemKeys.forEach(key => {
            const teamData = firstItem[key];
            if (teamData && typeof teamData === 'object') {
              console.log(`Processing team data from key ${key}:`, teamData);
              
              // Try different possible data structures for the team data
              let teamId = null;
              let teamName = null;
              let teamRank = null;
              
              // Structure 1: team.team.id and team.rank (expected)
              if (teamData.team && teamData.team.id && teamData.rank) {
                teamId = teamData.team.id;
                teamName = teamData.team.name;
                teamRank = teamData.rank;
                console.log(`✓ Found team data using structure 1: ${teamName} (ID: ${teamId}) at position ${teamRank}`);
              }
              // Structure 2: direct properties (alternative)
              else if (teamData.id && teamData.rank) {
                teamId = teamData.id;
                teamName = teamData.name;
                teamRank = teamData.rank;
                console.log(`✓ Found team data using structure 2: ${teamName} (ID: ${teamId}) at position ${teamRank}`);
              }
              // Structure 3: different property names
              else if (teamData.team_id && teamData.position) {
                teamId = teamData.team_id;
                teamName = teamData.team_name || teamData.name;
                teamRank = teamData.position;
                console.log(`✓ Found team data using structure 3: ${teamName} (ID: ${teamId}) at position ${teamRank}`);
              }
              // Structure 4: nested under different properties
              else if (teamData.team && typeof teamData.team === 'object') {
                // Try to find any numeric property that could be rank
                const numericProps = Object.entries(teamData.team).filter(([key, value]) => 
                  typeof value === 'number' && ['rank', 'position', 'standing', 'place'].includes(key)
                );
                if (numericProps.length > 0 && teamData.team.id) {
                  teamId = teamData.team.id;
                  teamName = teamData.team.name;
                  teamRank = numericProps[0][1];
                  console.log(`✓ Found team data using structure 4: ${teamName} (ID: ${teamId}) at position ${teamRank}`);
                }
              }
              
              if (teamId && teamRank) {
                // Store both rank and dynamic position class
                const positionClass = getDynamicPositionClass(teamRank, totalTeams);
                console.log(`Calculating position class for ${teamName}: rank ${teamRank}, total teams ${totalTeams}, percentage ${((teamRank / totalTeams) * 100).toFixed(1)}%, class: ${positionClass}`);
                
                positions[teamId] = {
                  rank: teamRank,
                  class: positionClass
                };
                console.log(`✓ Cached: Team ${teamName} (ID: ${teamId}) at position ${teamRank} with class ${positionClass}`);
              } else {
                console.log(`✗ Could not extract team data from:`, teamData);
              }
            }
          });
          
          // Skip the normal processing since we handled the numeric key structure
          return;
        }
      }
      
      // Normal processing for standard data structures
      teamStandings.forEach((team, teamIndex) => {
        // Try different possible data structures
        let teamId = null;
        let teamName = null;
        let teamRank = null;
        
        // Structure 1: team.team.id and team.rank (expected)
        if (team.team && team.team.id && team.rank) {
          teamId = team.team.id;
          teamName = team.team.name;
          teamRank = team.rank;
          console.log(`✓ Found team data using structure 1: ${teamName} (ID: ${teamId}) at position ${teamRank}`);
        }
        // Structure 2: direct properties (alternative)
        else if (team.id && team.rank) {
          teamId = team.id;
          teamName = team.name;
          teamRank = team.rank;
          console.log(`✓ Found team data using structure 2: ${teamName} (ID: ${teamId}) at position ${teamRank}`);
        }
        // Structure 3: different property names
        else if (team.team_id && team.position) {
          teamId = team.team_id;
          teamName = team.team_name || team.name;
          teamRank = team.position;
          console.log(`✓ Found team data using structure 3: ${teamName} (ID: ${teamId}) at position ${teamRank}`);
        }
        // Structure 4: nested under different properties
        else if (team.team && typeof team.team === 'object') {
          // Try to find any numeric property that could be rank
          const numericProps = Object.entries(team.team).filter(([key, value]) => 
            typeof value === 'number' && ['rank', 'position', 'standing', 'place'].includes(key)
          );
          if (numericProps.length > 0 && team.team.id) {
            teamId = team.team.id;
            teamName = team.team.name;
            teamRank = numericProps[0][1];
            console.log(`✓ Found team data using structure 4: ${teamName} (ID: ${teamId}) at position ${teamRank}`);
          }
        }
        
        if (teamId && teamRank) {
          // Store both rank and dynamic position class
          positions[teamId] = {
            rank: teamRank,
            class: getDynamicPositionClass(teamRank, totalTeams)
          };
          console.log(`✓ Cached: Team ${teamName} (ID: ${teamId}) at position ${teamRank} with class ${getDynamicPositionClass(teamRank, totalTeams)}`);
        } else {
          console.log(`✗ Could not extract team data from:`, team);
        }
      });
    });

    // Update cache
    teamPositionsCache = positions;
    teamPositionsCacheExpiry = Date.now() + TEAM_POSITIONS_CACHE_TTL;
    
    console.log(`✓ Cached ${Object.keys(positions).length} team positions for league ${leagueId}`);
    
    return positions;
  } catch (error) {
    console.error('✗ Failed to fetch team positions:', error);
    return {};
  }
}

// Get team position with fallback
function getTeamPosition(teamId) {
  if (!teamId) {
    return null;
  }
  
  if (!teamPositionsCache[teamId]) {
    return null;
  }
  
  // Return the rank number for backward compatibility
  return teamPositionsCache[teamId].rank || teamPositionsCache[teamId];
}

// Get team position class for dynamic styling
function getTeamPositionClass(teamId) {
  if (!teamId) {
    return 'position-unknown';
  }
  
  if (!teamPositionsCache[teamId]) {
    return 'position-unknown';
  }
  
  // Return the dynamic position class
  return teamPositionsCache[teamId].class || 'position-unknown';
}

// Get position suffix (1st, 2nd, 3rd, etc.)
function getPositionSuffix(position) {
  if (position >= 11 && position <= 13) return 'th';
  switch (position % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Clear team positions cache (useful when league changes)
function clearTeamPositionsCache() {
  teamPositionsCache = {};
  teamPositionsCacheExpiry = 0;
}

// Detect if league has changed and clear cache if needed
function detectLeagueChange() {
  if (!currentFixtures || currentFixtures.length === 0) {
    return;
  }
  
  const firstFixture = currentFixtures[0];
  if (!firstFixture.league || !firstFixture.league.id) {
    return;
  }
  
  const currentLeagueId = firstFixture.league.id;
  
  // Check if we have a cached league ID that's different from current
  if (teamPositionsCacheExpiry > 0 && Object.keys(teamPositionsCache).length > 0) {
    // If we have cached positions, check if they're for the same league
    // We can't directly check this, but we can infer from the cache being empty
    // or by checking if the current league ID is different from what we might expect
    console.log(`Detecting league change - current fixture league: ${currentLeagueId}`);
    
    // For now, let's be conservative and clear cache if we detect a different league
    // This ensures we always get fresh standings for the current fixtures
    if (currentLeagueId !== 262 && currentLeagueId !== 39) {
      console.log('League change detected, clearing team positions cache');
      clearTeamPositionsCache();
    }
  }
}

// Set a default league if none is currently set
async function ensureDefaultLeague() {
  try {
    const currentLeague = getCurrentLeague();
    if (!currentLeague) {
      console.log('No current league set, but will detect from fixtures instead of setting default');
      
      // Don't set a default league - let fetchTeamPositions detect from fixtures
      // This ensures we use the actual league of the fixtures being displayed
    }
  } catch (error) {
    console.warn('Failed to set default league:', error);
  }
}

// Start periodic team position refresh
function startTeamPositionRefresh() {
  // Refresh team positions every 10 minutes
  const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
  
  setInterval(async () => {
    try {
      console.log('Periodic team position refresh triggered');
      await refreshTeamPositions();
    } catch (error) {
      console.warn('Periodic team position refresh failed:', error);
    }
  }, REFRESH_INTERVAL);
  
  console.log(`Team position refresh scheduled every ${REFRESH_INTERVAL / 1000 / 60} minutes`);
}

// Test function for debugging team positions (can be called from console)
window.testTeamPositions = async function() {
  console.log('=== Testing Team Positions ===');
  console.log('Current league:', getCurrentLeague());
  console.log('Current fixtures:', currentFixtures);
  console.log('Team positions cache:', teamPositionsCache);
  console.log('Cache expiry:', new Date(teamPositionsCacheExpiry));
  
  try {
    console.log('Fetching fresh team positions...');
    const positions = await fetchTeamPositions();
    console.log('Fresh positions result:', positions);
    
    console.log('Updating existing match cards...');
    updateExistingMatchCardPositions();
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Test function specifically for Liga MX
window.testLigaMXPositions = async function() {
  console.log('=== Testing Liga MX Team Positions ===');
  
  try {
    // Clear cache first
    clearTeamPositionsCache();
    
    // Force fetch for Liga MX
    const { getLeagueStandings } = await import('./api-leagues.js');
    console.log('Fetching Liga MX standings directly...');
    
    const standings = await getLeagueStandings(262, '2025');
    console.log('Liga MX standings result:', standings);
    
    if (standings && standings.length > 0) {
      // Process standings manually
      const positions = {};
      standings.forEach(group => {
        if (group.standings && Array.isArray(group.standings)) {
          group.standings.forEach(team => {
            if (team.team && team.team.id && team.rank) {
              positions[team.team.id] = team.rank;
              console.log(`Team ${team.team.name} (ID: ${team.team.id}) at position ${team.rank}`);
            }
          });
        }
      });
      
      console.log('Processed Liga MX positions:', positions);
      
      // Update cache
      teamPositionsCache = positions;
      teamPositionsCacheExpiry = Date.now() + TEAM_POSITIONS_CACHE_TTL;
      
      // Update UI
      updateExistingMatchCardPositions();
      
      console.log('Liga MX test completed successfully');
    } else {
      console.log('No Liga MX standings found');
    }
  } catch (error) {
    console.error('Liga MX test failed:', error);
  }
};

// Test function to check API response structure
window.testAPIResponse = async function() {
  try {
    const { getLeagueStandings } = await import('./api-leagues.js');
    
    // Test Premier League
    const plStandings = await getLeagueStandings(39, '2025');
    
    // Test Liga MX
    const lmxStandings = await getLeagueStandings(262, '2025');
    
    // Test Liga MX 2024
    const lmxStandings2024 = await getLeagueStandings(262, '2024');
    
    console.log('API test completed successfully');
  } catch (error) {
    console.error('API test failed:', error);
  }
};

// Manually refresh team positions
async function refreshTeamPositions() {
  try {
    // Detect league changes first
    detectLeagueChange();
    
    // Clear cache to force fresh fetch
    clearTeamPositionsCache();
    
    // Fetch fresh positions
    const positions = await fetchTeamPositions();
    
    // Update existing match cards with new positions
    updateExistingMatchCardPositions();
    
    return positions;
  } catch (error) {
    console.warn('Failed to refresh team positions:', error);
    return {};
  }
}

// Update team positions on existing match cards
function updateExistingMatchCardPositions() {
  const matchCards = document.querySelectorAll('.match-card');
  
  matchCards.forEach((card, index) => {
    const homePositionEl = card.querySelector('.home-team .team-position');
    const awayPositionEl = card.querySelector('.away-team .team-position');
    const homeTeamName = card.querySelector('.home-team .team-name')?.textContent || 'Home Team';
    const awayTeamName = card.querySelector('.away-team .team-name')?.textContent || 'Away Team';
    
    if (homePositionEl && homePositionEl.dataset.teamId) {
      const teamId = homePositionEl.dataset.teamId;
      const position = getTeamPosition(teamId);
      
      if (position) {
        homePositionEl.textContent = position;
        const positionClass = getTeamPositionClass(teamId);
        homePositionEl.className = `team-position ${positionClass}`;
        homePositionEl.title = `${homeTeamName} - ${position}${getPositionSuffix(position)}`;
      } else {
        homePositionEl.textContent = '—';
        homePositionEl.className = 'team-position position-unknown';
        homePositionEl.title = `${homeTeamName} - Position unknown`;
      }
    }
    
    if (awayPositionEl && awayPositionEl.dataset.teamId) {
      const teamId = awayPositionEl.dataset.teamId;
      const position = getTeamPosition(teamId);
      
      if (position) {
        awayPositionEl.textContent = position;
        const positionClass = getTeamPositionClass(teamId);
        awayPositionEl.className = `team-position ${positionClass}`;
        awayPositionEl.title = `${awayTeamName} - ${position}${getPositionSuffix(position)}`;
      } else {
        awayPositionEl.textContent = '—';
        awayPositionEl.className = 'team-position position-unknown';
        awayPositionEl.title = `${awayTeamName} - Position unknown`;
      }
    }
  });
}

// Update league display in UI
function updateLeagueDisplay() {
  const heroSection = document.querySelector('.hero');
  if (heroSection && currentLeague) {
    const existingLeagueInfo = heroSection.querySelector('.league-info');
    if (!existingLeagueInfo) {
      const leagueInfo = document.createElement('div');
      leagueInfo.className = 'league-info';
      leagueInfo.innerHTML = `
        <div class="current-league-badge">
          <span class="league-icon">🏆</span>
          <span class="league-name">${currentLeague.name}</span>
          <span class="league-country">${currentLeague.country}</span>
        </div>
      `;
      heroSection.appendChild(leagueInfo);
    }
  }
}

// Comment out renderRanking function since ranking elements don't exist on main page
// function renderRanking(rows) {
//   rankingsBody.innerHTML = '';
//   if (!rows.length) {
//     rankingsEmpty.classList.remove('hidden');
//     return;
//   }
//   rankingsEmpty.classList.add('hidden');
//   rows.forEach((r, i) => {
//     const tr = document.createElement('tr');
//     tr.innerHTML = `<td>${i+1}</td><td>${r.displayName || 'Player'}</td><td>${r.points ?? 0}</td>`;
//     rankingsBody.appendChild(tr);
//   });
// }

function matchCard(f) {
  const tpl = document.getElementById('match-card-template');
  const card = tpl.content.firstElementChild.cloneNode(true);
  card.dataset.fixtureId = f.fixture.id;

  // League and status/time
  const leagueNameEl = card.querySelector('.league-name');
  const matchStatusEl = card.querySelector('.match-status');
  
  if (leagueNameEl) leagueNameEl.textContent = f.league?.name || 'Match';

  const statusShort = f.fixture?.status?.short || '';
  const kickoffDate = new Date(f.fixture.date);
  const kickoffText = kickoffDate.toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  let statusText = kickoffText;
  if (statusShort && statusShort !== 'NS') {
    const elapsed = f.fixture?.status?.elapsed;
    statusText = elapsed ? `${statusShort} ${elapsed}'` : statusShort;
  }
  
  // Set status in the datetime pill
  if (matchStatusEl) matchStatusEl.textContent = statusText;

  // Team names and logos
  const homeTeamEl = card.querySelector('.home-team .team-name');
  const awayTeamEl = card.querySelector('.away-team .team-name');
  const homeLogoEl = card.querySelector('.home-team .team-logo');
  const awayLogoEl = card.querySelector('.away-team .team-logo');
  
  if (homeTeamEl) homeTeamEl.textContent = f.teams.home.name;
  if (awayTeamEl) awayTeamEl.textContent = f.teams.away.name;
  if (homeLogoEl) homeLogoEl.src = f.teams.home.logo;
  if (awayLogoEl) awayLogoEl.src = f.teams.away.logo;

  // Set team IDs for position lookup
  const homePositionEl = card.querySelector('.home-team .team-position');
  const awayPositionEl = card.querySelector('.away-team .team-position');
  

  
  if (homePositionEl && f.teams.home.id) {
    homePositionEl.dataset.teamId = f.teams.home.id;
    const position = getTeamPosition(f.teams.home.id);
    
    if (position) {
      homePositionEl.textContent = position;
      const positionClass = getTeamPositionClass(f.teams.home.id);
              homePositionEl.className = `team-position ${positionClass}`;
      homePositionEl.title = `${f.teams.home.name} - ${position}${getPositionSuffix(position)}`;
    } else {
      // Show loading state if positions are being fetched
      homePositionEl.textContent = '';
      homePositionEl.className = 'team-position loading';
      homePositionEl.title = `${f.teams.home.name} - Loading position...`;
      
      // Set a timeout to show "—" if position doesn't load within 10 seconds
      setTimeout(() => {
        if (homePositionEl.textContent === '') {
          homePositionEl.textContent = '—';
          homePositionEl.className = 'team-position position-unknown';
          homePositionEl.title = `${f.teams.home.name} - Position unavailable`;
        }
      }, 10000);
    }
  } else {
    // Set default "—" for missing team IDs
    if (homePositionEl) {
      homePositionEl.textContent = '—';
      homePositionEl.className = 'team-position position-unknown';
      homePositionEl.title = `${f.teams.home.name} - Position unavailable`;
    }
  }
  
  if (awayPositionEl && f.teams.away.id) {
    awayPositionEl.dataset.teamId = f.teams.away.id;
    const position = getTeamPosition(f.teams.away.id);
    
    if (position) {
      awayPositionEl.textContent = position;
      const positionClass = getTeamPositionClass(f.teams.away.id);
              awayPositionEl.className = `team-position ${positionClass}`;
      awayPositionEl.title = `${f.teams.away.name} - ${position}${getPositionSuffix(position)}`;
    } else {
      // Show loading state if positions are being fetched
      awayPositionEl.textContent = '';
      awayPositionEl.className = 'team-position loading';
      awayPositionEl.title = `${f.teams.away.name} - Loading position...`;
      
      // Set a timeout to show "—" if position doesn't load within 10 seconds
      setTimeout(() => {
        if (awayPositionEl.textContent === '') {
          awayPositionEl.textContent = '—';
          awayPositionEl.className = 'team-position position-unknown';
          awayPositionEl.title = `${f.teams.away.name} - Position unavailable`;
        }
      }, 10000);
    }
  } else {
    // Set default "—" for missing team IDs
    if (awayPositionEl) {
      awayPositionEl.textContent = '—';
      awayPositionEl.className = 'team-position position-unknown';
      awayPositionEl.title = `${f.teams.away.name} - Position unavailable`;
    }
  }

  // Score cells when available (finished or live)
  const hScoreEl = card.querySelector('.home-score');
  const aScoreEl = card.querySelector('.away-score');
  const goalsHome = (f.goals && typeof f.goals.home === 'number') ? f.goals.home : null;
  const goalsAway = (f.goals && typeof f.goals.away === 'number') ? f.goals.away : null;
  
  if (hScoreEl && aScoreEl) {
    hScoreEl.textContent = goalsHome !== null ? String(goalsHome) : '-';
    aScoreEl.textContent = goalsAway !== null ? String(goalsAway) : '-';
  }

  // Update match status indicator
  const statusIndicator = card.querySelector('.match-status-indicator');
  if (statusIndicator) {
    if (statusShort === 'FT') {
      statusIndicator.textContent = 'FT';
      statusIndicator.classList.add('finished');
    } else if (statusShort === 'LIVE') {
      statusIndicator.textContent = 'LIVE';
      statusIndicator.classList.add('live');
    } else {
      statusIndicator.textContent = 'VS';
    }
  }

  // Prediction buttons
  card.querySelectorAll('.prediction-btn').forEach(btn => {
    // Check if picks are closed for this week (1 hour before first match)
    // Note: We need to check if currentFixtures is available, otherwise fall back to individual timing
    let isDisabled = false;
    
    if (currentFixtures && currentFixtures.length > 0) {
      // Use week-wide timing logic
      isDisabled = !canEnterPicks(currentFixtures);
    } else {
      // Fallback to individual fixture timing if week context not available
      const fixtureDate = new Date(f.fixture.date);
      const currentTime = new Date();
      const oneHourBeforeKickoff = new Date(fixtureDate.getTime() - (60 * 60 * 1000));
      isDisabled = currentTime >= oneHourBeforeKickoff;
    }
    
    if (isDisabled) {
      btn.disabled = true;
      
      // Check if this button represents the user's prediction
      const fixtureId = String(f.fixture.id);
      const userPrediction = choices[fixtureId];
      const isPredicted = btn.dataset.choice === userPrediction;
      
      if (isPredicted) {
        btn.classList.add('predicted');
        btn.title = `Your prediction: ${getPredictionText(userPrediction)}`;
              } else {
          btn.title = 'Picks closed for this week';
        }
    }
    
    btn.addEventListener('click', () => {
      if (isDisabled) return; // Prevent clicks on disabled buttons
      
      const pick = btn.dataset.choice;
      const id = String(f.fixture.id);
      // Toggle selection state across the 3 buttons
      card.querySelectorAll('.prediction-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      choices[id] = pick;
      updateSubmitButtonState();
      persistChoices();
    });
  });

  return card;
}

async function getWeekId() {
  return await getCurrentDashboardWeekId();
}

function storageKey() {
  const uid = currentUser()?.uid || 'anon';
  // We need to handle this asynchronously, so we'll use a placeholder for now
  // and update it when we get the actual week ID
  return `picks_placeholder_${uid}`;
}

async function getActualStorageKey() {
  const uid = currentUser()?.uid || 'anon';
  const weekId = await getWeekId();
  return `picks_${weekId}_${uid}`;
}

function loadStoredChoices() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch { return {}; }
}

async function loadStoredChoicesForWeek(weekId = null) {
  try {
    const actualKey = weekId ? `choices_${weekId}` : await getActualStorageKey();
    const raw = localStorage.getItem(actualKey);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch { return {}; }
}

function persistChoices() {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(choices));
  } catch {}
}

async function persistChoicesForWeek(weekId = null) {
  try {
    const actualKey = weekId ? `choices_${weekId}` : await getActualStorageKey();
    localStorage.setItem(actualKey, JSON.stringify(choices));
  } catch {}
}

async function hydrateSelections(fixtures, weekId = null) {
  const ids = fixtures.map(f => String(f.fixture.id));
  // Merge Firestore (authoritative) with localStorage (drafts)
  let serverChoices = {};
  const user = currentUser();
  if (user) {
    try {
      serverChoices = await getPredictionsForUserFixtures(user.uid, ids);
    } catch {}
  }
  const localChoices = await loadStoredChoicesForWeek(weekId);
  const merged = { ...localChoices, ...serverChoices }; // server overrides local
  
  // Apply to UI and memory
  Object.entries(merged).forEach(([id, pick]) => {
    if (!ids.includes(id)) return;
    const card = matchesEl.querySelector(`[data-fixture-id="${id}"]`);
    if (!card) return;
    
    // Remove any existing selected state
    card.querySelectorAll('.prediction-btn').forEach(b => b.classList.remove('selected'));
    
    // Add selected state to the correct button
    const btn = card.querySelector(`.prediction-btn[data-choice="${pick}"]`);
    if (btn) {
      btn.classList.add('selected');
      
      // If the match is already disabled, also add predicted state
      const fixture = fixtures.find(f => String(f.fixture.id) === id);
      if (fixture) {
        const fixtureDate = new Date(fixture.fixture.date);
        const currentTime = new Date();
        const oneHourBeforeKickoff = new Date(fixtureDate.getTime() - (60 * 60 * 1000));
        const isDisabled = currentTime >= oneHourBeforeKickoff;
        
        if (isDisabled) {
          btn.classList.add('predicted');
          btn.title = `Your prediction: ${getPredictionText(pick)}`;
        }
      }
    }
    
    choices[id] = pick;
  });
  
  updateSubmitButtonState();
  // Persist merged to local so it's available offline/after refresh
  await persistChoicesForWeek(weekId);
}

async function loadMatches() {
  const requestId = ++loadMatchesRequestId;
  
  // Prevent multiple simultaneous loads
  if (matchesLoadingEl.classList.contains('hidden') === false) {
    console.log('Load already in progress, skipping...');
    return;
  }
  
  // Debounce rapid successive calls
  const now = Date.now();
  if (now - lastLoadMatchesCall < LOAD_MATCHES_DEBOUNCE_MS) {
    console.log('Load matches called too frequently, debouncing...');
    return;
  }
  lastLoadMatchesCall = now;
  
  // Clear existing fixtures to prevent duplicates
  matchesEl.innerHTML = '';
  choices = {};
  updateSubmitButtonState();
  
  matchesErrorEl.classList.add('hidden');
  matchesEmptyEl.classList.add('hidden');
  matchesLoadingEl.classList.remove('hidden');

  try {
    // Load current week first, before loading fixtures
    console.log('Loading current week...');
    currentWeekId = await getCurrentDashboardWeekId();
    if (currentWeekId) {
      // Use the week name from Firebase instead of date format
      const weekName = await getWeekName(currentWeekId);
      currentWeekText.textContent = weekName;
      console.log('Current week set to:', currentWeekId, 'with name:', weekName);
    } else {
      console.warn('No current week ID available');
    }
    
    // Try to get Firestore, but don't wait indefinitely
    let firestoreDb = null;
    try {
      // Try the firestoreReady promise first
      firestoreDb = await Promise.race([
        firestoreReady,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000))
      ]);
    } catch (firestoreError) {
      console.warn('Firestore ready check failed, trying direct access:', firestoreError);
      // Try to access db directly
      const { db } = await import('./auth.js');
      firestoreDb = db;
    }
    
    if (!firestoreDb) {
      throw new Error('Database not available. Please refresh the page.');
    }
    
    const fixtures = await fetchWeekendTop10();
    
    // If a newer request started while we were awaiting, abort rendering
    if (requestId !== loadMatchesRequestId) return;
    
    matchesLoadingEl.classList.add('hidden');
    
    if (!fixtures.length) {
      matchesEmptyEl.classList.remove('hidden');
      return;
    }
    
    // Set currentFixtures BEFORE calling matchCard to avoid race condition
    currentFixtures = fixtures; // Store fixtures for time validation
    
    // Detect league changes and clear cache if needed
    detectLeagueChange();
    
    // Fetch team positions before rendering fixtures
    try {
      await fetchTeamPositions();
    } catch (error) {
      console.warn('Failed to fetch team positions, continuing without them:', error);
    }
    
    // Use safe fixture addition to prevent duplicates
    addFixturesSafely(fixtures);
    
    // Update positions on cards in case they were loaded after rendering
    updateExistingMatchCardPositions();
    
    // Hydrate selections for the current user (if any)
    if (fixtures.length > 0) {
      try {
        await hydrateSelections(fixtures, currentWeekId);
      } catch (hydrateError) {
        console.warn('Failed to hydrate selections:', hydrateError);
        // Don't fail the entire load for hydration issues
      }
    }
    
    // Start countdown timer for picks deadline
    startCountdownTimer();
    
    // Update submit button state after fixtures are loaded
    updateSubmitButtonState();
    
    // Week navigation removed - only showing current week
  } catch (err) {
    if (requestId !== loadMatchesRequestId) return;
    
    console.error('Error loading matches:', err);
    matchesLoadingEl.classList.add('hidden');
    
    // Provide more specific error messages
    let errorMessage = 'Failed to load matches.';
    if (err.message.includes('Database not available')) {
      errorMessage = 'Database not ready. Please refresh the page.';
    } else if (err.message.includes('API error')) {
      errorMessage = 'Unable to fetch match data. Please try again later.';
    } else if (err.message.includes('permission-denied')) {
      errorMessage = 'Access denied. Please check your permissions.';
    } else if (err.message.includes('Firestore timeout')) {
      errorMessage = 'Database connection timeout. Please try again.';
    }
    
    matchesErrorEl.textContent = errorMessage;
    matchesErrorEl.classList.remove('hidden');
  }
}

// Function to check if picks can still be entered (1 hour before first kickoff)
function canEnterPicks(fixtures) {
  if (!fixtures || fixtures.length === 0) {
    return false;
  }
  
  // Find the earliest kickoff time among all fixtures
  const kickoffTimes = fixtures
    .map(fixture => new Date(fixture.fixture.date))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  if (kickoffTimes.length === 0) {
    return false;
  }
  
  const firstKickoff = kickoffTimes[0];
  const currentTime = new Date();
  const oneHourBeforeKickoff = new Date(firstKickoff.getTime() - (60 * 60 * 1000));
  
  return currentTime < oneHourBeforeKickoff;
}

// Function to get time remaining until picks close
function getTimeUntilPicksClose(fixtures) {
  if (!fixtures || fixtures.length === 0) {
    return null;
  }
  
  const kickoffTimes = fixtures
    .map(fixture => new Date(fixture.fixture.date))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  if (kickoffTimes.length === 0) {
    return null;
  }
  
  const firstKickoff = kickoffTimes[0];
  const currentTime = new Date();
  const oneHourBeforeKickoff = new Date(firstKickoff.getTime() - (60 * 60 * 1000));
  
  if (currentTime >= oneHourBeforeKickoff) {
    return 0; // Picks are already closed
  }
  
  const timeRemaining = oneHourBeforeKickoff.getTime() - currentTime.getTime();
  return timeRemaining;
}

// Function to format time remaining in a user-friendly way
function formatTimeRemaining(milliseconds) {
  if (milliseconds <= 0) {
    return 'Picks closed';
  }
  
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    if (hours > 0) {
      return `${days}d ${hours}h remaining`;
    } else {
      return `${days}d remaining`;
    }
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
}

// Function to update the submit button state based on week status and user choices
function updateSubmitButtonState() {
  if (!submitBtn || !currentFixtures || currentFixtures.length === 0) {
    return;
  }
  
  const timeRemaining = getTimeUntilPicksClose(currentFixtures);
  
  if (timeRemaining <= 0) {
    // Week is closed - disable submit button
    submitBtn.disabled = true;
    submitBtn.title = 'Picks are closed for this week';
  } else {
    // Week is open - enable/disable based on whether user has made choices
    const hasChoices = Object.keys(choices).length > 0;
    submitBtn.disabled = !hasChoices;
    submitBtn.title = hasChoices ? 'Submit your predictions' : 'Make predictions to submit';
  }
}

// Function to update the time remaining display
function updateTimeRemainingDisplay() {
  const weekLimitsText = document.getElementById('week-limits-text');
  if (!weekLimitsText || !currentFixtures || currentFixtures.length === 0) {
    return;
  }
  
  const timeRemaining = getTimeUntilPicksClose(currentFixtures);
  if (timeRemaining === null) {
    weekLimitsText.textContent = 'Time limit unavailable';
    return;
  }
  
  if (timeRemaining <= 0) {
    weekLimitsText.textContent = 'Picks closed for this week';
    weekLimitsText.className = 'week-limits-text closed';
  } else {
    weekLimitsText.textContent = formatTimeRemaining(timeRemaining);
    weekLimitsText.className = 'week-limits-text active';
  }
  
  // Update submit button state
  updateSubmitButtonState();
  
  // Update prediction button states
  updatePredictionButtonStates();
}

// Function to update all prediction button states based on current time
function updatePredictionButtonStates() {
  if (!currentFixtures || currentFixtures.length === 0) {
    return;
  }
  
  // Use week-wide timing logic instead of individual fixture timing
  const isWeekClosed = !canEnterPicks(currentFixtures);
  
  // Update each match card's prediction buttons
  currentFixtures.forEach(fixture => {
    const card = matchesEl.querySelector(`[data-fixture-id="${fixture.fixture.id}"]`);
    if (!card) return;
    
    card.querySelectorAll('.prediction-btn').forEach(btn => {
      if (isWeekClosed) {
        btn.disabled = true;
        
        // Check if this button represents the user's prediction
        const fixtureId = String(fixture.fixture.id);
        const userPrediction = choices[fixtureId];
        const isPredicted = btn.dataset.choice === userPrediction;
        
        if (isPredicted) {
          btn.classList.add('predicted');
          btn.title = `Your prediction: ${getPredictionText(userPrediction)}`;
        } else {
          btn.classList.remove('predicted');
          btn.title = 'Picks closed for this week';
        }
      } else {
        btn.disabled = false;
        btn.classList.remove('predicted');
        btn.title = '';
      }
    });
  });
}

// Helper function to get readable prediction text
function getPredictionText(pick) {
  switch (pick) {
    case 'H': return 'Home Win';
    case 'D': return 'Draw';
    case 'A': return 'Away Win';
    default: return 'Unknown';
  }
}

// Start the countdown timer
function startCountdownTimer() {
  // Update immediately
  updateTimeRemainingDisplay();
  
  // Update every minute
  setInterval(() => {
    updateTimeRemainingDisplay();
  }, 60000); // 60 seconds
}

submitBtn.addEventListener('click', async () => {
  console.log('Submit button clicked');
  const user = currentUser();
  if (!user) {
    console.log('No authenticated user found');
    alert('Please log in to submit predictions.');
    return;
  }
  
  console.log(`User authenticated: ${user.uid}, displayName: ${user.displayName}`);
  
  // Verify authentication state is still valid before proceeding
  try {
    const { verifyAuthState } = await import('./auth.js');
    console.log('Verifying authentication state...');
    await verifyAuthState();
    console.log('Authentication state verified successfully');
  } catch (authError) {
    console.error('Authentication verification failed:', authError);
    alert('Authentication expired. Please log in again.');
    return;
  }
  
  // Check if picks can still be entered (1 hour before first kickoff)
  if (!canEnterPicks(currentFixtures)) {
    const timeRemaining = getTimeUntilPicksClose(currentFixtures);
    if (timeRemaining === 0) {
      alert('Picks are now closed for this week. The deadline was 1 hour before the first kickoff.');
    } else {
      alert('Picks are now closed for this week.');
    }
    return;
  }
  
  try {
    console.log('Preparing fixture data...');
    // Create a map of fixture data for enhanced entries using the actual fixture data from API
    const fixturesData = {};
    if (currentFixtures) {
      currentFixtures.forEach(fixture => {
        const fixtureId = fixture.fixture.id.toString();
        if (choices[fixtureId]) {
          fixturesData[fixtureId] = {
            teams: {
              home: {
                id: fixture.teams.home.id,
                name: fixture.teams.home.name,
                logo: fixture.teams.home.logo
              },
              away: {
                id: fixture.teams.away.id,
                name: fixture.teams.away.name,
                logo: fixture.teams.away.logo
              }
            },
            league: {
              id: fixture.league.id,
              name: fixture.league.name,
              country: fixture.league.country
            },
            fixture: {
              date: fixture.fixture.date,
              status: fixture.fixture.status
            }
          };
        }
      });
    }
    
    console.log(`Prepared data for ${Object.keys(fixturesData).length} fixtures`);
    
    // Ensure user document exists before saving predictions
    console.log('Ensuring user document exists...');
    const { ensureUserDoc } = await import('./scoring.js');
    await ensureUserDoc(user.uid, user.displayName || user.email?.split('@')[0]);
    console.log('User document ensured successfully');
    
    console.log('Saving predictions...');
    await savePredictions(user.uid, choices, fixturesData);
    console.log('Predictions saved successfully');
    
    alert('Predictions saved! Points will be awarded when matches finish.');
    // Keep local storage in sync post-save (server is authoritative if changed elsewhere)
    console.log('Persisting choices to local storage...');
    await persistChoicesForWeek();
    console.log('Local storage updated successfully');
  } catch (err) {
    console.error('Error in submit button handler:', err);
    if (err.code === 'permission-denied' || err.code === 'unauthenticated') {
      alert('Authentication error. Please log in again and try submitting your picks.');
    } else {
      alert('Error saving predictions: ' + err.message);
    }
  }
});

refreshBtn.addEventListener('click', async () => {
  await loadMatches();
  // Also refresh team positions to ensure they're up to date
  await refreshTeamPositions();
});

refreshPositionsBtn.addEventListener('click', async () => {
  console.log('Manual refresh positions button clicked');
  await refreshTeamPositions();
});

// Week navigation removed - only showing current week

// Week navigation functions removed - only showing current week

// Week discovery functions removed - only showing current week

// loadMatchesForWeek function removed - only showing current week

// updateWeekNavigationState function removed - only showing current week

// Auto-scoring is now handled by Cloud Function every 5 minutes
// No need for client-side periodic checking

// Track which users we've already ensured to prevent duplicate calls
const ensuredUsers = new Set();

onUserChanged(async (user) => {
  console.log('Auth state changed:', user ? `User ${user.uid} signed in` : 'User signed out');
  clearUnsubs();
  if (user) {
    if (logoutLink) {
      logoutLink.classList.remove('hidden');
    }
    
    // Show elements that are relevant for authenticated users
    const heroEl = document.querySelector('.hero');
    const weekSelectionEl = document.querySelector('.section[aria-labelledby="current-week-title"]');
    const titleEl = document.querySelector('#matches-title');
    const refreshBtn = document.querySelector('#btn-refresh');
    const submitBtn = document.querySelector('#btn-submit');
    
    if (heroEl) heroEl.classList.remove('hidden');
    if (weekSelectionEl) weekSelectionEl.classList.remove('hidden');
    if (titleEl) titleEl.classList.remove('hidden');
    if (refreshBtn) refreshBtn.classList.remove('hidden');
    if (submitBtn) submitBtn.classList.remove('hidden');
    
    // Only ensure user doc once per session to prevent duplicates
    if (!ensuredUsers.has(user.uid)) {
      try {
        // Wait for Firestore to be ready before ensuring user doc
        await firestoreReady;
        await safeFirebaseOperation(
          () => ensureUserDoc(user.uid, user.displayName || user.email?.split('@')[0]),
          null
        );
        
        // Also sync any existing favorites from localStorage
        await safeFirebaseOperation(
          () => import('./scoring.js').then(({ syncUserFavorites }) => syncUserFavorites(user.uid)),
          null
        );
        
        ensuredUsers.add(user.uid);
        console.log(`User document ensured and favorites synced for ${user.uid}`);
      } catch (error) {
        console.error(`Failed to ensure user document for ${user.uid}:`, error);
      }
    }
    
    // Live rankings - ensure Firestore is ready first
    try {
      // const rankingsUnsub = await watchRankings(renderRanking);
      // if (rankingsUnsub) {
      //   unsubs.push(rankingsUnsub);
      // }
    } catch (error) {
      console.error('Failed to set up rankings listener:', error);
    }
    
    console.log('User authenticated, loading matches with user context...');
    // Rehydrate selections with server-side picks for logged-in user
    try {
      // Ensure we have a default league set before loading matches
      await ensureDefaultLeague();
      await loadMatches();
    } catch (error) {
      console.error('Failed to load matches:', error);
      // Show error to user but don't crash the app
      if (matchesErrorEl) {
        matchesErrorEl.textContent = 'Failed to load matches. Please try again later.';
        matchesErrorEl.classList.remove('hidden');
      }
    }
  } else {
    if (logoutLink) {
      logoutLink.classList.add('hidden');
    }
    
    // Hide elements that are not relevant for anonymous users
    const heroEl = document.querySelector('.hero');
    const weekSelectionEl = document.querySelector('.section[aria-labelledby="current-week-title"]');
    const titleEl = document.querySelector('#matches-title');
    const refreshBtn = document.querySelector('#btn-refresh');
    const submitBtn = document.querySelector('#btn-submit');
    
    if (heroEl) heroEl.classList.add('hidden');
    if (weekSelectionEl) weekSelectionEl.classList.add('hidden');
    if (titleEl) titleEl.classList.add('hidden');
    if (refreshBtn) refreshBtn.classList.add('hidden');
    if (submitBtn) submitBtn.classList.add('hidden');
    
    // rankingsBody.innerHTML = '';
    // renderRanking([]);
    // Clear ensured users set when user signs out
    ensuredUsers.clear();
    
    console.log('User signed out, loading matches for anonymous user...');
    // Reload to show anon-local picks
    try {
      // Ensure we have a default league set before loading matches
      await ensureDefaultLeague();
      await loadMatches();
    } catch (error) {
      console.error('Failed to load matches for anonymous user:', error);
      // Show error to user but don't crash the app
      if (matchesErrorEl) {
        matchesErrorEl.textContent = 'Failed to load matches. Please try again later.';
        matchesErrorEl.classList.remove('hidden');
      }
    }
  }
});

// Initial load now happens via auth state listener above

// Add initial load for when page first loads (before auth state is determined)
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing dashboard...');
  
  // Check if Firebase quota is exceeded before proceeding
  const { isQuotaExceeded } = await import('./auth.js');
  if (isQuotaExceeded()) {
    console.warn('Firebase quota exceeded during initial load - limiting functionality');
    // Show quota exceeded message but don't crash
    if (matchesErrorEl) {
      matchesErrorEl.textContent = 'Firebase quota exceeded. Some features may not work properly.';
      matchesErrorEl.classList.remove('hidden');
    }
    return;
  }
  
  // Ensure we have a default league set before proceeding
  try {
    await ensureDefaultLeague();
  } catch (error) {
    console.warn('Failed to set default league during initial load:', error);
  }
  
  // Start periodic team position refresh
  startTeamPositionRefresh();
  
  // Show loading state immediately
  matchesLoadingEl.classList.remove('hidden');
  matchesErrorEl.classList.add('hidden');
  matchesEmptyEl.classList.add('hidden');
  
      // Week navigation removed - only showing current week
  
      // Global timeout removed - week navigation removed
  const globalWeekTimeout = setTimeout(() => {
      console.log('Global timeout reached - week navigation removed');
      // Week navigation removed - only showing current week
  }, 8000); // 8 second global timeout
  
  // Additional safety timeout - if week discovery is still hanging after 12 seconds, force everything to work
  const safetyTimeout = setTimeout(() => {
    console.log('Safety timeout reached, forcing all week navigation to be functional...');
    // Week navigation removed - only showing current week
    
    // Week navigation removed - only showing current week
  }, 12000); // 12 second safety timeout
  
  // Debug: Check what's available
  console.log('Checking available services...');
  // Run automatic tests to identify issues
  setTimeout(async () => {
    try {
      // Test 1: Check if API functions are available
      const { fetchWeekendTop10 } = await import('./api.js');
      console.log('✓ API functions available');
      
      // Test 2: Try to call API directly
      const fixtures = await fetchWeekendTop10();
      
      if (fixtures && fixtures.length > 0) {
        // If we got fixtures but they're not showing, there's a display issue
        if (matchesEl.children.length === 0) {
          // Force display the fixtures
          fixtures.forEach(f => matchesEl.appendChild(matchCard(f)));
          matchesLoadingEl.classList.add('hidden');
          console.log('✓ Manually displayed fixtures');
        }
      }
      
    } catch (error) {
      console.error('❌ Automatic test failed:', error);
    }
  }, 1000);
  
  // Try to load matches with a timeout approach
  let loadAttempted = false;
  
  const attemptLoad = async () => {
    if (loadAttempted) return;
    loadAttempted = true;
    
    try {
      // Check if user is authenticated first
      const { currentUser } = await import('./auth.js');
      const user = currentUser();
      
      if (!user) {
        
        // Hide elements that are not relevant for anonymous users
        const heroEl = document.querySelector('.hero');
        const weekSelectionEl = document.querySelector('.section[aria-labelledby="current-week-title"]');
        const titleEl = document.querySelector('#matches-title');
        const refreshBtn = document.querySelector('#btn-refresh');
        const submitBtn = document.querySelector('#btn-submit');
        
        if (heroEl) heroEl.classList.add('hidden');
        if (weekSelectionEl) weekSelectionEl.classList.add('hidden');
        if (titleEl) titleEl.classList.add('hidden');
        if (refreshBtn) refreshBtn.classList.add('hidden');
        if (submitBtn) submitBtn.classList.add('hidden');
        
        matchesLoadingEl.classList.add('hidden');
        matchesEmptyEl.innerHTML = `
          <div class="anonymous-user-message">
            <h3>Welcome to Footy Picker!</h3>
            <p>Sign in to view and predict on this weekend's top matches.</p>
            <div class="auth-buttons">
              <button id="btn-login-anon" class="btn secondary">Log in</button>
<button id="btn-signup-anon" class="btn primary">Sign up</button>
            </div>
          </div>
        `;
        matchesEmptyEl.classList.remove('hidden');
        
        // Bind the auth buttons
        document.getElementById('btn-login-anon')?.addEventListener('click', async () => {
          const { openAuth } = await import('./auth.js');
          openAuth('login');
        });
        document.getElementById('btn-signup-anon')?.addEventListener('click', async () => {
          const { openAuth } = await import('./auth.js');
          openAuth('signup');
        });
        
        return;
      }
      
      // Initialize league context
      try {
        const { loadCurrentLeague } = await import('./leagues.js');
        const previousLeague = currentLeague;
        currentLeague = await loadCurrentLeague();
        if (currentLeague) {
          updateLeagueDisplay();
          
          // Clear team positions cache if league changed
          if (previousLeague && previousLeague.id !== currentLeague.id) {
            clearTeamPositionsCache();
          }
        }
      } catch (error) {
        console.error('Error loading league context:', error);
      }
      
      // First try the normal loadMatches function
      await loadMatches();
      
      // Show elements that were hidden for anonymous users
      const heroEl = document.querySelector('.hero');
        const weekSelectionEl = document.querySelector('.section[aria-labelledby="current-week-title"]');
      const titleEl = document.querySelector('#matches-title');
      const refreshBtn = document.querySelector('#btn-refresh');
      const submitBtn = document.querySelector('#btn-submit');
      
      if (heroEl) heroEl.classList.remove('hidden');
      if (weekSelectionEl) weekSelectionEl.classList.remove('hidden');
      if (titleEl) titleEl.classList.remove('hidden');
      if (refreshBtn) refreshBtn.classList.remove('hidden');
      if (submitBtn) submitBtn.classList.remove('hidden');
      
      // If we get here, matches loaded successfully
      
    } catch (error) {
      console.error('Error during initial load:', error);
      
      // Try a fallback approach - load matches without Firestore dependency
      try {
        await loadMatchesFallback();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        // Show error state but don't break the page
        matchesErrorEl.textContent = 'Failed to load matches. Please try the refresh button.';
        matchesErrorEl.classList.remove('hidden');
        matchesLoadingEl.classList.add('hidden');
      }
    }
  };
  
  // Try immediate load first
  attemptLoad();
  
  // If that doesn't work, try again after a short delay
  setTimeout(() => {
    if (matchesLoadingEl.classList.contains('hidden') === false) {
      attemptLoad();
    }
  }, 2000);
  
  // Final fallback - if still loading after 5 seconds, show error
  setTimeout(() => {
    if (matchesLoadingEl.classList.contains('hidden') === false) {
      matchesErrorEl.textContent = 'Loading is taking longer than expected. Please use the refresh button.';
      matchesErrorEl.classList.remove('hidden');
      matchesLoadingEl.classList.add('hidden');
      
      // Week navigation removed - only showing current week
      
      // Week navigation removed - only showing current week
      
      // Add retry button
      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn ghost small';
      retryBtn.textContent = 'Retry';
      retryBtn.onclick = async () => {
        try {
          matchesErrorEl.classList.add('hidden');
          matchesLoadingEl.classList.remove('hidden');
          await loadMatches();
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          matchesErrorEl.textContent = 'Retry failed. Please refresh the page.';
          matchesErrorEl.classList.remove('hidden');
          matchesLoadingEl.classList.add('hidden');
        }
      };
      matchesErrorEl.appendChild(document.createElement('br'));
      matchesErrorEl.appendChild(retryBtn);
    }
  }, 5000);
});

// Fallback function to load matches without Firestore dependency
async function loadMatchesFallback() {
  const requestId = ++loadMatchesRequestId;
  
  // Prevent multiple simultaneous loads
  if (matchesLoadingEl.classList.contains('hidden') === false) {
    console.log('Load already in progress, skipping...');
    return;
  }
  
  // Debounce rapid successive calls
  const now = Date.now();
  if (now - lastLoadMatchesCall < LOAD_MATCHES_DEBOUNCE_MS) {
    console.log('Load matches fallback called too frequently, debouncing...');
    return;
  }
  lastLoadMatchesCall = now;
  
  // Clear existing fixtures to prevent duplicates
  matchesEl.innerHTML = '';
  choices = {};
  updateSubmitButtonState();
  
  matchesErrorEl.classList.add('hidden');
  matchesEmptyEl.classList.add('hidden');
  matchesLoadingEl.classList.remove('hidden');

  try {
    // Load current week first, before loading fixtures
    console.log('Loading current week...');
    currentWeekId = await getCurrentDashboardWeekId();
    if (currentWeekId) {
      // Use the week name from Firebase instead of date format
      const weekName = await getWeekName(currentWeekId);
      currentWeekText.textContent = weekName;
      console.log('Current week set to:', currentWeekId, 'with name:', weekName);
    } else {
      console.warn('No current week ID available');
    }
    
    const fixtures = await fetchWeekendTop10();
    
    // If a newer request started while we were awaiting, abort rendering
    if (requestId !== loadMatchesRequestId) return;
    
    matchesLoadingEl.classList.add('hidden');
    
    if (!fixtures.length) {
      matchesEmptyEl.classList.remove('hidden');
      return;
    }
    
    // Set currentFixtures BEFORE calling matchCard to avoid race condition
    currentFixtures = fixtures; // Store fixtures for time validation
    
    // Fetch team positions before rendering fixtures
    try {
      await fetchTeamPositions();
    } catch (error) {
      console.warn('Failed to fetch team positions (fallback), continuing without them:', error);
    }
    
    // Use safe fixture addition to prevent duplicates
    addFixturesSafely(fixtures);
    
    // Update positions on cards in case they were loaded after rendering
    updateExistingMatchCardPositions();
    
    // Hydrate selections for the current user (if any)
    if (fixtures.length > 0) {
      try {
        await hydrateSelections(fixtures, currentWeekId);
      } catch (hydrateError) {
        console.warn('Failed to hydrate selections without Firestore:', hydrateError);
        // Don't fail the entire load for hydration issues
      }
    }
    
    // Start countdown timer for picks deadline
    startCountdownTimer();
    
    // Update submit button state after fixtures are loaded
    updateSubmitButtonState();
    
    // Week navigation removed - only showing current week
  } catch (err) {
    if (requestId !== loadMatchesRequestId) return;
    
    console.error('Error loading matches (fallback):', err);
    matchesLoadingEl.classList.add('hidden');
    
    // Provide more specific error messages
    let errorMessage = 'Failed to load matches.';
    if (err.message.includes('Database not available')) {
      errorMessage = 'Database not ready. Please refresh the page.';
    } else if (err.message.includes('API error')) {
      errorMessage = 'Unable to fetch match data. Please try again later.';
    } else if (err.message.includes('permission-denied')) {
      errorMessage = 'Access denied. Please check your permissions.';
    } else if (err.message.includes('Firestore timeout')) {
      errorMessage = 'Database connection timeout. Please try again.';
    }
    
    matchesErrorEl.textContent = errorMessage;
    matchesErrorEl.classList.remove('hidden');
  }
}

// Function to check if a fixture is already displayed to prevent duplicates
function isFixtureAlreadyDisplayed(fixtureId) {
  return matchesEl.querySelector(`[data-fixture-id="${fixtureId}"]`) !== null;
}

// Function to safely add fixtures without duplicates
function addFixturesSafely(fixtures) {
  // Clear existing fixtures first
  matchesEl.innerHTML = '';
  
  // Add each fixture, ensuring no duplicates
  fixtures.forEach(fixture => {
    const fixtureId = String(fixture.fixture.id);
    if (!isFixtureAlreadyDisplayed(fixtureId)) {
      matchesEl.appendChild(matchCard(fixture));
    } else {
      console.warn(`Fixture ${fixtureId} already displayed, skipping duplicate`);
    }
  });
}

// Listen for username changes to update any local references
window.addEventListener('usernameChanged', (event) => {
  const { displayName } = event.detail;
  // Update any local username references if needed
  console.log('Username changed to:', displayName);
});

// Debug function to test Firebase operations
window.testFirebaseOperations = async () => {
  try {
    console.log('Testing Firebase operations...');
    const user = currentUser();
    if (!user) {
      console.log('No authenticated user');
      return;
    }
    
    console.log('User authenticated, testing operations...');
    
    // Test 1: Verify auth state
    const { verifyAuthState } = await import('./auth.js');
    await verifyAuthState();
    console.log('✓ Auth state verified');
    
    // Test 2: Ensure user document
    const { ensureUserDoc } = await import('./scoring.js');
    await ensureUserDoc(user.uid, user.displayName || user.email?.split('@')[0]);
    console.log('✓ User document ensured');
    
    // Test 3: Test Firestore access
    const { firestoreReady } = await import('./auth.js');
    const firestoreDb = await firestoreReady;
    const { collection, getDocs, limit } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
    const usersRef = collection(firestoreDb, 'users');
    const snapshot = await getDocs(usersRef, limit(1));
    console.log('✓ Firestore access verified');
    
    console.log('All Firebase operations successful!');
    alert('Firebase operations test successful!');
  } catch (error) {
    console.error('Firebase operations test failed:', error);
    alert('Firebase operations test failed: ' + error.message);
  }
};

// Debug function to test match loading
window.testMatchLoading = async () => {
  try {
    await loadMatches();
    console.log('Match loading test completed');
  } catch (error) {
    console.error('Match loading test failed:', error);
    alert('Match loading test failed: ' + error.message);
  }
};

// Debug function to test API functions directly
window.testAPIFunctions = async () => {
  try {
    // Test 1: Check if fetchWeekendTop10 is available
    const { fetchWeekendTop10 } = await import('./api.js');
    
    // Test 2: Try to call it
    const fixtures = await fetchWeekendTop10();
    
    if (fixtures && fixtures.length > 0) {
      console.log(`Found ${fixtures.length} fixtures`);
    } else {
      console.log('No fixtures returned');
    }
    
  } catch (error) {
    console.error('API functions test failed:', error);
    alert('API functions test failed: ' + error.message);
  }
};

// Debug function to test Firebase status
window.testFirebaseStatus = async () => {
  try {
    // Test 1: Check Firebase app
    const { app } = await import('./firebase-config.js');
    
    // Test 2: Check Firestore
    const { db, firestoreReady } = await import('./auth.js');
    
    // Test 3: Try to wait for Firestore
    try {
      const firestoreDb = await Promise.race([
        firestoreReady,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
      console.log('✓ Firestore ready:', firestoreDb);
    } catch (timeoutError) {
      console.warn('Firestore ready timeout:', timeoutError);
    }
    
  } catch (error) {
    console.error('Firebase status test failed:', error);
    alert('Firebase status test failed: ' + error.message);
  }
};

// Debug function to test week navigation specifically
window.testWeekNavigation = async () => {
  try {
    // Test 1: Check current week
    console.log('Current week ID:', currentWeekId);
    console.log('Week navigation removed - only showing current week');
    
    console.log('✓ Week navigation test completed');
    
  } catch (error) {
    console.error('Week navigation test failed:', error);
    alert('Week navigation test failed: ' + error.message);
  }
};

// Debug function to test team positions fetching
window.testTeamPositions = async () => {
  try {
    console.log('Testing team positions fetching...');
    console.log('Current fixtures:', currentFixtures);
    console.log('Current league:', getCurrentLeague());
    
    const positions = await fetchTeamPositions();
    console.log('Team positions result:', positions);
    
    if (Object.keys(positions).length > 0) {
      console.log('✓ Team positions fetched successfully');
      // Update existing cards
      updateExistingMatchCardPositions();
    } else {
      console.log('✗ No team positions available');
    }
  } catch (error) {
    console.error('Team positions test failed:', error);
  }
};

// Debug function to test API standings directly
window.testStandingsAPI = async (leagueId = 262, season = '2024') => {
  try {
    console.log(`Testing standings API for league ${leagueId}, season ${season}...`);
    const standings = await getLeagueStandings(leagueId, season);
    console.log('Standings API result:', standings);
    return standings;
  } catch (error) {
    console.error('Standings API test failed:', error);
    return null;
  }
};