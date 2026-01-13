import { onUserChanged, db, isFirestoreReady, firestoreReady, openAuth } from './auth.js';
import { collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { af } from './api-football.js';

const bodyEl = document.getElementById('hist-body');
const emptyEl = document.getElementById('hist-empty');

async function loadUserPredictions(uid) {
  const firestoreDb = await firestoreReady;
  if (!firestoreDb) {
    console.error('Firestore database not initialized');
    return [];
  }
  const root = collection(firestoreDb, 'predictions');
  const snap = await getDocs(root);
  const fixtures = [];
  for (const d of snap.docs) {
    const fid = d.id;
    const entryRef = doc(firestoreDb, 'predictions', fid, 'entries', uid);
    const entrySnap = await getDoc(entryRef);
    if (!entrySnap.exists()) continue;
    fixtures.push({ fixtureId: fid, entry: entrySnap.data() });
  }
  return fixtures;
}

async function render(uid) {
  if (!bodyEl || !emptyEl) return;
  bodyEl.innerHTML = '';
  const preds = await loadUserPredictions(uid);
  if (!preds.length) {
    emptyEl.classList.remove('hidden');
    emptyEl.textContent = 'No history yet.';
    return;
  }
  emptyEl.classList.add('hidden');
  
  // Sort predictions by date (most recent first)
  preds.sort((a, b) => {
    const dateA = a.entry.fixtureDate ? new Date(a.entry.fixtureDate).getTime() : 0;
    const dateB = b.entry.fixtureDate ? new Date(b.entry.fixtureDate).getTime() : 0;
    return dateB - dateA;
  });
  
  preds.forEach(({ fixtureId, entry }) => {
    const tr = document.createElement('tr');
    
    // Use enhanced data from entries collection if available
    let fixtureLabel, result, leagueInfo;
    
    if (entry.homeTeam && entry.awayTeam) {
      // Use enhanced data from entries collection
      const date = entry.fixtureDate ? new Date(entry.fixtureDate).toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }) : 'Unknown date';
      
      fixtureLabel = `${date} — ${entry.homeTeam.name} vs ${entry.awayTeam.name}`;
      leagueInfo = entry.league?.name || 'Unknown league';
      
      if (entry.result) {
        result = `${entry.result.homeGoals}:${entry.result.awayGoals}`;
      } else {
        result = entry.status === 'FT' ? 'Finished' : entry.status || '—';
      }
    } else {
      // Fallback to basic fixture ID if no enhanced data
      fixtureLabel = `Fixture ${fixtureId}`;
      result = '—';
      leagueInfo = '—';
    }
    
    // Create a more informative display
    tr.innerHTML = `
      <td>
        <div class="fixture-info">
          <div class="teams">${fixtureLabel}</div>
          <div class="league">${leagueInfo}</div>
        </div>
      </td>
      <td>
        <span class="pick ${entry.pick}">${entry.pick === 'H' ? 'Home' : entry.pick === 'A' ? 'Away' : 'Draw'}</span>
      </td>
      <td>${result}</td>
      <td>
        <span class="points ${entry.points > 0 ? 'earned' : 'none'}">${entry.points ?? 0}</span>
      </td>
    `;
    
    bodyEl.appendChild(tr);
  });
}

function showAuthButtons() {
  const mainContent = document.querySelector('main.container');
  if (mainContent) {
    mainContent.innerHTML = `
      <section class="section">
        <div class="section-head">
          <h2>Authentication Required</h2>
        </div>
        <div class="anonymous-user-message">
                      <h3>Welcome to Footy Picker!</h3>
          <p>Sign in to view your prediction history.</p>
          <div class="auth-buttons">
            <button id="btn-login-anon" class="btn secondary">Log in</button>
<button id="btn-signup-anon" class="btn primary">Sign up</button>
          </div>
        </div>
      </section>
    `;
    
    // Bind the auth buttons
    document.getElementById('btn-login-anon')?.addEventListener('click', () => openAuth('login'));
    document.getElementById('btn-signup-anon')?.addEventListener('click', () => openAuth('signup'));
  }
}

onUserChanged((user) => {
  if (!user) {
    showAuthButtons();
    return;
  }
  render(user.uid);
});


