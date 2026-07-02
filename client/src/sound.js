// Web Audioで簡単な効果音を合成（音源ファイル不要）。ユーザー操作後に鳴るので自動再生制限もOK。
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function tone(freq, start, dur, type = 'sine', gain = 0.2) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function playClick() { if (!muted) tone(680, 0, 0.07, 'square', 0.12); }
export function playReveal() { if (muted) return; tone(440, 0, 0.12, 'triangle', 0.16); tone(660, 0.09, 0.16, 'triangle', 0.16); }
// 全員一致のファンファーレ（ドミソド）
export function playMatch() { if (muted) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.28, 'sine', 0.22)); }
// クリアの盛大なファンファーレ
export function playClear() { if (muted) return; [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.13, 0.45, 'triangle', 0.24)); }
