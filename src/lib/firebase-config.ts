import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDuSXcug9nzMGQilm5377mo7TPnMJOrBSE',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'banger-picks.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'banger-picks',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'banger-picks.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '724898846036',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:724898846036:web:f002fb3c714dfe865ee4c1',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-QFB3TGFPHP',
}

let initError: Error | null = null
let app: FirebaseApp

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]
  }
} catch (error) {
  console.error('Firebase initialization failed:', error)
  initError = error as Error
  app = initializeApp(firebaseConfig, { name: 'fallback' })
}

export function getFirebaseApp(): FirebaseApp {
  return app
}

export const firebaseInitialized = initError === null
export const firebaseInitError = initError

export function checkFirebaseInitialized() {
  if (!firebaseInitialized && firebaseInitError) {
    throw new Error(`Firebase not initialized: ${firebaseInitError.message}`)
  }
}