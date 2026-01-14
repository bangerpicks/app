/**
 * Admin Firestore operations for gameweek management and caching
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore'
import { db } from './firebase'
import { APIFootballFixture } from './api-football'

/**
 * Generate cache key for fixture search
 * Simple hash function for browser compatibility
 */
function generateCacheKey(from: string, to: string, league?: number): string {
  const key = `${from}-${to}-${league || 'all'}`
  // Simple hash function
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Get cached fixture search results
 * 
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @param league - Optional league ID
 * @returns Cached fixtures or null if not found
 */
export async function getCachedFixtureSearch(
  from: string,
  to: string,
  league?: number
): Promise<APIFootballFixture[] | null> {
  try {
    console.log('[admin] getCachedFixtureSearch called:', { from, to, league })
    const cacheKey = generateCacheKey(from, to, league)
    console.log('[admin] Generated cache key:', cacheKey)
    
    const cacheDoc = await getDoc(doc(db, 'fixture_searches', cacheKey))
    console.log('[admin] Cache document exists:', cacheDoc.exists())
    
    if (cacheDoc.exists()) {
      const data = cacheDoc.data()
      console.log('[admin] Cache data found:', {
        hasFixtures: !!data.fixtures,
        fixturesCount: data.fixtures?.length || 0,
        cachedAt: data.cachedAt,
      })
      
      // Check if cache is still valid (24 hours)
      const cachedAt = data.cachedAt?.toMillis() || 0
      const now = Date.now()
      const cacheAge = now - cachedAt
      const cacheExpiry = 24 * 60 * 60 * 1000 // 24 hours
      
      console.log('[admin] Cache age check:', {
        cachedAt,
        now,
        cacheAge,
        cacheExpiry,
        isValid: cacheAge < cacheExpiry,
        ageInHours: (cacheAge / (60 * 60 * 1000)).toFixed(2),
      })
      
      if (cacheAge < cacheExpiry) {
        console.log('[admin] Returning cached fixtures:', data.fixtures?.length || 0)
        return data.fixtures || null
      } else {
        console.log('[admin] Cache expired, returning null')
      }
    } else {
      console.log('[admin] No cache document found')
    }
    
    return null
  } catch (error) {
    console.error('[admin] Error getting cached fixture search:', error)
    return null
  }
}

/**
 * Save fixture search results to cache
 * 
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @param league - Optional league ID
 * @param fixtures - Fixtures to cache
 */
export async function saveCachedFixtureSearch(
  from: string,
  to: string,
  league: number | undefined,
  fixtures: APIFootballFixture[]
): Promise<void> {
  try {
    console.log('[admin] saveCachedFixtureSearch called:', {
      from,
      to,
      league,
      fixturesCount: fixtures.length,
    })
    const cacheKey = generateCacheKey(from, to, league)
    console.log('[admin] Saving to cache with key:', cacheKey)
    
    await setDoc(doc(db, 'fixture_searches', cacheKey), {
      from,
      to,
      league: league || null,
      fixtures,
      cachedAt: Timestamp.now(),
    })
    console.log('[admin] Successfully saved to cache')
  } catch (error) {
    console.error('[admin] Error saving cached fixture search:', error)
    // Don't throw - caching is not critical
  }
}

/**
 * Admin gameweek data structure
 */
export interface AdminGameweekData {
  gameweekId: string
  name: string
  description?: string
  startDate: Timestamp
  endDate: Timestamp
  deadline: Timestamp
  status: 'draft' | 'active' | 'completed' | 'archived'
  fixtureIds: number[]
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  forceOpenForTesting?: boolean
}

/**
 * Gameweek fixture subcollection data
 */
export interface GameweekFixtureData {
  fixtureId: number
  fixture: APIFootballFixture
  teams: {
    home: {
      id: number
      name: string
      logo: string
    }
    away: {
      id: number
      name: string
      logo: string
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
  }
  addedBy: string
  addedAt: Timestamp
}

/**
 * Input data for creating a gameweek
 */
export interface CreateGameweekData {
  name: string
  description?: string
  startDate: Date
  endDate: Date
  deadline: Date
  status: 'draft' | 'active' | 'completed' | 'archived'
  fixtureIds: number[]
  createdBy: string
  forceOpenForTesting?: boolean
}

/**
 * Create a new gameweek
 * 
 * @param data - Gameweek data
 * @returns Gameweek ID
 */
export async function createGameweek(data: CreateGameweekData): Promise<string> {
  try {
    // Validate
    if (!data.name || data.name.trim() === '') {
      throw new Error('Gameweek name is required')
    }
    if (data.fixtureIds.length === 0 || data.fixtureIds.length > 10) {
      throw new Error('Gameweek must have between 1 and 10 fixtures')
    }

    // Generate gameweek ID
    const gameweekId = `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const now = Timestamp.now()
    const gameweekData: AdminGameweekData = {
      gameweekId,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      startDate: Timestamp.fromDate(data.startDate),
      endDate: Timestamp.fromDate(data.endDate),
      deadline: Timestamp.fromDate(data.deadline),
      status: data.status,
      fixtureIds: data.fixtureIds,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
      forceOpenForTesting: data.forceOpenForTesting,
    }

    await setDoc(doc(db, 'gameweeks', gameweekId), gameweekData)
    return gameweekId
  } catch (error) {
    console.error('Error creating gameweek:', error)
    throw error
  }
}

/**
 * Update an existing gameweek
 * 
 * @param gameweekId - Gameweek ID
 * @param updates - Partial gameweek data to update
 */
export async function updateGameweek(
  gameweekId: string,
  updates: Partial<Omit<CreateGameweekData, 'createdBy'>> & { fixtureIds?: number[] }
): Promise<void> {
  try {
    const gameweekRef = doc(db, 'gameweeks', gameweekId)
    const gameweekDoc = await getDoc(gameweekRef)
    
    if (!gameweekDoc.exists()) {
      throw new Error('Gameweek not found')
    }

    const updateData: any = {
      updatedAt: Timestamp.now(),
    }

    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim() === '') {
        throw new Error('Gameweek name is required')
      }
      updateData.name = updates.name.trim()
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description?.trim() || ''
    }

    if (updates.startDate !== undefined) {
      updateData.startDate = Timestamp.fromDate(updates.startDate)
    }

    if (updates.endDate !== undefined) {
      updateData.endDate = Timestamp.fromDate(updates.endDate)
    }

    if (updates.deadline !== undefined) {
      updateData.deadline = Timestamp.fromDate(updates.deadline)
    }

    if (updates.status !== undefined) {
      updateData.status = updates.status
    }

    if (updates.fixtureIds !== undefined) {
      if (updates.fixtureIds.length === 0 || updates.fixtureIds.length > 10) {
        throw new Error('Gameweek must have between 1 and 10 fixtures')
      }
      updateData.fixtureIds = updates.fixtureIds
    }

    if (updates.forceOpenForTesting !== undefined) {
      updateData.forceOpenForTesting = updates.forceOpenForTesting
    }

    await updateDoc(gameweekRef, updateData)
  } catch (error) {
    console.error('Error updating gameweek:', error)
    throw error
  }
}

/**
 * Delete a gameweek and its fixtures subcollection
 * 
 * @param gameweekId - Gameweek ID
 */
export async function deleteGameweek(gameweekId: string): Promise<void> {
  try {
    const batch = writeBatch(db)
    
    // Delete all fixtures in subcollection
    const fixturesRef = collection(db, 'gameweeks', gameweekId, 'fixtures')
    const fixturesSnapshot = await getDocs(fixturesRef)
    
    fixturesSnapshot.forEach((fixtureDoc) => {
      batch.delete(fixtureDoc.ref)
    })
    
    // Delete gameweek document
    batch.delete(doc(db, 'gameweeks', gameweekId))
    
    await batch.commit()
  } catch (error) {
    console.error('Error deleting gameweek:', error)
    throw error
  }
}

/**
 * Get all gameweeks with optional filters
 * 
 * @param filters - Optional filters
 * @returns Array of gameweeks
 */
export async function getAllGameweeks(filters?: {
  status?: 'draft' | 'active' | 'completed' | 'archived'
  sortBy?: 'date' | 'name'
  sortOrder?: 'asc' | 'desc'
}): Promise<AdminGameweekData[]> {
  try {
    const constraints: QueryConstraint[] = []
    
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status))
    }
    
    if (filters?.sortBy === 'date') {
      constraints.push(orderBy('startDate', filters.sortOrder || 'desc'))
    } else if (filters?.sortBy === 'name') {
      constraints.push(orderBy('name', filters.sortOrder || 'asc'))
    } else {
      // Default: sort by date descending
      constraints.push(orderBy('startDate', 'desc'))
    }
    
    const q = query(collection(db, 'gameweeks'), ...constraints)
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      gameweekId: doc.id,
    })) as AdminGameweekData[]
  } catch (error) {
    console.error('Error getting gameweeks:', error)
    throw error
  }
}

/**
 * Get a single gameweek by ID
 * 
 * @param gameweekId - Gameweek ID
 * @returns Gameweek data or null if not found
 */
export async function getGameweekById(
  gameweekId: string
): Promise<AdminGameweekData | null> {
  try {
    const gameweekDoc = await getDoc(doc(db, 'gameweeks', gameweekId))
    
    if (!gameweekDoc.exists()) {
      return null
    }
    
    return {
      ...gameweekDoc.data(),
      gameweekId: gameweekDoc.id,
    } as AdminGameweekData
  } catch (error) {
    console.error('Error getting gameweek:', error)
    throw error
  }
}

/**
 * Get the active gameweek (status: 'active')
 * 
 * @returns Active gameweek data or null if none found
 */
export async function getActiveGameweek(): Promise<AdminGameweekData | null> {
  try {
    const q = query(
      collection(db, 'gameweeks'),
      where('status', '==', 'active'),
      orderBy('startDate', 'desc')
    )
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return null
    }
    
    // Return the first (most recent) active gameweek
    const doc = snapshot.docs[0]
    return {
      ...doc.data(),
      gameweekId: doc.id,
    } as AdminGameweekData
  } catch (error) {
    console.error('Error getting active gameweek:', error)
    throw error
  }
}

/**
 * Force open the active gameweek for testing (allows predictions even during live matches)
 * 
 * @param forceOpen - Whether to force open (true) or restore normal deadline logic (false)
 */
export async function forceOpenActiveGameweek(forceOpen: boolean): Promise<void> {
  try {
    const activeGameweek = await getActiveGameweek()
    if (!activeGameweek) {
      throw new Error('No active gameweek found')
    }
    
    await updateGameweek(activeGameweek.gameweekId, {
      forceOpenForTesting: forceOpen,
    })
  } catch (error) {
    console.error('Error forcing open active gameweek:', error)
    throw error
  }
}

/**
 * Save fixtures to gameweek subcollection
 * 
 * @param gameweekId - Gameweek ID
 * @param fixtures - Array of fixtures to save
 */
export async function saveGameweekFixtures(
  gameweekId: string,
  fixtures: APIFootballFixture[],
  addedBy: string
): Promise<void> {
  try {
    // Get existing fixtures to find ones that need to be deleted
    const fixturesRef = collection(db, 'gameweeks', gameweekId, 'fixtures')
    const existingSnapshot = await getDocs(fixturesRef)
    
    // Create a Set of new fixture IDs for quick lookup
    const newFixtureIds = new Set(fixtures.map((f) => f.fixture.id))
    
    // Prepare batch for all operations
    const batch = writeBatch(db)
    const now = Timestamp.now()
    
    // Delete fixtures that are no longer in the new list
    existingSnapshot.forEach((docSnapshot) => {
      const fixtureData = docSnapshot.data()
      const fixtureId = fixtureData.fixtureId
      
      if (!newFixtureIds.has(fixtureId)) {
        // This fixture was removed, delete it
        batch.delete(docSnapshot.ref)
      }
    })
    
    // Add or update fixtures in the new list
    fixtures.forEach((fixture) => {
      const fixtureData: GameweekFixtureData = {
        fixtureId: fixture.fixture.id,
        fixture,
        teams: {
          home: {
            id: fixture.teams.home.id,
            name: fixture.teams.home.name,
            logo: fixture.teams.home.logo,
          },
          away: {
            id: fixture.teams.away.id,
            name: fixture.teams.away.name,
            logo: fixture.teams.away.logo,
          },
        },
        league: {
          id: fixture.league.id,
          name: fixture.league.name,
          country: fixture.league.country,
          logo: fixture.league.logo,
        },
        addedBy,
        addedAt: now,
      }
      
      const fixtureRef = doc(
        db,
        'gameweeks',
        gameweekId,
        'fixtures',
        fixture.fixture.id.toString()
      )
      batch.set(fixtureRef, fixtureData)
    })
    
    await batch.commit()
  } catch (error) {
    console.error('Error saving gameweek fixtures:', error)
    throw error
  }
}

/**
 * Get fixtures for a gameweek
 * 
 * @param gameweekId - Gameweek ID
 * @returns Array of fixture data
 */
export async function getGameweekFixtures(
  gameweekId: string
): Promise<GameweekFixtureData[]> {
  try {
    const fixturesRef = collection(db, 'gameweeks', gameweekId, 'fixtures')
    const snapshot = await getDocs(fixturesRef)
    
    return snapshot.docs.map((doc) => doc.data() as GameweekFixtureData)
  } catch (error) {
    console.error('Error getting gameweek fixtures:', error)
    throw error
  }
}

/**
 * App settings interface
 */
export interface AppSettings {
  adminUids?: string[]
  appName?: string
  maintenanceMode?: boolean
  allowRegistrations?: boolean
  shopEnabled?: boolean
  minRedemptionPoints?: number
  defaultFixturesPerWeek?: number
  gameweekDeadlineOffsetMinutes?: number // Minutes after first game starts (default: 5)
  updatedAt?: Timestamp
}

/**
 * Get app settings
 * 
 * @returns App settings or null if not found
 */
export async function getAppSettings(): Promise<AppSettings | null> {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'app'))
    
    if (!settingsDoc.exists()) {
      return null
    }
    
    return settingsDoc.data() as AppSettings
  } catch (error) {
    console.error('Error getting app settings:', error)
    throw error
  }
}

/**
 * Update app settings
 * 
 * @param updates - Partial settings to update
 */
export async function updateAppSettings(
  updates: Partial<Omit<AppSettings, 'updatedAt'>>
): Promise<void> {
  try {
    const settingsRef = doc(db, 'settings', 'app')
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    }
    
    // Use setDoc with merge: true to handle both create and update cases
    await setDoc(settingsRef, updateData, { merge: true })
  } catch (error) {
    console.error('Error updating app settings:', error)
    throw error
  }
}