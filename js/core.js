'use strict';
/* =========================================================
   CORE — constants, helpers, input (keyboard + gamepad), audio
   ========================================================= */

const W = 960, H = 540;      // logical screen size
const GROUND = 470;          // street level (y of feet on the ground)
const GRAV = 1900;           // px/s^2
const FONT = '"Bungee", Impact, "Arial Black", sans-serif';

const rand   = (a, b) => a + Math.random() * (b - a);
const randi  = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const clamp  = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp   = (a, b, t) => a + (b - a) * t;
const chance = p => Math.random() < p;
const pick   = arr => arr[Math.floor(Math.random() * arr.length)];
const sign   = v => (v < 0 ? -1 : v > 0 ? 1 : 0);

function circleRect(cx, cy, r, b) {
  const nx = clamp(cx, b.x, b.x + b.w), ny = clamp(cy, b.y, b.y + b.h);
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}

// Small seeded RNG so a city's skyline is the same every visit.
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Lighten (a>0) or darken (a<0) a #rrggbb colour.
function shade(hex, a) {
  const c = parseInt(hex.slice(1), 16);
  const f = v => clamp(Math.round(a < 0 ? v * (1 + a) : v + (255 - v) * a), 0, 255);
  const r = f(c >> 16), g = f((c >> 8) & 255), b = f(c & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/* ---------------- Input ---------------- */
const KEYMAP = {
  left:    ['ArrowLeft', 'KeyA'],
  right:   ['ArrowRight', 'KeyD'],
  up:      ['ArrowUp', 'KeyW'],
  down:    ['ArrowDown', 'KeyS'],
  punch:   ['KeyZ', 'KeyJ'],
  jump:    ['KeyX', 'KeyK', 'Space'],
  special: ['KeyC', 'KeyL'],
  start:   ['Enter', 'NumpadEnter'],
  pause:   ['KeyP', 'Escape'],
  mute:    ['KeyM'],
};

const Input = {
  keys: new Set(), pressedKeys: new Set(), pad: {}, padPrev: {},
  held(a) { return KEYMAP[a].some(k => this.keys.has(k)) || !!this.pad[a]; },
  hit(a)  { return KEYMAP[a].some(k => this.pressedKeys.has(k)) || (!!this.pad[a] && !this.padPrev[a]); },
  pollPad() {
    this.padPrev = this.pad;
    const p = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      const b = i => gp.buttons[i] && gp.buttons[i].pressed;
      p.left    = p.left    || ax < -0.4 || b(14);
      p.right   = p.right   || ax >  0.4 || b(15);
      p.up      = p.up      || ay < -0.4 || b(12);
      p.down    = p.down    || ay >  0.4 || b(13);
      p.jump    = p.jump    || b(0);
      p.punch   = p.punch   || b(2) || b(1);
      p.special = p.special || b(3) || b(5);
      p.start   = p.start   || b(9);
      p.pause   = p.pause   || b(8);
    }
    this.pad = p;
  },
  endFrame() { this.pressedKeys.clear(); },
};

const BLOCKED = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
addEventListener('keydown', e => {
  if (BLOCKED.has(e.code)) e.preventDefault();
  if (!e.repeat) Input.pressedKeys.add(e.code);
  Input.keys.add(e.code);
  Sfx.unlock();
});
addEventListener('keyup', e => Input.keys.delete(e.code));
addEventListener('blur', () => Input.keys.clear());
addEventListener('pointerdown', () => Sfx.unlock());

/* ---------------- Audio (all synthesized, no sample files) ---------------- */
const Sfx = {
  ctx: null, master: null, noiseBuf: null, muted: false,
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  tone(f, dur, type = 'square', vol = 0.3, f2 = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.3, freq = 1200, type = 'lowpass', delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const fl = this.ctx.createBiquadFilter();
    fl.type = type; fl.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.02);
  },
  play(n) {
    switch (n) {
      case 'punch':   this.noise(0.12, 0.45, 900); this.tone(140, 0.1, 'square', 0.12, 60); break;
      case 'glass':   this.noise(0.2, 0.25, 5000, 'highpass'); this.tone(2400, 0.08, 'triangle', 0.08, 3200); break;
      case 'crumble': this.noise(1.6, 0.55, 280); this.tone(60, 1.3, 'sawtooth', 0.12, 28); break;
      case 'eat':     this.tone(440, 0.14, 'sine', 0.35, 110); this.tone(260, 0.1, 'square', 0.07, 90, 0.1); break;
      case 'yuck':    this.tone(220, 0.35, 'sawtooth', 0.2, 70); this.noise(0.3, 0.2, 4000, 'highpass'); break;
      case 'coin':    this.tone(988, 0.08, 'square', 0.12); this.tone(1319, 0.2, 'square', 0.12, null, 0.08); break;
      case 'shoot':   this.tone(900, 0.05, 'square', 0.05, 300); break;
      case 'cannon':  this.noise(0.25, 0.3, 700); this.tone(120, 0.2, 'square', 0.1, 50); break;
      case 'boom':    this.noise(0.7, 0.55, 450); this.tone(90, 0.5, 'sine', 0.35, 28); break;
      case 'hurt':    this.tone(280, 0.18, 'square', 0.14, 90); break;
      case 'jump':    this.tone(170, 0.15, 'triangle', 0.15, 420); break;
      case 'whiff':   this.noise(0.08, 0.12, 2500, 'bandpass'); break;
      case 'select':  this.tone(660, 0.07, 'square', 0.12); break;
      case 'confirm': this.tone(440, 0.1, 'square', 0.15); this.tone(880, 0.18, 'square', 0.15, null, 0.1); break;
      case 'poof':    this.noise(0.5, 0.3, 2000, 'bandpass'); this.tone(600, 0.4, 'sine', 0.2, 1500); break;
      case 'blink':   this.tone(1400, 0.25, 'sine', 0.15, 180); this.noise(0.25, 0.12, 3000, 'highpass'); break;
      case 'chomp':   this.noise(0.1, 0.35, 1500, 'bandpass'); this.tone(200, 0.08, 'square', 0.1, 120); break;
      case 'dash':    this.tone(120, 0.3, 'sawtooth', 0.15, 600); this.noise(0.3, 0.2, 800); break;
      case 'roar':    this.tone(70, 0.9, 'sawtooth', 0.28, 45); this.tone(105, 0.9, 'sawtooth', 0.18, 60); this.noise(0.9, 0.25, 500); break;
      case 'clear':   [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'square', 0.12, null, i * 0.12)); break;
      case 'over':    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.18, null, i * 0.22)); break;
    }
  },
};
