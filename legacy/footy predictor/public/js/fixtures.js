import { af } from './api-football.js';
import { onAuthStateChanged, openAuth, auth } from './auth.js';

// Curated competitions. Use API-FOOTBALL league IDs where available.
// Note: Some cups can have multiple IDs for stages; we target primary ones.
// Leagues
const CURATED_LEAGUES = [
  { id: 39, name: 'Premier League', country: 'England' },
  { id: 140, name: 'La Liga', country: 'Spain' },
  { id: 78, name: 'Bundesliga', country: 'Germany' },
  { id: 135, name: 'Serie A', country: 'Italy' },
  { id: 61, name: 'Ligue 1', country: 'France' },
  { id: 262, name: 'Liga MX', country: 'Mexico' },
  { id: 253, name: 'MLS', country: 'USA/Canada' },
  { id: 71, name: 'Serie A (Brazil)', country: 'Brazil' },
  { id: 128, name: 'Primera División (Argentina)', country: 'Argentina' },
  { id: 307, name: 'Saudi Pro League', country: 'Saudi Arabia' },
];

// Cups/Tournaments
const CURATED_CUPS = [
  { id: 2, name: 'UEFA Champions League', region: 'Europe' },
  { id: 17, name: 'FIFA Club World Cup', region: 'Global' },
  { id: 3, name: 'UEFA Europa League', region: 'Europe' },
  { id: 848, name: 'UEFA Europa Conference League', region: 'Europe' },
  { id: 45, name: 'FA Cup', region: 'England' },
  { id: 143, name: 'Copa del Rey', region: 'Spain' },
  { id: 81, name: 'DFB-Pokal', region: 'Germany' },
  { id: 137, name: 'Coppa Italia', region: 'Italy' },
  { id: 13, name: 'Copa Libertadores', region: 'South America' },
  { id: 12, name: 'Copa Sudamericana', region: 'South America' },
];

const chipsLeagues = document.getElementById('chips-leagues');
const chipsCups = document.getElementById('chips-cups');
const fixturesEl = document.getElementById('league-fixtures');
const statusEl = document.getElementById('league-status');
const emptyEl = document.getElementById('league-empty');
const loadingEl = document.getElementById('league-loading');
const seasonSelect = document.getElementById('season-select');
const windowSelect = document.getElementById('window-select');
const viewStandingsBtn = document.getElementById('btn-view-standings');
const standingsModal = document.getElementById('modal-standings');
const standingsContent = document.getElementById('standings-content');
const standingsHelper = document.getElementById('standings-helper');
const standingsTabs = document.getElementById('standings-tabs');

function setStatus(text, kind = '') {
  if (!statusEl) return;
  statusEl.textContent = text || '';
  statusEl.className = kind || '';
}

function showLoading(show) {
  if (!loadingEl) return;
  loadingEl.classList.toggle('hidden', !show);
}

function dateWindowToRange(win) {
  const now = new Date();
  let from = new Date(now);
  let to = new Date(now);
  if (win === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (win === 'weekend') {
    const day = now.getDay();
    const diffToFri = (5 - day + 7) % 7;
    const friday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToFri);
    const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2, 23, 59, 59);
    from = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate());
    to = sunday;
  } else {
    const days = Number(win) || 7;
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 23, 59, 59);
  }
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

function renderChips() {
  const mkChip = (item, group) => {
    const a = document.createElement('button');
    a.type = 'button';
    a.className = 'chip';
    a.setAttribute('data-id', String(item.id));
    a.setAttribute('data-group', group);
    a.textContent = group === 'league' ? `${item.name}` : `${item.name}`;
    return a;
  };
  chipsLeagues.innerHTML = '';
  CURATED_LEAGUES.forEach((l) => chipsLeagues.appendChild(mkChip(l, 'league')));
  chipsCups.innerHTML = '';
  CURATED_CUPS.forEach((c) => chipsCups.appendChild(mkChip(c, 'cup')));
}

function setActiveChip(id) {
  document.querySelectorAll('.chips .chip').forEach((el) => el.classList.remove('active'));
  const el = document.querySelector(`.chips .chip[data-id="${CSS.escape(String(id))}"]`);
  if (el) el.classList.add('active');
}

async function loadSeasons() {
  if (!seasonSelect) return;
  try {
    setStatus('Loading seasons…', 'loading');
    const data = await af.get('/leagues/seasons');
    const seasons = (data.response || []).sort((a, b) => b - a);
    seasonSelect.innerHTML = '';
    seasons.forEach((y) => {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      seasonSelect.appendChild(opt);
    });
    const current = new Date().getFullYear();
    const hasCurrent = seasons.includes(current);
    seasonSelect.value = hasCurrent ? String(current) : String(seasons[0] || '');
    setStatus('');
  } catch (e) {
    const current = new Date().getFullYear();
    const fallback = Array.from({ length: 6 }, (_, i) => current - i);
    seasonSelect.innerHTML = '';
    fallback.forEach((y) => {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      seasonSelect.appendChild(opt);
    });
    seasonSelect.value = String(current);
    setStatus(e.message || 'Fallback seasons loaded', 'error');
  }
}

async function fetchFixturesForCompetition(leagueId, season, from, to) {
  const params = { league: Number(leagueId), season: Number(season), from, to };
  const data = await af.get('/fixtures', params);
  return (data.response || []).sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
}

async function fetchStandings(leagueId, season) {
  const data = await af.get('/standings', { league: Number(leagueId), season: Number(season) });
  const groups = data.response?.[0]?.league?.standings || [];
  return Array.isArray(groups) ? groups : [];
}

function renderStandingsTabs(groups, onSelect) {
  if (!standingsTabs) return;
  standingsTabs.innerHTML = '';
  if (!groups || groups.length <= 1) {
    standingsTabs.style.display = 'none';
    return;
  }
  standingsTabs.style.display = '';
  groups.forEach((_, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (idx === 0 ? ' active' : '');
    btn.textContent = `Group ${String.fromCharCode(65 + idx)}`;
    btn.setAttribute('data-idx', String(idx));
    standingsTabs.appendChild(btn);
  });
  standingsTabs.onclick = (e) => {
    const chip = e.target.closest('button[data-idx]');
    if (!chip) return;
    standingsTabs.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    chip.classList.add('active');
    const idx = Number(chip.getAttribute('data-idx'));
    onSelect(idx);
  };
}

function renderStandingsTable(rows) {
  if (!standingsContent) return;
  if (!rows || rows.length === 0) {
    standingsContent.innerHTML = '';
    if (standingsHelper) standingsHelper.textContent = 'Standings not available for this competition.';
    return;
  }
  if (standingsHelper) standingsHelper.textContent = '';
  
  // Calculate total teams for dynamic position scaling
  const totalTeams = rows.length;
  
  const header = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>MP</th>
          <th>W</th>
          <th>D</th>
          <th>L</th>
          <th>GF</th>
          <th>GA</th>
          <th>GD</th>
          <th>Pts</th>
          <th>Form</th>
        </tr>
      </thead>`;
  const bodyRows = rows.map((row) => {
    const team = row.team?.name || '';
    const rank = row.rank ?? '';
    const all = row.all || {};
    const goalsDiff = row.goalsDiff ?? ((all.goals?.for || 0) - (all.goals?.against || 0));
    const form = (row.form || '').slice(-5);
    
    // Create dynamic position class based on total teams
    let positionClass = '';
    if (rank && totalTeams > 0) {
      const percentage = (rank / totalTeams) * 100;
      if (percentage <= 15) {
        positionClass = 'position-top'; // Top 15% - Green
      } else if (percentage <= 30) {
        positionClass = 'position-upper'; // 15-30% - Light green
      } else if (percentage <= 45) {
        positionClass = 'position-mid-upper'; // 30-45% - Yellow-green
      } else if (percentage <= 60) {
        positionClass = 'position-mid'; // 45-60% - Yellow
      } else if (percentage <= 75) {
        positionClass = 'position-mid-lower'; // 60-75% - Orange
      } else if (percentage <= 90) {
        positionClass = 'position-lower'; // 75-90% - Red-orange
      } else {
        positionClass = 'position-bottom'; // Bottom 10% - Red
      }
    }
    
    // Create position pill with dynamic styling
          const positionPill = rank ? `<span class="team-position ${positionClass}">${rank}</span>` : '';
    
    return `
      <tr>
        <td>${positionPill}</td>
        <td>${team}</td>
        <td>${all.played ?? ''}</td>
        <td>${all.win ?? ''}</td>
        <td>${all.draw ?? ''}</td>
        <td>${all.lose ?? ''}</td>
        <td>${all.goals?.for ?? ''}</td>
        <td>${all.goals?.against ?? ''}</td>
        <td>${goalsDiff}</td>
        <td>${row.points ?? ''}</td>
        <td>${form}</td>
      </tr>`;
  }).join('');
  standingsContent.innerHTML = header + `<tbody>${bodyRows}</tbody></table>`;
}

function renderFixtures(fixtures) {
  fixturesEl.innerHTML = '';
  if (!fixtures.length) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  fixtures.forEach((f) => {
    const li = document.createElement('li');
    const kickoff = new Date(f.fixture.date).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const statusShort = f.fixture?.status?.short || 'NS';
    const elapsed = f.fixture?.status?.elapsed;
    const statusText = statusShort !== 'NS' ? (elapsed ? `${statusShort} ${elapsed}'` : statusShort) : kickoff;
    const gh = (f.goals && typeof f.goals.home === 'number') ? f.goals.home : '-';
    const ga = (f.goals && typeof f.goals.away === 'number') ? f.goals.away : '-';
    li.innerHTML = `
      <label class="fixture">
        <div class="when">${statusText}</div>
        <div class="rows">
          <div class="league">${f.league.name}</div>
          <div class="row">
            <img class="logo" src="${f.teams.home.logo}" alt="" />
            <span class="name">${f.teams.home.name}</span>
            <span class="cell">${gh}</span>
          </div>
          <div class="row">
            <img class="logo" src="${f.teams.away.logo}" alt="" />
            <span class="name">${f.teams.away.name}</span>
            <span class="cell">${ga}</span>
          </div>
        </div>
        <div class="actions">
          <a class="btn small" href="https://www.google.com/search?q=${encodeURIComponent(f.teams.home.name + ' vs ' + f.teams.away.name)}" target="_blank" rel="noopener">Details</a>
        </div>
      </label>
    `;
    fixturesEl.appendChild(li);
  });
}

async function loadForChip(id) {
  if (!id) return;
  const win = windowSelect?.value || '7';
  const { from, to } = dateWindowToRange(win);
  const season = seasonSelect?.value || new Date().getFullYear();
  try {
    setStatus('Loading fixtures…', 'loading');
    showLoading(true);
    const fixtures = await fetchFixturesForCompetition(id, season, from, to);
    renderFixtures(fixtures);
    setStatus('');
  } catch (e) {
    renderFixtures([]);
    setStatus(e.message || 'Failed to load fixtures', 'error');
  } finally {
    showLoading(false);
  }
}

function bindEvents() {
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip[data-id]');
    if (!chip) return;
    const id = chip.getAttribute('data-id');
    setActiveChip(id);
    loadForChip(id);
  });
  seasonSelect?.addEventListener('change', () => {
    const active = document.querySelector('.chip.active');
    if (active) loadForChip(active.getAttribute('data-id'));
  });
  windowSelect?.addEventListener('change', () => {
    const active = document.querySelector('.chip.active');
    if (active) loadForChip(active.getAttribute('data-id'));
  });

  viewStandingsBtn?.addEventListener('click', async () => {
    const active = document.querySelector('.chip.active');
    if (!active) return;
    const id = Number(active.getAttribute('data-id'));
    const season = seasonSelect?.value || new Date().getFullYear();
    try {
      if (standingsHelper) standingsHelper.textContent = 'Loading standings…';
      const groups = await fetchStandings(id, season);
      renderStandingsTabs(groups, (idx) => {
        const rows = Array.isArray(groups[idx]) ? groups[idx] : [];
        renderStandingsTable(rows);
      });
      const initialRows = Array.isArray(groups[0]) ? groups[0] : [];
      renderStandingsTable(initialRows);
    } catch (e) {
      if (standingsHelper) standingsHelper.textContent = e.message || 'Failed to load standings';
      standingsContent.innerHTML = '';
    }
    standingsModal?.showModal();
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
          <p>Sign in to view fixtures and standings.</p>
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

async function init() {
  if (!chipsLeagues || !chipsCups) return;
  
  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is authenticated, show fixtures
      renderChips();
      loadSeasons();
      bindEvents();
      const defaultId = CURATED_LEAGUES[0].id;
      setActiveChip(defaultId);
      loadForChip(defaultId);
    } else {
      // User is not authenticated, show auth buttons
      showAuthButtons();
    }
  });
}

init();


