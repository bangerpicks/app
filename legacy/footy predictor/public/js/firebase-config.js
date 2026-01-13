/*
  firebase-config.js
  — Firebase initialization for the Footy Picker app.
  — This is using your provided Firebase config.
  — Import this file wherever you need Firebase services.

  Docs:
  https://firebase.google.com/docs/web/setup
*/

// ===== Import SDKs you need =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

// ===== Your web app's Firebase configuration =====
export const firebaseConfig = {
  apiKey: "AIzaSyCeNtuKJAK72jdXxNlBX5DsuMRAX9QJYM8",
  authDomain: "footy-predictor-d3e9d.firebaseapp.com",
  projectId: "footy-predictor-d3e9d",
  storageBucket: "footy-predictor-d3e9d.firebasestorage.app",
  messagingSenderId: "447397488205",
  appId: "1:447397488205:web:d3c0f3636adee25530de04",
  measurementId: "G-EHNDC9DJPP"
};

// ===== Initialize Firebase =====
export const app = initializeApp(firebaseConfig);

// Ensure the app is properly initialized
if (!app) {
  console.error('Firebase app failed to initialize');
}

// ===== Optional: Initialize Analytics =====
// Analytics can throw in some environments (e.g., when process is undefined via bundlers)
// Guard it or disable entirely to avoid runtime errors in simple Hosting setups.
// If you need Analytics, uncomment the import and the line below.
// export const analytics = getAnalytics(app);
