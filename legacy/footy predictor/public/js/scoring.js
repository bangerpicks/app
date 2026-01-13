/*
  Scoring & Firestore schema — scoring.js
  Firestore collections used:
    users/{uid} → { displayName, points }
    predictions/{fixtureId}/entries/{uid} → { pick: 'H'|'D'|'A', awarded: boolean, points: number, ts }

  Functions:
    savePredictions(uid, choices)
    watchRankings(cb)
    checkAndAwardForUser(uid)
*/

import { db, isFirestoreReady, firestoreReady } from './auth.js';
import {
  doc, setDoc, serverTimestamp, collection, onSnapshot,
  getDoc, updateDoc, increment, query, orderBy, limit, getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { fetchFixtureResult, decideWinnerSymbol } from './api.js';

export async function savePredictions(uid, choices, fixturesData = null) {
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      console.error('Firestore database not initialized');
      throw new Error('Database not available');
    }
    
    // Verify authentication state before proceeding
    const { currentUser } = await import('./auth.js');
    const user = currentUser();
    if (!user || user.uid !== uid) {
      throw new Error('Authentication state mismatch');
    }
    
    const batch = [];
    for (const [fixtureId, pick] of Object.entries(choices)) {
      const ref = doc(firestoreDb, 'predictions', String(fixtureId), 'entries', uid);
      // Ensure parent document exists so security rules permit subcollection writes
      const parentRef = doc(firestoreDb, 'predictions', String(fixtureId));
      batch.push(setDoc(parentRef, { exists: true }, { merge: true }));
      
      // Enhanced entry data with team information
      const entryData = { 
        pick, 
        awarded: false, 
        points: 0, 
        ts: serverTimestamp() 
      };
      
      // Add team and fixture information if available
      if (fixturesData && fixturesData[fixtureId]) {
        const fixture = fixturesData[fixtureId];
        entryData.homeTeam = {
          id: fixture.teams?.home?.id || null,
          name: fixture.teams?.home?.name || 'Unknown',
          logo: fixture.teams?.home?.logo || ''
        };
        entryData.awayTeam = {
          id: fixture.teams?.away?.id || null,
          name: fixture.teams?.away?.name || 'Unknown',
          logo: fixture.teams?.away?.logo || ''
        };
        entryData.league = {
          id: fixture.league?.id || null,
          name: fixture.league?.name || 'Unknown',
          country: fixture.league?.country || 'Unknown'
        };
        entryData.fixtureDate = fixture.fixture?.date || null;
        entryData.status = fixture.fixture?.status?.short || 'NS';
        
        // Add result if available
        if (fixture.goals && typeof fixture.goals.home === 'number' && typeof fixture.goals.away === 'number') {
          entryData.result = {
            homeGoals: fixture.goals.home,
            awayGoals: fixture.goals.away
          };
        }
      }
      
      batch.push(setDoc(ref, entryData, { merge: true }));
    }
    
    console.log(`Saving ${batch.length} predictions for user ${uid}`);
    await Promise.all(batch);
    console.log('All predictions saved successfully');
  } catch (error) {
    console.error('savePredictions: Error saving predictions:', error);
    
    // Provide more specific error information
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check your authentication status.');
    } else if (error.code === 'unauthenticated') {
      throw new Error('User not authenticated. Please log in again.');
    } else if (error.code === 'not-found') {
      throw new Error('Database not found. Please check your configuration.');
    } else if (error.message && error.message.includes('collection()')) {
      throw new Error('Database connection error. Please refresh the page.');
    }
    
    throw error;
  }
}

export async function watchRankings(cb) {
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      console.error('watchRankings: Firestore database not initialized');
      return () => {}; // Return no-op unsubscribe function
    }
    
    // Allow both authenticated and anonymous users to view rankings
    const { currentUser } = await import('./auth.js');
    const user = currentUser();
    const userType = user ? 'authenticated' : 'anonymous';
    
    console.log(`watchRankings: Firestore is ready, setting up rankings listener for ${userType} user`);
    const q = query(collection(firestoreDb, 'users'), orderBy('points', 'desc'), limit(50));
    return onSnapshot(q, async (snap) => {
      const rows = [];
      const userPromises = snap.docs.map(async (d) => {
        const userData = d.data();
        const uid = d.id;
        
        // Get user stats for enhanced leaderboard data
        try {
          const stats = await getUserStats(uid);
          return { 
            id: uid, 
            ...userData,
            totalPredictions: stats.totalPredictions,
            correctPredictions: stats.correctPredictions,
            accuracy: stats.accuracy
          };
        } catch (error) {
          console.error(`Error getting stats for user ${uid}:`, error);
          return { 
            id: uid, 
            ...userData,
            totalPredictions: 0,
            correctPredictions: 0,
            accuracy: 0
          };
        }
      });
      
      const enhancedRows = await Promise.all(userPromises);
      cb(enhancedRows);
    }, (error) => {
      // Handle snapshot errors
      console.error('watchRankings: Snapshot error:', error);
      if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
        console.log('watchRankings: Authentication error, rankings listener will be retried on next auth change');
      }
    });
  } catch (error) {
    console.error('watchRankings: Error setting up rankings listener:', error);
    
    // Provide more specific error information
    if (error.code === 'permission-denied') {
      console.error('watchRankings: Permission denied. User may not have access to rankings.');
    } else if (error.code === 'unauthenticated') {
      console.error('watchRankings: User not authenticated.');
    } else if (error.code === 'not-found') {
      console.error('watchRankings: Database not found.');
    }
    
    return () => {}; // Return no-op unsubscribe function
  }
}

/**
 * Ensures a user document exists in Firestore with the given displayName.
 * This function is the SINGLE source of truth for user document creation/updates.
 * It prevents duplicate user creation when users sign in on multiple devices.
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {string} displayName - The user's display name
 * @returns {Promise<void>}
 */
// Function to sync user favorites from localStorage to Firestore
export async function syncUserFavorites(uid) {
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      console.error('syncUserFavorites: Firestore database not initialized');
      return;
    }
    
    // Get favorites from localStorage
    const savedTeam = localStorage.getItem('favoriteTeam');
    const savedPlayer = localStorage.getItem('favoritePlayer');
    
    if (!savedTeam && !savedPlayer) {
      return; // No favorites to sync
    }
    
    const uref = doc(firestoreDb, 'users', uid);
    const updates = {};
    
    if (savedTeam) {
      try {
        const team = JSON.parse(savedTeam);
        updates.favoriteTeam = team;
      } catch (error) {
        console.error('Error parsing saved team:', error);
      }
    }
    
    if (savedPlayer) {
      try {
        const player = JSON.parse(savedPlayer);
        updates.favoritePlayer = player;
      } catch (error) {
        console.error('Error parsing saved player:', error);
      }
    }
    
    if (Object.keys(updates).length > 0) {
      updates.lastUpdated = serverTimestamp();
      await setDoc(uref, updates, { merge: true });
      console.log(`User favorites synced for ${uid}`);
    }
  } catch (error) {
    console.error(`syncUserFavorites: Error syncing favorites for ${uid}:`, error);
  }
}

export async function ensureUserDoc(uid, displayName, photoURL = null) {
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      console.error('Firestore database not initialized');
      throw new Error('Database not available');
    }
    
    // Verify authentication state before proceeding
    const { currentUser } = await import('./auth.js');
    const user = currentUser();
    if (!user || user.uid !== uid) {
      throw new Error('Authentication state mismatch');
    }
  
    const uref = doc(firestoreDb, 'users', uid);
    
    // First check if user exists to determine if this is a creation or update
    const existingDoc = await getDoc(uref);
    
    if (!existingDoc.exists()) {
      // Creating new user - set initial values
      console.log(`Creating new user document for ${uid}`);
      await setDoc(uref, { 
        displayName: displayName || 'Player', 
        points: 0,
        photoURL: user.photoURL || '⚽',
        favoriteTeam: null,
        favoritePlayer: null,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      console.log(`New user document created for ${uid}`);
    } else {
      // User exists - update profile data if available
      const currentData = existingDoc.data();
      const updates = {};
      
      if (currentData.displayName !== displayName) {
        updates.displayName = displayName || 'Player';
      }
      
      // Update profile icon if it changed
      if (photoURL && currentData.photoURL !== photoURL) {
        updates.photoURL = photoURL;
      } else if (currentData.photoURL !== user.photoURL) {
        updates.photoURL = user.photoURL || '⚽';
      }
      
      // Update timestamp
      updates.lastUpdated = serverTimestamp();
      
      if (Object.keys(updates).length > 0) {
        console.log(`Updating user document for ${uid}`);
        await setDoc(uref, updates, { merge: true });
        console.log(`User document updated for ${uid}`);
      } else {
        console.log(`User document already up to date for ${uid}`);
      }
    }
  } catch (error) {
    console.error(`ensureUserDoc: Error ensuring user document for ${uid}:`, error);
    
    // Provide more specific error information
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check your authentication status.');
    } else if (error.code === 'unauthenticated') {
      throw new Error('User not authenticated. Please log in again.');
    } else if (error.code === 'not-found') {
      throw new Error('Database not found. Please check your configuration.');
    } else if (error.message && error.message.includes('collection()')) {
      throw new Error('Database connection error. Please refresh the page.');
    }
    
    throw error;
  }
}

export async function checkAndAwardForUser(uid) {
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      console.error('Firestore database not initialized');
      throw new Error('Database not available');
    }
    
    // Find all predictions for this user (across fixtures)
    // Then fetch each fixture result, compare, and award once.
    const predRoot = collection(firestoreDb, 'predictions');
    const predSnaps = await getDocs(predRoot);
    const updates = [];

    for (const predDoc of predSnaps.docs) {
      const fixtureId = predDoc.id;
      const entryRef = doc(firestoreDb, 'predictions', fixtureId, 'entries', uid);
      const entrySnap = await getDoc(entryRef);
      if (!entrySnap.exists()) continue;
      const entry = entrySnap.data();
      if (entry.awarded) continue;

      // Fetch result from API-Football
      const full = await fetchFixtureResult(fixtureId);
      const winner = decideWinnerSymbol(full);
      if (!winner) continue; // not finished yet

      const gotPoint = winner === entry.pick ? 1 : 0;

      // Enhanced update with result information and fixture details
      const updateData = { 
        awarded: true, 
        points: gotPoint,
        correct: gotPoint > 0, // Add correct field for consistency
        status: full.fixture?.status?.short || 'FT',
        // Add/update fixture details from the fetched full data
        homeTeam: {
          id: full.teams?.home?.id || null,
          name: full.teams?.home?.name || 'Unknown',
          logo: full.teams?.home?.logo || ''
        },
        awayTeam: {
          id: full.teams?.away?.id || null,
          name: full.teams?.away?.name || 'Unknown',
          logo: full.teams?.away?.logo || ''
        },
        league: {
          id: full.league?.id || null,
          name: full.league?.name || 'Unknown',
          country: full.league?.country || 'Unknown'
        },
        fixtureDate: full.fixture?.date || null,
        // Add result if available
        result: full.goals && typeof full.goals.home === 'number' && typeof full.goals.away === 'number' ? {
          homeGoals: full.goals.home,
          awayGoals: full.goals.away
        } : null
      };

      // Mark awarded and increment user points if correct
      updates.push(updateDoc(entryRef, updateData));
      if (gotPoint) {
        const uref = doc(firestoreDb, 'users', uid);
        updates.push(updateDoc(uref, { points: increment(1) }));
      }
    }

    await Promise.all(updates);
  } catch (error) {
    console.error('checkAndAwardForUser: Error checking and awarding for user:', error);
    throw error;
  }
}

/**
 * Fetch existing predictions for a user across a list of fixtureIds.
 * Returns a map-like plain object: { [fixtureId: string]: 'H'|'D'|'A' }
 */
export async function getPredictionsForUserFixtures(uid, fixtureIds) {
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      console.error('Firestore database not initialized');
      return {};
    }
    
    const results = {};
    const tasks = (fixtureIds || []).map(async (fid) => {
      const id = String(fid);
      const ref = doc(firestoreDb, 'predictions', id, 'entries', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const pick = snap.data()?.pick;
        if (pick === 'H' || pick === 'D' || pick === 'A') {
          results[id] = pick;
        }
      }
    });
    await Promise.all(tasks);
    return results;
  } catch (error) {
    console.error('getPredictionsForUserFixtures: Error fetching predictions:', error);
    return {};
  }
}

/**
 * Fetch detailed predictions for a specific user with fixture information.
 * Returns an array of prediction objects with full details.
 */
export async function getUserDetailedPredictions(uid) {
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      console.error('Firestore database not initialized');
      return [];
    }
    
    const predictions = [];
    
    // Get all predictions collections
    const predRoot = collection(firestoreDb, 'predictions');
    const predSnaps = await getDocs(predRoot);
    
    // For each fixture, check if user has a prediction
    for (const predDoc of predSnaps.docs) {
      const fixtureId = predDoc.id;
      const entryRef = doc(firestoreDb, 'predictions', fixtureId, 'entries', uid);
      const entrySnap = await getDoc(entryRef);
      
      if (entrySnap.exists()) {
        const entry = entrySnap.data();
        if (entry.pick && (entry.pick === 'H' || entry.pick === 'D' || entry.pick === 'A')) {
          // Create prediction object
          const prediction = {
            fixtureId: fixtureId,
            pick: entry.pick,
            awarded: entry.awarded || false,
            points: entry.points || 0,
            timestamp: entry.ts,
            homeTeam: entry.homeTeam || null,
            awayTeam: entry.awayTeam || null,
            league: entry.league || null,
            fixtureDate: entry.fixtureDate || null,
            status: entry.status || 'NS',
            result: entry.result || null
          };
          
                  // Determine if prediction was correct
        if (entry.awarded && entry.result) {
          // Convert stored result format to match decideWinnerSymbol expectations
          const fixtureData = {
            goals: {
              home: entry.result.homeGoals,
              away: entry.result.awayGoals
            },
            fixture: {
              status: { short: entry.status }
            }
          };
          const winner = decideWinnerSymbol(fixtureData);
          prediction.correct = winner === entry.pick;
          prediction.actualResult = winner;
        }
          
          predictions.push(prediction);
        }
      }
    }
    
    // Sort by timestamp (most recent first)
    predictions.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return b.timestamp.toDate() - a.timestamp.toDate();
      }
      return 0;
    });
    
    return predictions;
  } catch (error) {
    console.error('getUserDetailedPredictions: Error fetching detailed predictions:', error);
    return [];
  }
}

/**
 * Get user statistics including total predictions and accuracy.
 * Returns an object with stats for the leaderboard.
 */
export async function getUserStats(uid) {
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      console.error('Firestore database not initialized');
      return { totalPredictions: 0, correctPredictions: 0, accuracy: 0 };
    }
    
    const predictions = await getUserDetailedPredictions(uid);
    const totalPredictions = predictions.length;
    const correctPredictions = predictions.filter(p => p.correct === true).length;
    const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
    
    return {
      totalPredictions,
      correctPredictions,
      accuracy: Math.round(accuracy)
    };
  } catch (error) {
    console.error('getUserStats: Error calculating user stats:', error);
    return { totalPredictions: 0, correctPredictions: 0, accuracy: 0 };
  }
}