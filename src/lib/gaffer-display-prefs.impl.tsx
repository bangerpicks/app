'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { useAuth } from '@/lib/AuthProvider'
import { db } from '@/lib/firebase'
import type { UserDocument } from '@/lib/users'

export interface GafferDisplayPrefs {
  knowledgeOpenOnLoad: boolean
  pickOpenOnLoad: boolean
}

export const DEFAULT_GAFFER_DISPLAY_PREFS: GafferDisplayPrefs = {
  knowledgeOpenOnLoad: true,
  pickOpenOnLoad: true,
}

const STORAGE_KEY = 'banger-picks:gaffer-display-prefs'

export function readGafferDisplayPrefsFromStorage(): GafferDisplayPrefs {
  if (typeof window === 'undefined') return DEFAULT_GAFFER_DISPLAY_PREFS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_GAFFER_DISPLAY_PREFS
    const parsed = JSON.parse(raw) as Partial<GafferDisplayPrefs>
    return {
      knowledgeOpenOnLoad: parsed.knowledgeOpenOnLoad !== false,
      pickOpenOnLoad: parsed.pickOpenOnLoad !== false,
    }
  } catch {
    return DEFAULT_GAFFER_DISPLAY_PREFS
  }
}

export function writeGafferDisplayPrefsToStorage(prefs: GafferDisplayPrefs): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

function prefsFromUserDoc(data: UserDocument | undefined): GafferDisplayPrefs {
  if (!data) return DEFAULT_GAFFER_DISPLAY_PREFS
  return {
    knowledgeOpenOnLoad: data.gafferKnowledgeOpenOnLoad !== false,
    pickOpenOnLoad: data.gafferPickOpenOnLoad !== false,
  }
}

export async function loadGafferDisplayPrefs(
  user: User | null | undefined
): Promise<GafferDisplayPrefs> {
  const cached = readGafferDisplayPrefsFromStorage()

  if (!user?.uid) {
    return cached
  }

  try {
    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)
    if (!userDoc.exists()) {
      return cached
    }
    const prefs = prefsFromUserDoc(userDoc.data() as UserDocument)
    writeGafferDisplayPrefsToStorage(prefs)
    return prefs
  } catch (error) {
    console.error('Error loading Gaffer display prefs:', error)
    return cached
  }
}

export async function saveGafferDisplayPrefs(
  user: User,
  prefs: GafferDisplayPrefs
): Promise<void> {
  if (!user?.uid) {
    throw new Error('Invalid user object')
  }

  const userRef = doc(db, 'users', user.uid)
  const updates: Partial<UserDocument> = {
    gafferKnowledgeOpenOnLoad: prefs.knowledgeOpenOnLoad,
    gafferPickOpenOnLoad: prefs.pickOpenOnLoad,
    lastUpdated: serverTimestamp() as UserDocument['lastUpdated'],
  }

  await setDoc(userRef, updates, { merge: true })
  writeGafferDisplayPrefsToStorage(prefs)
}

export function gafferDisplayPrefsEqual(
  a: GafferDisplayPrefs,
  b: GafferDisplayPrefs
): boolean {
  return (
    a.knowledgeOpenOnLoad === b.knowledgeOpenOnLoad &&
    a.pickOpenOnLoad === b.pickOpenOnLoad
  )
}

type GafferDisplayPrefsContextValue = {
  prefs: GafferDisplayPrefs
  ready: boolean
}

const GafferDisplayPrefsContext = createContext<GafferDisplayPrefsContextValue>({
  prefs: DEFAULT_GAFFER_DISPLAY_PREFS,
  ready: false,
})

export function GafferDisplayPrefsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<GafferDisplayPrefs>(() =>
    readGafferDisplayPrefsFromStorage()
  )
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    loadGafferDisplayPrefs(user).then((loaded) => {
      if (!cancelled) {
        setPrefs(loaded)
        setReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  return (
    <GafferDisplayPrefsContext.Provider value={{ prefs, ready }}>
      {children}
    </GafferDisplayPrefsContext.Provider>
  )
}

export function useGafferDisplayPrefs(): GafferDisplayPrefsContextValue {
  return useContext(GafferDisplayPrefsContext)
}
