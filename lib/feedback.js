// ─── Тактильный и звуковой отклик ───
let audioCtx = null;

function isSoundOn() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("zp_sound") !== "off";
}

export function toggleSound() {
  const on = isSoundOn();
  localStorage.setItem("zp_sound", on ? "off" : "on");
  return !on;
}

export function soundEnabled() {
  return isSoundOn();
}

export function vibrate(pattern = 10) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function tone(freq, dur = 0.12, type = "sine", gain = 0.06, when = 0) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const t = audioCtx.currentTime + when;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur);
  } catch (e) {
    /* звук недоступен — тихо пропускаем */
  }
}

export function tapFeedback() {
  vibrate(8);
}

export function goodFeedback() {
  vibrate([10, 30, 10]);
  if (isSoundOn()) {
    tone(523.25, 0.1);
    tone(783.99, 0.16, "sine", 0.05, 0.07);
  }
}

export function badFeedback() {
  vibrate(40);
  if (isSoundOn()) tone(196, 0.18, "triangle", 0.05);
}

export function finishFeedback() {
  vibrate([15, 40, 15, 40, 30]);
  if (isSoundOn()) {
    tone(523.25, 0.12);
    tone(659.25, 0.12, "sine", 0.05, 0.1);
    tone(783.99, 0.2, "sine", 0.06, 0.2);
    tone(1046.5, 0.3, "sine", 0.05, 0.32);
  }
}
