// Tidebound Bazaar — tiny synthesized sounds. WebAudio oscillators only,
// no audio files, no network. M toggles sound on and off.
let ctx = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = on;
}

export function isSoundEnabled() {
  return enabled;
}

function tone(freq, seconds, type, gain, when) {
  if (!enabled) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + (when || 0);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + seconds + 0.05);
  } catch (err) {
    // Sound is garnish: a browser without audio still plays the game.
  }
}

export function playClick() { tone(660, 0.07, 'triangle', 0.08); }
export function playCoin() { tone(988, 0.09, 'sine', 0.12); tone(1319, 0.14, 'sine', 0.1, 0.07); }
export function playDeal() { tone(392, 0.08, 'triangle', 0.09); tone(523, 0.08, 'triangle', 0.09, 0.06); tone(659, 0.1, 'triangle', 0.09, 0.12); }
export function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.11));
}
export function playLose() {
  [392, 330, 262, 196].forEach((f, i) => tone(f, 0.26, 'sawtooth', 0.06, i * 0.13));
}
export function playStorm() { tone(180, 0.4, 'sawtooth', 0.08); tone(90, 0.5, 'sine', 0.1, 0.05); }
