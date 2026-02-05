'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from './firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      setUser(currentUser)
      setLoading(false)
    })
    
    // Timeout after 5 seconds if auth state doesn't resolve
    timeoutId = setTimeout(() => {
      console.warn('Auth state check timed out - assuming unauthenticated')
      setUser(null)
      setLoading(false)
      unsubscribe() // Clean up listener
    }, 5000)
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
