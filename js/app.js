// ─── Main App Controller ───
const App = (() => {

  let currentTab = 'explore';
  let selectedCountryId = null;
  let quizStarted = false;

  function init() {
    // Build map
    MapRenderer.buildSVG();

    // Map click handler
    MapRenderer.setClickHandler((numId, country) => {
      if (currentTab === 'explore') {
        selectCountry(numId, country);
      } else if (currentTab === 'quiz') {
        if (Quiz.getMode() === 'findit') {
          Quiz.handleFindItClick(numId);
        // In other quiz modes map clicks do nothing (don't disrupt quiz highlight)
        }
      }
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Zoom buttons
    document.getElementById('zoom-in') .addEventListener('click', MapRenderer.zoomIn);
    document.getElementById('zoom-out').addEventListener('click', MapRenderer.zoomOut);
    document.getElementById('zoom-reset').addEventListener('click', MapRenderer.resetView);

    // Init quiz
    Quiz.init();

    // Init progress panel
    renderProgressPanel();

    // Update header
    updateHeaderStats();

    // Continent filter buttons in progress panel
    document.querySelectorAll('.continent-row').forEach(row => {
      row.addEventListener('click', () => {
        const cont = row.dataset.continent;
        filterByCcontinent(cont);
        switchTab('explore');
      });
    });
  }

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

    const infoPanel     = document.getElementById('info-panel');
    const quizPanel     = document.getElementById('quiz-panel');
    const progressPanel = document.getElementById('progress-panel');

    infoPanel.style.display     = tab === 'explore'  ? 'block' : 'none';
    quizPanel.style.display     = tab === 'quiz'     ? 'flex'  : 'none';
    progressPanel.style.display = tab === 'progress' ? 'flex'  : 'none';

    MapRenderer.setTooltipEnabled(tab === 'explore');

    if (tab === 'explore') {
      MapRenderer.clearAllHighlights();
      document.getElementById('find-it-overlay').classList.remove('visible');
    }
    if (tab === 'quiz' && !quizStarted) {
      quizStarted = true;
      Quiz.start();
    }
    if (tab === 'progress') {
      renderProgressPanel();
    }
  }

  function selectCountry(numId, country) {
    selectedCountryId = numId;
    MapRenderer.clearAllHighlights();
    MapRenderer.highlightCountry(numId, 'selected');

    // Show info card
    const placeholder = document.querySelector('.info-placeholder');
    const card = document.querySelector('.country-card');
    placeholder.style.display = 'none';
    card.classList.add('visible');

    // Populate card
    document.getElementById('card-flag').textContent     = country.flag;
    document.getElementById('card-name').textContent     = country.name;
    document.getElementById('card-capital').textContent  = country.capital;
    document.getElementById('card-continent').textContent = country.continent;

    const badge = document.getElementById('continent-badge');
    badge.textContent = country.continent;
    const cont = CONTINENTS[country.continent] || {};
    badge.style.background = cont.color || '#CBD5E1';
    badge.style.color = '#1E2A4A';

    document.getElementById('card-fact').textContent = country.fact;

    // Mastery bar
    const mastery = Progress.getMastery(numId);
    const pct = (mastery / 5) * 100;
    document.getElementById('mastery-bar-fill').style.width = pct + '%';
    document.getElementById('mastery-label-val').textContent = masteryLabel(mastery);

    // Mark as visited (small XP)
    if (mastery === 0) {
      Progress.recordCorrect(numId, 2);
      updateHeaderStats();
    }
  }

  function masteryLabel(m) {
    return ['Not started', 'Learning', 'Practicing', 'Mastered ⭐', 'Expert 🌟', 'Perfect 🏆'][m] || '';
  }

  function filterByCcontinent(continent) {
    const ids = Object.entries(COUNTRIES)
      .filter(([,c]) => c.continent === continent)
      .map(([id]) => id);
    MapRenderer.dimAllExcept(ids);
    showToast(`Showing ${continent}`, '');
  }

  function showToast(msg, type = '') {
    const container = document.querySelector('.toast-container');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function updateHeaderStats() {
    document.getElementById('xp-count').textContent      = Progress.xp;
    document.getElementById('streak-count').textContent  = Progress.streak;
    document.getElementById('mastered-count').textContent = Progress.masteredCount();
    MapRenderer.updateMasteryColors();
  }

  function renderProgressPanel() {
    const panel = document.getElementById('progress-panel');
    const total = Progress.totalCountries();
    const mastered = Progress.masteredCount();
    const pct = Math.round((mastered / total) * 100);

    document.getElementById('prog-percent').textContent = pct + '%';
    document.getElementById('prog-bar-fill').style.width = pct + '%';
    document.getElementById('prog-subtitle').textContent = `${mastered} of ${total} countries mastered`;

    // Continent rows
    const stats = Progress.getContinentStats();
    const contList = document.getElementById('continent-list');
    contList.innerHTML = '';
    for (const [cont, data] of Object.entries(stats)) {
      const p = Math.round((data.mastered / data.total) * 100);
      const col = (CONTINENTS[cont] || { color: '#CBD5E1' }).color;
      const row = document.createElement('div');
      row.className = 'continent-row';
      row.dataset.continent = cont;
      row.innerHTML = `
        <div class="continent-color" style="background:${col}"></div>
        <div class="continent-name">${cont}</div>
        <div class="continent-prog">${data.mastered}/${data.total}</div>
        <div class="continent-bar">
          <div class="continent-bar-fill" style="width:${p}%;background:${col}"></div>
        </div>
      `;
      row.addEventListener('click', () => { filterByCcontinent(cont); switchTab('explore'); });
      contList.appendChild(row);
    }

    // Achievements
    const achs = Progress.getAllAchievements();
    const achGrid = document.getElementById('achievements-grid');
    achGrid.innerHTML = '';
    for (const ach of achs) {
      const earned = Progress.isAchievementEarned(ach.id);
      const chip = document.createElement('div');
      chip.className = 'achievement-chip ' + (earned ? 'earned' : 'locked');
      chip.innerHTML = `
        <div class="achievement-icon">${ach.icon}</div>
        <div class="achievement-name">${ach.name}</div>
        <div class="achievement-desc">${ach.desc}</div>
      `;
      achGrid.appendChild(chip);
    }
  }

  return { init, updateHeaderStats, switchTab };
})();

// ─── Boot ───
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
