import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDuSXcug9nzMGQilm5377mo7TPnMJOrBSE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "banger-picks.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "banger-picks",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "banger-picks.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "724898846036",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:724898846036:web:f002fb3c714dfe865ee4c1",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-QFB3TGFPHP"
}

// Initialize Firebase
let app: FirebaseApp
let initError: Error | null = null

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]
  }
} catch (error) {
  console.error('Firebase initialization failed:', error)
  initError = error as Error
  // Create a minimal app instance to prevent crashes
  app = initializeApp(firebaseConfig, { name: 'fallback' })
}

// Initialize Auth
export const auth = getAuth(app)

// Set auth persistence to LOCAL so users stay signed in
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error)
})

// Initialize Firestore
export const db = getFirestore(app)

// Export initialization state
export const firebaseInitialized = initError === null
export const firebaseInitError = initError

// Check initialization before use
export function checkFirebaseInitialized() {
  if (!firebaseInitialized && firebaseInitError) {
    throw new Error(`Firebase not initialized: ${firebaseInitError.message}`)
  }
}

export default app
