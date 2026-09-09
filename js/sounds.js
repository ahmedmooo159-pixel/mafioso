// ============================================================
// sounds.js — Sound Effects بسيطة (Web Audio API)
// ============================================================

const Sounds = (() => {
  let audioCtx = null;
  let enabled = true;

  function getCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        enabled = false;
      }
    }
    return audioCtx;
  }

  function resumeCtx() {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // بيعمل نغمة بسيطة
  function playTone(frequency, duration, type = 'sine', volume = 0.3, delay = 0) {
    if (!enabled) return;
    const ctx = resumeCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
      gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    } catch (e) {}
  }

  // طبلة (kick drum) بسيطة
  function playDrum(delay = 0) {
    if (!enabled) return;
    const ctx = resumeCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.5);
      gain.gain.setValueAtTime(1, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.5);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.5);
    } catch (e) {}
  }

  // ============================================================
  // Sound Effects
  // ============================================================

  // صوت كشف الدور
  function playReveal() {
    playTone(440, 0.1, 'sine', 0.3);
    playTone(660, 0.1, 'sine', 0.3, 0.12);
    playTone(880, 0.3, 'sine', 0.4, 0.24);
  }

  // صوت تشويق (وقت الإعلان عن نتيجة التصويت)
  function playSuspense() {
    for (let i = 0; i < 5; i++) {
      playDrum(i * 0.15);
    }
  }

  // صوت الإلغاء (لما حد بيتقصى)
  function playElimination() {
    playTone(300, 0.2, 'sawtooth', 0.4);
    playTone(250, 0.2, 'sawtooth', 0.4, 0.25);
    playTone(200, 0.4, 'sawtooth', 0.3, 0.5);
  }

  // صوت فوز (الأبرياء كسبوا)
  function playWin() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      playTone(freq, 0.3, 'sine', 0.4, i * 0.15);
    });
  }

  // صوت خسارة (المافيوسو كسب)
  function playLose() {
    const notes = [400, 350, 300, 250];
    notes.forEach((freq, i) => {
      playTone(freq, 0.35, 'sawtooth', 0.3, i * 0.18);
    });
  }

  // صوت الـ Twist
  function playTwist() {
    playTone(200, 0.1, 'square', 0.3);
    playTone(400, 0.1, 'square', 0.3, 0.12);
    playTone(200, 0.1, 'square', 0.3, 0.24);
    playTone(600, 0.4, 'sine', 0.4, 0.36);
  }

  // صوت تيك (عند انتقال التليفون)
  function playTick() {
    playTone(800, 0.05, 'square', 0.2);
  }

  // صوت طبلة بطيء (بداية الجولة النهائية)
  function playFinalRound() {
    for (let i = 0; i < 3; i++) {
      playDrum(i * 0.3);
    }
  }

  function setEnabled(val) { enabled = val; }
  function isEnabled() { return enabled; }

  return {
    playReveal,
    playSuspense,
    playElimination,
    playWin,
    playLose,
    playTwist,
    playTick,
    playFinalRound,
    setEnabled,
    isEnabled
  };
})();
