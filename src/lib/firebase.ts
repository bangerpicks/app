import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import {
  checkFirebaseInitialized,
  firebaseInitError,
  firebaseInitialized,
  getFirebaseApp,
} from './firebase-config'

export { auth } from './firebase-auth'
export {
  checkFirebaseInitialized,
  firebaseInitError,
  firebaseInitialized,
  firebaseConfig,
} from './firebase-config'

const app = getFirebaseApp()

// Initialize Firestore (offline cache + iOS Safari long-polling autodetect)
let dbInstance
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    experimentalAutoDetectLongPolling: true,
  })
} catch (error) {
  console.warn(
    'initializeFirestore failed; falling back to getFirestore without persistentLocalCache / multi-tab manager:',
    error
  )
  dbInstance = getFirestore(app)
}
export const db = dbInstance

// Initialize Functions (for callable functions like trackReferralSignup)
export const functions = getFunctions(app, 'us-central1')

export default app