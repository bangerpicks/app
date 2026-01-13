/* API-Football Client Facade — admin-curated fixtures only (no auto-detect) */
import { af } from './api-football.js';
import { db, firestoreReady } from './auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// Admin curates fixtures per weekend via the Admin page.

export function getWeekendRange(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay();
  const diffToFri = (5 - day + 7) % 7;
  const friday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToFri);
  const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2);
  const toISO = (x) => x.toISOString().slice(0, 10);
  return { from: toISO(friday), to: toISO(sunday) };
}

// Get the current week range (Monday to Sunday) that contains today
export function getCurrentWeekRange(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay();
  // Monday is 1, Sunday is 0, so we need to adjust
  const monday = day === 0 ? -6 : 1 - day;
  const mondayDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + monday);
  const sundayDate = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + 6);
  const toISO = (x) => x.toISOString().slice(0, 10);
  return { from: toISO(mondayDate), to: toISO(sundayDate) };
}

// Get the current weekend range (Friday to Sunday) that contains today or is upcoming
export function getCurrentWeekendRange(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay();
  
  // If today is Friday, Saturday, or Sunday, use this weekend
  if (day >= 5) {
    const friday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day - 5));
    const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2);
    const toISO = (x) => x.toISOString().slice(0, 10);
    return { from: toISO(friday), to: toISO(sunday) };
  } else {
    // If today is Monday-Thursday, use the upcoming weekend
    const diffToFri = 5 - day;
    const friday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToFri);
    const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2);
    const toISO = (x) => x.toISOString().slice(0, 10);
    return { from: toISO(friday), to: toISO(sunday) };
  }
}

// Get the most recent completed weekend
export function getLastCompletedWeekend(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay();
  
  // If today is Monday-Thursday, last weekend was 2-4 days ago
  if (day >= 1 && day <= 4) {
    const daysBack = day + 2; // Monday=3, Tuesday=4, Wednesday=5, Thursday=6
    const friday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysBack);
    const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2);
    const toISO = (x) => x.toISOString().slice(0, 10);
    return { from: toISO(friday), to: toISO(sunday) };
  } else if (day === 0) {
    // If today is Sunday, last weekend was last week
    const friday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
    const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2);
    const toISO = (x) => x.toISOString().slice(0, 10);
    return { from: toISO(friday), to: toISO(sunday) };
  } else {
    // If today is Friday or Saturday, last weekend was last week
    const friday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
    const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2);
    const toISO = (x) => x.toISOString().slice(0, 10);
    return { from: toISO(friday), to: toISO(sunday) };
  }
}

// Get the next week range (Monday to Sunday) from a given date
export function getNextWeekRange(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay();
  // Monday is 1, Sunday is 0, so we need to adjust
  const monday = day === 0 ? 1 : 8 - day; // Next Monday
  const mondayDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + monday);
  const sundayDate = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + 6);
  const toISO = (x) => x.toISOString().slice(0, 10);
  return { from: toISO(mondayDate), to: toISO(sundayDate) };
}

// Get the previous week range (Monday to Sunday) from a given date
export function getPreviousWeekRange(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay();
  // Monday is 1, Sunday is 0, so we need to adjust
  const monday = day === 0 ? -6 : -6 - day; // Previous Monday
  const mondayDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + monday);
  const sundayDate = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + 6);
  const toISO = (x) => x.toISOString().slice(0, 10);
  return { from: toISO(mondayDate), to: toISO(sundayDate) };
}

// Get the next week ID from a given week ID
export function getNextWeekId(weekId) {
  if (!weekId) return null;
  
  const [fromStr, toStr] = weekId.split('_');
  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);
  
  // For weekend ranges, add 7 days to get to the next weekend
  const nextFromDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextToDate = new Date(toDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const toISO = (x) => x.toISOString().slice(0, 10);
  return `${toISO(nextFromDate)}_${toISO(nextToDate)}`;
}

// Get the previous week ID from a given week ID
export function getPreviousWeekId(weekId) {
  if (!weekId) return null;
  
  const [fromStr, toStr] = weekId.split('_');
  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);
  
  // For weekend ranges, subtract 7 days to get to the previous weekend
  const prevFromDate = new Date(fromDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevToDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const toISO = (x) => x.toISOString().slice(0, 10);
  return `${toISO(prevFromDate)}_${toISO(prevToDate)}`;
}

// Get multiple previous week IDs for searching
export function getPreviousWeekIds(weekId, count = 8) {
  if (!weekId) return [];
  
  const weekIds = [];
  let currentWeekId = weekId;
  
  for (let i = 0; i < count; i++) {
    const prevWeekId = getPreviousWeekId(currentWeekId);
    if (!prevWeekId) break;
    
    weekIds.push(prevWeekId);
    currentWeekId = prevWeekId;
  }
  
  return weekIds;
}

// Get multiple next week IDs for searching
export function getNextWeekIds(weekId, count = 8) {
  if (!weekId) return [];
  
  const weekIds = [];
  let currentWeekId = weekId;
  
  for (let i = 0; i < count; i++) {
    const nextWeekId = getNextWeekId(currentWeekId);
    if (!nextWeekId) break;
    
    weekIds.push(nextWeekId);
    currentWeekId = nextWeekId;
  }
  
  return weekIds;
}

export function formatWeekDisplay(weekId) {
  if (!weekId) return 'Current Week';
  
  const [fromStr, toStr] = weekId.split('_');
  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };
  
  return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
}

// New function to get the week name from Firebase
export async function getWeekName(weekId) {
  if (!weekId) return 'Current Week';
  
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      console.warn('getWeekName: Firestore not ready, falling back to date format');
      return formatWeekDisplay(weekId);
    }
    
    // Try to get the week name from the weeks collection
    const weekRef = doc(firestoreDb, 'weeks', weekId);
    const weekSnap = await getDoc(weekRef);
    
    if (weekSnap.exists()) {
      const weekData = weekSnap.data();
      if (weekData.name && weekData.name.trim()) {
        console.log('getWeekName: Found week name:', weekData.name);
        return weekData.name;
      }
    }
    
    // Fallback to date format if no name found
    console.log('getWeekName: No week name found, using date format');
    return formatWeekDisplay(weekId);
    
  } catch (error) {
    console.warn('getWeekName: Error fetching week name:', error);
    // Fallback to date format on error
    return formatWeekDisplay(weekId);
  }
}

export async function fetchWeekendTop10() {
  let weekId;
  
  try {
    console.log('fetchWeekendTop10: Starting...');
    
    // Check if user is authenticated first
    const { auth, currentUser } = await import('./auth.js');
    const user = currentUser();
    if (!user) {
      console.error('fetchWeekendTop10: No authenticated user found');
      return [];
    }
    
    // Check if user's token is still valid
    try {
      await user.getIdToken(false);
      console.log('fetchWeekendTop10: User token is valid');
    } catch (tokenError) {
      console.error('fetchWeekendTop10: User token error:', tokenError);
      if (tokenError.code === 'auth/user-token-expired') {
        console.error('fetchWeekendTop10: User token expired, cannot access Firestore');
        return [];
      }
    }
    
    const firestoreDb = await firestoreReady;
    console.log('fetchWeekendTop10: Firestore ready:', !!firestoreDb);
    
    if (!firestoreDb) {
      console.error('Firestore database not initialized');
      return [];
    }
    
    // First, check if admin has set a specific dashboard week
    const settingsRef = doc(firestoreDb, 'settings', 'app');
    console.log('fetchWeekendTop10: Checking settings...');
    const settingsSnap = await getDoc(settingsRef);
    console.log('fetchWeekendTop10: Settings exists:', settingsSnap.exists());
    
    if (settingsSnap.exists()) {
      const currentDashboardWeek = settingsSnap.data()?.currentDashboardWeek;
      if (currentDashboardWeek) {
        weekId = currentDashboardWeek;
        console.log('Using admin-selected dashboard week:', weekId);
      }
    }
    
    // If no admin week set, fall back to auto-calculated weekend
    if (!weekId) {
      const { from, to } = getWeekendRange();
      weekId = `${from}_${to}`;
      console.log('Using auto-calculated weekend:', weekId);
    }
    
    // Try curated list for the determined week
    const curatedRef = doc(firestoreDb, 'weeklySelections', weekId);
    console.log('fetchWeekendTop10: Checking weeklySelections for week:', weekId);
    const curatedSnap = await getDoc(curatedRef);
    console.log('fetchWeekendTop10: Curated exists:', curatedSnap.exists());
    
    if (curatedSnap.exists()) {
      const fixtureIds = curatedSnap.data()?.fixtureIds || [];
      console.log('fetchWeekendTop10: Found fixture IDs:', fixtureIds);
      
      if (Array.isArray(fixtureIds) && fixtureIds.length > 0) {
        const uniqueIds = [...new Set(fixtureIds.map(String))];
        console.log('fetchWeekendTop10: Fetching fixtures for IDs:', uniqueIds);
        
        // API-Football supports multiple ids via repeated query params
        // API-FOOTBALL expects multiple fixture ids via `ids=1-2-3` (hyphen-separated),
        // not repeated `id` params. Using `ids` ensures we fetch all selected fixtures.
        const dataMulti = await af.get('/fixtures', { ids: uniqueIds.join('-') });
        console.log('fetchWeekendTop10: API response:', dataMulti);
        
        // Additional deduplication to ensure no duplicate fixtures in response
        const responseFixtures = dataMulti.response || [];
        const seenFixtureIds = new Set();
        const deduplicatedFixtures = responseFixtures.filter(fixture => {
          const fixtureId = String(fixture.fixture.id);
          if (seenFixtureIds.has(fixtureId)) {
            console.warn(`Duplicate fixture ID ${fixtureId} found in API response, filtering out`);
            return false;
          }
          seenFixtureIds.add(fixtureId);
          return true;
        });
        
        const fixtures = deduplicatedFixtures
          .sort((a, b) => new Date(a.fixture.date) - new Date(a.fixture.date))
          .slice(0, 10);
        
        console.log('fetchWeekendTop10: Returning fixtures:', fixtures.length);
        return fixtures;
      }
    }
    
    console.log('fetchWeekendTop10: No curated selection found, returning empty array');
    return [];
    
  } catch (error) {
    console.error('Error fetching weekend fixtures:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // Handle specific Firebase errors
    if (error.code === 'permission-denied') {
      console.error('Firestore permission denied - user may not be authenticated or token expired');
    } else if (error.code === 'unauthenticated') {
      console.error('User is not authenticated');
    } else if (error.code === 'auth/user-token-expired') {
      console.error('User authentication token has expired');
    } else if (error.code === 'auth/network-request-failed') {
      console.error('Network request failed - check internet connection');
    }
    
    return [];
  }
}

export async function fetchFixturesForWeek(weekId) {
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      console.error('Firestore database not initialized');
      return [];
    }
    
    // Try curated list for the specified week
    const curatedRef = doc(firestoreDb, 'weeklySelections', weekId);
    const curatedSnap = await getDoc(curatedRef);
    if (curatedSnap.exists()) {
      const fixtureIds = curatedSnap.data()?.fixtureIds || [];
      if (Array.isArray(fixtureIds) && fixtureIds.length > 0) {
        const uniqueIds = [...new Set(fixtureIds.map(String))];
        const dataMulti = await af.get('/fixtures', { ids: uniqueIds.join('-') });
        
        // Additional deduplication to ensure no duplicate fixtures in response
        const responseFixtures = dataMulti.response || [];
        const seenFixtureIds = new Set();
        const deduplicatedFixtures = responseFixtures.filter(fixture => {
          const fixtureId = String(fixture.fixture.id);
          if (seenFixtureIds.has(fixtureId)) {
            console.warn(`Duplicate fixture ID ${fixtureId} found in API response, filtering out`);
            return false;
          }
          seenFixtureIds.add(fixtureId);
          return true;
        });
        
        const fixtures = deduplicatedFixtures
          .sort((a, b) => new Date(a.fixture.date) - new Date(a.fixture.date))
          .slice(0, 10);
        return fixtures;
      }
    }
  } catch (error) {
    console.error('Error fetching fixtures for week:', error);
  }

  // No curated selection found for this week
  return [];
}

export async function fetchFixtureResult(fixtureId) {
  const data = await af.get('/fixtures', { id: fixtureId });
  return data.response?.[0];
}

export function decideWinnerSymbol(fix) {
  const goals = fix?.goals;
  const status = fix?.fixture?.status?.short;
  if (!goals || (status !== 'FT' && status !== 'AET' && status !== 'PEN')) return null;
  const h = goals.home ?? 0;
  const a = goals.away ?? 0;
  if (h > a) return 'H';
  if (h < a) return 'A';
  return 'D';
}

export async function getCurrentDashboardWeekId() {
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      console.error('Firestore database not initialized');
      return null;
    }
    
    // Check if admin has set a specific dashboard week
    const settingsRef = doc(firestoreDb, 'settings', 'app');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      const currentDashboardWeek = settingsSnap.data()?.currentDashboardWeek;
      console.log('getCurrentDashboardWeekId: Settings document exists, currentDashboardWeek:', currentDashboardWeek);
      if (currentDashboardWeek) {
        console.log('getCurrentDashboardWeekId: Returning admin-set week:', currentDashboardWeek);
        return currentDashboardWeek;
      }
    } else {
      console.log('getCurrentDashboardWeekId: Settings document does not exist');
    }
    
    // If no admin week set, determine the most appropriate current week
    const now = new Date();
    const day = now.getDay();
    
    let currentWeek;
    
    // Logic to determine the most appropriate "current week"
    if (day >= 5) {
      // Friday, Saturday, Sunday - use this weekend
      currentWeek = getCurrentWeekendRange(now);
    } else if (day >= 1 && day <= 4) {
      // Monday-Thursday - check if we're closer to last weekend or next weekend
      const lastWeekend = getLastCompletedWeekend(now);
      const nextWeekend = getCurrentWeekendRange(now);
      
      // Calculate days since last weekend and days until next weekend
      const lastWeekendEnd = new Date(lastWeekend.to);
      const nextWeekendStart = new Date(nextWeekend.from);
      const daysSinceLast = Math.floor((now - lastWeekendEnd) / (1000 * 60 * 60 * 24));
      const daysUntilNext = Math.floor((nextWeekendStart - now) / (1000 * 60 * 60 * 24));
      
      // Use the closer weekend
      if (daysSinceLast <= daysUntilNext) {
        currentWeek = lastWeekend;
      } else {
        currentWeek = nextWeekend;
      }
    } else {
      // Sunday - use the weekend that just ended
      currentWeek = getLastCompletedWeekend(now);
    }
    
    const fallbackWeek = `${currentWeek.from}_${currentWeek.to}`;
    console.log('getCurrentDashboardWeekId: No admin week set, using calculated week:', fallbackWeek);
    console.log('getCurrentDashboardWeekId: Week details:', {
      day: day,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
      from: currentWeek.from,
      to: currentWeek.to
    });
    
    return fallbackWeek;
  } catch (error) {
    console.error('Error getting current dashboard week ID:', error);
    // Fall back to calculated weekend
    const currentWeek = getCurrentWeekendRange();
    const fallbackWeek = `${currentWeek.from}_${currentWeek.to}`;
    console.log('getCurrentDashboardWeekId: Error occurred, using fallback:', fallbackWeek);
    return fallbackWeek;
  }
}