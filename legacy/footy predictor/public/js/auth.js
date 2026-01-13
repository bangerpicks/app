/*
  Authentication helpers — auth.js
  Responsibilities:
  • Initialize Firebase services (via app from firebase-config.js)
  • Show login/signup modals
  • Expose onAuthStateChanged, login, signup, logout
*/

import { app } from './firebase-config.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

export { app };
export { onAuthStateChanged };
export const auth = getAuth(app);
export const db = getFirestore(app);

// Ensure Firestore is properly initialized
if (!db) {
  console.error('Firestore database not initialized');
} else {
  console.log('Firestore database initialized successfully');
}

// Add a function to check if Firestore is ready
export function isFirestoreReady() {
  return !!db;
}

// Add a function to wait for Firestore to be ready
export function waitForFirestore() {
  return new Promise((resolve) => {
    if (db) {
      resolve(db);
    } else {
      // Wait a bit and check again
      setTimeout(() => {
        if (db) {
          resolve(db);
        } else {
          console.error('Firestore failed to initialize');
          resolve(null);
        }
      }, 100);
    }
  });
}

// Debug function to check Firestore status
export function debugFirestore() {
  console.log('Firebase app:', app);
  console.log('Firestore db:', db);
  console.log('Firestore type:', typeof db);
  console.log('Firestore constructor:', db?.constructor?.name);
  console.log('Firestore methods:', Object.getOwnPropertyNames(db || {}));
  console.log('Firestore prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(db || {})));
  return { app, db };
}

// Call debug function after initialization
setTimeout(() => {
  debugFirestore();
}, 100);

// Check for quota exceeded state immediately on page load
// This helps catch quota issues before any auth operations
setTimeout(async () => {
  try {
    if (auth.currentUser) {
      // Quick test to see if we can get a token
      await auth.currentUser.getIdToken(false);
    }
  } catch (error) {
    if (error.code === 'auth/quota-exceeded') {
      console.warn('Firebase quota exceeded detected on page load - disabling all Firebase operations');
      handleQuotaExceeded();
    }
  }
}, 2000); // Increased delay to 2 seconds to reduce initial load impact

// Add error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Handle Firebase quota exceeded errors gracefully
  if (event.reason && event.reason.code === 'auth/quota-exceeded') {
    console.warn('Firebase quota exceeded error caught globally');
    handleQuotaExceeded();
    event.preventDefault(); // Prevent the error from being logged
    return;
  }
  
  if (event.reason && event.reason.message && event.reason.message.includes('collection()')) {
    console.error('Firestore collection() error detected. This usually means:');
    console.error('1. The db instance is undefined');
    console.error('2. The Firebase modules are not fully loaded');
    console.error('3. There is a timing issue with module initialization');
    debugFirestore();
  }
});

// Global flag to track quota exceeded state
let quotaExceeded = false;
let quotaNotificationShown = false;
let tokenRefreshInterval = null; // Track the single interval

// Global notification function for quota exceeded errors
function showQuotaExceededNotification() {
  // Only show notification once per session
  if (quotaNotificationShown) {
    return;
  }
  
  // Check if notification already exists
  if (document.getElementById('quota-exceeded-notification')) {
    return;
  }
  
  quotaNotificationShown = true;
  
  const notification = document.createElement('div');
  notification.id = 'quota-exceeded-notification';
  notification.className = 'quota-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <strong>Firebase Quota Exceeded</strong>
      <p>Your Firebase project has reached its quota limit. Some features may not work properly.</p>
      <button onclick="this.parentElement.parentElement.remove()" class="btn-close">×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
}

// Export function to check quota status
export function isQuotaExceeded() {
  return quotaExceeded;
}

// Function to immediately stop all token refresh attempts
export function stopTokenRefresh() {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }
  
  // Also clear any other potential intervals
  if (window.tokenRefreshInterval) {
    clearInterval(window.tokenRefreshInterval);
    window.tokenRefreshInterval = null;
  }
  
  console.log('Token refresh stopped');
}

// Add a function to handle quota exceeded state more gracefully
export function handleQuotaExceeded() {
  if (quotaExceeded) return; // Already handled
  
  quotaExceeded = true;
  console.warn('Firebase quota exceeded - switching to offline mode');
  
  // Stop all token refresh attempts
  stopTokenRefresh();
  
  // Show user notification
  showQuotaExceededNotification();
  
  // Disable Firebase operations gracefully
  // The app will continue to work with cached data
}

// Add a function to check if Firebase operations should be allowed
export function canUseFirebase() {
  return !quotaExceeded && !!db && !!auth;
}

// Add a function to safely execute Firebase operations
export async function safeFirebaseOperation(operation, fallback = null) {
  if (!canUseFirebase()) {
    console.warn('Firebase operation blocked - quota exceeded or not ready');
    return fallback;
  }
  
  try {
    return await operation();
  } catch (error) {
    if (error.code === 'auth/quota-exceeded') {
      handleQuotaExceeded();
      return fallback;
    }
    throw error;
  }
}

// Export a promise that resolves when Firestore is ready
export const firestoreReady = new Promise((resolve) => {
  const checkReady = () => {
    if (db) {
      console.log('Firestore is ready');
      resolve(db);
    } else {
      setTimeout(checkReady, 50);
    }
  };
  checkReady();
});

// Also export a function that ensures Firestore is ready before proceeding
export async function ensureFirestoreReady() {
  if (!db) {
    console.log('Waiting for Firestore to be ready...');
    await firestoreReady;
  }
  return db;
}

// Function to verify and refresh authentication state
export async function verifyAuthState() {
  const user = currentUser();
  if (!user) {
    throw new Error('No authenticated user');
  }
  
  try {
    // Force a token refresh to ensure we have a valid auth token
    await user.getIdToken(true);
    return user;
  } catch (error) {
    console.error('Authentication token refresh failed:', error);
    throw new Error('Authentication expired. Please log in again.');
  }
}

// Function to check if user is still authenticated and token is valid
export async function isUserAuthenticated() {
  try {
    const user = await verifyAuthState();
    return !!user;
  } catch (error) {
    return false;
  }
}

// UI Elements
const modal = document.getElementById('modal-auth');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authHelper = document.getElementById('auth-helper');
const emailEl = document.getElementById('auth-email');
const passEl = document.getElementById('auth-pass');
const userPanel = document.getElementById('user-panel');
let logoutLink = document.getElementById('logout-link');

// Ensure logoutLink exists, if not create it dynamically
if (!logoutLink && userPanel) {
  console.warn('logout-link element not found in auth.js, creating dynamically');
  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'logout-link';
  logoutBtn.className = 'btn ghost hidden';
  logoutBtn.textContent = 'Log out';
  userPanel.appendChild(logoutBtn);
  // Update the reference
  logoutLink = logoutBtn;
}

let mode = 'login'; // or 'signup'

export function openAuth(which) {
  mode = which;
  authTitle.textContent = which === 'login' ? 'Log in' : 'Create account';
  authHelper.textContent = which === 'login' ? 'Use your email and password.' : 'Create a new account.';
  emailEl.value = '';
  passEl.value = '';
  modal.showModal();
}

// Add function to close modal
export function closeAuth() {
  modal.close();
}



// Add event listeners for modal close functionality
function bindModalCloseEvents() {
  // Get the cancel button by ID
  const cancelBtn = document.getElementById('auth-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeAuth();
    });
  }
  
  // Also handle clicking outside the modal (backdrop click)
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeAuth();
    }
  });
  
  // Handle escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.open) {
      closeAuth();
    }
  });
}

// Bind modal close events when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindModalCloseEvents);
} else {
  bindModalCloseEvents();
}

// Add logout event listener if logoutLink exists
if (logoutLink) {
  logoutLink.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
  });
} else {
  console.warn('logoutLink not available for event listener');
}

// Function to bind logout functionality (can be called when element is created later)
export function bindLogoutButton(element) {
  if (element && element.id === 'logout-link') {
    element.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOut(auth);
    });
    console.log('Logout button bound successfully');
  }
}

// Form submission handler
authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailEl.value.trim();
  const pass = passEl.value;
  
  try {
    if (mode === 'login') {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      // Use local-part of email as a simple displayName fallback
      const name = email.split('@')[0];
      await updateProfile(cred.user, { displayName: name });
    }
    modal.close();
  } catch (err) {
    authHelper.textContent = err.message;
  }
});

function showWelcomeModal(userId) {
  // Set flag to prevent showing again
  localStorage.setItem(`welcome_shown_${userId}`, 'true');
  
  // Create welcome modal
  const welcomeModal = document.createElement('dialog');
  welcomeModal.className = 'modal welcome-modal';
  welcomeModal.innerHTML = `
    <div class="modal-box welcome-modal-box">
      <div class="welcome-header">
        <div class="welcome-icon">🎉</div>
        <h2 class="welcome-title">Welcome to Footy Picker!</h2>
        <p class="welcome-subtitle">Get started with your football prediction journey</p>
      </div>
      
      <div class="welcome-content">
        <div class="welcome-feature">
          <div class="feature-icon">⚽</div>
          <div class="feature-text">
            <h3>Personalize Your Experience</h3>
            <p>Choose your favorite team and customize your profile to make it truly yours!</p>
          </div>
        </div>
      </div>
      
      <div class="welcome-actions">
        <button class="btn ghost" onclick="this.closest('.welcome-modal').close()">Skip for now</button>
        <button class="btn primary" onclick="goToProfile()">Set Up Profile</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(welcomeModal);
  welcomeModal.showModal();
  
  // Add global function for the onclick
  window.goToProfile = function() {
    welcomeModal.close();
    // Redirect to profile page
    window.location.href = '/profile.html';
  };
}

export function onUserChanged(cb) {
  return onAuthStateChanged(auth, (user) => {
    // Check if this is a new user (first time signing in)
    if (user && user.metadata.creationTime === user.metadata.lastSignInTime) {
      // Check if we've already shown the welcome modal for this user
      const welcomeShown = localStorage.getItem(`welcome_shown_${user.uid}`);
      if (!welcomeShown) {
        // This is a new user, show welcome modal
        setTimeout(() => showWelcomeModal(user.uid), 500); // Small delay to ensure UI is ready
      }
    }
    cb(user);
  });
}

export function currentUser() {
  return auth.currentUser;
}

// Utility function to get current display name consistently across the app
export function getCurrentDisplayName() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.displayName || user.email?.split('@')[0] || 'Player';
}

// Function to update username across the entire app
export async function updateUsernameAcrossApp(newDisplayName) {
  if (!auth.currentUser) return;
  
  try {
    // Update Firebase Auth profile
    await updateProfile(auth.currentUser, { displayName: newDisplayName });
    
    // Update Firestore user document using the centralized ensureUserDoc function
    // Ensure Firestore is ready first
    await firestoreReady;
    const { ensureUserDoc } = await import('./scoring.js');
    await ensureUserDoc(auth.currentUser.uid, newDisplayName);
    
    // Trigger custom event for other parts of the app
    window.dispatchEvent(new CustomEvent('usernameChanged', { 
      detail: { displayName: newDisplayName, user: auth.currentUser } 
    }));
    
    // Also refresh displays immediately
    refreshUsernameDisplays(newDisplayName);
    
    return true;
  } catch (error) {
    console.error('Error updating username across app:', error);
    return false;
  }
}

// Function to update profile icon across the entire app
export async function updateProfileIconAcrossApp(newPhotoURL) {
  console.log('updateProfileIconAcrossApp called with:', newPhotoURL);
  console.log('Current user:', auth.currentUser);
  
  if (!auth.currentUser) {
    console.error('No current user found');
    return false;
  }
  
  try {
    console.log('Updating Firebase Auth profile...');
    // Update Firebase Auth profile
    await updateProfile(auth.currentUser, { photoURL: newPhotoURL });
    console.log('Firebase Auth profile updated successfully');
    console.log('New user photoURL:', auth.currentUser.photoURL);
    
    // Update Firestore user document
    console.log('Updating Firestore user document...');
    await firestoreReady;
    const { ensureUserDoc } = await import('./scoring.js');
    await ensureUserDoc(auth.currentUser.uid, auth.currentUser.displayName, newPhotoURL);
    console.log('Firestore user document updated successfully');
    
    // Trigger custom event for other parts of the app
    console.log('Dispatching profileIconChanged event...');
    window.dispatchEvent(new CustomEvent('profileIconChanged', { 
      detail: { photoURL: newPhotoURL, user: auth.currentUser } 
    }));
    
    // Also refresh displays immediately
    console.log('Refreshing profile icon displays...');
    refreshProfileIconDisplays(newPhotoURL);
    
    console.log('Profile icon update completed successfully');
    return true;
  } catch (error) {
    console.error('Error updating profile icon across app:', error);
    return false;
  }
}

// Function to refresh username displays across the app
export function refreshUsernameDisplays(newDisplayName) {
  try {
    console.log('Refreshing username displays across app:', newDisplayName);
    
    // Update any profile name displays
    const profileNames = document.querySelectorAll('.profile-name');
    profileNames.forEach(el => {
      if (el) el.textContent = newDisplayName;
    });
    
    // Update any user name displays in headers
    const userNames = document.querySelectorAll('.user-name');
    userNames.forEach(el => {
      if (el) el.textContent = newDisplayName;
    });
    
    // Update any user avatar initials
    const userAvatars = document.querySelectorAll('.user-avatar');
    userAvatars.forEach(el => {
      if (el) {
        const initials = newDisplayName.trim().charAt(0).toUpperCase();
        el.textContent = initials;
      }
    });
    
    // Update any other username references
    const usernameElements = document.querySelectorAll('[data-username]');
    usernameElements.forEach(el => {
      if (el) el.textContent = newDisplayName;
    });
    
    console.log(`Updated ${profileNames.length} profile names, ${userNames.length} user names, ${userAvatars.length} avatars, ${usernameElements.length} other elements`);
  } catch (error) {
    console.error('Error refreshing username displays:', error);
  }
}

// Function to refresh profile icon displays across the app
export function refreshProfileIconDisplays(newPhotoURL) {
  try {
    console.log('Refreshing profile icon displays across app:', newPhotoURL);
    
    // Update any profile avatar displays
    const avatarEmojis = document.querySelectorAll('.avatar-emoji');
    console.log('Found avatar emojis:', avatarEmojis.length);
    avatarEmojis.forEach((el, index) => {
      if (el) {
        console.log(`Updating avatar emoji ${index}:`, el.textContent, '->', newPhotoURL);
        el.textContent = newPhotoURL;
      }
    });
    
    // Update any user icons in leaderboards or other components
    const userIcons = document.querySelectorAll('[data-user-icon]');
    console.log('Found user icons:', userIcons.length);
    userIcons.forEach((el, index) => {
      if (el) {
        console.log(`Updating user icon ${index}:`, el.textContent, '->', newPhotoURL);
        el.textContent = newPhotoURL;
      }
    });
    
    // Update any profile icon options to show the new selection
    const iconOptions = document.querySelectorAll('.icon-option');
    console.log('Found icon options:', iconOptions.length);
    iconOptions.forEach((option, index) => {
      const wasSelected = option.classList.contains('selected');
      if (option.dataset.emoji === newPhotoURL) {
        option.classList.add('selected');
        if (!wasSelected) {
          console.log(`Icon option ${index} now selected:`, option.dataset.emoji);
        }
      } else {
        option.classList.remove('selected');
        if (wasSelected) {
          console.log(`Icon option ${index} now unselected:`, option.dataset.emoji);
        }
      }
    });
    
    console.log(`Updated ${avatarEmojis.length} avatar emojis, ${userIcons.length} user icons, ${iconOptions.length} icon options`);
  } catch (error) {
    console.error('Error refreshing profile icon displays:', error);
  }
}

// Keep header user panel in sync with auth state
onAuthStateChanged(auth, async (user) => {
  if (!userPanel) return;
  
  try {
    if (user) {
      console.log(`Auth state changed: User signed in - ${user.uid}`);
      const display = user.displayName || user.email?.split('@')[0] || 'Player';
      const initials = display.trim().charAt(0).toUpperCase();
      userPanel.innerHTML = `
        <a class="user-chip" href="/profile.html" title="Open profile">
          <span class="user-avatar">${initials}</span>
          <span class="user-name">${display}</span>
        </a>
      `;
      
      // User document creation is handled centrally in app.js via ensureUserDoc()
      // This prevents duplicate user creation when signing in on multiple devices
      
      // Monitor token refresh - but only if we haven't hit quota limits
      if (quotaExceeded) {
        console.log('Skipping token refresh monitoring - quota exceeded');
        return;
      }
      
      // Additional check: if we're already getting quota errors, don't set up refresh
      try {
        // Quick test to see if we can get a token
        await user.getIdToken(false); // Don't force refresh, just check current token
      } catch (error) {
        console.log('Token check error details:', {
          code: error.code,
          message: error.message,
          fullError: error
        });
        
        if (error.code === 'auth/quota-exceeded') {
          console.warn('Firebase quota exceeded detected during auth setup - disabling token refresh');
          handleQuotaExceeded();
          return; // Ensure we exit immediately
        } else {
          console.warn('Token check failed with non-quota error:', error.code);
        }
      }
      
      try {
        const idTokenResult = await user.getIdTokenResult();
        console.log(`User token valid until: ${new Date(idTokenResult.expirationTime).toISOString()}`);
        
        // Clear any existing interval before setting up a new one
        if (tokenRefreshInterval) {
          clearInterval(tokenRefreshInterval);
          tokenRefreshInterval = null;
        }
        
        // Set up token refresh monitoring - RE-ENABLED WITH BETTER ERROR HANDLING
        tokenRefreshInterval = setInterval(async () => {
          // Double-check quota status at the start of each interval
          if (quotaExceeded) {
            console.log('Stopping token refresh - quota exceeded');
            if (tokenRefreshInterval) {
              clearInterval(tokenRefreshInterval);
              tokenRefreshInterval = null;
            }
            return;
          }
          
          try {
            // Only refresh if the token is close to expiring (within 10 minutes)
            const tokenResult = await user.getIdTokenResult();
            const timeUntilExpiry = tokenResult.expirationTime - Date.now();
            
            if (timeUntilExpiry > 600000) { // 10 minutes in milliseconds
              console.log('Token still valid for', Math.round(timeUntilExpiry / 60000), 'minutes, skipping refresh');
              return;
            }
            
            console.log('Token expiring soon, refreshing...');
            const newToken = await user.getIdToken(true);
            console.log('Token refreshed successfully');
          } catch (error) {
            console.error('Token refresh failed:', error);
            if (error.code === 'auth/quota-exceeded') {
              console.warn('Firebase quota exceeded - token refresh disabled');
              handleQuotaExceeded();
              return; // Ensure we exit immediately
            } else if (error.code === 'auth/user-token-expired' || error.code === 'auth/user-disabled') {
              // User token is expired or user is disabled, sign them out
              console.warn('User token expired or disabled, signing out');
              await signOut(auth);
              return;
            } else if (error.code === 'auth/network-request-failed') {
              // Network error, don't clear interval, just log and continue
              console.warn('Network error during token refresh, will retry:', error.message);
              return;
            } else {
              // For other errors, only log and continue (don't clear interval for network issues)
              console.warn('Token refresh failed for other reason:', error.code, error.message);
              // Don't return here - let the interval continue for retry
            }
          }
        }, 300000); // Check every 5 minutes instead of forcing refresh every 5 minutes
        
        // Clean up interval when user signs out
        const cleanup = () => {
          if (tokenRefreshInterval) {
            clearInterval(tokenRefreshInterval);
            tokenRefreshInterval = null;
          }
        };
        
        // Use the onAuthStateChanged to detect sign out instead
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (!currentUser) {
            cleanup();
            unsubscribe();
          }
        });
      } catch (error) {
        console.error('Error getting token result:', error);
        if (error.code === 'auth/quota-exceeded') {
          console.warn('Firebase quota exceeded - token refresh monitoring disabled');
          handleQuotaExceeded();
        }
      }
    } else {
      console.log('Auth state changed: User signed out');
      userPanel.innerHTML = '';
      
      // Clean up token refresh interval when user signs out
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
      }
    }
  } catch (error) {
    console.error('Error in onAuthStateChanged callback:', error);
  }
});

// Listen for username changes and update header
window.addEventListener('usernameChanged', (event) => {
  if (!userPanel || !auth.currentUser) return;
  
  try {
    const { displayName } = event.detail;
    const display = displayName || auth.currentUser.email?.split('@')[0] || 'Player';
    const initials = display.trim().charAt(0).toUpperCase();
    
    console.log('Username changed event received:', { displayName, display, initials });
    
    userPanel.innerHTML = `
      <a class="user-chip" href="/profile.html" title="Open profile">
        <span class="user-avatar">${initials}</span>
        <span class="user-name">${display}</span>
      </a>
    `;
    
    // Refresh username displays across the entire app
    refreshUsernameDisplays(display);
  } catch (error) {
    console.error('Error handling username changed event:', error);
  }
});