// ─── Web Audio API Sound Effects ───
const Sounds = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function tone(freq, type, duration, gain = 0.3, delay = 0) {
    const c = getCtx();
    const osc = c.createOscillator();
    const vol = c.createGain();
    osc.connect(vol);
    vol.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    vol.gain.setValueAtTime(0, c.currentTime + delay);
    vol.gain.linearRampToValueAtTime(gain, c.currentTime + delay + 0.01);
    vol.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.01);
  }

  return {
    correct() {
      tone(523, 'sine', 0.12, 0.25);
      tone(659, 'sine', 0.12, 0.25, 0.12);
      tone(784, 'sine', 0.2,  0.25, 0.24);
    },
    wrong() {
      tone(220, 'sawtooth', 0.1, 0.18);
      tone(180, 'sawtooth', 0.15, 0.18, 0.1);
    },
    click() {
      tone(440, 'sine', 0.06, 0.12);
    },
    levelUp() {
      [523,659,784,1047].forEach((f, i) => tone(f, 'sine', 0.2, 0.3, i * 0.12));
    },
    achievement() {
      [784,880,988,1047,1319].forEach((f, i) => tone(f, 'triangle', 0.18, 0.28, i * 0.1));
    },
    xp() {
      tone(880, 'sine', 0.08, 0.15);
      tone(1047, 'sine', 0.08, 0.15, 0.08);
    }
  };
})();
