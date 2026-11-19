import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirebaseApp } from './firebase-config'

const app = getFirebaseApp()
export const auth = getAuth(app)

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error)
})