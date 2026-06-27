// ─── Progress & XP System ───
const Progress = (() => {
  const KEY = 'worldwise_v1';

  const ACHIEVEMENTS = [
    { id: 'first_correct',  icon: '🌟', name: 'First Star!',      desc: 'Got your first correct answer',    check: s => s.totalCorrect >= 1 },
    { id: 'ten_correct',    icon: '🏅', name: '10 Right!',        desc: 'Answered 10 questions correctly',   check: s => s.totalCorrect >= 10 },
    { id: 'fifty_correct',  icon: '🥈', name: '50 Right!',        desc: 'Answered 50 questions correctly',   check: s => s.totalCorrect >= 50 },
    { id: 'hundred_correct',icon: '🥇', name: '100 Right!',       desc: 'Answered 100 questions correctly',  check: s => s.totalCorrect >= 100 },
    { id: 'streak_3',       icon: '🔥', name: '3 Day Streak!',    desc: 'Practiced 3 days in a row',         check: s => s.streak >= 3 },
    { id: 'streak_7',       icon: '🌈', name: 'Week Warrior!',    desc: 'Practiced 7 days in a row',         check: s => s.streak >= 7 },
    { id: 'mastered_5',     icon: '⭐', name: 'Rising Star',      desc: 'Mastered 5 countries',              check: s => masteredCount(s) >= 5 },
    { id: 'mastered_20',    icon: '🌍', name: 'World Explorer',   desc: 'Mastered 20 countries',             check: s => masteredCount(s) >= 20 },
    { id: 'mastered_50',    icon: '🗺️', name: 'Cartographer',     desc: 'Mastered 50 countries',             check: s => masteredCount(s) >= 50 },
    { id: 'mastered_100',   icon: '🏆', name: 'World Master',     desc: 'Mastered 100 countries',            check: s => masteredCount(s) >= 100 },
    { id: 'europe_done',    icon: '🇪🇺', name: 'Europe Expert',   desc: 'Mastered all of Europe',            check: s => continentMastered(s, 'Europe') },
    { id: 'africa_done',    icon: '🌍', name: 'Africa Expert',    desc: 'Mastered all of Africa',            check: s => continentMastered(s, 'Africa') },
    { id: 'asia_done',      icon: '🌏', name: 'Asia Expert',      desc: 'Mastered all of Asia',              check: s => continentMastered(s, 'Asia') },
    { id: 'americas_done',  icon: '🌎', name: 'Americas Expert',  desc: 'Mastered all Americas',             check: s => continentMastered(s, 'North America') && continentMastered(s, 'South America') },
    { id: 'xp_500',         icon: '💫', name: 'XP Grinder',       desc: 'Earned 500 XP',                     check: s => s.xp >= 500 },
    { id: 'xp_2000',        icon: '✨', name: 'XP Champion',      desc: 'Earned 2000 XP',                    check: s => s.xp >= 2000 },
  ];

  function masteredCount(s) {
    return Object.values(s.mastery || {}).filter(v => v >= 3).length;
  }

  function continentMastered(s, continent) {
    const ids = Object.entries(COUNTRIES)
      .filter(([,c]) => c.continent === continent)
      .map(([id]) => id);
    return ids.length > 0 && ids.every(id => (s.mastery[id] || 0) >= 3);
  }

  function defaultState() {
    return {
      xp: 0,
      streak: 0,
      lastDate: null,
      mastery: {},       // id -> 0-5
      totalCorrect: 0,
      totalWrong: 0,
      achievements: [],  // array of earned ids
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      return { ...defaultState(), ...JSON.parse(raw) };
    } catch { return defaultState(); }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  // ─── Public API ───
  let _state = load();

  // Update streak on load
  (function checkStreak() {
    const today = new Date().toDateString();
    if (_state.lastDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (_state.lastDate === yesterday) {
      _state.streak = (_state.streak || 0) + 1;
    } else if (_state.lastDate !== today) {
      _state.streak = 1;
    }
    _state.lastDate = today;
    save(_state);
  })();

  return {
    get xp()      { return _state.xp; },
    get streak()  { return _state.streak; },
    get mastery() { return _state.mastery; },

    getMastery(id) { return _state.mastery[id] || 0; },

    masteredCount() { return masteredCount(_state); },

    totalCountries() { return Object.keys(COUNTRIES).length; },

    recordCorrect(countryId, baseXP = 10) {
      _state.totalCorrect++;
      const m = _state.mastery[countryId] || 0;
      const newM = Math.min(5, m + 1);
      _state.mastery[countryId] = newM;
      // Bonus XP for mastery milestones
      let xpGain = baseXP;
      if (newM === 3) xpGain += 15; // mastered bonus
      if (newM === 5) xpGain += 25; // expert bonus
      _state.xp += xpGain;
      save(_state);
      return { xpGain, newMastery: newM };
    },

    recordWrong(countryId) {
      _state.totalWrong++;
      const m = _state.mastery[countryId] || 0;
      _state.mastery[countryId] = Math.max(0, m - 1);
      save(_state);
    },

    checkAchievements() {
      const newlyEarned = [];
      for (const ach of ACHIEVEMENTS) {
        if (!_state.achievements.includes(ach.id) && ach.check(_state)) {
          _state.achievements.push(ach.id);
          newlyEarned.push(ach);
        }
      }
      if (newlyEarned.length) save(_state);
      return newlyEarned;
    },

    isAchievementEarned(id) { return _state.achievements.includes(id); },

    getAllAchievements() { return ACHIEVEMENTS; },

    getContinentStats() {
      const stats = {};
      for (const [id, c] of Object.entries(COUNTRIES)) {
        const cont = c.continent;
        if (!stats[cont]) stats[cont] = { total: 0, mastered: 0 };
        stats[cont].total++;
        if ((_state.mastery[id] || 0) >= 3) stats[cont].mastered++;
      }
      return stats;
    },

    reset() {
      _state = defaultState();
      save(_state);
    }
  };
})();
