import { onUserChanged, auth, updateUsernameAcrossApp, updateProfileIconAcrossApp, openAuth } from './auth.js';
import { signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { af } from './api-football.js';

console.log('API Football object imported:', af);

const root = document.getElementById('profile-content');

// Profile icon options
const PROFILE_ICONS = [
  { emoji: '⚽', name: 'Football' },
  { emoji: '🏆', name: 'Trophy' },
  { emoji: '🔥', name: 'Fire' },
  { emoji: '⭐', name: 'Star' },
  { emoji: '💪', name: 'Strong' },
  { emoji: '🚀', name: 'Rocket' },
  { emoji: '🎯', name: 'Target' },
  { emoji: '🏅', name: 'Medal' },
  { emoji: '⚡', name: 'Lightning' },
  { emoji: '🎪', name: 'Show' }
];

// Popular teams for quick selection
const POPULAR_TEAMS = [
  { id: 40, name: 'Liverpool', country: 'England', league: 'Premier League' },
  { id: 33, name: 'Manchester United', country: 'England', league: 'Premier League' },
  { id: 47, name: 'Tottenham', country: 'England', league: 'Premier League' },
  { id: 49, name: 'Chelsea', country: 'England', league: 'Premier League' },
  { id: 50, name: 'Manchester City', country: 'England', league: 'Premier League' },
  { id: 529, name: 'Barcelona', country: 'Spain', league: 'La Liga' },
  { id: 530, name: 'Atletico Madrid', country: 'Spain', league: 'La Liga' },
  { id: 541, name: 'Real Madrid', country: 'Spain', league: 'La Liga' },
  { id: 157, name: 'Bayern Munich', country: 'Germany', league: 'Bundesliga' },
  { id: 165, name: 'Borussia Dortmund', country: 'Germany', league: 'Bundesliga' }
];

function renderAnon() {
  if (!root) return;
  root.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">👤</div>
      <h3>Welcome to Footy Picker</h3>
      <p>Log in to customize your profile and track your predictions</p>
      <div class="auth-buttons">
        <button id="btn-login-anon" class="btn secondary">Log in</button>
<button id="btn-signup-anon" class="btn primary">Sign up</button>
      </div>
    </div>
  `;
  
  // Bind the auth buttons
  document.getElementById('btn-login-anon')?.addEventListener('click', () => openAuth('login'));
  document.getElementById('btn-signup-anon')?.addEventListener('click', () => openAuth('signup'));
}

function renderUser(user) {
  console.log('renderUser called with user:', user);
  if (!root) {
    console.error('Root element not found!');
    return;
  }
  console.log('Root element found, rendering user profile...');
  
  const display = user.displayName || user.email?.split('@')[0] || 'Player';
  const userIcon = user.photoURL || '⚽';
  
  console.log('User profile data:', {
    displayName: user.displayName,
    photoURL: user.photoURL,
    email: user.email,
    computedDisplay: display,
    computedIcon: userIcon
  });
  
  console.log('Profile icon options:', PROFILE_ICONS.map(icon => ({
    emoji: icon.emoji,
    name: icon.name,
    isSelected: icon.emoji === userIcon
  })));
  
  root.innerHTML = `
    <!-- Profile Card Section -->
    <div class="profile-card">
      <div class="profile-header">
        <div class="profile-avatar">
          <span class="avatar-emoji">${userIcon}</span>
        </div>
        <div class="profile-info">
          <h2 class="profile-name">${display}</h2>
          <p class="profile-email">${user.email}</p>
        </div>
      </div>
      
      <div class="profile-favorites">
        <div class="favorite-item" id="profile-favorite-team">
          <div class="favorite-icon">🏆</div>
          <div class="favorite-content">
            <h4>Favorite Team</h4>
            <p class="favorite-placeholder">Select your favorite team</p>
          </div>
        </div>
        
        <div class="favorite-item" id="profile-favorite-player">
          <div class="favorite-icon">⭐</div>
          <div class="favorite-content">
            <h4>Favorite Player</h4>
            <p class="favorite-placeholder">Select your favorite player</p>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-sections">
      <!-- Profile Icon Section -->
      <div class="profile-section">
        <h3>Profile Icon</h3>
        <p class="section-description">Choose an icon that represents you</p>
        <div class="icon-grid">
          ${PROFILE_ICONS.map(icon => `
            <button class="icon-option ${icon.emoji === userIcon ? 'selected' : ''}" 
                    data-emoji="${icon.emoji}" data-name="${icon.name}">
              <span class="icon-display">${icon.emoji}</span>
              <span class="icon-name">${icon.name}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Display Name Section -->
      <div class="profile-section">
        <h3>Display Name</h3>
        <p class="section-description">How other players will see you</p>
        <div class="field-group">
          <input id="name-input" type="text" value="${display}" placeholder="Enter your display name" />
          <button class="btn" id="save-name">Save</button>
        </div>
      </div>

      <!-- Favorite Team Section -->
      <div class="profile-section">
        <h3>Favorite Team</h3>
        <p class="section-description">Show your team loyalty</p>
        <div class="team-selection" id="team-selection">
          <div class="quick-teams">
            <p class="quick-label">Quick picks:</p>
            <div class="team-chips">
              ${POPULAR_TEAMS.map(team => `
                <button class="chip team-chip" data-team-id="${team.id}" data-team-name="${team.name}">
                  ${team.name}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="search-teams">
            <p class="search-label">Or search for any team:</p>
            <div class="search-group">
              <input id="team-search" type="text" placeholder="Search teams..." />
              <button class="btn" id="search-teams-btn">Search</button>
              <button class="btn" id="test-team-btn" style="background: #ff6b6b; color: white;">Test Team API</button>
            </div>
            <div id="team-results" class="team-results"></div>
          </div>
          <div id="selected-team" class="selected-team" style="display: none;">
            <div class="team-info">
              <img id="team-logo" class="team-logo" src="" alt="" />
              <div class="team-details">
                <h4 id="team-name"></h4>
                <p id="team-league"></p>
              </div>
            </div>
          </div>
        </div>
        <div class="section-actions">
          <button class="btn ghost" id="change-team-btn" style="display: none;">Change Team</button>
        </div>
      </div>

      <!-- Favorite Player Section -->
      <div class="profile-section">
        <h3>Favorite Player</h3>
        <p class="section-description">Who's your football hero?</p>
        <div class="player-selection" id="player-selection">
          <div class="search-group">
            <input id="player-search" type="text" placeholder="Search players..." />
            <button class="btn" id="search-players-btn">Search</button>
            <button class="btn" id="test-search-btn" style="background: #ff6b6b; color: white;">Test Search</button>
          </div>
          <div id="player-results" class="player-results"></div>
          <div id="selected-player" class="selected-player" style="display: none;">
            <div class="player-info">
              <img id="player-photo" class="player-photo" src="" alt="" />
              <div class="player-details">
                <h4 id="player-name"></h4>
                <p id="player-team"></p>
                <p id="player-position"></p>
              </div>
            </div>
          </div>
        </div>
        <div class="section-actions">
          <button class="btn ghost" id="change-player-btn" style="display: none;">Change Player</button>
        </div>
      </div>
    </div>
  `;

  console.log('Profile HTML rendered, binding events...');
  bindProfileEvents(user);
  console.log('Events bound, loading saved favorites...');
  loadSavedFavorites();
  console.log('Profile setup complete');
  
  // Test API functionality
  setTimeout(() => {
    console.log('Testing API functionality...');
    testAPIConnection();
  }, 2000);
}

function bindProfileEvents(user) {
  console.log('bindProfileEvents called for user:', user);
  // Profile icon selection
  document.querySelectorAll('.icon-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const emoji = btn.dataset.emoji;
      console.log('Profile icon clicked:', emoji);
      console.log('Current user:', auth.currentUser);
      console.log('Current user photoURL:', auth.currentUser?.photoURL);
      
      try {
        console.log('Calling updateProfileIconAcrossApp...');
        const success = await updateProfileIconAcrossApp(emoji);
        console.log('updateProfileIconAcrossApp result:', success);
        
        if (success) {
          // The centralized function will handle updating all displays
          console.log('Profile icon updated successfully');
          console.log('New user photoURL:', auth.currentUser?.photoURL);
          showToast('Profile icon updated!');
        } else {
          console.log('Profile icon update failed');
          showToast('Failed to update icon', 'error');
        }
      } catch (error) {
        console.error('Error updating profile icon:', error);
        showToast('Failed to update icon', 'error');
      }
    });
  });

  // Display name save
  const saveBtn = document.getElementById('save-name');
  const nameInput = document.getElementById('name-input');
  saveBtn?.addEventListener('click', async () => {
    const name = nameInput?.value?.trim();
    if (!name) return;
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
      // Update username across the entire app
      const success = await updateUsernameAcrossApp(name);
      
      if (success) {
        // Update profile display
        const profileName = document.querySelector('.profile-name');
        if (profileName) {
          profileName.textContent = name;
        }
        
        showToast('Display name saved!');
      } else {
        showToast('Failed to save name', 'error');
      }
    } catch (error) {
      showToast('Failed to save name', 'error');
      console.error('Error updating display name:', error);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });

  // Team search and selection
  const teamSearchBtn = document.getElementById('search-teams-btn');
  const teamSearchInput = document.getElementById('team-search');
  const testTeamBtn = document.getElementById('test-team-btn');
  
  console.log('Team search elements:', { teamSearchBtn, teamSearchInput, testTeamBtn });
  
  teamSearchBtn?.addEventListener('click', () => {
    console.log('Team search button clicked, value:', teamSearchInput.value);
    searchTeams(teamSearchInput.value);
  });
  teamSearchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      console.log('Team search Enter pressed, value:', e.target.value);
      searchTeams(e.target.value);
    }
  });
  
  testTeamBtn?.addEventListener('click', async () => {
    console.log('Test team button clicked - testing team search...');
    try {
      const response = await af.get('/teams', { search: 'Liverpool' });
      console.log('=== LIVERPOOL TEAM SEARCH TEST ===');
      console.log('Full response:', response);
      if (response.response && response.response.length > 0) {
        console.log('First team item:', response.response[0]);
        console.log('First team keys:', Object.keys(response.response[0]));
        console.log('First team structure:', JSON.stringify(response.response[0], null, 2));
      }
    } catch (error) {
      console.error('Team test failed:', error);
    }
  });

  // Quick team selection
  document.querySelectorAll('.team-chip').forEach(chip => {
    chip.addEventListener('click', () => selectTeam(chip.dataset.teamId, chip.dataset.teamName));
  });

  // Player search and selection
  const playerSearchBtn = document.getElementById('search-players-btn');
  const playerSearchInput = document.getElementById('player-search');
  const testSearchBtn = document.getElementById('test-search-btn');
  
  console.log('Player search elements:', { playerSearchBtn, playerSearchInput });
  
  if (!playerSearchBtn) {
    console.error('Player search button not found!');
  }
  if (!playerSearchInput) {
    console.error('Player search input not found!');
  }
  if (!testSearchBtn) {
    console.error('Test search button not found!');
  }
  
  playerSearchBtn?.addEventListener('click', () => {
    console.log('Player search button clicked, value:', playerSearchInput.value);
    searchPlayers(playerSearchInput.value);
  });
  playerSearchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      console.log('Player search Enter pressed, value:', e.target.value);
      searchPlayers(e.target.value);
    }
  });

  testSearchBtn?.addEventListener('click', () => {
    console.log('Test search button clicked - running comprehensive API test...');
    testAPIConnection();
  });


  // Change buttons
  document.getElementById('change-team-btn')?.addEventListener('click', () => {
    document.getElementById('selected-team').style.display = 'none';
    document.querySelector('.team-selection').style.display = 'block';
    document.getElementById('change-team-btn').style.display = 'none';
  });

  document.getElementById('change-player-btn')?.addEventListener('click', () => {
    document.getElementById('selected-player').style.display = 'none';
    document.querySelector('.player-selection').style.display = 'block';
    document.getElementById('change-player-btn').style.display = 'none';
  });

  // Sign out
  const signoutBtn = document.getElementById('btn-signout');
  signoutBtn?.addEventListener('click', async () => {
    await signOut(auth);
    location.assign('/');
  });
}

async function searchTeams(query) {
  console.log('searchTeams called with query:', query);
  if (!query.trim()) {
    console.log('Empty query, returning early');
    return;
  }
  
  const resultsDiv = document.getElementById('team-results');
  if (!resultsDiv) {
    console.error('team-results div not found!');
    return;
  }
  console.log('Found team-results div, starting search...');
  resultsDiv.innerHTML = '<div class="loading">Searching teams...</div>';
  
  try {
    // Try multiple search strategies for teams
    let teams = [];
    const currentYear = new Date().getFullYear();
    
          // Strategy 1: Search by name directly
      try {
        console.log('Trying direct team search...');
        const response = await af.get('/teams', { search: query });
        console.log('=== TEAM SEARCH DEBUG ===');
        console.log('Full response:', response);
        console.log('Response type:', typeof response);
        console.log('Response keys:', Object.keys(response));
        console.log('Response.response type:', typeof response.response);
        console.log('Response.response length:', response.response?.length);
        
        if (response.response && response.response.length > 0) {
          console.log('First team item:', response.response[0]);
          console.log('First team item type:', typeof response.response[0]);
          console.log('First team item keys:', Object.keys(response.response[0]));
          
          // Try to find team data in different possible locations
          const firstTeam = response.response[0];
          console.log('Looking for team data in:', firstTeam);
          
          if (firstTeam.team) {
            console.log('Found team.team:', firstTeam.team);
            console.log('team.team keys:', Object.keys(firstTeam.team));
          }
          if (firstTeam.name) {
            console.log('Found direct name:', firstTeam.name);
          }
          if (firstTeam.country) {
            console.log('Found direct country:', firstTeam.country);
          }
          if (firstTeam.league) {
            console.log('Found direct league:', firstTeam.league);
          }
        }
        
        console.log('Response structure:', {
          hasResponse: !!response.response,
          responseType: typeof response.response,
          responseLength: response.response?.length || 0,
          hasErrors: !!response.errors,
          errors: response.errors,
          results: response.results,
          paging: response.paging
        });
        
        if (response.errors) {
          console.log('API Errors:', response.errors);
        }
        // Try different response structures
        teams = response.response || response.results || [];
        console.log('Extracted teams:', teams);
      } catch (error) {
        console.log('Direct search failed:', error.message);
        console.error('Full error:', error);
      }
    
    // Strategy 2: Search in popular leagues if direct search fails
    if (teams.length === 0) {
      try {
        console.log('Trying popular leagues search...');
        const popularLeagues = [39, 140, 78, 61]; // Premier League, La Liga, Bundesliga, Serie A
        const responses = await Promise.all(
          popularLeagues.map(leagueId => 
            af.get('/teams', { league: leagueId, season: currentYear - 1 })
          )
        );
        
        const allTeams = responses.flatMap(response => response.response || response.results || []);
        teams = allTeams.filter(team => 
          team.team.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20);
        console.log('Popular leagues search found:', teams.length, 'teams');
      } catch (error) {
        console.log('Popular leagues search failed:', error.message);
      }
    }
    
    // Strategy 3: Search in 2024 season (more likely to have data)
    if (teams.length === 0) {
      try {
        console.log('Trying 2024 season search...');
        const response = await af.get('/teams', { league: 39, season: 2024 });
        const allTeams = response.response || response.results || [];
        teams = allTeams.filter(team => 
          team.team.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20);
        console.log('2024 season search found:', teams.length, 'teams');
      } catch (error) {
        console.log('2024 season search failed:', error.message);
      }
    }
    
    // Strategy 4: Try without season parameter (fallback)
    if (teams.length === 0) {
      try {
        console.log('Trying without season parameter...');
        const response = await af.get('/teams', { league: 39 });
        const allTeams = response.response || response.results || [];
        teams = allTeams.filter(team => 
          team.team.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20);
        console.log('No season search found:', teams.length, 'teams');
      } catch (error) {
        console.log('No season search failed:', error.message);
      }
    }
    
    if (teams.length === 0) {
      resultsDiv.innerHTML = `
        <div class="no-results">
          <p>No teams found for "${query}".</p>
          <p>Try searching for:</p>
          <ul style="text-align: left; margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>Popular teams: "Liverpool", "Barcelona", "Real Madrid", "Bayern"</li>
            <li>Partial names: "United", "City", "Madrid"</li>
            <li>Country names: "England", "Spain", "Germany"</li>
          </ul>
        </div>
      `;
      return;
    }
    
    // Debug: Log the first team to see its structure
    if (teams.length > 0) {
      console.log('First team structure:', teams[0]);
      console.log('Team keys:', Object.keys(teams[0]));
    }
    
    resultsDiv.innerHTML = teams.map(team => {
      // Handle different possible team structures
      const teamData = team.team || team;
      const teamId = teamData.id || team.id;
      const teamName = teamData.name || team.name;
      const teamLogo = teamData.logo || team.logo;
      const country = teamData.country || team.country || 'Unknown Country';
      const league = team.league?.name || team.league || 'Unknown League';
      
      return `
        <div class="team-result" data-team-id="${teamId}" data-team-name="${teamName}">
          <img class="team-logo" src="${teamLogo}" alt="${teamName}" onerror="this.style.display='none'" />
          <div class="team-info">
            <h4>${teamName}</h4>
            <p>${country} • ${league}</p>
          </div>
          <button class="btn small team-select-btn" data-team-id="${teamId}" data-team-name="${teamName}">Select</button>
        </div>
      `;
    }).join('');
    
    // Bind team selection events
    resultsDiv.querySelectorAll('.team-select-btn').forEach(btn => {
      btn.addEventListener('click', () => selectTeam(btn.dataset.teamId, btn.dataset.teamName));
    });
    
  } catch (error) {
    resultsDiv.innerHTML = '<div class="error">Failed to search teams</div>';
    console.error('Team search error:', error);
  }
}

async function searchPlayers(query) {
  console.log('=== searchPlayers function called ===');
  console.log('Query:', query);
  console.log('Query type:', typeof query);
  console.log('Query trimmed:', query.trim());
  console.log('Query length:', query.length);
  
  if (!query.trim()) {
    console.log('Empty query, returning early');
    return;
  }
  const resultsDiv = document.getElementById('player-results');
  if (!resultsDiv) {
    console.error('Player results div not found!');
    return;
  }
  console.log('Found player-results div, starting search...');
  
  resultsDiv.innerHTML = '<div class="loading">Searching players...</div>';
  
  try {
    // Check if API key is available
    const apiKey = document.querySelector('meta[name="api-sports-key"]')?.content;
    console.log('API key found:', apiKey ? 'Yes' : 'No');
    
    if (!apiKey) {
      throw new Error('API key is missing. Please check the meta tag.');
    }
    
    let players = [];
    const currentYear = new Date().getFullYear();
    
    // Try multiple approaches to find players
    const searchStrategies = [
      // Strategy 1: Search by player name directly using profiles endpoint (most efficient)
      async () => {
        console.log('Trying /players/profiles endpoint...');
        const response = await af.get('/players/profiles', { 
          search: query
        });
        console.log('=== PLAYER SEARCH DEBUG ===');
        console.log('Full response:', response);
        console.log('Response type:', typeof response);
        console.log('Response keys:', Object.keys(response));
        console.log('Response.response type:', typeof response.response);
        console.log('Response.response length:', response.response?.length);
        
        if (response.response && response.response.length > 0) {
          console.log('First player item:', response.response[0]);
          console.log('First player item type:', typeof response.response[0]);
          console.log('First player item keys:', Object.keys(response.response[0]));
          
          // Try to find player data in different possible locations
          const firstPlayer = response.response[0];
          console.log('Looking for player data in:', firstPlayer);
          
          if (firstPlayer.player) {
            console.log('Found player.player:', firstPlayer.player);
            console.log('player.player keys:', Object.keys(firstPlayer.player));
          }
          if (firstPlayer.name) {
            console.log('Found direct name:', firstPlayer.name);
          }
          if (firstPlayer.team) {
            console.log('Found direct team:', firstPlayer.team);
          }
          if (firstPlayer.club) {
            console.log('Found direct club:', firstPlayer.club);
          }
          if (firstPlayer.position) {
            console.log('Found direct position:', firstPlayer.position);
          }
          if (firstPlayer.type) {
            console.log('Found direct type:', firstPlayer.type);
          }
        }
        
        console.log('Response structure:', {
          hasResponse: !!response.response,
          responseType: typeof response.response,
          responseLength: response.response?.length || 0,
          hasErrors: !!response.errors,
          errors: response.errors,
          results: response.results,
          paging: response.paging
        });
        
        if (response.errors) {
          console.log('API Errors:', response.errors);
        }
        // Try different response structures
        const players = response.response || response.results || [];
        console.log('Extracted players:', players);
        return players;
      },
      
      // Strategy 2: Try with pagination if first strategy returns many results
      async () => {
        console.log('Trying /players/profiles with pagination...');
        const response = await af.get('/players/profiles', { 
          search: query, 
          page: 1
        });
        console.log('Profiles paginated response:', response);
        return response.response || response.results || [];
      },
      
      // Strategy 3: Get players from Premier League and filter (use previous season)
      async () => {
        console.log('Trying Premier League players (previous season)...');
        const response = await af.get('/players', { 
          league: 39, 
          season: currentYear - 1
        });
        console.log('Premier League response:', response);
        const allPlayers = response.response || response.results || [];
        return allPlayers.filter(player => 
          player.player.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20);
      },
      
      // Strategy 4: Get players from La Liga and filter (use previous season)
      async () => {
        console.log('Trying La Liga players (previous season)...');
        const response = await af.get('/players', { 
          league: 140, 
          season: currentYear - 1
        });
        console.log('La Liga response:', response);
        console.log('La Liga response structure:', {
          hasResponse: !!response.response,
          responseType: typeof response.response,
          responseLength: response.response?.length || 0,
          hasResults: !!response.results,
          resultsLength: response.results?.length || 0
        });
        const allPlayers = response.response || response.results || [];
        return allPlayers.filter(player => 
          player.player.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20);
      },
      
      // Strategy 5: Get top scorers from multiple leagues (use previous season)
      async () => {
        console.log('Trying top scorers from multiple leagues (previous season)...');
        const leagues = [39, 140, 78, 61]; // Premier League, La Liga, Bundesliga, Serie A
        const responses = await Promise.all(
          leagues.map(leagueId => 
            af.get('/players/topscorers', { league: leagueId, season: currentYear - 1 })
          )
        );
        console.log('Top scorers responses:', responses);
        const allTopScorers = responses.flatMap(response => response.response || response.results || []);
        return allTopScorers.filter(player => 
          player.player.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20);
      },
      
      // Strategy 6: Try Bundesliga players (use previous season)
      async () => {
        console.log('Trying Bundesliga players (previous season)...');
        const response = await af.get('/players', { 
          league: 78, 
          season: currentYear - 1
        });
        console.log('Bundesliga response:', response);
        const allPlayers = response.response || response.results || [];
        return allPlayers.filter(player => 
          player.player.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20);
      },
      
      // Strategy 7: Try Serie A players (use previous season)
      async () => {
        console.log('Trying Serie A players (previous season)...');
        const response = await af.get('/players', { 
          league: 61, 
          season: currentYear - 1
        });
        console.log('Serie A response:', response);
        const allPlayers = response.response || response.results || [];
        return allPlayers.filter(player => 
          player.player.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20);
      },
      
      // Strategy 8: Try without season parameter (fallback)
      async () => {
        console.log('Trying without season parameter...');
        const response = await af.get('/players', { 
          league: 39
        });
        console.log('No season response:', response);
        const allPlayers = response.response || [];
        return allPlayers.filter(player => 
          player.player.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20);
      }
    ];
    
    // Try each strategy until we find players
    for (let i = 0; i < searchStrategies.length; i++) {
      try {
        console.log(`Trying search strategy ${i + 1}...`);
        const result = await searchStrategies[i]();
        console.log(`Strategy ${i + 1} result:`, result);
        
        if (result && result.length > 0) {
          console.log(`Strategy ${i + 1} succeeded with ${result.length} players`);
          players = result;
          break;
        }
      } catch (error) {
        console.log(`Strategy ${i + 1} failed:`, error.message);
        continue;
      }
    }
    
    if (players.length === 0) {
      resultsDiv.innerHTML = `
        <div class="no-results">
          <p>No players found for "${query}".</p>
          <p>Try searching for:</p>
          <ul style="text-align: left; margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>Popular players: "Messi", "Ronaldo", "Haaland", "Mbappé"</li>
            <li>Current players: "Salah", "Kane", "De Bruyne"</li>
            <li>Partial names: "Bruno", "Kevin", "Harry"</li>
          </ul>
          <p><small>Note: Player data availability depends on the current season and league restrictions.</small></p>
        </div>
      `;
      return;
    }
    
    // Debug: Log the first player to see its structure
    if (players.length > 0) {
      console.log('First player structure:', players[0]);
      console.log('Player keys:', Object.keys(players[0]));
    }
    
    resultsDiv.innerHTML = players.map(player => {
      // Handle different possible player structures
      const playerData = player.player || player;
      const playerId = playerData.id || player.id;
      const playerName = playerData.name || player.name;
      const playerPhoto = playerData.photo || player.photo || '';
      
      // Try multiple paths for team name
      const teamName = player.statistics?.[0]?.team?.name || 
                      player.team?.name || 
                      player.club?.name ||
                      player.team_name ||
                      'Unknown Team';
      
      // Try multiple paths for position
      const position = player.statistics?.[0]?.games?.position || 
                      player.position || 
                      player.type ||
                      player.role ||
                      'Unknown Position';
      
      return `
        <div class="player-result" data-player-id="${playerId}" data-player-name="${playerName}">
          <img class="player-photo" src="${playerPhoto}" alt="${playerName}" onerror="this.style.display='none'" />
          <div class="player-info">
            <h4>${playerName}</h4>
            <p>${teamName} • ${position}</p>
          </div>
          <button class="btn small player-select-btn" data-player-id="${playerId}" data-player-name="${playerName}" data-team-name="${teamName}" data-position="${position}">Select</button>
        </div>
      `;
    }).join('');
    
    // Bind player selection events
    resultsDiv.querySelectorAll('.player-select-btn').forEach(btn => {
      btn.addEventListener('click', () => selectPlayer(btn.dataset.playerId, btn.dataset.playerName, btn.dataset.teamName, btn.dataset.position));
    });
    
  } catch (error) {
    console.error('Player search error:', error);
    
    resultsDiv.innerHTML = `
      <div class="error">
        <p>Failed to search players. Please try again.</p>
        <p><small>Error: ${error.message}</small></p>
        <p><small>This might be due to API restrictions or network issues.</small></p>
        <p><small>Check the browser console for more details.</small></p>
      </div>
    `;
  }
}

async function selectTeam(teamId, teamName, showNotification = true) {
  // Hide search results and show selected team
  document.getElementById('team-results').innerHTML = '';
  document.getElementById('team-search').value = '';
  
  // Update selected team display
  const selectedTeamDiv = document.getElementById('selected-team');
  document.getElementById('team-name').textContent = teamName;
  
  // Use the logo URL from the team data we just created
  const teamLogoUrl = `https://media.api-sports.io/football/teams/${teamId}.png`;
  document.getElementById('team-logo').src = teamLogoUrl;
  document.getElementById('team-logo').alt = teamName;
  
  // Try to get league info from popular teams
  const popularTeam = POPULAR_TEAMS.find(t => t.id == teamId);
  if (popularTeam) {
    document.getElementById('team-league').textContent = `${popularTeam.league} • ${popularTeam.country}`;
  } else {
    document.getElementById('team-league').textContent = 'Team selected';
  }
  
  selectedTeamDiv.style.display = 'flex';
  document.querySelector('.team-selection').style.display = 'none';
  
  // Show change button
  document.getElementById('change-team-btn').style.display = 'block';
  
  // Update profile card
  updateProfileCardTeam(teamId, teamName, popularTeam);
  
  // Only show toast if explicitly requested (not when loading saved favorites)
  if (showNotification) {
    showToast(`${teamName} selected as favorite team!`);
  }
  
  // Save to localStorage and sync to Firestore
  const teamData = { 
    id: teamId, 
    name: teamName,
    logoUrl: `https://media.api-sports.io/football/teams/${teamId}.png`
  };
  localStorage.setItem('favoriteTeam', JSON.stringify(teamData));
  
  console.log('Saved team data with logo URL:', teamData);
  
  // Sync to Firestore if user is authenticated
  try {
    const { currentUser } = await import('./auth.js');
    const user = currentUser();
    if (user) {
      const { syncUserFavorites } = await import('./scoring.js');
      await syncUserFavorites(user.uid);
    }
  } catch (error) {
    console.error('Error syncing team to Firestore:', error);
  }
}

async function selectPlayer(playerId, playerName, teamName, position, showNotification = true) {
  // Hide search results and show selected player
  document.getElementById('player-results').innerHTML = '';
  document.getElementById('player-search').value = '';
  
  // Update selected player display
  const selectedPlayerDiv = document.getElementById('selected-player');
  document.getElementById('player-name').textContent = playerName;
  
  // Use the photo URL from the player data we just created
  const playerPhotoUrl = `https://media.api-sports.io/football/players/${playerId}.png`;
  document.getElementById('player-photo').src = playerPhotoUrl;
  document.getElementById('player-photo').alt = playerName;
  document.getElementById('player-team').textContent = teamName || 'Unknown Team';
  document.getElementById('player-position').textContent = position || 'Unknown Position';
  
  selectedPlayerDiv.style.display = 'flex';
  document.querySelector('.player-selection').style.display = 'none';
  
  // Show change button
  document.getElementById('change-player-btn').style.display = 'block';
  
  // Update profile card
  updateProfileCardPlayer(playerId, playerName, teamName, position);
  
  // Only show toast if explicitly requested (not when loading saved favorites)
  if (showNotification) {
    showToast(`${playerName} selected as favorite player!`);
  }
  
  // Save to localStorage and sync to Firestore
  const playerData = { 
    id: playerId, 
    name: playerName, 
    team: teamName, 
    position: position,
    photoUrl: `https://media.api-sports.io/football/players/${playerId}.png`
  };
  localStorage.setItem('favoritePlayer', JSON.stringify(playerData));
  
  console.log('Saved player data with photo URL:', playerData);
  
  // Sync to Firestore if user is authenticated
  try {
    const { currentUser } = await import('./auth.js');
    const user = currentUser();
    if (user) {
      const { syncUserFavorites } = await import('./scoring.js');
      await syncUserFavorites(user.uid);
    }
  } catch (error) {
    console.error('Error syncing player to Firestore:', error);
  }
}

function loadSavedFavorites() {
  // Load saved favorite team
  const savedTeam = localStorage.getItem('favoriteTeam');
  if (savedTeam) {
    try {
      const team = JSON.parse(savedTeam);
      // Check if it's a popular team for league info
      const popularTeam = POPULAR_TEAMS.find(t => t.id == team.id);
      if (popularTeam) {
        selectTeam(team.id, team.name, false);
      } else {
        // For non-popular teams, just show basic info
        const selectedTeamDiv = document.getElementById('selected-team');
        document.getElementById('team-name').textContent = team.name;
        
        // Use saved logo URL if available
        const teamLogoUrl = team.logoUrl || `https://media.api-sports.io/football/teams/${team.id}.png`;
        document.getElementById('team-logo').src = teamLogoUrl;
        document.getElementById('team-logo').alt = team.name;
        document.getElementById('team-league').textContent = 'Team selected';
        
        selectedTeamDiv.style.display = 'flex';
        document.getElementById('team-selection').style.display = 'none';
        
        // Show change button
        document.getElementById('change-team-btn').style.display = 'block';
        
        // Update profile card
        updateProfileCardTeam(team.id, team.name, null);
      }
    } catch (error) {
      console.error('Error loading saved team:', error);
    }
  }

  // Load saved favorite player
  const savedPlayer = localStorage.getItem('favoritePlayer');
  if (savedPlayer) {
    try {
      const player = JSON.parse(savedPlayer);
      selectPlayer(player.id, player.name, player.team, player.position, false);
      // Show change button for saved player
      document.getElementById('change-player-btn').style.display = 'block';
    } catch (error) {
      console.error('Error loading saved player:', error);
    }
  }
}

function changeFavoriteTeam() {
  // Show the team selection section and hide the selected team
  const selectedTeamDiv = document.getElementById('selected-team');
  const teamSelectionDiv = document.querySelector('.team-selection');
  
  if (selectedTeamDiv && teamSelectionDiv) {
    selectedTeamDiv.style.display = 'none';
    teamSelectionDiv.style.display = 'block';
    
    // Clear any previous search results
    document.getElementById('team-results').innerHTML = '';
    document.getElementById('team-search').value = '';
    
    // Scroll to the team selection section
    teamSelectionDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function changeFavoritePlayer() {
  // Show the player selection section and hide the selected player
  const selectedPlayerDiv = document.getElementById('selected-player');
  const playerSelectionDiv = document.querySelector('.player-selection');
  
  if (selectedPlayerDiv && playerSelectionDiv) {
    selectedPlayerDiv.style.display = 'none';
    playerSelectionDiv.style.display = 'block';
    
    // Clear any previous search results
    document.getElementById('player-results').innerHTML = '';
    document.getElementById('player-search').value = '';
    
    // Scroll to the player selection section
    playerSelectionDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function updateProfileCardTeam(teamId, teamName, popularTeam) {
  const profileTeamDiv = document.getElementById('profile-favorite-team');
  if (!profileTeamDiv) return;
  
  const leagueInfo = popularTeam ? `${popularTeam.league} • ${popularTeam.country}` : 'Team selected';
  
  // Get saved team data to check for logo URL
  const savedTeam = localStorage.getItem('favoriteTeam');
  let teamLogoUrl = `https://media.api-sports.io/football/teams/${teamId}.png`;
  
  if (savedTeam) {
    try {
      const teamData = JSON.parse(savedTeam);
      if (teamData.logoUrl && teamData.id == teamId) {
        teamLogoUrl = teamData.logoUrl;
      }
    } catch (error) {
      console.error('Error parsing saved team data:', error);
    }
  }
  
  profileTeamDiv.innerHTML = `
    <div class="favorite-icon">🏆</div>
    <div class="favorite-content">
      <h4>Favorite Team</h4>
      <div class="favorite-details">
        <img class="favorite-logo" src="${teamLogoUrl}" alt="${teamName}" onerror="this.style.display='none'" />
        <div class="favorite-info">
          <p class="favorite-name">${teamName}</p>
          <p class="favorite-meta">${leagueInfo}</p>
        </div>
      </div>
    </div>
  `;
}

function updateProfileCardPlayer(playerId, playerName, teamName, position) {
  const profilePlayerDiv = document.getElementById('profile-favorite-player');
  if (!profilePlayerDiv) return;
  
  // Get saved player data to check for photo URL
  const savedPlayer = localStorage.getItem('favoritePlayer');
  let playerPhotoUrl = `https://media.api-sports.io/football/players/${playerId}.png`;
  
  if (savedPlayer) {
    try {
      const playerData = JSON.parse(savedPlayer);
      if (playerData.photoUrl && playerData.id == playerId) {
        playerPhotoUrl = playerData.photoUrl;
      }
    } catch (error) {
      console.error('Error parsing saved player data:', error);
    }
  }
  
  profilePlayerDiv.innerHTML = `
    <div class="favorite-icon">⭐</div>
    <div class="favorite-content">
      <h4>Favorite Player</h4>
      <div class="favorite-details">
        <img class="favorite-photo" src="${playerPhotoUrl}" alt="${playerName}" onerror="this.style.display='none'" />
        <div class="favorite-info">
          <p class="favorite-name">${playerName}</p>
          <p class="favorite-meta">${teamName || 'Unknown Team'} • ${position || 'Unknown Position'}</p>
        </div>
      </div>
    </div>
  `;
}

function showToast(message, type = 'success') {
  // Create toast notification
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Hide and remove toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function testAPIConnection() {
  console.log('=== Testing API Connection ===');
  
  try {
    // Test 1: Basic API call to timezone endpoint
    console.log('Test 1: Testing timezone endpoint...');
    const timezoneResponse = await af.get('/timezone');
    console.log('Timezone response:', timezoneResponse);
    
    // Test 2: Test teams endpoint with a simple query
    console.log('Test 2: Testing teams endpoint...');
    const teamsResponse = await af.get('/teams', { league: 39, season: 2024 });
    console.log('Teams response:', teamsResponse);
    
    // Test 3: Test players endpoint
    console.log('Test 3: Testing players endpoint...');
    const playersResponse = await af.get('/players', { league: 39, season: 2024 });
    console.log('Players response:', playersResponse);
    
    // Test 4: Test search endpoints specifically
    console.log('Test 4: Testing search endpoints...');
    try {
      const teamSearchResponse = await af.get('/teams', { search: 'Liverpool' });
      console.log('=== LIVERPOOL TEAM SEARCH RAW RESPONSE ===');
      console.log('Full response:', teamSearchResponse);
      if (teamSearchResponse.response && teamSearchResponse.response.length > 0) {
        console.log('First team item:', teamSearchResponse.response[0]);
        console.log('First team keys:', Object.keys(teamSearchResponse.response[0]));
      }
    } catch (error) {
      console.log('Team search failed:', error.message);
    }
    
    try {
      const playerSearchResponse = await af.get('/players/profiles', { search: 'Messi' });
      console.log('=== MESSI PLAYER SEARCH RAW RESPONSE ===');
      console.log('Full response:', playerSearchResponse);
      if (playerSearchResponse.response && playerSearchResponse.response.length > 0) {
        console.log('First player item:', playerSearchResponse.response[0]);
        console.log('First player keys:', Object.keys(playerSearchResponse.response[0]));
      }
    } catch (error) {
      console.log('Player search failed:', error.message);
    }
    
    console.log('=== API Connection Test Complete ===');
    
  } catch (error) {
    console.error('API Connection Test Failed:', error);
  }
}

onUserChanged((user) => {
  console.log('onUserChanged callback triggered with user:', user);
  if (!user) {
    console.log('No user, rendering anonymous state');
    renderAnon();
  } else {
    console.log('User authenticated, rendering user profile');
    renderUser(user);
  }
});



