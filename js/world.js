'use strict';
/* =========================================================
   WORLD — tour stops, effects, buildings, humans, military
   ========================================================= */

/* ---------------- Tour stops ---------------- */
// tod: 'day' | 'dusk' | 'night'. landmark: a silhouette drawn on the horizon.
const CITIES = [
  { name: 'PEORIA', sub: 'Illinois, USA', sky: ['#5fb0e6', '#d8f1ff'], tod: 'day', far: '#8fb0c8',
    ground: '#47474e', walk: '#8f8b85', colors: ['#b5653d', '#9b8a76', '#c9a66b', '#7f8794', '#a34c3a'], landmark: 'water' },
  { name: 'CHICAGO', sub: 'Illinois, USA', sky: ['#4a7fb8', '#cfe2f0'], tod: 'day', far: '#6f8aa3',
    ground: '#34363c', walk: '#8d8f94', colors: ['#5d6b7a', '#8a949f', '#3f4c5a', '#a35c3d', '#6f7f90'], landmark: 'skyscraper' },
  { name: 'LAS VEGAS', sub: 'Nevada, USA', sky: ['#120726', '#7a1f6b'], tod: 'night', far: '#3b1c4f',
    ground: '#2a2230', walk: '#5c4a62', colors: ['#c2368f', '#3b86c6', '#d9a42c', '#6a3bb0', '#2fb59a'], landmark: 'strip' },
  { name: 'SAN FRANCISCO', sub: 'California, USA', sky: ['#f08a5d', '#fbe3c0'], tod: 'dusk', far: '#a86a63',
    ground: '#3a3a42', walk: '#a79d92', colors: ['#e8d7c0', '#c96a5a', '#8fb2c4', '#f0c987', '#a7b88a'], landmark: 'bridge' },
  { name: 'MEXICO CITY', sub: 'Mexico', sky: ['#3d9bd6', '#fde8b5'], tod: 'day', far: '#a3805f',
    ground: '#4a4038', walk: '#b79a74', colors: ['#d95f3b', '#e6b23a', '#3aa0a0', '#c4488a', '#e89a5a'], landmark: 'stepped' },
  { name: 'HAVANA', sub: 'Cuba', sky: ['#2bb8d6', '#fff0c8'], tod: 'day', far: '#6fa89a',
    ground: '#4a4a4d', walk: '#cfc4a8', colors: ['#6ec9c0', '#f0a8b8', '#f2d36b', '#e8885a', '#8fc2e8'], landmark: 'capitol' },
  { name: 'NEW YORK', sub: 'New York, USA', sky: ['#243a6b', '#f0a070'], tod: 'dusk', far: '#4b4f7a',
    ground: '#2e2e36', walk: '#7e7c82', colors: ['#8c5a44', '#6d7380', '#a08468', '#4e5868', '#b5a58f'], landmark: 'statue' },
  { name: 'DUNWICH', sub: 'Massachusetts, USA (stay off the hills)', sky: ['#0a0d12', '#2f3a2a'], tod: 'night', far: '#1a2420',
    ground: '#1c1d18', walk: '#3c3d33', colors: ['#4a4235', '#3b3a30', '#55503f', '#2f3a38'], landmark: 'stones' },
  { name: 'REYKJAVIK', sub: 'Iceland', sky: ['#04101f', '#0f3a4a'], tod: 'night', far: '#2a4a5a',
    ground: '#23282e', walk: '#4f5a63', colors: ['#c8553d', '#e3d9c6', '#3f6f8f', '#d9b64a', '#6a7480'], landmark: 'volcano' },
  { name: 'DUBLIN', sub: 'Ireland', sky: ['#8d9aa6', '#d9dfd0'], tod: 'day', far: '#6f8a74',
    ground: '#3b3d40', walk: '#85888a', colors: ['#8c4a3a', '#3f6b4f', '#b38f6a', '#5a5f68', '#c9b99a'], landmark: 'needle' },
  { name: 'LONDON', sub: 'United Kingdom', sky: ['#7f8b98', '#c9d0d6'], tod: 'day', far: '#77828d',
    ground: '#3e4046', walk: '#7d7f84', colors: ['#8a4b3a', '#6e6a66', '#9a8f80', '#5c5f66'], landmark: 'clock' },
  { name: 'AMSTERDAM', sub: 'Netherlands', sky: ['#6fb5de', '#f2f4e8'], tod: 'day', far: '#8da7a0',
    ground: '#4a4440', walk: '#a89c8a', colors: ['#8f3f35', '#a85d3f', '#6d4a3a', '#b8825a', '#5d6f7a'], landmark: 'windmills' },
  { name: 'PARIS', sub: 'France', sky: ['#e97e58', '#ffd9a3'], tod: 'dusk', far: '#b8735f',
    ground: '#3d3a40', walk: '#9b8f84', colors: ['#d9c7a3', '#cdb88f', '#bfae94', '#a89a86'], landmark: 'eiffel' },
  { name: 'BERLIN', sub: 'Germany', sky: ['#6d7a8c', '#c5ccd4'], tod: 'day', far: '#78808c',
    ground: '#38393f', walk: '#7a7b80', colors: ['#9a9488', '#6d7580', '#b0a48a', '#7e5f52', '#5a6370'], landmark: 'arch' },
  { name: 'ROME', sub: 'Italy', sky: ['#4aa3dc', '#ffe2a8'], tod: 'day', far: '#b88a6a',
    ground: '#4a423c', walk: '#c4b08e', colors: ['#d99a5f', '#c97b4a', '#e8c48a', '#b8693f', '#d8b078'], landmark: 'colosseum' },
  { name: 'VENICE', sub: 'Italy', sky: ['#6b5aa8', '#ffb98a'], tod: 'dusk', far: '#8a6f8c',
    ground: '#2f4a58', walk: '#b9a98f', colors: ['#d4806a', '#e8c39a', '#b86a5a', '#c9a15f', '#9a7f8f'], landmark: 'canal' },
  { name: 'ATHENS', sub: 'Greece', sky: ['#2e8fd8', '#e9f6ff'], tod: 'day', far: '#b9b2a0',
    ground: '#4a4a48', walk: '#d8d2c2', colors: ['#f2efe6', '#e3dccb', '#c9d8e6', '#b8c8d8', '#e8d9b0'], landmark: 'acropolis' },
  { name: 'ISTANBUL', sub: 'Turkey', sky: ['#3a3070', '#ff9a6a'], tod: 'dusk', far: '#6a4f7a',
    ground: '#3a3440', walk: '#9b8e8a', colors: ['#c97b5a', '#d9b48a', '#8a5a6a', '#b8604a', '#a89a8f'], landmark: 'minarets' },
  { name: 'MOSCOW', sub: 'Russia', sky: ['#34457a', '#d39aa2'], tod: 'dusk', far: '#55578a',
    ground: '#3a3a44', walk: '#c7c9d1', colors: ['#b9b0a2', '#9c4b45', '#d1c7b2', '#7a8290'], landmark: 'domes' },
  { name: 'CAIRO', sub: 'Egypt', sky: ['#efbe5f', '#fff1c8'], tod: 'day', far: '#d4ab70',
    ground: '#6b5a44', walk: '#c8b08a', colors: ['#d6b98a', '#c9a57a', '#b8925f', '#e0c9a0'], landmark: 'pyramids' },
  { name: 'MARRAKECH', sub: 'Morocco', sky: ['#e0954f', '#ffe3b0'], tod: 'day', far: '#b8704f',
    ground: '#6a4a38', walk: '#c9976a', colors: ['#c4603f', '#d98a5a', '#b8483a', '#e0a878', '#9c5040'], landmark: 'medina' },
  { name: 'NAIROBI', sub: 'Kenya', sky: ['#4fa8d8', '#fff3c9'], tod: 'day', far: '#7f9a6a',
    ground: '#5a4a38', walk: '#b89a70', colors: ['#d9c08a', '#a8784f', '#6f8f6a', '#c46a3f', '#8aa0a8'], landmark: 'acacia' },
  { name: 'CAPE TOWN', sub: 'South Africa', sky: ['#2f7fc4', '#bfe6f2'], tod: 'day', far: '#5a7f8f',
    ground: '#44464a', walk: '#c2b8a2', colors: ['#f2e6c9', '#d9825a', '#8fb5c9', '#c8b36a', '#a86a5a'], landmark: 'table' },
  { name: 'DUBAI', sub: 'United Arab Emirates', sky: ['#07142e', '#274a7a'], tod: 'night', far: '#1f3b62',
    ground: '#26282f', walk: '#5c6270', colors: ['#7a96b8', '#a9bccf', '#5d7a9a', '#c9d4e0', '#6f8aa8'], landmark: 'burj' },
  { name: 'MUMBAI', sub: 'India', sky: ['#c0445a', '#ffc27a'], tod: 'dusk', far: '#8a5060',
    ground: '#3d3a3a', walk: '#a8977f', colors: ['#d9a23a', '#c24a5a', '#3f8f8a', '#e07a3a', '#8a5aa8'], landmark: 'gateway' },
  { name: 'BANGKOK', sub: 'Thailand', sky: ['#0d1030', '#5a2a5a'], tod: 'night', far: '#3a2a4a',
    ground: '#2c2a30', walk: '#6a5a52', colors: ['#d4a23a', '#b83a4a', '#3a9a8a', '#e0703a', '#7a4a9a'], landmark: 'prang' },
  { name: 'HONG KONG', sub: 'China', sky: ['#7fa8c0', '#d8e4e8'], tod: 'day', far: '#6a8a9f',
    ground: '#34383c', walk: '#8a8f92', colors: ['#4f7a8f', '#7a96a8', '#9c4a4a', '#c9a14a', '#5a6a78'], landmark: 'junk' },
  { name: 'SEOUL', sub: 'South Korea', sky: ['#9ac4e8', '#f4f0e6'], tod: 'day', far: '#b8806a',
    ground: '#3c3a3a', walk: '#a49a8a', colors: ['#d9763a', '#b8483a', '#e6b04a', '#6a7f8f', '#c89a6a'], landmark: 'pagoda' },
  { name: 'TOKYO', sub: 'Japan', sky: ['#0b0f2a', '#3a2464'], tod: 'night', far: '#2a2448',
    ground: '#22222c', walk: '#4a4a58', colors: ['#3a3f58', '#4b3f63', '#2f4a5c', '#5a3d4f'], landmark: 'lattice' },
  { name: 'SYDNEY', sub: 'Australia', sky: ['#2b9ae0', '#d6f3ff'], tod: 'day', far: '#6f9aa8',
    ground: '#44464a', walk: '#cfc6b2', colors: ['#e8dcc0', '#d98a4a', '#6aa5c9', '#c9a85a', '#8a9aa8'], landmark: 'opera' },
  { name: 'BUENOS AIRES', sub: 'Argentina', sky: ['#6aa0d8', '#f6e4c8'], tod: 'day', far: '#9a8a8a',
    ground: '#42424a', walk: '#b0a59a', colors: ['#c9a28a', '#a8b8c4', '#d9c08a', '#b87a6a', '#8a98a8'], landmark: 'obelisk' },
  { name: 'RIO DE JANEIRO', sub: 'Brazil', sky: ['#ff7650', '#ffd56e'], tod: 'dusk', far: '#7c5a7a',
    ground: '#444448', walk: '#d9cfb8', colors: ['#f2e2c4', '#e8b48a', '#9fc3c1', '#e7d36b'], landmark: 'sugarloaf' },
  { name: "R'LYEH", sub: 'South Pacific (recently surfaced)', sky: ['#02130f', '#0f4e3f'], tod: 'night', far: '#0f332b',
    ground: '#10241f', walk: '#1f3d35', colors: ['#2f5a4a', '#24463c', '#3b4f45', '#2b3d3a'], landmark: 'monoliths', eldritch: true },
];

const SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#ff7eb6'];
const SKINS  = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const BILLBOARDS = ['YUM COLA', 'VOID MART', 'NAP CO.', 'SQUID INK', 'GOOD BANK', 'TOAST!', 'BIG SALE', 'EAT MORE'];

/* ---------------- Effects ---------------- */
const FX = {
  parts: [], texts: [], rings: [],
  clear() { this.parts.length = 0; this.texts.length = 0; this.rings.length = 0; },
  add(o) {
    if (this.parts.length > 900) return null;
    const p = Object.assign({ vx: 0, vy: 0, grav: 900, life: 1, size: 4, color: '#999', rot: 0, vr: 0, shape: 'sq', ground: true }, o);
    p.max = p.life; this.parts.push(p); return p;
  },
  debris(x, y, n, colors, force = 1) {
    for (let i = 0; i < n; i++) this.add({ x, y, vx: rand(-160, 160) * force, vy: rand(-260, -40) * force,
      life: rand(0.5, 1.2), size: rand(2, 6), color: pick(colors), vr: rand(-10, 10) });
  },
  glass(x, y, n) {
    for (let i = 0; i < n; i++) this.add({ x, y, vx: rand(-120, 120), vy: rand(-180, 20), life: rand(0.4, 0.9),
      size: rand(2, 4), color: pick(['#dff4ff', '#a9d8f5', '#ffffff']), shape: 'tri', vr: rand(-15, 15) });
  },
  dust(x, y, n, color = '#b8ad9e', spread = 40) {
    for (let i = 0; i < n; i++) this.add({ x: x + rand(-spread, spread), y: y + rand(-10, 10), vx: rand(-30, 30), vy: rand(-50, -10),
      grav: -20, life: rand(0.8, 1.8), size: rand(8, 18), color, shape: 'puff', ground: false });
  },
  smoke(x, y, color = '#333', size = 1) {
    this.add({ x, y, vx: rand(-15, 15), vy: rand(-40, -15), grav: -10, life: rand(0.5, 1), size: rand(5, 10) * size,
      color, shape: 'puff', ground: false });
  },
  spark(x, y, n = 5, color = '#ffe14d') {
    for (let i = 0; i < n; i++) this.add({ x, y, vx: rand(-200, 200), vy: rand(-200, 100), grav: 300, life: rand(0.15, 0.35),
      size: rand(1.5, 3), color, ground: false });
  },
  boom(x, y, s = 1) {
    for (let i = 0; i < 16; i++) this.add({ x, y, vx: rand(-200, 200) * s, vy: rand(-220, 60) * s, grav: 200,
      life: rand(0.3, 0.7), size: rand(6, 14) * s, color: pick(['#ffdf6b', '#ff9a3c', '#ff5a2a', '#fff3b0']), shape: 'puff', ground: false });
    this.ring(x, y, 50 * s, '#fff3b0', 0.35);
  },
  ring(x, y, max, color, life = 0.6) { this.rings.push({ x, y, max, color, life, t: 0 }); },
  text(x, y, str, color = '#fff', size = 16) { this.texts.push({ x, y, str, color, size, life: 1.1, t: 0 }); },
  update(dt) {
    for (const p of this.parts) {
      p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.ground && p.y > GROUND + 6) { p.y = GROUND + 6; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; }
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const t of this.texts) { t.t += dt; t.y -= 34 * dt; }
    this.texts = this.texts.filter(t => t.t < t.life);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter(r => r.t < r.life);
  },
  draw(ctx) {
    for (const p of this.parts) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      if (p.shape === 'puff') {
        ctx.globalAlpha = a * 0.6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.5 - a * 0.5), 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        if (p.shape === 'line') { ctx.fillRect(-p.len, -p.size / 2, p.len, p.size); }
        else if (p.shape === 'tri') { ctx.beginPath(); ctx.moveTo(-p.size, p.size); ctx.lineTo(p.size, p.size); ctx.lineTo(0, -p.size); ctx.fill(); }
        else ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }
    for (const r of this.rings) {
      const k = r.t / r.life;
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.color; ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.max * k, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = clamp(2 - (t.t / t.life) * 2, 0, 1);
      ctx.font = `${t.size}px ${FONT}`;
      ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  },
};

/* ---------------- Buildings ---------------- */
const FH = 38, CW = 32, BPAD = 6;   // floor height, column width, side padding
const COLLAPSE_AT = 0.4;            // a building falls once this fraction of its total window HP is gone

function makeJag() { const a = []; for (let i = 0; i < 12; i++) a.push(rand(0, 6)); return a; }

class Building {
  constructor(x, cols, floors, city, rng, d) {
    this.x = x; this.cols = cols; this.floors = floors;
    this.w = cols * CW + BPAD * 2;
    this.color = city.colors[Math.floor(rng() * city.colors.length)];
    this.trim = shade(this.color, -0.28);
    const styles = ['antenna', 'tank', 'sign', 'plain', 'ac'];
    this.style = styles[Math.floor(rng() * styles.length)];
    if ((city.landmark === 'domes' || city.landmark === 'minarets') && rng() < 0.45) this.style = 'dome';
    if (city.eldritch) this.style = rng() < 0.6 ? 'spire' : 'plain';
    this.sign = BILLBOARDS[Math.floor(rng() * BILLBOARDS.length)];
    this.sink = 0; this.sinkV = 0; this.collapsing = false; this.gone = false;
    this.shakeT = 0; this.destroyed = 0; this.dmgTaken = 0; this.maxHp = floors * cols * 3;
    this.rubble = []; for (let i = 0; i < 9; i++) this.rubble.push(rng());
    this.cells = [];
    const pSol = Math.min(0.24, 0.035 * d);
    for (let f = 0; f < floors; f++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const cell = { hp: 3, occ: null, jag: null, lit: rng() < 0.6, wave: rng() * 6, shootT: 2 + rng() * 4,
          shirt: SHIRTS[Math.floor(rng() * SHIRTS.length)], skin: SKINS[Math.floor(rng() * SKINS.length)], flash: 0 };
        const r = rng();
        if (r < 0.15) cell.occ = 'person';
        else if (r < 0.15 + pSol) cell.occ = 'soldier';
        else if (r < 0.19 + pSol) cell.occ = 'food';
        else if (r < 0.22 + pSol) cell.occ = 'toaster';
        else if (r < 0.245 + pSol) cell.occ = 'cash';
        row.push(cell);
      }
      this.cells.push(row);
    }
  }
  get alive() { return !this.collapsing && !this.gone; }
  top() { return GROUND - this.floors * FH + this.sink; }
  cellCenter(f, c) { return { x: this.x + BPAD + c * CW + CW / 2, y: this.top() + (this.floors - 1 - f) * FH + FH / 2 }; }
  cellAt(px, py) {
    if (!this.alive) return null;
    const x0 = this.x + BPAD;
    if (px < x0 || px >= x0 + this.cols * CW) return null;
    const top = this.top();
    if (py < top || py >= GROUND) return null;
    const f = this.floors - 1 - Math.floor((py - top) / FH);
    const c = Math.floor((px - x0) / CW);
    return { f, c, cell: this.cells[f][c] };
  }
  // Damage one cell. Returns true if anything was hit.
  hit(f, c, dmg, game) {
    const cell = this.cells[f][c];
    if (cell.hp <= 0) return false;
    const before = cell.hp;
    cell.hp = Math.max(0, cell.hp - dmg);
    // A window with something inside always breaks open first, so it can be grabbed.
    if (cell.occ && before > 1 && cell.hp <= 0) cell.hp = 0.5;
    this.dmgTaken += before - cell.hp;
    const { x, y } = this.cellCenter(f, c);
    this.shakeT = 0.15;
    if (before > 1 && cell.hp <= 1) { Sfx.play('glass'); FX.glass(x, y, 9); game.addScore(50); }
    if (cell.hp <= 0) {
      cell.jag = makeJag(); this.destroyed++;
      FX.debris(x, y, 10, [this.color, this.trim, '#555']);
      FX.dust(x, y, 2, '#a99', 12);
      game.addScore(100, x, y - 10);
      Sfx.play('punch');
      cell.occ = null;
    } else {
      FX.debris(x, y, 3, [this.color, this.trim]);
      if (before <= 1) Sfx.play('punch');
    }
    this.checkCollapse(game);
    return true;
  }
  checkCollapse(game) {
    if (this.collapsing) return;
    // Overall damage only: no single floor or row can bring it down early, so it pays to work the whole face.
    if (this.dmgTaken >= this.maxHp * COLLAPSE_AT) game.collapseBuilding(this);
  }
  update(dt, game) {
    if (this.shakeT > 0) this.shakeT -= dt;
    if (this.gone) return;
    if (this.collapsing) {
      this.sinkV += 160 * dt; this.sink += this.sinkV * dt;
      if (chance(dt * 40)) FX.dust(this.x + rand(0, this.w), GROUND - 4, 1, '#c8bca9', 6);
      game.shake = Math.max(game.shake, 3);
      if (this.sink >= this.floors * FH + 12) { this.gone = true; this.collapsing = false; FX.dust(this.x + this.w / 2, GROUND - 10, 10, '#c8bca9', this.w / 2); }
      return;
    }
    // Soldiers leaning out of windows take pot-shots.
    const m = game.monster;
    for (let f = 0; f < this.floors; f++) for (let c = 0; c < this.cols; c++) {
      const cell = this.cells[f][c];
      if (cell.flash > 0) cell.flash -= dt;
      if (cell.occ !== 'soldier' || cell.hp <= 0) continue;
      cell.shootT -= dt * game.stunMult('window');
      if (cell.shootT <= 0) {
        cell.shootT = rand(2.6, 4.6) / game.d;
        if (game.state === 'play' && m && !m.defeated) {
          const p = this.cellCenter(f, c);
          if (Math.hypot(m.x - p.x, m.y - m.h / 2 - p.y) < 420) { game.fire(p.x, p.y + 4, 'bullet'); cell.flash = 0.12; }
        }
      }
    }
  }
  draw(ctx, city, t, monster) {
    if (this.gone) { this.drawRubble(ctx); return; }
    const top = this.top(), x = this.x, w = this.w, bh = this.floors * FH;
    const sx = (this.shakeT > 0 || this.collapsing) ? rand(-2, 2) : 0;
    ctx.save();
    ctx.translate(sx, 0);
    ctx.beginPath(); ctx.rect(x - 30, -200, w + 60, GROUND + 200); ctx.clip();
    // body
    ctx.fillStyle = this.color; ctx.fillRect(x, top, w, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, top, 4, bh);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + w - 5, top, 5, bh);
    ctx.fillStyle = this.trim;
    for (let r = 0; r < this.floors; r++) ctx.fillRect(x, top + r * FH + FH - 3, w, 3);
    // roof
    ctx.fillRect(x - 3, top - 6, w + 6, 7);
    this.drawRoof(ctx, top, city, t);
    // windows
    const mx = monster ? monster.x : W / 2;
    for (let f = 0; f < this.floors; f++) for (let c = 0; c < this.cols; c++) {
      const cx = x + BPAD + c * CW, cy = top + (this.floors - 1 - f) * FH;
      this.drawCell(ctx, this.cells[f][c], cx, cy, city, t, f === 0, mx);
    }
    // street-level door
    if (this.cells[0][Math.floor(this.cols / 2)].hp > 0) {
      const dc = Math.floor(this.cols / 2), dx = x + BPAD + dc * CW + 8;
      ctx.fillStyle = shade(this.trim, -0.3); ctx.fillRect(dx, GROUND + this.sink - 24, 16, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(dx + 2, GROUND + this.sink - 22, 5, 20);
    }
    ctx.restore();
    // damage meter: fills toward collapse
    if (this.alive && this.dmgTaken > 0) {
      const k = Math.min(1, this.dmgTaken / (this.maxHp * COLLAPSE_AT)), by = top - 16;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x + 4, by, w - 8, 5);
      ctx.fillStyle = k > 0.75 ? '#ff4b3a' : k > 0.4 ? '#ffb23a' : '#ffe27a';
      ctx.fillRect(x + 5, by + 1, (w - 10) * k, 3);
    }
  }
  drawCell(ctx, cell, x, y, city, t, ground, mx) {
    if (cell.hp <= 0) {
      const j = cell.jag;
      ctx.fillStyle = '#1a1214';
      ctx.beginPath();
      ctx.moveTo(x + j[0], y + j[1]);
      ctx.lineTo(x + CW / 2, y + j[2]); ctx.lineTo(x + CW - j[3], y + j[4]);
      ctx.lineTo(x + CW - j[5], y + FH / 2); ctx.lineTo(x + CW - j[6], y + FH - j[7]);
      ctx.lineTo(x + CW / 2, y + FH - j[8]); ctx.lineTo(x + j[9], y + FH - j[10]);
      ctx.lineTo(x + j[11], y + FH / 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2e2c';
      ctx.fillRect(x + 6, y + FH - 9, 6, 3); ctx.fillRect(x + 16, y + FH - 8, 8, 3);
      return;
    }
    const wx = x + 6, wy = y + 7, ww = CW - 12, wh = FH - 16;
    let glass;
    if (city.tod === 'night') glass = cell.lit ? (city.eldritch ? '#7dffb0' : '#ffd86b') : '#26304a';
    else if (city.tod === 'dusk') glass = cell.lit ? '#ffc36b' : '#6d7ea0';
    else glass = '#9fd0ee';
    if (cell.hp > 1) {
      ctx.fillStyle = glass; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.moveTo(wx + 2, wy + wh - 2); ctx.lineTo(wx + 8, wy + 2); ctx.lineTo(wx + 11, wy + 2); ctx.lineTo(wx + 5, wy + wh - 2); ctx.fill();
    } else {
      ctx.fillStyle = '#2a2023'; ctx.fillRect(wx, wy, ww, wh);
    }
    // occupant
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    const ccx = wx + ww / 2, by = wy + wh;
    if (cell.occ === 'person' || cell.occ === 'soldier') {
      const scared = cell.hp <= 1;
      if (cell.occ === 'person') {
        ctx.fillStyle = cell.shirt; ctx.fillRect(ccx - 4, by - 8, 8, 8);
        ctx.fillStyle = cell.skin; ctx.beginPath(); ctx.arc(ccx, by - 11, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = cell.skin; ctx.lineWidth = 1.6; ctx.beginPath();
        if (scared) { ctx.moveTo(ccx - 4, by - 7); ctx.lineTo(ccx - 6, by - 15); ctx.moveTo(ccx + 4, by - 7); ctx.lineTo(ccx + 6, by - 15); }
        else { const wv = Math.sin(t * 8 + cell.wave) * 3; ctx.moveTo(ccx + 4, by - 7); ctx.lineTo(ccx + 7 + wv * 0.3, by - 14 + Math.abs(wv) * 0.3); }
        ctx.stroke();
      } else {
        const dir = mx < ccx ? -1 : 1;
        ctx.fillStyle = '#4d5a2c'; ctx.fillRect(ccx - 4, by - 8, 8, 8);
        ctx.fillStyle = '#e0ac69'; ctx.beginPath(); ctx.arc(ccx, by - 11, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3b4622'; ctx.beginPath(); ctx.arc(ccx, by - 12, 4, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ccx, by - 6); ctx.lineTo(ccx + dir * 9, by - 7); ctx.stroke();
        if (cell.flash > 0) { ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(ccx + dir * 10, by - 7, 3, 0, Math.PI * 2); ctx.fill(); }
      }
    } else if (cell.hp <= 1 && cell.occ) {
      if (cell.occ === 'food') {
        ctx.fillStyle = '#b5652b'; ctx.beginPath(); ctx.ellipse(ccx - 1, by - 7, 5, 4, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f3ead8'; ctx.fillRect(ccx + 2, by - 11, 4, 2); ctx.beginPath(); ctx.arc(ccx + 6, by - 11, 1.6, 0, Math.PI * 2); ctx.fill();
      } else if (cell.occ === 'toaster') {
        ctx.fillStyle = '#b8bcc4'; ctx.fillRect(ccx - 6, by - 9, 12, 9);
        ctx.fillStyle = '#555'; ctx.fillRect(ccx - 4, by - 9, 3, 2); ctx.fillRect(ccx + 1, by - 9, 3, 2);
        if (Math.sin(t * 30) > 0) { ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ccx - 6, by - 12); ctx.lineTo(ccx - 3, by - 10); ctx.lineTo(ccx - 1, by - 14); ctx.lineTo(ccx + 3, by - 11); ctx.stroke(); }
      } else if (cell.occ === 'cash') {
        ctx.fillStyle = '#3f8f3a'; ctx.beginPath(); ctx.arc(ccx, by - 5, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(ccx - 2, by - 12, 4, 3);
        ctx.fillStyle = '#d7f5b0'; ctx.font = `7px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('$', ccx, by - 2.5);
      }
    }
    ctx.restore();
    if (cell.hp > 1 && cell.hp < 3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
      ctx.beginPath(); const px = wx + ww * 0.6, py = wy + wh * 0.4;
      ctx.moveTo(px, py); ctx.lineTo(wx + 1, wy + 3); ctx.moveTo(px, py); ctx.lineTo(wx + ww - 1, wy + wh - 1);
      ctx.moveTo(px, py); ctx.lineTo(wx + 3, wy + wh - 1); ctx.moveTo(px, py); ctx.lineTo(wx + ww, wy + 2); ctx.stroke();
    } else if (cell.hp <= 1) {
      ctx.fillStyle = glass;
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 6, wy); ctx.lineTo(wx, wy + 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(wx + ww, wy + wh); ctx.lineTo(wx + ww - 5, wy + wh); ctx.lineTo(wx + ww, wy + wh - 8); ctx.fill();
    }
    ctx.fillStyle = this.trim; ctx.fillRect(wx - 2, wy + wh, ww + 4, 3);
  }
  drawRoof(ctx, top, city, t) {
    const x = this.x, w = this.w;
    ctx.fillStyle = this.trim; ctx.strokeStyle = this.trim;
    switch (this.style) {
      case 'antenna': {
        const ax = x + w * 0.7;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, top - 6); ctx.lineTo(ax, top - 44); ctx.moveTo(ax - 6, top - 30); ctx.lineTo(ax + 6, top - 30); ctx.stroke();
        if (Math.sin(t * 4) > 0) { ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(ax, top - 45, 2.5, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'tank': {
        const tx = x + w * 0.3;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 9, top - 6); ctx.lineTo(tx - 7, top - 18); ctx.moveTo(tx + 9, top - 6); ctx.lineTo(tx + 7, top - 18); ctx.stroke();
        ctx.fillStyle = shade(this.trim, 0.2); ctx.fillRect(tx - 11, top - 36, 22, 18);
        ctx.beginPath(); ctx.moveTo(tx - 12, top - 36); ctx.lineTo(tx, top - 44); ctx.lineTo(tx + 12, top - 36); ctx.fill();
        break;
      }
      case 'sign': {
        const sw = Math.min(w - 10, 88), sx = x + (w - sw) / 2;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + 10, top - 6); ctx.lineTo(sx + 10, top - 14); ctx.moveTo(sx + sw - 10, top - 6); ctx.lineTo(sx + sw - 10, top - 14); ctx.stroke();
        ctx.fillStyle = city.tod === 'night' ? '#ff4fa3' : '#f5efe0'; ctx.fillRect(sx, top - 32, sw, 18);
        ctx.fillStyle = city.tod === 'night' ? '#fff' : '#c0392b'; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center';
        ctx.fillText(this.sign, sx + sw / 2, top - 19);
        break;
      }
      case 'ac':
        ctx.fillStyle = shade(this.trim, 0.15); ctx.fillRect(x + 10, top - 16, 18, 10); ctx.fillRect(x + w - 34, top - 14, 22, 8);
        break;
      case 'dome': {
        const dx = x + w / 2;
        ctx.fillStyle = '#d4a017'; ctx.beginPath(); ctx.moveTo(dx - 16, top - 6);
        ctx.quadraticCurveTo(dx - 22, top - 30, dx, top - 44); ctx.quadraticCurveTo(dx + 22, top - 30, dx + 16, top - 6); ctx.fill();
        ctx.fillRect(dx - 1, top - 54, 2, 10);
        break;
      }
      case 'spire': {
        const dx = x + w * 0.5;
        ctx.fillStyle = shade(this.color, -0.4); ctx.beginPath(); ctx.moveTo(dx - 14, top - 6); ctx.lineTo(dx + 6, top - 70); ctx.lineTo(dx + 12, top - 6); ctx.fill();
        ctx.fillStyle = 'rgba(125,255,176,' + (0.4 + 0.3 * Math.sin(t * 2)) + ')'; ctx.beginPath(); ctx.arc(dx + 5, top - 66, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
    }
  }
  drawRubble(ctx) {
    const x = this.x, w = this.w, r = this.rubble;
    ctx.fillStyle = this.trim;
    ctx.beginPath(); ctx.moveTo(x - 10, GROUND);
    for (let i = 0; i < r.length; i++) ctx.lineTo(x - 10 + (w + 20) * (i + 0.5) / r.length, GROUND - 6 - r[i] * 20);
    ctx.lineTo(x + w + 10, GROUND); ctx.fill();
    ctx.fillStyle = this.color;
    for (let i = 0; i < r.length; i += 2) ctx.fillRect(x + w * r[i], GROUND - 8 - r[(i + 3) % r.length] * 10, 10, 6);
  }
}

/* ---------------- Street-level humans ---------------- */
class Walker {
  constructor(kind, x, dir, d) {
    this.kind = kind; this.x = x; this.y = GROUND; this.vy = 0; this.air = false;
    this.dir = dir; this.facing = dir; this.t = rand(0, 10); this.dead = false; this.stun = 0;
    this.speed = kind === 'civ' ? rand(35, 60) : rand(50, 65);
    this.shirt = pick(SHIRTS); this.skin = pick(SKINS);
    this.panic = false;
    this.fireT = rand(1.2, 2.2);
    this.stopX = dir > 0 ? rand(40, 300) : rand(W - 300, W - 40);
    this.arrived = false; this.d = d;
  }
  box() { return { x: this.x - 6, y: this.y - 20, w: 12, h: 20 }; }
  update(dt, game) {
    this.t += dt;
    if (this.air) {
      this.vy += GRAV * 0.45 * dt; this.y += this.vy * dt;
      if (this.y >= GROUND) { this.y = GROUND; this.air = false; this.vy = 0; FX.dust(this.x, GROUND, 1, '#bbb', 4); }
      return;
    }
    if (this.stun > 0) { this.stun -= dt; return; }
    const m = game.monster;
    const threat = m && !m.defeated;
    if (this.kind === 'civ') {
      if (threat && Math.abs(m.x - this.x) < 170) { this.dir = sign(this.x - m.x) || 1; this.panic = true; }
      this.facing = this.dir;
      this.x += this.dir * this.speed * (this.panic ? 2.3 : 1) * dt;
      if (this.x < -30 || this.x > W + 30) this.dead = true;
    } else {
      if (!this.arrived) {
        const dx = this.stopX - this.x;
        this.facing = sign(dx) || this.facing;
        this.x += sign(dx) * this.speed * dt;
        if (Math.abs(dx) < 3) this.arrived = true;
      } else if (threat) {
        this.facing = sign(m.x - this.x) || 1;
        // back away if the monster gets too close
        if (Math.abs(m.x - this.x) < 70 && m.y > GROUND - 140) this.x -= this.facing * this.speed * 1.4 * dt;
        this.x = clamp(this.x, 8, W - 8);
        this.fireT -= dt;
        if (this.fireT <= 0) {
          this.fireT = rand(1.5, 2.6) / this.d;
          if (game.state === 'play') game.fire(this.x + this.facing * 8, this.y - 14, 'bullet');
        }
      }
    }
  }
  draw(ctx, t) {
    const x = this.x, y = this.y, f = this.facing;
    const fainted = this.stun > 0 && this.kind === 'civ';
    if (fainted) {
      ctx.fillStyle = this.shirt; ctx.fillRect(x - 6, y - 5, 10, 5);
      ctx.fillStyle = this.skin; ctx.beginPath(); ctx.arc(x + 7, y - 3, 3.5, 0, Math.PI * 2); ctx.fill();
      this.drawStars(ctx, x, y - 12, t);
      return;
    }
    const moving = !this.air && (this.kind === 'civ' || !this.arrived);
    const lg = moving ? Math.sin(this.t * 14) * 3 : 0;
    const soldier = this.kind === 'soldier';
    ctx.strokeStyle = soldier ? '#2e3518' : '#2b2b3a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x - lg, y); ctx.moveTo(x, y - 8); ctx.lineTo(x + lg, y); ctx.stroke();
    ctx.fillStyle = soldier ? '#4d5a2c' : this.shirt; ctx.fillRect(x - 4, y - 16, 8, 9);
    ctx.fillStyle = soldier ? '#e0ac69' : this.skin; ctx.beginPath(); ctx.arc(x, y - 19, 3.5, 0, Math.PI * 2); ctx.fill();
    if (soldier) {
      ctx.fillStyle = '#3b4622'; ctx.beginPath(); ctx.arc(x, y - 20, 4.3, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + f * 11, y - 15); ctx.stroke();
      if (this.stun > 0) this.drawStars(ctx, x, y - 28, t);
    } else {
      ctx.strokeStyle = this.skin; ctx.lineWidth = 2; ctx.beginPath();
      if (this.panic || this.air) { ctx.moveTo(x - 3, y - 15); ctx.lineTo(x - 6, y - 24); ctx.moveTo(x + 3, y - 15); ctx.lineTo(x + 6, y - 24); }
      else { ctx.moveTo(x, y - 15); ctx.lineTo(x + lg, y - 9); }
      ctx.stroke();
    }
  }
  drawStars(ctx, x, y, t) {
    ctx.fillStyle = '#ffe14d';
    for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillRect(x + Math.cos(a) * 7 - 1, y + Math.sin(a) * 2 - 1, 2.5, 2.5); }
  }
}

/* ---------------- Military ---------------- */
class Tank {
  constructor(dir, d) {
    this.dir = dir; this.facing = dir; this.x = dir > 0 ? -60 : W + 60; this.y = GROUND;
    this.stopX = dir > 0 ? rand(60, 280) : rand(W - 280, W - 60);
    this.hp = 3; this.fireT = rand(1.5, 2.5); this.dead = false; this.flash = 0; this.t = 0; this.stun = 0; this.d = d;
    this.aim = -0.4;
  }
  box() { return { x: this.x - 28, y: this.y - 24, w: 56, h: 24 }; }
  update(dt, game) {
    this.t += dt; if (this.flash > 0) this.flash -= dt;
    if (this.stun > 0) { this.stun -= dt; return; }
    const m = game.monster;
    const dx = this.stopX - this.x;
    if (Math.abs(dx) > 2) this.x += sign(dx) * 60 * dt;
    if (m && !m.defeated) {
      this.facing = sign(m.x - this.x) || 1;
      const tx = m.x - this.x, ty = (m.y - m.h * 0.5) - (this.y - 22);
      this.aim = clamp(Math.atan2(ty, Math.abs(tx)), -1.35, 0.1);
      this.fireT -= dt;
      if (this.fireT <= 0) {
        this.fireT = rand(2.8, 4) / this.d;
        if (game.state === 'play') {
          const bx = this.x + this.facing * Math.cos(this.aim) * 26, by = this.y - 22 + Math.sin(this.aim) * 26;
          game.fire(bx, by, 'shell'); Sfx.play('cannon');
        }
      }
    }
  }
  draw(ctx) {
    const x = this.x, y = this.y, f = this.facing;
    const body = this.flash > 0 ? '#fff' : '#5b6b34';
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.roundRect(x - 28, y - 10, 56, 10, 5); ctx.fill();
    ctx.fillStyle = '#555';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x - 22 + i * 11, y - 5, 3.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = body; ctx.fillRect(x - 25, y - 18, 50, 9);
    ctx.save(); ctx.translate(x, y - 22); ctx.scale(f, 1);
    ctx.save(); ctx.rotate(this.aim); ctx.fillStyle = '#3c4622'; ctx.fillRect(0, -2, 28, 4); ctx.restore();
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 2, 13, 7, 0, Math.PI, 0); ctx.fill();
    ctx.restore();
    if (this.stun > 0) Walker.prototype.drawStars(ctx, x, y - 34, this.t);
  }
}

class Heli {
  constructor(dir, d) {
    this.x = dir > 0 ? -80 : W + 80; this.y = rand(110, 230); this.facing = dir;
    this.hp = 2; this.fireT = rand(1.8, 3); this.dead = false; this.falling = false; this.vy = 0; this.rot = 0;
    this.t = 0; this.flash = 0; this.stun = 0; this.d = d; this.side = dir > 0 ? -1 : 1;
  }
  box() { return { x: this.x - 28, y: this.y - 11, w: 56, h: 22 }; }
  update(dt, game) {
    this.t += dt; if (this.flash > 0) this.flash -= dt;
    if (this.falling) {
      this.vy += 500 * dt; this.y += this.vy * dt; this.rot += dt * 4; this.x += this.facing * 40 * dt;
      if (this.y >= GROUND - 10) { this.dead = true; FX.boom(this.x, GROUND - 10, 1.3); Sfx.play('boom'); game.shake = Math.max(game.shake, 8); }
      return;
    }
    const m = game.monster;
    if (this.stun > 0) { this.stun -= dt; this.y += Math.sin(this.t * 10) * 30 * dt; return; }
    if (!m || m.defeated) { this.x += this.facing * 60 * dt; return; }
    if (Math.abs(m.x - this.x) < 120) this.side = this.x < m.x ? -1 : 1;
    const tx = clamp(m.x + this.side * 230, 40, W - 40);
    const ty = clamp(m.y - m.h - 40, 90, 300);
    this.x += clamp(tx - this.x, -95 * dt, 95 * dt);
    this.y += clamp(ty - this.y, -60 * dt, 60 * dt);
    this.facing = sign(m.x - this.x) || 1;
    this.fireT -= dt;
    if (this.fireT <= 0) {
      this.fireT = rand(2.2, 3.2) / this.d;
      if (game.state === 'play') { game.fire(this.x + this.facing * 20, this.y + 6, 'bullet'); this.burst = 2; this.burstT = 0.12; }
    }
    if (this.burst > 0) {
      this.burstT -= dt;
      if (this.burstT <= 0) { this.burst--; this.burstT = 0.12; if (game.state === 'play') game.fire(this.x + this.facing * 20, this.y + 6, 'bullet'); }
    }
  }
  draw(ctx) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot); ctx.scale(this.facing, 1);
    const body = this.flash > 0 ? '#fff' : '#4f5d3a';
    ctx.fillStyle = body;
    ctx.fillRect(-34, -4, 22, 4);                                 // tail boom
    ctx.fillRect(-36, -10, 4, 10);                                // tail fin
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9fd0ee'; ctx.beginPath(); ctx.ellipse(8, -2, 8, 6, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-12, 13); ctx.lineTo(14, 13); ctx.moveTo(-6, 9); ctx.lineTo(-6, 13); ctx.moveTo(8, 9); ctx.lineTo(8, 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -14); ctx.stroke();
    const rl = 30 * Math.abs(Math.cos(this.t * 30));
    ctx.beginPath(); ctx.moveTo(-rl, -14); ctx.lineTo(rl, -14); ctx.stroke();
    ctx.restore();
    if (this.stun > 0 && !this.falling) Walker.prototype.drawStars(ctx, this.x, this.y - 22, this.t);
  }
}

class Shot {
  constructor(x, y, vx, vy, kind) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.kind = kind; this.dead = false; this.life = 3;
    this.dmg = kind === 'shell' ? 7 : 2.2; this.r = kind === 'shell' ? 4.5 : 2.5;
  }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt;
    if (this.life <= 0 || this.x < -20 || this.x > W + 20 || this.y < -20) this.dead = true;
    if (this.y > GROUND + 4) { this.dead = true; FX.dust(this.x, GROUND, 1, '#aaa', 3); }
  }
  draw(ctx) {
    if (this.kind === 'shell') {
      ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
    } else {
      const l = 0.018;
      ctx.strokeStyle = '#fff6a8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - this.vx * l, this.y - this.vy * l); ctx.stroke();
    }
  }
}

/* ---------------- Backdrop ---------------- */
function lmPalm(ctx, x, by, h, t) {
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, by); ctx.quadraticCurveTo(x + 8, by - h * 0.5, x + 3, by - h); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath();
  for (let k = -3; k <= 3; k++) {
    const sw = Math.sin(t * 1.2 + k) * 2;
    ctx.moveTo(x + 3, by - h); ctx.quadraticCurveTo(x + 3 + k * 9, by - h - 16 + Math.abs(k) * 2 + sw, x + 3 + k * 15, by - h + 6 + Math.abs(k) * 5);
  }
  ctx.stroke();
}

function drawLandmark(ctx, kind, col, t, city) {
  const by = GROUND - 14;
  ctx.fillStyle = col; ctx.strokeStyle = col;
  switch (kind) {
    case 'water': {
      const x = 860;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 20, by); ctx.lineTo(x - 14, by - 120); ctx.moveTo(x + 20, by); ctx.lineTo(x + 14, by - 120);
      ctx.moveTo(x - 17, by - 60); ctx.lineTo(x + 17, by - 60); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, by - 140, 34, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 1.5, by - 180, 3, 20);
      ctx.fillRect(700, by - 90, 26, 90); ctx.beginPath(); ctx.arc(713, by - 90, 13, Math.PI, 0); ctx.fill();   // grain silo
      ctx.fillRect(730, by - 70, 22, 70); ctx.beginPath(); ctx.arc(741, by - 70, 11, Math.PI, 0); ctx.fill();
      break;
    }
    case 'eiffel': case 'lattice': {
      const x = kind === 'eiffel' ? 820 : 150, h = kind === 'eiffel' ? 300 : 280;
      if (kind === 'lattice') ctx.fillStyle = ctx.strokeStyle = '#b8402f';
      ctx.beginPath(); ctx.moveTo(x - 48, by); ctx.lineTo(x - 36, by); ctx.lineTo(x - 12, by - h * 0.32); ctx.lineTo(x - 22, by - h * 0.32); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 48, by); ctx.lineTo(x + 36, by); ctx.lineTo(x + 12, by - h * 0.32); ctx.lineTo(x + 22, by - h * 0.32); ctx.fill();
      ctx.fillRect(x - 26, by - h * 0.34, 52, 6);
      ctx.beginPath(); ctx.moveTo(x - 20, by - h * 0.32); ctx.lineTo(x - 8, by - h * 0.62); ctx.lineTo(x + 8, by - h * 0.62); ctx.lineTo(x + 20, by - h * 0.32); ctx.fill();
      ctx.fillRect(x - 12, by - h * 0.64, 24, 5);
      ctx.beginPath(); ctx.moveTo(x - 7, by - h * 0.62); ctx.lineTo(x, by - h); ctx.lineTo(x + 7, by - h * 0.62); ctx.fill();
      if (kind === 'lattice') {
        ctx.fillStyle = '#e8e3da'; ctx.fillRect(x - 16, by - h * 0.45, 32, 6); ctx.fillRect(x - 6, by - h * 0.8, 12, 5);
        if (Math.sin(t * 3) > 0) { ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(x, by - h, 3, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    }
    case 'pyramids':
      [[760, 150], [880, 110], [660, 80]].forEach(([x, h]) => {
        ctx.beginPath(); ctx.moveTo(x - h * 1.1, by); ctx.lineTo(x, by - h); ctx.lineTo(x + h * 1.1, by); ctx.fill();
        ctx.fillStyle = shade(col, 0.12); ctx.beginPath(); ctx.moveTo(x, by - h); ctx.lineTo(x + h * 1.1, by); ctx.lineTo(x + h * 0.3, by); ctx.fill(); ctx.fillStyle = col;
      });
      break;
    case 'clock': {
      const x = 860;
      ctx.fillRect(x - 20, by - 230, 40, 230);
      ctx.beginPath(); ctx.moveTo(x - 24, by - 230); ctx.lineTo(x, by - 300); ctx.lineTo(x + 24, by - 230); ctx.fill();
      ctx.fillStyle = '#efe6c4'; ctx.beginPath(); ctx.arc(x, by - 200, 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, by - 200); ctx.lineTo(x, by - 210); ctx.moveTo(x, by - 200); ctx.lineTo(x + 7, by - 198); ctx.stroke();
      ctx.fillStyle = col; ctx.fillRect(560, by - 90, 260, 90);
      for (let i = 0; i < 9; i++) ctx.fillRect(566 + i * 30, by - 106, 6, 16);
      break;
    }
    case 'domes':
      [[780, 170, '#c94a3a'], [830, 210, '#2f7d5a'], [880, 160, '#d4a017'], [730, 130, '#3a6db5']].forEach(([x, h, dc]) => {
        ctx.fillStyle = col; ctx.fillRect(x - 12, by - h, 24, h);
        ctx.fillStyle = shade(dc, -0.25);
        ctx.beginPath(); ctx.moveTo(x - 13, by - h); ctx.quadraticCurveTo(x - 22, by - h - 22, x, by - h - 40); ctx.quadraticCurveTo(x + 22, by - h - 22, x + 13, by - h); ctx.fill();
      });
      break;
    case 'sugarloaf':
      ctx.beginPath(); ctx.moveTo(620, by); ctx.quadraticCurveTo(700, by - 130, 760, by - 60); ctx.quadraticCurveTo(820, by - 290, 890, by - 230);
      ctx.quadraticCurveTo(940, by - 160, 980, by); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(760, by - 62); ctx.lineTo(880, by - 228); ctx.stroke();
      break;
    case 'skyscraper': {
      [[590, 150, 44], [645, 210, 38], [700, 270, 50], [765, 340, 54], [830, 250, 42], [885, 200, 46], [935, 150, 36]].forEach(([x, h, w], i) => {
        ctx.fillRect(x - w / 2, by - h, w, h);
        if (i === 3) { ctx.fillRect(x - w / 4, by - h - 26, w / 2, 26); ctx.fillRect(x - 10, by - h - 40, 3, 16); ctx.fillRect(x + 7, by - h - 40, 3, 16); }
        if (i === 1) { ctx.beginPath(); ctx.moveTo(x - w / 2, by - h); ctx.lineTo(x, by - h - 22); ctx.lineTo(x + w / 2, by - h); ctx.fill(); }
      });
      break;
    }
    case 'strip': {
      const x = 860;
      ctx.fillRect(x - 4, by - 250, 8, 250); ctx.beginPath(); ctx.ellipse(x, by - 258, 24, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 8, by - 290, 16, 34); ctx.fillRect(x - 1, by - 320, 2, 30);
      ctx.beginPath(); ctx.moveTo(660, by); ctx.lineTo(720, by - 120); ctx.lineTo(780, by); ctx.fill();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(600, by - 72, 60, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + t * 0.2; ctx.moveTo(600, by - 72); ctx.lineTo(600 + Math.cos(a) * 60, by - 72 + Math.sin(a) * 60); } ctx.stroke();
      ctx.fillRect(594, by - 72, 12, 72);
      ctx.strokeStyle = `rgba(255,80,210,${0.5 + 0.4 * Math.sin(t * 4)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, by - 258, 24, 13, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(660, by); ctx.lineTo(720, by - 120); ctx.lineTo(780, by); ctx.closePath(); ctx.stroke();
      break;
    }
    case 'bridge': {
      const top = by - 210, xl = 650, xr = 880, cx = (xl + xr) / 2, half = (xr - xl) / 2;
      ctx.fillRect(560, by - 42, 400, 8);
      [xl, xr].forEach(x => { ctx.fillRect(x - 8, top, 6, 210); ctx.fillRect(x + 2, top, 6, 210); ctx.fillRect(x - 8, top + 50, 16, 5); ctx.fillRect(x - 8, top + 110, 16, 5); });
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(xl, top); ctx.quadraticCurveTo(cx, by - 40, xr, top); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xl, top); ctx.quadraticCurveTo(600, by - 100, 560, by - 44); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xr, top); ctx.quadraticCurveTo(920, by - 100, 960, by - 44); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath();
      for (let x = xl + 12; x < xr; x += 14) { const u = (x - cx) / half; ctx.moveTo(x, top + 80 * (1 - u * u)); ctx.lineTo(x, by - 42); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(560, by - 70, 400, 46); ctx.fillRect(600, by - 110, 120, 30);
      break;
    }
    case 'stepped': {
      const temple = (x, s) => {
        for (let i = 0; i < 5; i++) ctx.fillRect(x - (130 - i * 22) * s, by - (i + 1) * 26 * s, (260 - i * 44) * s, 26 * s);
        ctx.fillRect(x - 18 * s, by - 152 * s, 36 * s, 22 * s);
      };
      temple(740, 1); temple(610, 0.55);
      ctx.fillStyle = shade(col, 0.15); for (let i = 0; i < 4; i++) ctx.fillRect(734, by - 26 * i - 26, 12, 26);
      ctx.fillStyle = col;
      ctx.fillRect(896, by - 190, 8, 190); ctx.fillRect(886, by - 22, 28, 22);
      ctx.beginPath(); ctx.arc(900, by - 202, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(890, by - 192); ctx.lineTo(900, by - 214); ctx.lineTo(910, by - 192); ctx.fill();
      break;
    }
    case 'capitol': {
      ctx.fillRect(610, by - 66, 280, 66);
      ctx.beginPath(); ctx.moveTo(700, by - 66); ctx.lineTo(750, by - 92); ctx.lineTo(800, by - 66); ctx.fill();
      ctx.fillRect(722, by - 116, 56, 50);
      ctx.beginPath(); ctx.arc(750, by - 116, 36, Math.PI, 0); ctx.fill();
      ctx.fillRect(747, by - 176, 6, 24); ctx.fillRect(745, by - 168, 10, 3);
      ctx.fillStyle = shade(col, 0.2);
      for (let i = 0; i < 12; i++) ctx.fillRect(620 + i * 23, by - 60, 5, 54);
      ctx.fillStyle = col;
      lmPalm(ctx, 585, by, 140, t); lmPalm(ctx, 925, by, 120, t);
      break;
    }
    case 'statue': {
      const x = 850;
      [[640, 200, 34], [690, 260, 30]].forEach(([bx, h, w]) => { ctx.fillRect(bx - w / 2, by - h, w, h); ctx.fillRect(bx - w / 4, by - h - 24, w / 2, 24); ctx.fillRect(bx - 1, by - h - 50, 2, 26); });
      ctx.fillRect(x - 40, by - 24, 80, 24);
      ctx.beginPath(); ctx.moveTo(x - 36, by - 24); ctx.lineTo(x - 24, by - 38); ctx.lineTo(x + 24, by - 38); ctx.lineTo(x + 36, by - 24); ctx.fill();
      ctx.fillRect(x - 24, by - 98, 48, 60);
      ctx.beginPath(); ctx.moveTo(x - 20, by - 98); ctx.lineTo(x - 13, by - 190); ctx.lineTo(x + 13, by - 190); ctx.lineTo(x + 20, by - 98); ctx.fill();
      ctx.beginPath(); ctx.arc(x, by - 202, 10, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.beginPath();
      for (let k = -3; k <= 3; k++) { ctx.moveTo(x + k * 3, by - 210); ctx.lineTo(x + k * 9, by - 228 + Math.abs(k) * 3); }
      ctx.stroke();
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x + 10, by - 184); ctx.lineTo(x + 28, by - 244); ctx.stroke();
      ctx.fillRect(x + 22, by - 252, 14, 8);
      ctx.fillStyle = '#ffcc4d'; ctx.beginPath(); ctx.ellipse(x + 29, by - 262, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col; ctx.fillRect(x - 26, by - 162, 10, 18);
      break;
    }
    case 'stones': {
      const hy = x => { const u = (x - 560) / 400; return by - 400 * u * (1 - u); };
      ctx.beginPath(); ctx.moveTo(560, by); ctx.quadraticCurveTo(760, by - 200, 960, by); ctx.fill();
      [[690, 44, -3], [722, 58, 2], [752, 70, -1], [784, 54, 4], [816, 62, -2], [846, 40, 3]].forEach(([x, h, l]) => {
        const y = hy(x);
        ctx.beginPath(); ctx.moveTo(x - 6, y + 4); ctx.lineTo(x - 4 + l, y - h); ctx.lineTo(x + 5 + l, y - h + 5); ctx.lineTo(x + 7, y + 4); ctx.fill();
      });
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(620, hy(620)); ctx.lineTo(626, hy(620) - 50); ctx.lineTo(616, hy(620) - 76);
      ctx.moveTo(626, hy(620) - 50); ctx.lineTo(640, hy(620) - 64); ctx.stroke();
      ctx.fillRect(900, by - 34, 36, 34); ctx.beginPath(); ctx.moveTo(894, by - 34); ctx.lineTo(918, by - 56); ctx.lineTo(942, by - 34); ctx.fill();
      if (Math.sin(t * 1.3) > 0.2) { ctx.fillStyle = 'rgba(255,200,90,0.7)'; ctx.fillRect(912, by - 24, 6, 8); ctx.fillStyle = col; }
      break;
    }
    case 'volcano': {
      if (city && city.tod === 'night') {
        ctx.save(); ctx.lineWidth = 16;
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = `rgba(110,255,180,${0.1 + 0.05 * Math.sin(t + i)})`; ctx.beginPath();
          for (let x = 0; x <= W; x += 20) { const y = 90 + i * 34 + Math.sin(x * 0.008 + t * 0.5 + i * 2) * 22; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.stroke();
        }
        ctx.restore(); ctx.strokeStyle = col;
      }
      ctx.beginPath(); ctx.moveTo(580, by); ctx.lineTo(740, by - 160); ctx.lineTo(790, by - 160); ctx.lineTo(960, by); ctx.fill();
      ctx.fillStyle = 'rgba(235,244,255,0.45)'; ctx.beginPath(); ctx.moveTo(712, by - 132); ctx.lineTo(740, by - 160); ctx.lineTo(790, by - 160); ctx.lineTo(818, by - 128); ctx.lineTo(780, by - 140); ctx.lineTo(752, by - 126); ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(626, by - 120, 18, 120); ctx.fillRect(614, by - 60, 12, 60); ctx.fillRect(644, by - 60, 12, 60); ctx.fillRect(606, by - 30, 8, 30); ctx.fillRect(656, by - 30, 8, 30);
      ctx.beginPath(); ctx.moveTo(626, by - 120); ctx.lineTo(635, by - 150); ctx.lineTo(644, by - 120); ctx.fill();
      break;
    }
    case 'needle': {
      const x = 830;
      ctx.beginPath(); ctx.moveTo(x - 6, by); ctx.lineTo(x, by - 340); ctx.lineTo(x + 6, by); ctx.fill();
      ctx.fillRect(630, by - 120, 18, 120); ctx.beginPath(); ctx.moveTo(627, by - 120); ctx.lineTo(639, by - 156); ctx.lineTo(651, by - 120); ctx.fill();
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(700, by - 6); ctx.quadraticCurveTo(740, by - 56, 780, by - 6); ctx.stroke();
      ctx.fillRect(690, by - 8, 100, 4);
      ctx.fillRect(900, by - 60, 50, 60); ctx.fillRect(920, by - 76, 10, 16);
      break;
    }
    case 'windmills': {
      [[650, 110], [770, 140], [890, 100]].forEach(([x, h], i) => {
        ctx.beginPath(); ctx.moveTo(x - 17, by); ctx.lineTo(x - 10, by - h); ctx.lineTo(x + 10, by - h); ctx.lineTo(x + 17, by); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 12, by - h); ctx.quadraticCurveTo(x, by - h - 22, x + 12, by - h); ctx.fill();
        ctx.save(); ctx.translate(x, by - h + 6); ctx.rotate(t * 0.4 + i);
        ctx.lineWidth = 3;
        for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(56, 0); ctx.stroke(); ctx.fillRect(14, -9, 40, 9); }
        ctx.restore();
      });
      break;
    }
    case 'arch': {
      const x = 780;
      for (let i = 0; i < 6; i++) ctx.fillRect(x - 108 + i * 41, by - 100, 14, 100);
      ctx.fillRect(x - 118, by - 120, 236, 20); ctx.fillRect(x - 58, by - 148, 116, 28);
      ctx.fillRect(x - 16, by - 160, 32, 12);
      for (let k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.ellipse(x + k * 14, by - 172, 10, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x + k * 14 + k * 4 - 1, by - 190, 3, 18); }
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, by - 160); ctx.lineTo(x, by - 196); ctx.moveTo(x - 14, by - 184); ctx.lineTo(x, by - 192); ctx.lineTo(x + 14, by - 184); ctx.stroke();
      ctx.fillRect(638, by - 250, 4, 250); ctx.beginPath(); ctx.arc(640, by - 200, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(639, by - 290, 2, 40);
      break;
    }
    case 'colosseum': {
      const top = x => x < 640 ? by - 70 - (x - 620) : x < 800 ? by - 96 : x < 840 ? by - 96 + (x - 800) * 0.4 : x < 880 ? by - 80 + (x - 840) * 0.2 : by - 72 + (x - 880) * 1.1;
      ctx.beginPath(); ctx.moveTo(620, by); ctx.lineTo(620, by - 70); ctx.lineTo(640, by - 96); ctx.lineTo(800, by - 96); ctx.lineTo(840, by - 80); ctx.lineTo(880, by - 72); ctx.lineTo(900, by - 50); ctx.lineTo(900, by); ctx.fill();
      ctx.fillStyle = shade(col, -0.3);
      for (let k = 0; k < 3; k++) for (let i = 0; i < 10; i++) {
        const ax = 630 + i * 26.5, ay = by - 28 * (k + 1) + 4;
        if (ay < top(ax + 5) + 4 || ay < top(ax - 2) + 4) continue;
        ctx.beginPath(); ctx.moveTo(ax, ay + 20); ctx.lineTo(ax, ay + 6); ctx.arc(ax + 5, ay + 6, 5, Math.PI, 0); ctx.lineTo(ax + 10, ay + 20); ctx.fill();
      }
      ctx.fillStyle = col;
      break;
    }
    case 'canal': {
      ctx.fillRect(632, by - 190, 16, 190); ctx.fillRect(628, by - 190, 24, 14);
      ctx.beginPath(); ctx.moveTo(628, by - 190); ctx.lineTo(640, by - 226); ctx.lineTo(652, by - 190); ctx.fill();
      ctx.fillRect(735, by - 60, 150, 60);
      [[762, 24], [810, 32], [858, 24]].forEach(([x, r]) => { ctx.beginPath(); ctx.arc(x, by - 60, r, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 1.5, by - 60 - r - 16, 3, 16); });
      ctx.fillStyle = shade(col, -0.3);
      for (let i = 0; i < 8; i++) { const ax = 744 + i * 18; ctx.beginPath(); ctx.moveTo(ax, by); ctx.lineTo(ax, by - 22); ctx.arc(ax + 6, by - 22, 6, Math.PI, 0); ctx.lineTo(ax + 12, by); ctx.fill(); }
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(664, by - 12); ctx.quadraticCurveTo(700, by + 2, 724, by - 12); ctx.quadraticCurveTo(700, by - 6, 668, by - 6); ctx.lineTo(660, by - 22); ctx.fill();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(705, by - 8); ctx.lineTo(705, by - 34); ctx.moveTo(705, by - 30); ctx.lineTo(692, by - 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(705, by - 38, 4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'acropolis': {
      ctx.beginPath(); ctx.moveTo(560, by); ctx.lineTo(610, by - 84); ctx.lineTo(850, by - 90); ctx.lineTo(910, by); ctx.fill();
      ctx.fillStyle = shade(col, 0.22);
      ctx.fillRect(630, by - 100, 200, 10);
      for (let i = 0; i < 9; i++) ctx.fillRect(636 + i * 22, by - 152, 10, 52);
      ctx.fillRect(626, by - 164, 208, 12);
      ctx.beginPath(); ctx.moveTo(626, by - 164); ctx.lineTo(730, by - 192); ctx.lineTo(834, by - 164); ctx.fill();
      ctx.fillStyle = col;
      break;
    }
    case 'minarets': {
      ctx.fillRect(700, by - 70, 160, 70);
      ctx.beginPath(); ctx.arc(780, by - 70, 48, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(722, by - 70, 24, Math.PI, 0); ctx.arc(838, by - 70, 24, Math.PI, 0); ctx.fill();
      ctx.fillRect(779, by - 140, 2, 22);
      [[670, 200], [885, 200], [735, 150], [825, 150]].forEach(([x, h]) => {
        ctx.fillRect(x - 4, by - h, 8, h); ctx.fillRect(x - 8, by - h * 0.78, 16, 4);
        ctx.beginPath(); ctx.moveTo(x - 6, by - h); ctx.lineTo(x, by - h - 34); ctx.lineTo(x + 6, by - h); ctx.fill();
      });
      break;
    }
    case 'medina': {
      ctx.fillStyle = shade(col, 0.15);
      ctx.beginPath(); ctx.moveTo(560, by); ctx.lineTo(640, by - 90); ctx.lineTo(700, by - 40); ctx.lineTo(790, by - 120); ctx.lineTo(870, by - 60); ctx.lineTo(960, by - 100); ctx.lineTo(960, by); ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(758, by - 210, 44, 210); ctx.fillRect(768, by - 238, 24, 28);
      ctx.beginPath(); ctx.arc(780, by - 244, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(779, by - 266, 2, 20);
      ctx.fillStyle = shade(col, 0.25); for (let i = 0; i < 3; i++) ctx.fillRect(766, by - 190 + i * 50, 28, 6);
      ctx.fillStyle = col;
      lmPalm(ctx, 690, by, 100, t); lmPalm(ctx, 860, by, 120, t); lmPalm(ctx, 915, by, 90, t);
      break;
    }
    case 'acacia': {
      [[650, 80], [770, 105], [890, 70]].forEach(([x, h]) => {
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, by); ctx.quadraticCurveTo(x - 6, by - h * 0.6, x + 4, by - h); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x + 4, by - h - 2, 52, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x - 20, by - h + 4, 28, 6, 0, 0, Math.PI * 2); ctx.fill();
      });
      ctx.beginPath(); ctx.ellipse(700, by - 44, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3; ctx.beginPath();
      [[686, 52], [692, 52], [708, 52], [714, 52]].forEach(([x, y]) => { ctx.moveTo(x, by - 44); ctx.lineTo(x, by - 2); });
      ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(716, by - 50); ctx.lineTo(728, by - 92); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(732, by - 96, 9, 5, -0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'table': {
      ctx.beginPath(); ctx.moveTo(540, by); ctx.lineTo(600, by - 110); ctx.lineTo(640, by - 168); ctx.lineTo(900, by - 176); ctx.lineTo(940, by - 150); ctx.lineTo(960, by - 70); ctx.lineTo(960, by); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(650 + i * 32, by - 172 + (i % 2) * 6, 30, 9, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = col;
      break;
    }
    case 'burj': {
      const x = 800, tiers = [30, 26, 22, 18, 14, 10, 6];
      tiers.forEach((w, i) => ctx.fillRect(x - w / 2, by - (i + 1) * 40, w, 40));
      ctx.beginPath(); ctx.moveTo(x - 3, by - 280); ctx.lineTo(x, by - 340); ctx.lineTo(x + 3, by - 280); ctx.fill();
      ctx.fillRect(x - 24, by - 90, 8, 90); ctx.fillRect(x + 16, by - 130, 8, 130);
      ctx.beginPath(); ctx.moveTo(640, by); ctx.lineTo(640, by - 170); ctx.quadraticCurveTo(720, by - 100, 690, by); ctx.fill();
      [[720, 110, 20], [870, 150, 24], [920, 100, 22], [590, 90, 24]].forEach(([bx, h, w]) => ctx.fillRect(bx - w / 2, by - h, w, h));
      if (Math.sin(t * 3) > 0) { ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(x, by - 340, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = col; }
      break;
    }
    case 'gateway': {
      ctx.fillRect(720, by - 100, 120, 100);
      ctx.beginPath(); ctx.arc(780, by - 100, 22, Math.PI, 0); ctx.fill(); ctx.fillRect(779, by - 146, 2, 24);
      [722, 838].forEach(x => { ctx.fillRect(x - 8, by - 130, 16, 130); ctx.beginPath(); ctx.arc(x, by - 130, 10, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 1, by - 152, 2, 12); });
      ctx.fillStyle = shade(col, -0.35);
      ctx.beginPath(); ctx.moveTo(762, by); ctx.lineTo(762, by - 58); ctx.arc(780, by - 58, 18, Math.PI, 0); ctx.lineTo(798, by); ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(600, by - 70, 90, 70); [622, 668].forEach(x => { ctx.beginPath(); ctx.arc(x, by - 70, 14, Math.PI, 0); ctx.fill(); });
      ctx.beginPath(); ctx.arc(645, by - 70, 18, Math.PI, 0); ctx.fill();
      ctx.fillRect(900, by - 80, 40, 80);
      break;
    }
    case 'prang': {
      const prang = (x, s) => {
        ctx.save(); ctx.translate(x, by); ctx.scale(s, s);
        for (let i = 0; i < 5; i++) {
          const bw = 50 - i * 8, y0 = -i * 50;
          ctx.beginPath(); ctx.moveTo(-bw, y0); ctx.lineTo(-bw + 6, y0 - 50); ctx.lineTo(bw - 6, y0 - 50); ctx.lineTo(bw, y0); ctx.fill();
        }
        ctx.beginPath(); ctx.moveTo(-6, -250); ctx.lineTo(0, -320); ctx.lineTo(6, -250); ctx.fill();
        ctx.restore();
      };
      prang(790, 1); prang(705, 0.42); prang(875, 0.42);
      ctx.beginPath(); ctx.moveTo(580, by); ctx.lineTo(630, by - 50); ctx.lineTo(650, by - 36); ctx.lineTo(670, by - 56); ctx.lineTo(690, by); ctx.fill();
      ctx.fillRect(920, by - 60, 36, 60);
      break;
    }
    case 'pagoda': {
      const x = 820;
      for (let i = 0; i < 5; i++) {
        const w = 92 - i * 14, y = by - 44 * i - 24;
        ctx.fillRect(x - w * 0.4, y - 22, w * 0.8, 24);
        ctx.beginPath(); ctx.moveTo(x - w, y - 14); ctx.quadraticCurveTo(x - w * 0.55, y - 16, x, y - 38); ctx.quadraticCurveTo(x + w * 0.55, y - 16, x + w, y - 14);
        ctx.quadraticCurveTo(x, y - 24, x - w, y - 14); ctx.fill();
      }
      ctx.fillRect(x - 1, by - 44 * 4 - 82, 2, 30);
      ctx.beginPath(); ctx.moveTo(560, by); ctx.quadraticCurveTo(650, by - 100, 730, by); ctx.fill();
      ctx.fillRect(637, by - 200, 6, 120); ctx.beginPath(); ctx.ellipse(640, by - 150, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(639, by - 226, 2, 28);
      break;
    }
    case 'junk': {
      ctx.fillStyle = shade(col, 0.12);
      ctx.beginPath(); ctx.moveTo(540, by); ctx.quadraticCurveTo(640, by - 270, 800, by); ctx.fill();
      ctx.fillStyle = col;
      [[640, 200, 30], [685, 150, 26], [730, 250, 36], [775, 180, 28], [915, 170, 34], [945, 110, 28]].forEach(([x, h, w], i) => {
        ctx.fillRect(x - w / 2, by - h, w, h);
        if (i % 2 === 0) { ctx.beginPath(); ctx.moveTo(x - w / 2, by - h); ctx.lineTo(x, by - h - 26); ctx.lineTo(x + w / 2, by - h); ctx.fill(); }
        else ctx.fillRect(x - 1, by - h - 30, 2, 30);
      });
      ctx.beginPath(); ctx.moveTo(800, by - 14); ctx.lineTo(900, by - 14); ctx.quadraticCurveTo(880, by + 2, 850, by + 2); ctx.lineTo(820, by + 2); ctx.quadraticCurveTo(805, by - 4, 800, by - 14); ctx.fill();
      ctx.fillRect(846, by - 100, 3, 88);
      ctx.fillStyle = '#8b2e2a';
      ctx.beginPath(); ctx.moveTo(848, by - 96); ctx.lineTo(888, by - 86); ctx.lineTo(890, by - 28); ctx.lineTo(848, by - 22); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 1; i < 4; i++) ctx.fillRect(848, by - 96 + i * 18, 42, 2);
      ctx.fillStyle = col;
      break;
    }
    case 'opera': {
      ctx.fillRect(640, by - 14, 290, 14);
      [[690, 64, 66, 1], [736, 84, 96, 1], [800, 100, 112, 1], [858, 70, 74, -1], [904, 54, 52, -1]].forEach(([x, w, h, d]) => {
        ctx.save(); ctx.translate(x, by - 14); ctx.scale(d, 1);
        ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.quadraticCurveTo(-w / 2, -h, w * 0.1, -h); ctx.quadraticCurveTo(w * 0.55, -h * 0.5, w / 2, 0); ctx.fill();
        ctx.restore();
      });
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(560, by - 40); ctx.quadraticCurveTo(600, by - 130, 640, by - 40); ctx.stroke();
      break;
    }
    case 'obelisk': {
      const x = 800;
      ctx.beginPath(); ctx.moveTo(x - 12, by); ctx.lineTo(x - 7, by - 250); ctx.lineTo(x, by - 278); ctx.lineTo(x + 7, by - 250); ctx.lineTo(x + 12, by); ctx.fill();
      ctx.fillRect(x - 18, by - 10, 36, 10);
      [[670, 90, 70], [905, 110, 64]].forEach(([bx, h, w]) => { ctx.fillRect(bx - w / 2, by - h, w, h); ctx.beginPath(); ctx.arc(bx, by - h, w * 0.3, Math.PI, 0); ctx.fill(); ctx.fillRect(bx - 1, by - h - w * 0.3 - 14, 2, 14); });
      break;
    }
    case 'monoliths': {
      const slabs = [[620, 200, -0.18], [700, 280, 0.12], [790, 240, -0.05], [870, 320, 0.22], [930, 180, -0.3]];
      slabs.forEach(([x, h, a], i) => {
        ctx.save(); ctx.translate(x, by); ctx.rotate(a);
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-14 - i * 2, -h); ctx.lineTo(18, -h + 20); ctx.lineTo(24, 0); ctx.fill();
        ctx.strokeStyle = `rgba(125,255,176,${0.25 + 0.2 * Math.sin(t * 1.5 + i)})`; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
      });
      break;
    }
  }
}
