// onUserChanged import removed - not being used
// getUserDetailedPredictions import removed - no longer needed
import { 
  getCurrentDashboardWeekId, 
  getPreviousWeekRange, 
  getNextWeekRange,
  fetchFixturesForWeek,
  getCurrentWeekendRange,
  getLastCompletedWeekend,
  getWeekName,
  getNextWeekId,
  getPreviousWeekId,
  getPreviousWeekIds,
  getNextWeekIds
} from './api.js';

// DOM Elements
const bodyEl = document.getElementById('lb-body');
const emptyEl = document.getElementById('lb-empty');
const compactView = document.getElementById('compact-view');

// Detailed predictions view elements
const detailedView = document.getElementById('detailed-view');
const predictionsTable = document.getElementById('predictions-table');
const predictionsHeader = document.getElementById('predictions-header');
const predictionsBody = document.getElementById('predictions-body');

// View toggle buttons
const btnCompactView = document.getElementById('btn-compact-view');
const btnDetailedView = document.getElementById('btn-detailed-view');

// Week navigation elements
const btnPrevWeek = document.getElementById('btn-prev-week');
const btnNextWeek = document.getElementById('btn-next-week');
const btnCurrentWeek = document.getElementById('btn-current-week');
const currentWeekDisplay = document.getElementById('current-week-display');
const weekDateRange = document.getElementById('week-date-range');

// Modal elements - removed as no longer needed

let currentView = 'compact';
let currentRankings = [];
let currentWeekId = null;

// Cache for predictions to avoid repeated database calls
let predictionsCache = new Map();
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Loading state management
let isLoading = false;

// Helper function to truncate usernames to 9 characters
function truncateUsername(username) {
  if (!username || username.length <= 9) {
    return username || 'Player';
  }
  return username.substring(0, 9) + '...';
}

// Helper function to get team abbreviation (first 3 letters)
function getTeamAbbreviation(teamName) {
  if (!teamName || teamName.length <= 3) {
    return teamName || 'TEA';
  }
  return teamName.substring(0, 3).toUpperCase();
}

// Check if cache is still valid
function isCacheValid() {
  return Date.now() - cacheTimestamp < CACHE_DURATION && predictionsCache.size > 0;
}

// Clear cache when it expires
function clearCache() {
  predictionsCache.clear();
  cacheTimestamp = 0;
}

// Show loading state
function showLoadingState() {
  isLoading = true;
  if (bodyEl) {
    bodyEl.innerHTML = `
      <tr>
        <td colspan="4" class="loading-row">
          <div class="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </td>
      </tr>
    `;
  }
}

// Hide loading state
function hideLoadingState() {
  isLoading = false;
}

// View toggle functionality
function setView(view) {
  currentView = view;
  
  // Hide both view toggle buttons
  if (btnCompactView && btnDetailedView) {
    btnCompactView.style.display = 'none';
    btnDetailedView.style.display = 'none';
  }
  
  // Show/hide appropriate views
  if (view === 'compact') {
    compactView.classList.remove('hidden');
    detailedView.classList.add('hidden');
  } else if (view === 'detailed') {
    compactView.classList.add('hidden');
    detailedView.classList.remove('hidden');
    
    // Show loading state for detailed view
    if (predictionsHeader && predictionsBody) {
      predictionsHeader.innerHTML = '<tr><th>Loading...</th></tr>';
      predictionsBody.innerHTML = '<tr><td>Preparing detailed view...</td></tr>';
    }
    
    // If we already have rankings data, render immediately
    if (currentRankings.length > 0) {
      render(currentRankings);
    }
  }
  
  // Only render if not already handled above
  if (view !== 'detailed' || currentRankings.length === 0) {
    render(currentRankings);
  }
}

// Initialize the leaderboard with the current week
async function initializeLeaderboard() {
  try {
    console.log('initializeLeaderboard: Starting initialization...');
    
    // Show loading state
    if (currentWeekDisplay) {
      currentWeekDisplay.innerHTML = '<h2>Loading...</h2><div class="week-date-range">Please wait</div>';
    }
    
    // Clear any stale cache on initialization
    clearCache();
    
    // Try to get the current dashboard week
    currentWeekId = await getCurrentDashboardWeekId();
    console.log('initializeLeaderboard: Got dashboard week ID:', currentWeekId);
    
    // If that fails, fall back to calculated current week
    if (!currentWeekId) {
      const now = new Date();
      const day = now.getDay();
      
      if (day >= 5) {
        // Friday, Saturday, Sunday - use this weekend
        const currentWeek = getCurrentWeekendRange(now);
        currentWeekId = `${currentWeek.from}_${currentWeek.to}`;
      } else {
        // Monday-Thursday - use the most recent weekend
        const lastWeekend = getLastCompletedWeekend(now);
        currentWeekId = `${lastWeekend.from}_${lastWeekend.to}`;
      }
      
      console.log('initializeLeaderboard: Using fallback week ID:', currentWeekId);
    }
    
    if (currentWeekId) {
      // Check if the current week has data, if not, try to find a nearby week
      const fixtures = await fetchFixturesForWeek(currentWeekId);
      if (fixtures.length === 0) {
        console.log('initializeLeaderboard: Current week has no data, searching for nearby week...');
        
        // Try to find a nearby week with data
        const nearbyWeeks = [
          ...getPreviousWeekIds(currentWeekId, 4),
          ...getNextWeekIds(currentWeekId, 4)
        ];
        
        for (const weekId of nearbyWeeks) {
          try {
            const weekFixtures = await fetchFixturesForWeek(weekId);
            if (weekFixtures.length > 0) {
              currentWeekId = weekId;
              console.log('initializeLeaderboard: Found nearby week with data:', weekId);
              showSuccessMessage('Loaded nearby week with data');
              break;
            }
          } catch (error) {
            console.warn(`initializeLeaderboard: Error checking week ${weekId}:`, error);
            continue;
          }
        }
      }
      
      await loadWeeklyRankings(currentWeekId);
      showSuccessMessage('Leaderboard loaded successfully');
    } else {
      console.error('initializeLeaderboard: No week ID available');
      showErrorMessage('Unable to determine current week');
      showEmptyState();
    }
  } catch (error) {
    console.error('Error initializing leaderboard:', error);
    showErrorMessage('Error loading leaderboard');
    showEmptyState();
  }
}

// Force refresh cache and reload data
async function refreshLeaderboard() {
  clearCache();
  if (currentWeekId) {
    await loadWeeklyRankings(currentWeekId);
    showSuccessMessage('Leaderboard refreshed');
  }
}

// Load rankings for a specific week
async function loadWeeklyRankings(weekId) {
  try {
    // Show loading state immediately
    showLoadingState();
    
    // Get fixtures for this week
    const fixtures = await fetchFixturesForWeek(weekId);
    
    if (!fixtures.length) {
      hideLoadingState();
      showEmptyState();
      return;
    }
    
    // Update week display
    await updateWeekDisplay(weekId);
    
    // Check if we have valid cached data
    if (isCacheValid() && predictionsCache.has(weekId)) {
      console.log('Using cached predictions for week:', weekId);
      const cachedData = predictionsCache.get(weekId);
      await processRankingsFromCache(weekId, fixtures, cachedData);
      hideLoadingState();
      return;
    }
    
    // Get all users and calculate their weekly points in parallel
    const { db, firestoreReady } = await import('./auth.js');
    const firestoreDb = await firestoreReady;
    
    if (!firestoreDb) {
      console.error('Firestore not ready');
      hideLoadingState();
      return;
    }
    
    const { collection, getDocs, query, where, getDocsFromCache } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
    
    // Get all users first
    const usersSnapshot = await getDocs(collection(firestoreDb, 'users'));
    const users = [];
    
    // Prepare batch operations for predictions
    const fixtureIds = fixtures.map(f => String(f.fixture.id));
    const predictionPromises = [];
    
    // Create a map to store all predictions for this week
    const allPredictions = new Map(); // fixtureId -> userId -> prediction
    
    // Batch fetch all predictions for this week
    for (const fixtureId of fixtureIds) {
      try {
        const predictionRef = collection(firestoreDb, 'predictions', fixtureId, 'entries');
        const predictionPromise = getDocs(predictionRef).then(snapshot => {
          const fixturePredictions = new Map();
          snapshot.forEach(doc => {
            fixturePredictions.set(doc.id, doc.data());
          });
          allPredictions.set(fixtureId, fixturePredictions);
        });
        predictionPromises.push(predictionPromise);
      } catch (error) {
        console.warn(`Error setting up prediction fetch for fixture ${fixtureId}:`, error);
      }
    }
    
    // Wait for all prediction fetches to complete
    await Promise.all(predictionPromises);
    
    // Cache the predictions for future use
    predictionsCache.set(weekId, allPredictions);
    cacheTimestamp = Date.now();
    
    // Also cache fixtures for detailed view
    if (!predictionsCache.has('fixtures_' + weekId)) {
      predictionsCache.set('fixtures_' + weekId, fixtures);
    }
    
    // Process users and calculate points using the cached predictions
    await processRankingsFromCache(weekId, fixtures, allPredictions);
    
    hideLoadingState();
    
  } catch (error) {
    console.error('Error loading weekly rankings:', error);
    hideLoadingState();
    showEmptyState();
  }
}

// Update the week display with name and date range
async function updateWeekDisplay(weekId) {
  try {
    const weekName = await getWeekName(weekId);
    currentWeekDisplay.textContent = weekName;
    
    // Parse the week ID to get date information
    const [fromStr, toStr] = weekId.split('_');
    if (fromStr && toStr) {
      const weekStartDate = new Date(fromStr);
      const weekEndDate = new Date(toStr);
      
      const startStr = weekStartDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      const endStr = weekEndDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
      
      weekDateRange.textContent = `${startStr} - ${endStr}`;
    }
  } catch (error) {
    console.error('Error updating week display:', error);
    currentWeekDisplay.textContent = 'Unknown Week';
    weekDateRange.textContent = '';
  }
}

// Process rankings from cached data
async function processRankingsFromCache(weekId, fixtures, allPredictions) {
  try {
    const { db, firestoreReady } = await import('./auth.js');
    const firestoreDb = await firestoreReady;
    
    if (!firestoreDb) {
      console.error('Firestore not ready');
      return;
    }
    
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
    
    // Get all users
    const usersSnapshot = await getDocs(collection(firestoreDb, 'users'));
    const users = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;
      
      // Calculate weekly points for this user using cached data
      const weeklyPoints = calculateWeeklyPointsFromCache(uid, weekId, fixtures, allPredictions);
      
      users.push({
        id: uid,
        ...userData,
        weeklyPoints: weeklyPoints.points,
        weeklyCorrect: weeklyPoints.correct,
        weeklyTotal: weeklyPoints.total,
        weeklyAccuracy: weeklyPoints.accuracy
      });
    }
    
    // Sort by weekly points, then by number of predictions made
    const sortedUsers = users
      .filter(user => user.weeklyTotal > 0) // Only show users who made predictions
      .sort((a, b) => {
        // First sort by points
        if (b.weeklyPoints !== a.weeklyPoints) {
          return b.weeklyPoints - a.weeklyPoints;
        }
        // If points are equal, sort by number of predictions (more predictions first)
        return b.weeklyTotal - a.weeklyTotal;
      });
    
    currentRankings = sortedUsers;
    render(currentRankings);
  } catch (error) {
    console.error('Error processing rankings from cache:', error);
    showEmptyState();
  }
}

// Calculate weekly points for a user from cached data
function calculateWeeklyPointsFromCache(uid, weekId, fixtures, allPredictions) {
  try {
    let totalPoints = 0;
    let correctPredictions = 0;
    let totalPredictions = 0;

    // Check each fixture for this week
    for (const fixture of fixtures) {
      const fixtureId = String(fixture.fixture.id);
      
      const fixturePredictions = allPredictions.get(fixtureId);
      if (!fixturePredictions) continue;

      const userPrediction = fixturePredictions.get(uid);
      if (!userPrediction) continue;

      totalPredictions++;
      
      // For completed matches, check if prediction was awarded and points were given
      if (userPrediction.awarded !== undefined) {
        if (userPrediction.awarded) {
          totalPoints += userPrediction.points || 0;
          if (userPrediction.points > 0) {
            correctPredictions++;
          }
        }
      }
      
      // Debug logging
      console.log(`Fixture ${fixtureId}: User ${uid} - awarded: ${userPrediction.awarded}, points: ${userPrediction.points}, correct: ${userPrediction.correct}`);
    }
    
    const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
    
    return {
      points: totalPoints,
      correct: correctPredictions,
      total: totalPredictions,
      accuracy: Math.round(accuracy)
    };
    
  } catch (error) {
    console.error('Error calculating weekly points from cache:', error);
    return { points: 0, correct: 0, total: 0, accuracy: 0 };
  }
}

// Calculate weekly points for a user (legacy function - kept for compatibility)
async function calculateWeeklyPoints(uid, weekId, fixtures) {
  try {
    const { db, firestoreReady } = await import('./auth.js');
    const firestoreDb = await firestoreReady;
    
    if (!firestoreDb) return { points: 0, correct: 0, total: 0, accuracy: 0 };
    
    const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
    
    let totalPoints = 0;
    let correctPredictions = 0;
    let totalPredictions = 0;
    
    // Check each fixture for this week
    for (const fixture of fixtures) {
      const fixtureId = fixture.fixture.id;
      
      try {
        // Get user's prediction for this fixture
        const predictionRef = collection(firestoreDb, 'predictions', String(fixtureId), 'entries');
        const userPredictionQuery = query(predictionRef, where('__name__', '==', uid));
        const predictionSnapshot = await getDocs(userPredictionQuery);
        
        if (!predictionSnapshot.empty) {
          const prediction = predictionSnapshot.docs[0].data();
          totalPredictions++;
          
          // For completed matches, check if prediction was awarded and points were given
          if (prediction.awarded !== undefined) {
            if (prediction.awarded) {
              totalPoints += prediction.points || 0;
              if (prediction.points > 0) {
                correctPredictions++;
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Error checking prediction for fixture ${fixtureId}:`, error);
      }
    }
    
    const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
    
    return {
      points: totalPoints,
      correct: correctPredictions,
      total: totalPredictions,
      accuracy: Math.round(accuracy)
    };
    
  } catch (error) {
    console.error('Error calculating weekly points:', error);
    return { points: 0, correct: 0, total: 0, accuracy: 0 };
  }
}

// Navigate to previous week
async function goToPreviousWeek() {
  if (!currentWeekId) return;
  
  // Clear cache when navigating to ensure fresh data
  clearCache();
  
  // Disable button and show loading state
  btnPrevWeek.disabled = true;
  btnPrevWeek.innerHTML = '<span class="btn-icon">⏳</span>';
  
  try {
    console.log('goToPreviousWeek: Starting navigation from week:', currentWeekId);
    
    // Get multiple previous weeks to search through
    const previousWeekIds = getPreviousWeekIds(currentWeekId, 12); // Search up to 12 weeks back
    console.log('goToPreviousWeek: Searching through weeks:', previousWeekIds);
    
    // Find the first week with data
    for (const weekId of previousWeekIds) {
      try {
        const fixtures = await fetchFixturesForWeek(weekId);
        if (fixtures.length > 0) {
          currentWeekId = weekId;
          await loadWeeklyRankings(currentWeekId);
          console.log('goToPreviousWeek: Successfully navigated to week:', weekId);
          showSuccessMessage(`Navigated to previous week`);
          return;
        }
      } catch (error) {
        console.warn(`goToPreviousWeek: Error checking week ${weekId}:`, error);
        continue;
      }
    }
    
    console.log('goToPreviousWeek: No weeks with data found in the last 12 weeks');
    showErrorMessage('No previous weeks with data found');
    
  } catch (error) {
    console.error('Error navigating to previous week:', error);
    showErrorMessage('Error navigating to previous week');
  } finally {
    // Re-enable button and restore icon
    btnPrevWeek.disabled = false;
    btnPrevWeek.innerHTML = '<span class="btn-icon">←</span>';
  }
}

// Navigate to next week
async function goToNextWeek() {
  if (!currentWeekId) return;
  
  // Clear cache when navigating to ensure fresh data
  clearCache();
  
  // Disable button and show loading state
  btnNextWeek.disabled = true;
  btnNextWeek.innerHTML = '<span class="btn-icon">⏳</span>';
  
  try {
    console.log('goToNextWeek: Starting navigation from week:', currentWeekId);
    
    // Get multiple next weeks to search through
    const nextWeekIds = getNextWeekIds(currentWeekId, 12); // Search up to 12 weeks forward
    console.log('goToNextWeek: Searching through weeks:', nextWeekIds);
    
    // Find the first week with data
    for (const weekId of nextWeekIds) {
      try {
        const fixtures = await fetchFixturesForWeek(weekId);
        if (fixtures.length > 0) {
          currentWeekId = weekId;
          await loadWeeklyRankings(currentWeekId);
          console.log('goToNextWeek: Successfully navigated to week:', weekId);
          showSuccessMessage(`Navigated to next week`);
          return;
        }
      } catch (error) {
        console.warn(`goToNextWeek: Error checking week ${weekId}:`, error);
        continue;
      }
    }
    
    console.log('goToNextWeek: No weeks with data found in the next 12 weeks');
    showErrorMessage('No next weeks with data found');
    
  } catch (error) {
    console.error('Error navigating to next week:', error);
    showErrorMessage('Error navigating to next week');
  } finally {
    // Re-enable button and restore icon
    btnNextWeek.disabled = false;
    btnNextWeek.innerHTML = '<span class="btn-icon">→</span>';
  }
}

// Go to current week
async function goToCurrentWeek() {
  // Clear cache when navigating to ensure fresh data
  clearCache();
  
  // Disable button and show loading state
  btnCurrentWeek.disabled = true;
  const originalText = btnCurrentWeek.textContent;
  btnCurrentWeek.textContent = 'Loading...';
  
  try {
    console.log('goToCurrentWeek: Starting...');
    
    const now = new Date();
    const day = now.getDay();
    
    let targetWeekId;
    if (day >= 5) {
      // Friday, Saturday, Sunday - use this weekend
      const currentWeek = getCurrentWeekendRange(now);
      targetWeekId = `${currentWeek.from}_${currentWeek.to}`;
    } else {
      // Monday-Thursday - use the most recent weekend
      const lastWeekend = getLastCompletedWeekend(now);
      targetWeekId = `${lastWeekend.from}_${lastWeekend.to}`;
    }
    
    console.log('goToCurrentWeek: Target week ID:', targetWeekId);
    
    if (targetWeekId && targetWeekId !== currentWeekId) {
      // Check if the target week has data
      const fixtures = await fetchFixturesForWeek(targetWeekId);
      if (fixtures.length > 0) {
        currentWeekId = targetWeekId;
        await loadWeeklyRankings(currentWeekId);
        console.log('goToCurrentWeek: Successfully navigated to current week:', targetWeekId);
        showSuccessMessage('Navigated to current week');
      } else {
        console.log('goToCurrentWeek: Target week has no data, searching for nearby week...');
        
        // Try to find a nearby week with data
        const nearbyWeeks = [
          ...getPreviousWeekIds(targetWeekId, 4),
          ...getNextWeekIds(targetWeekId, 4)
        ];
        
        for (const weekId of nearbyWeeks) {
          try {
            const weekFixtures = await fetchFixturesForWeek(weekId);
            if (weekFixtures.length > 0) {
              currentWeekId = weekId;
              await loadWeeklyRankings(currentWeekId);
              console.log('goToCurrentWeek: Found nearby week with data:', weekId);
              showSuccessMessage('Navigated to nearby week with data');
              return;
            }
          } catch (error) {
            console.warn(`goToCurrentWeek: Error checking week ${weekId}:`, error);
            continue;
          }
        }
        
        console.log('goToCurrentWeek: No nearby weeks with data found');
        showErrorMessage('No current week data available');
      }
    } else {
      console.log('goToCurrentWeek: Already on current week or no target week');
      showSuccessMessage('Already on current week');
    }
  } catch (error) {
    console.error('Error going to current week:', error);
    showErrorMessage('Error navigating to current week');
  } finally {
    // Re-enable button and restore text
    btnCurrentWeek.disabled = false;
    btnCurrentWeek.textContent = originalText;
  }
}

// Show empty state
function showEmptyState() {
  currentRankings = [];
  render(currentRankings);
}

// Show error message to user
function showErrorMessage(message, duration = 5000) {
  // Create error message element
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.innerHTML = `
    <div class="error-content">
      <span class="error-icon">⚠️</span>
      <span class="error-text">${message}</span>
      <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(errorEl);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (errorEl.parentElement) {
      errorEl.remove();
    }
  }, duration);
}

// Show success message to user
function showSuccessMessage(message, duration = 3000) {
  // Create success message element
  const successEl = document.createElement('div');
  successEl.className = 'success-message';
  successEl.innerHTML = `
    <div class="success-content">
      <span class="success-icon">✅</span>
      <span class="success-text">${message}</span>
      <button class="success-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(successEl);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (successEl.parentElement) {
      successEl.remove();
    }
  }, duration);
}

// Render compact table view
function renderCompact(rankings) {
  if (!bodyEl) return;
  
  bodyEl.innerHTML = '';
  rankings.forEach((r, i) => {
    const tr = document.createElement('tr');
    
    // Get user profile data
    const favoriteTeam = r.favoriteTeam;
    const favoritePlayer = r.favoritePlayer;
    
    tr.innerHTML = `
      <td class="position">
        <div class="position-badge ${i < 3 ? `top-${i + 1}` : ''}">${i + 1}</div>
      </td>
      <td class="player">
        <div class="player-info">
          <div class="player-details">
            <div class="player-name">${truncateUsername(r.displayName)}</div>
            <div class="player-badges">
              ${favoriteTeam ? `
                <span class="badge team-badge" title="${favoriteTeam.name}">
                  <img src="${favoriteTeam.logoUrl || `https://media.api-sports.io/football/teams/${favoriteTeam.id}.png`}" 
                       alt="${favoriteTeam.name}" 
                       class="team-logo-small"
                       onload="console.log('Team logo loaded:', '${favoriteTeam.name}')"
                       onerror="console.log('Team logo failed:', '${favoriteTeam.name}'); this.parentElement.querySelector('.team-fallback').style.display='inline'; this.style.display='none';">
                  <span class="team-fallback" style="display: none;">🏆</span>
                </span>
              ` : ''}
              ${favoritePlayer ? `
                <span class="badge player-badge" title="${favoritePlayer.name}">
                  <img src="${favoritePlayer.photoUrl || `https://media.api-sports.io/football/players/${favoritePlayer.id}.png`}" 
                       alt="${favoritePlayer.name}" 
                       class="player-photo-small"
                       onload="console.log('Player photo loaded:', '${favoritePlayer.name}')"
                       onerror="console.log('Player photo failed:', '${favoritePlayer.name}'); this.parentElement.querySelector('.player-fallback').style.display='inline'; this.style.display='none';">
                  <span class="player-fallback" style="display: none;">⭐</span>
                </span>
              ` : ''}
            </div>
          </div>
        </div>
      </td>
      <td class="points">
        <div class="points-value">${r.weeklyPoints || 0}</div>
      </td>
    `;
    
         // No click handler needed - detailed view shows all predictions
    
    bodyEl.appendChild(tr);
  });
}

// Render detailed predictions view
async function renderDetailed(rankings) {
  if (!predictionsHeader || !predictionsBody) return;
  
  try {
    // Get fixtures for current week (use cached if available)
    let fixtures = predictionsCache.get('fixtures_' + currentWeekId);
    if (!fixtures) {
      fixtures = await fetchFixturesForWeek(currentWeekId);
      if (fixtures.length > 0) {
        predictionsCache.set('fixtures_' + currentWeekId, fixtures);
      }
    }
    
    if (!fixtures || !fixtures.length) {
      predictionsHeader.innerHTML = '<tr><th colspan="3">No fixtures available</th></tr>';
      predictionsBody.innerHTML = '';
      return;
    }
    
    // Build header with fixtures - Improved spacing for mobile
    const headerRow = document.createElement('tr');
    headerRow.className = 'fixture-header-row'; // Add class for better styling
    
    // Add a spacer row after the header to prevent overlap with user rows
    const spacerRow = document.createElement('tr');
    spacerRow.className = 'header-spacer-row';
    spacerRow.innerHTML = `<td colspan="${fixtures.length + 2}" class="header-spacer"></td>`;
    
    headerRow.innerHTML = `
      <th class="user-header">USER</th>
      ${fixtures.map(fixture => `
        <th class="fixture-header">
          <div class="fixture-teams">
            <div class="team-logos">
              <img src="${fixture.teams?.home?.logo || `https://media.api-sports.io/football/teams/${fixture.teams?.home?.id}.png`}" 
                   alt="${fixture.teams?.home?.name || 'Home'}" 
                   class="team-logo-tiny"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
              <span class="team-fallback" style="display: none;">🏆</span>
              <span class="vs-separator">v</span>
              <img src="${fixture.teams?.away?.logo || `https://media.api-sports.io/football/teams/${fixture.teams?.away?.id}.png`}" 
                   alt="${fixture.teams?.away?.name || 'Away'}" 
                   class="team-logo-tiny"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
              <span class="team-fallback" style="display: none;">🏆</span>
            </div>
            <div class="fixture-matchup">${getTeamAbbreviation(fixture.teams?.home?.name || 'GUA')} v ${getTeamAbbreviation(fixture.teams?.away?.name || 'BAR')}</div>
          </div>
        </th>
      `).join('')}
      <th class="points-header">PTS</th>
    `;
    
    predictionsHeader.innerHTML = '';
    predictionsHeader.appendChild(headerRow);
    predictionsHeader.appendChild(spacerRow); // Add spacer row
    
    // Build body with user predictions using cached data
    predictionsBody.innerHTML = '';
    
    // Get cached predictions for this week
    const allPredictions = predictionsCache.get(currentWeekId);
    if (!allPredictions) {
      predictionsBody.innerHTML = '<tr><td colspan="' + (fixtures.length + 2) + '">Loading predictions...</td></tr>';
      return;
    }
    
    for (let i = 0; i < rankings.length; i++) {
      const user = rankings[i];
      const row = document.createElement('tr');
      row.className = 'user-prediction-row'; // Add class for better styling
      
      // Create prediction cells using cached data
      const predictionCells = fixtures.map(fixture => {
        const fixtureId = String(fixture.fixture.id);
        const fixturePredictions = allPredictions.get(fixtureId);
        const userPrediction = fixturePredictions ? fixturePredictions.get(user.id) : null;
        
        if (!userPrediction) {
          return '<td class="prediction-cell no-prediction">-</td>';
        }
        
        // Determine if prediction is completed and correct
        let isCompleted = false;
        let isCorrect = false;
        
        // Check if the fixture is actually finished
        const fixtureStatus = fixture.fixture?.status?.short;
        const isFixtureFinished = fixtureStatus === 'FT' || fixtureStatus === 'AET' || fixtureStatus === 'PEN';
        
        if (isFixtureFinished && userPrediction.awarded !== undefined) {
          // Fixture is finished and prediction has been scored
          isCompleted = true;
          isCorrect = userPrediction.points > 0;
        } else if (isFixtureFinished && userPrediction.awarded === undefined) {
          // Fixture is finished but prediction hasn't been scored yet
          isCompleted = true;
          isCorrect = false; // Mark as incorrect until scored
        } else {
          // Fixture is not finished yet - keep as pending
          isCompleted = false;
          isCorrect = false;
        }
        
        const predictionClass = isCompleted ? (isCorrect ? 'correct' : 'incorrect') : 'pending';
        
        return `
          <td class="prediction-cell ${predictionClass}">
            <div class="prediction-value">${userPrediction.pick || '?'}</div>
          </td>
        `;
      }).join('');
      
      // Get user profile data
      const favoriteTeam = user.favoriteTeam;
      const favoritePlayer = user.favoritePlayer;
      
      row.innerHTML = `
        <td class="user-cell">
          <div class="user-info">
            <div class="user-details">
              <div class="user-name">${truncateUsername(user.displayName)}</div>
              <div class="user-badges">
                ${favoriteTeam ? `
                  <span class="badge team-badge" title="${favoriteTeam.name}">
                    <img src="${favoriteTeam.logoUrl || `https://media.api-sports.io/football/teams/${favoriteTeam.id}.png`}" 
                         alt="${favoriteTeam.name}" 
                         class="team-logo-tiny"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                    <span class="team-fallback" style="display: none;">🏆</span>
                  </span>
                ` : ''}
                ${favoritePlayer ? `
                  <span class="badge player-badge" title="${favoritePlayer.name}">
                    <img src="${favoritePlayer.photoUrl || `https://media.api-sports.io/football/players/${favoritePlayer.id}.png`}" 
                         alt="${favoritePlayer.name}" 
                         class="player-photo-tiny"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                    <span class="team-fallback" style="display: none;">⭐</span>
                  </span>
                ` : ''}
              </div>
            </div>
          </div>
        </td>
        ${predictionCells}
        <td class="points-cell">
          <div class="points-value">${user.weeklyPoints || 0}</div>
        </td>
      `;
      
      predictionsBody.appendChild(row);
    }
    
  } catch (error) {
    console.error('Error rendering detailed view:', error);
    predictionsHeader.innerHTML = '<tr><th colspan="3">Error loading predictions</th></tr>';
    predictionsBody.innerHTML = '';
  }
}

// Main render function
function render(rankings) {
  if (!rankings.length) {
    emptyEl.classList.remove('hidden');
    return;
  }
  
  emptyEl.classList.add('hidden');
  
  // Render based on current view
  if (currentView === 'detailed') {
    renderDetailed(rankings);
  } else {
    renderCompact(rankings);
  }
}

// User predictions modal removed - no longer needed with detailed view

// Get user predictions for a specific week from Firestore
async function getUserPredictionsForWeek(uid, weekId) {
  try {
    if (!weekId) return [];
    
    const { db, firestoreReady } = await import('./auth.js');
    const firestoreDb = await firestoreReady;
    
    if (!firestoreDb) return [];
    
    const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
    
    // Get fixtures for this week
    const fixtures = await fetchFixturesForWeek(weekId);
    if (!fixtures.length) return [];
    
    const predictions = [];
    
    // Check each fixture for this week
    for (const fixture of fixtures) {
      const fixtureId = String(fixture.fixture.id);
      
      try {
        // Get user's prediction for this fixture
        const predictionRef = collection(firestoreDb, 'predictions', fixtureId, 'entries');
        const userPredictionQuery = query(predictionRef, where('__name__', '==', uid));
        const predictionSnapshot = await getDocs(userPredictionQuery);
        
        if (!predictionSnapshot.empty) {
          const prediction = predictionSnapshot.docs[0].data();
          
          // Debug logging
          console.log(`Prediction data for fixture ${fixtureId}:`, prediction);
          
          // Format fixture name
          let fixtureName = 'Unknown vs Unknown';
          if (fixture.teams?.home && fixture.teams?.away) {
            fixtureName = `${fixture.teams.home.name} vs ${fixture.teams.away.name}`;
          }
          
          // Format date
          let dateStr = 'Unknown date';
          if (fixture.fixture?.date) {
            const date = new Date(fixture.fixture.date);
            dateStr = date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
          
          // Determine result and points
          let result = 'P'; // Pending
          let points = 0;
          let status = 'Pending';
          
          if (prediction.awarded !== undefined) {
            if (prediction.awarded) {
              // Check if prediction was correct based on points awarded
              if (prediction.points > 0) {
                result = 'W';
                points = prediction.points;
                status = 'Correct';
              } else {
                result = 'L';
                points = 0;
                status = 'Incorrect';
              }
            }
          } else if (fixture.fixture?.status?.short === 'FT' || fixture.fixture?.status?.short === 'AET' || fixture.fixture?.status?.short === 'PEN') {
            status = 'Completed (Not Scored)';
          }
          
          predictions.push({
            fixture: fixtureName,
            pick: prediction.pick,
            result: result,
            points: points,
            date: dateStr,
            status: status,
            league: fixture.league?.name || 'Unknown League',
            homeTeam: fixture.teams?.home,
            awayTeam: fixture.teams?.away,
            actualResult: prediction.actualResult,
            fixtureStatus: fixture.fixture?.status?.short
          });
        }
      } catch (error) {
        console.warn(`Error checking prediction for fixture ${fixtureId}:`, error);
      }
    }
    
    return predictions;
  } catch (error) {
    console.error('Error fetching predictions for week:', error);
    return [];
  }
}

// Render user predictions in modal
function renderUserPredictions(user, predictions) {
  if (!predictions.length) {
    predictionsContent.innerHTML = `
      <div class="empty-predictions">
        <div class="empty-icon">📊</div>
        <h3>No predictions this week</h3>
        <p>${truncateUsername(user.displayName) || 'This player'} hasn't made any predictions for this week yet.</p>
      </div>
    `;
    return;
  }
  
  // Group predictions by status
  const completedPredictions = predictions.filter(p => p.result !== 'P');
  const pendingPredictions = predictions.filter(p => p.result === 'P');
  
  // Calculate summary stats
  const totalPredictions = predictions.length;
  const completedCount = completedPredictions.length;
  const correctCount = completedPredictions.filter(p => p.result === 'W').length;
  const totalPoints = completedPredictions.reduce((sum, p) => sum + p.points, 0);
  
  // Create compact prediction cards
  const predictionsHtml = predictions.map(pred => {
    const isCompleted = pred.result !== 'P';
    const isCorrect = pred.result === 'W';
    
    return `
      <div class="prediction-card ${isCompleted ? (isCorrect ? 'correct' : 'incorrect') : 'pending'}">
        <div class="prediction-header">
          <div class="prediction-teams">${pred.fixture}</div>
          <div class="prediction-league">${pred.league}</div>
        </div>
        
        <div class="prediction-content">
          <div class="prediction-pick">
            <span class="pick-icon">${getPickSymbol(pred.pick)}</span>
            <span class="pick-text">${getPickText(pred.pick)}</span>
          </div>
          
          <div class="prediction-status">
            ${isCompleted ? `
              <div class="status-result ${isCorrect ? 'correct' : 'incorrect'}">
                <span class="result-icon">${isCorrect ? '✓' : '✗'}</span>
                <span class="result-text">${isCorrect ? 'Correct' : 'Incorrect'}</span>
              </div>
              <div class="status-points">+${pred.points} pt</div>
            ` : `
              <div class="status-pending">
                <span class="pending-icon">⏳</span>
                <span class="pending-text">${pred.status}</span>
              </div>
            `}
          </div>
        </div>
        
        <div class="prediction-footer">
          <span class="prediction-time">${pred.date}</span>
        </div>
      </div>
    `;
  }).join('');
  
  predictionsContent.innerHTML = `
    <div class="user-predictions">
      <div class="user-header">
                 <div class="user-info">
           <div class="user-avatar">
             ${user.photoURL ? `<img src="${user.photoURL}" alt="${truncateUsername(user.displayName) || 'User'}" />` : '<span class="fallback-emoji">⚽</span>'}
           </div>
          <div class="user-details">
            <h3 class="user-name">${truncateUsername(user.displayName)}</h3>
            <div class="user-badges">
              ${user.favoriteTeam ? `
                <span class="badge team-badge" title="${user.favoriteTeam.name}">
                  <img src="${user.favoriteTeam.logoUrl || `https://media.api-sports.io/football/teams/${user.favoriteTeam.id}.png`}" 
                       alt="${user.favoriteTeam.name}" 
                       class="team-logo-tiny"
                       onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                  <span class="team-fallback" style="display: none;">🏆</span>
                </span>
              ` : ''}
              ${user.favoritePlayer ? `
                <span class="badge player-badge" title="${user.favoritePlayer.name}">
                  <img src="${user.favoritePlayer.photoUrl || `https://media.api-sports.io/football/players/${user.favoritePlayer.id}.png`}" 
                       alt="${user.favoritePlayer.name}" 
                       class="player-photo-tiny"
                       onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                  <span class="player-fallback" style="display: none;">⭐</span>
                </span>
              ` : ''}
            </div>
          </div>
        </div>
        
        <div class="week-summary">
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-value">${totalPredictions}</span>
              <span class="stat-label">Predictions</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${correctCount}</span>
              <span class="stat-label">Correct</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${totalPoints}</span>
              <span class="stat-label">Points</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="predictions-grid">
        ${predictionsHtml}
      </div>
    </div>
  `;
}

// getPickSymbol function removed - can be inlined where needed

// getPickText function removed - no longer needed

// Event listeners
// viewCompactBtn.addEventListener('click', () => setView('compact')); // Removed detailed view elements
// viewDetailedBtn.addEventListener('click', () => setView('detailed')); // Removed detailed view elements
// Modal event listeners removed - no longer needed

// View toggle event listeners
if (btnCompactView) {
  btnCompactView.addEventListener('click', () => setView('compact'));
}
if (btnDetailedView) {
  btnDetailedView.addEventListener('click', () => setView('detailed'));
}

// Week navigation event listeners
btnPrevWeek.addEventListener('click', goToPreviousWeek);
btnNextWeek.addEventListener('click', goToNextWeek);
btnCurrentWeek.addEventListener('click', goToCurrentWeek);

// Refresh button event listener
const btnRefresh = document.getElementById('btn-refresh');
if (btnRefresh) {
  btnRefresh.style.display = 'none';
  btnRefresh.addEventListener('click', refreshLeaderboard);
}

// Manual scoring trigger for testing
async function triggerManualScoring() {
  try {
    console.log('Triggering manual scoring...');
    const response = await fetch('/triggerScoring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Manual scoring result:', result);
      showSuccessMessage(`Manual scoring completed: ${result.updates} updates, ${result.points} points awarded`);
      
      // Refresh the leaderboard after scoring
      setTimeout(() => {
        refreshLeaderboard();
      }, 2000);
    } else {
      console.error('Manual scoring failed:', response.status);
      showErrorMessage('Manual scoring failed');
    }
  } catch (error) {
    console.error('Error triggering manual scoring:', error);
      showErrorMessage('Error triggering manual scoring');
    }
  }

// Debug function to check prediction status
async function debugPredictionStatus() {
  try {
    if (!currentWeekId) {
      console.log('No current week ID available');
      return;
    }
    
    const fixtures = await fetchFixturesForWeek(currentWeekId);
    console.log(`Debug: Found ${fixtures.length} fixtures for week ${currentWeekId}`);
    
    for (const fixture of fixtures) {
      const fixtureId = String(fixture.fixture.id);
      const status = fixture.fixture?.status?.short;
      const goals = fixture.goals;
      
      console.log(`Fixture ${fixtureId}: Status=${status}, Goals=${goals ? `${goals.home}-${goals.away}` : 'None'}`);
      
      // Check if fixture is finished
      if (goals && (status === 'FT' || status === 'AET' || status === 'PEN')) {
        console.log(`  -> Fixture ${fixtureId} is finished, should be scored`);
        
        // Check predictions for this fixture
        const { db, firestoreReady } = await import('./auth.js');
        const firestoreDb = await firestoreReady;
        
        if (firestoreDb) {
          const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
          const predictionRef = collection(firestoreDb, 'predictions', fixtureId, 'entries');
          const predictionSnapshot = await getDocs(predictionRef);
          
          console.log(`  -> Found ${predictionSnapshot.size} predictions for fixture ${fixtureId}`);
          
          predictionSnapshot.forEach(doc => {
            const prediction = doc.data();
            console.log(`    User ${doc.id}: awarded=${prediction.awarded}, points=${prediction.points}, correct=${prediction.correct}, pick=${prediction.pick}`);
          });
        }
      } else {
        console.log(`  -> Fixture ${fixtureId} is not finished yet`);
      }
    }
  } catch (error) {
    console.error('Error debugging prediction status:', error);
  }
}

// Add manual scoring button if it doesn't exist
const btnManualScoring = document.getElementById('btn-manual-scoring');
if (btnManualScoring) {
  btnManualScoring.style.display = 'none';
  btnManualScoring.addEventListener('click', triggerManualScoring);
}

// Add debug button if it doesn't exist
const btnDebug = document.getElementById('btn-debug');
if (btnDebug) {
  btnDebug.style.display = 'none';
  btnDebug.addEventListener('click', debugPredictionStatus);
}

// Modal backdrop click handler removed - no longer needed

// Initialize view and leaderboard
setView('detailed');
initializeLeaderboard();

// Listen for username changes
window.addEventListener('usernameChanged', (event) => {
  const { displayName } = event.detail;
  console.log('Username changed to:', displayName);
});


