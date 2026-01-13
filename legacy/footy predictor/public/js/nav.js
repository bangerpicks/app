const NAV_HTML = `
<div class="bottom-spacer"></div>
<nav class="bottom-nav" aria-label="Bottom">
  <a href="/" data-path="/">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5M5 9v11h14V9"/></svg>
    <span class="lbl">Dashboard</span>
  </a>
  <!-- Temporarily hidden navigation links
  <a href="/leagues.html" data-path="/leagues.html">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    <span class="lbl">Leagues</span>
  </a>
  <a href="/tournaments.html" data-path="/tournaments.html">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    <span class="lbl">Tournaments</span>
  </a>
  <a href="/tournament-advanced.html" data-path="/tournament-advanced.html">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    <span class="lbl">Advanced Tournaments</span>
  </a>
  -->
  <a href="/leaderboard.html" data-path="/leaderboard.html">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21V10M12 21V3M17 21v-6"/></svg>
    <span class="lbl">Leaderboard</span>
  </a>
  <a href="/fixtures.html" data-path="/fixtures.html">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18M3 12h18M3 19h18"/></svg>
    <span class="lbl">Fixtures</span>
  </a>
  <a href="/history.html" data-path="/history.html">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5l3 2M12 21a9 9 0 1 1 9-9 9 9 0 0 1-9 9"/></svg>
    <span class="lbl">My Results</span>
  </a>
</nav>`;

(function injectBottomNav() {
  try {
    if (document.querySelector('.bottom-nav')) return;
    document.body.insertAdjacentHTML('beforeend', NAV_HTML);
    const path = location.pathname.endsWith('/') || location.pathname.endsWith('/index.html')
      ? '/' : location.pathname;
    document.querySelectorAll('.bottom-nav a').forEach((a) => {
      const p = a.getAttribute('data-path');
      if (p === path) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });
  } catch {}
})();
