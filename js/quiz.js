// ─── Quiz Engine ───
const Quiz = (() => {

  let mode = 'capital'; // 'capital' | 'name' | 'findit' | 'flashcard'
  let queue = [];
  let current = null;
  let sessionCorrect = 0, sessionWrong = 0, sessionStreak = 0;
  let answered = false;
  let fcFlipped = false;

  // DOM refs (populated on init)
  let D = {};

  const COUNTRY_IDS = () => Object.keys(COUNTRIES);

  // ─── Weighted queue: lower mastery = more likely ───
  function buildQueue(count = 10) {
    const ids = COUNTRY_IDS();
    const weighted = [];
    for (const id of ids) {
      const m = Progress.getMastery(id);
      const weight = Math.max(1, 6 - m); // mastery 0→6, mastery 5→1
      for (let i = 0; i < weight; i++) weighted.push(id);
    }
    shuffle(weighted);
    const picked = [];
    const seen = new Set();
    for (const id of weighted) {
      if (!seen.has(id)) { picked.push(id); seen.add(id); }
      if (picked.length >= count) break;
    }
    return picked;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getWrongChoices(correctId, field, count = 3) {
    const ids = COUNTRY_IDS().filter(id => id !== correctId);
    shuffle(ids);
    return ids.slice(0, count).map(id => COUNTRIES[id][field]);
  }

  // ─── Init ───
  function init() {
    D = {
      panel:       document.getElementById('quiz-panel'),
      modeBtns:    document.querySelectorAll('.mode-btn'),
      content:     document.querySelector('.quiz-content'),
      question:    document.querySelector('.quiz-question'),
      prompt:      document.querySelector('.quiz-prompt'),
      flag:        document.querySelector('.quiz-flag'),
      countryName: document.querySelector('.quiz-country-name'),
      subtitle:    document.querySelector('.quiz-subtitle'),
      choices:     document.querySelector('.choices-grid'),
      typeWrap:    document.querySelector('.type-answer-wrap'),
      typeInput:   document.querySelector('.type-answer-wrap input'),
      submitBtn:   document.querySelector('.submit-btn'),
      feedback:    document.querySelector('.answer-feedback'),
      feedbackIcon:document.querySelector('.feedback-icon'),
      feedbackText:document.querySelector('.feedback-msg'),
      nextBtn:     document.querySelector('.next-btn'),
      scoreCorrect:document.getElementById('sq-correct'),
      scoreWrong:  document.getElementById('sq-wrong'),
      scoreStreak: document.getElementById('sq-streak'),
      findItOverlay: document.getElementById('find-it-overlay'),
      findItTarget:  document.getElementById('fi-target-name'),
      findItFlag:    document.getElementById('fi-target-flag'),
      fiCorrect:     document.getElementById('fi-correct'),
      fiWrong:       document.getElementById('fi-wrong'),
    };

    // Mode buttons
    D.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        D.modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setMode(btn.dataset.mode);
      });
    });

    D.submitBtn.addEventListener('click', submitTyped);
    D.typeInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitTyped(); });
    D.nextBtn.addEventListener('click', nextQuestion);
  }

  function setMode(m) {
    mode = m;
    sessionCorrect = sessionWrong = sessionStreak = 0;
    queue = buildQueue(20);
    answered = false;
    MapRenderer.clearAllHighlights();

    if (mode === 'findit') {
      D.content.style.display = 'none';
      D.findItOverlay.classList.add('visible');
      startFindIt();
    } else {
      D.findItOverlay.classList.remove('visible');
      D.content.style.display = 'flex';
      nextQuestion();
    }

    updateScoreBar();
  }

  // ─── Capital Quiz & Name Quiz ───
  function nextQuestion() {
    answered = false;
    D.feedback.classList.remove('show', 'correct', 'wrong');
    D.nextBtn.classList.remove('show');
    D.typeInput.classList.remove('correct', 'wrong');
    D.typeInput.value = '';

    if (queue.length === 0) queue = buildQueue(20);
    current = queue.shift();
    const c = COUNTRIES[current];

    MapRenderer.clearAllHighlights();
    if (mode !== 'flashcard') {
      D.question.style.display = '';
      MapRenderer.highlightCountry(current, 'selected');
    }

    if (mode === 'capital') {
      D.prompt.textContent = 'What is the capital of...';
      D.flag.textContent = c.flag;
      D.countryName.textContent = c.name;
      D.subtitle.textContent = c.continent;
      renderChoices('capital', current, c.capital);
    } else if (mode === 'name') {
      D.prompt.textContent = 'Which country has this capital?';
      D.flag.textContent = c.flag;
      D.countryName.textContent = c.capital;
      D.subtitle.textContent = c.continent;
      renderChoices('name', current, c.name);
    } else if (mode === 'type') {
      D.prompt.textContent = 'Type the capital of...';
      D.flag.textContent = c.flag;
      D.countryName.textContent = c.name;
      D.subtitle.textContent = c.continent;
      showTypeInput();
    } else if (mode === 'flashcard') {
      showFlashcard(current, c);
    }
  }

  function renderChoices(field, correctId, correctValue) {
    D.choices.style.display = 'grid';
    D.typeWrap.style.display = 'none';

    const wrongs = getWrongChoices(correctId, field);
    const allChoices = shuffle([correctValue, ...wrongs]);

    D.choices.innerHTML = '';
    allChoices.forEach(val => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = val;
      btn.addEventListener('click', () => selectChoice(btn, val, correctValue, correctId));
      D.choices.appendChild(btn);
    });
  }

  function selectChoice(btn, selected, correct, countryId) {
    if (answered) return;
    answered = true;
    Sounds.click();

    const isCorrect = selected === correct;
    document.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b.textContent === correct) b.classList.add('correct');
    });

    if (isCorrect) {
      btn.classList.add('correct');
      handleCorrect(countryId);
    } else {
      btn.classList.add('wrong');
      handleWrong(countryId, correct);
    }
  }

  function showTypeInput() {
    D.choices.style.display = 'none';
    D.typeWrap.style.display = 'flex';
    setTimeout(() => D.typeInput.focus(), 50);
  }

  function submitTyped() {
    if (answered) return;
    const c = COUNTRIES[current];
    const answer = D.typeInput.value.trim();
    if (!answer) return;
    answered = true;

    const correct = c.capital;
    const isCorrect = normalizeStr(answer) === normalizeStr(correct);

    if (isCorrect) {
      D.typeInput.classList.add('correct');
      handleCorrect(current);
    } else {
      D.typeInput.classList.add('wrong');
      handleWrong(current, correct);
    }
  }

  function normalizeStr(s) {
    return s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function handleCorrect(countryId) {
    Sounds.correct();
    sessionCorrect++;
    sessionStreak++;
    const { xpGain, newMastery } = Progress.recordCorrect(countryId);
    MapRenderer.highlightCountry(countryId, 'correct');
    MapRenderer.updateMasteryColors();

    showFeedback(true, `+${xpGain} XP! ${masteryText(newMastery)}`);
    updateScoreBar();

    if (sessionStreak % 5 === 0) Confetti.burst(60);
    if (sessionStreak >= 3) Sounds.xp();

    App.updateHeaderStats();

    const newAchs = Progress.checkAchievements();
    if (newAchs.length) {
      newAchs.forEach(a => {
        showToast(`${a.icon} Achievement: ${a.name}!`, 'xp');
        Sounds.achievement();
      });
    }
  }

  function handleWrong(countryId, correctAnswer) {
    Sounds.wrong();
    sessionWrong++;
    sessionStreak = 0;
    Progress.recordWrong(countryId);
    MapRenderer.highlightCountry(countryId, 'wrong');
    showFeedback(false, `The answer was: ${correctAnswer}`);
    updateScoreBar();
    App.updateHeaderStats();
  }

  function masteryText(m) {
    if (m === 1) return '📖 Learning';
    if (m === 2) return '✏️ Practicing';
    if (m === 3) return '⭐ Mastered!';
    if (m === 4) return '🌟 Expert!';
    if (m === 5) return '🏆 Perfect!';
    return '';
  }

  function showFeedback(isCorrect, msg) {
    D.feedback.className = 'answer-feedback show ' + (isCorrect ? 'correct' : 'wrong');
    D.feedbackIcon.textContent = isCorrect ? '✅' : '❌';
    D.feedbackText.textContent = msg;
    D.nextBtn.classList.add('show');
  }

  function updateScoreBar() {
    D.scoreCorrect.textContent = sessionCorrect;
    D.scoreWrong.textContent = sessionWrong;
    D.scoreStreak.textContent = sessionStreak;
  }

  // ─── Flashcard Mode ───
  function showFlashcard(id, c) {
    fcFlipped = false;
    D.question.style.display = 'none';
    D.choices.style.display = 'none';
    D.typeWrap.style.display = 'none';
    D.feedback.classList.remove('show');
    D.nextBtn.classList.remove('show');

    const cardEl = document.getElementById('flashcard-el');
    if (cardEl) cardEl.remove();
    const oldBtns = document.getElementById('fc-btns');
    if (oldBtns) oldBtns.remove();

    const card = document.createElement('div');
    card.id = 'flashcard-el';
    card.style.cssText = `
      background: linear-gradient(135deg, #EEF4FF, #E0EAFF);
      border-radius: 16px;
      border: 2.5px solid #D1DFF5;
      padding: 30px 20px;
      text-align: center;
      cursor: pointer;
      user-select: none;
      min-height: 160px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: transform 0.1s;
    `;
    card.innerHTML = `
      <div style="font-size:3.5rem">${c.flag}</div>
      <div style="font-size:1.4rem;font-weight:800;color:#1E2A4A">${c.name}</div>
      <div style="font-size:0.8rem;color:#6B80A8;font-weight:600">Tap to reveal capital →</div>
    `;

    const front = card.innerHTML;
    const back = `
      <div style="font-size:3.5rem">${c.flag}</div>
      <div style="font-size:0.8rem;font-weight:700;color:#6B80A8;text-transform:uppercase;letter-spacing:0.5px">Capital of ${c.name}</div>
      <div style="font-size:1.8rem;font-weight:900;color:#1E2A4A">${c.capital}</div>
    `;

    card.addEventListener('click', () => {
      if (!fcFlipped) {
        card.innerHTML = back;
        fcFlipped = true;
        // Show know / don't know buttons
        const btns = document.createElement('div');
        btns.id = 'fc-btns';
        btns.style.cssText = 'display:flex;gap:10px;margin-top:4px;';
        const know = document.createElement('button');
        know.className = 'choice-btn correct';
        know.style.cssText = 'flex:1;padding:12px;font-size:0.9rem;';
        know.textContent = '✅ I knew it!';
        const dontKnow = document.createElement('button');
        dontKnow.className = 'choice-btn wrong';
        dontKnow.style.cssText = 'flex:1;padding:12px;font-size:0.9rem;';
        dontKnow.textContent = '❌ Still learning';
        know.addEventListener('click', e => { e.stopPropagation(); handleCorrect(id); nextQuestion(); });
        dontKnow.addEventListener('click', e => { e.stopPropagation(); handleWrong(id, c.capital); nextQuestion(); });
        btns.appendChild(know);
        btns.appendChild(dontKnow);
        D.content.appendChild(btns);
      }
    });

    D.content.appendChild(card);
  }

  // ─── Find It Mode ───
  let findItCurrent = null;
  let fiCorrect = 0, fiWrong = 0;

  function startFindIt() {
    fiCorrect = 0; fiWrong = 0;
    queue = buildQueue(20);
    nextFindIt();
  }

  function nextFindIt() {
    if (queue.length === 0) queue = buildQueue(20);
    findItCurrent = queue.shift();
    const c = COUNTRIES[findItCurrent];
    D.findItTarget.textContent = c.name;
    D.findItFlag.textContent = c.flag;
    D.fiCorrect.textContent = fiCorrect;
    D.fiWrong.textContent = fiWrong;
    MapRenderer.clearAllHighlights();
    MapRenderer.highlightCountry(findItCurrent, 'target');
  }

  function handleFindItClick(numId) {
    if (!findItCurrent) return;
    const isCorrect = numId === findItCurrent;
    if (isCorrect) {
      fiCorrect++;
      Sounds.correct();
      handleCorrect(findItCurrent);
      MapRenderer.highlightCountry(numId, 'correct');
      setTimeout(() => nextFindIt(), 900);
    } else {
      fiWrong++;
      Sounds.wrong();
      MapRenderer.highlightCountry(numId, 'wrong');
      Progress.recordWrong(findItCurrent);
      // Flash wrong, keep target pulsing
      setTimeout(() => {
        MapRenderer.highlightCountry(numId, null);
      }, 700);
    }
    D.fiCorrect.textContent = fiCorrect;
    D.fiWrong.textContent = fiWrong;
    sessionStreak = isCorrect ? sessionStreak + 1 : 0;
    updateScoreBar();
    App.updateHeaderStats();
  }

  function showToast(msg, type = '') {
    const container = document.querySelector('.toast-container');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  return {
    init,
    start() { setMode(mode); },
    setMode,
    nextQuestion,
    handleFindItClick,
    getMode: () => mode
  };
})();
