'use strict';
/* =========================================================
   WORLD — tour stops, effects, buildings, humans, military
   ========================================================= */

/* ---------------- Tour stops ---------------- */
// tod: 'day' | 'dusk' | 'night'. landmark: a silhouette drawn on the horizon.
const CITIES = [
  { name: 'PEORIA', sub: 'Illinois, USA', sky: ['#5fb0e6', '#d8f1ff'], tod: 'day', far: '#8fb0c8',
    ground: '#47474e', walk: '#8f8b85', colors: ['#b5653d', '#9b8a76', '#c9a66b', '#7f8794', '#a34c3a'], landmark: 'water' },
  { name: 'PARIS', sub: 'France', sky: ['#e97e58', '#ffd9a3'], tod: 'dusk', far: '#b8735f',
    ground: '#3d3a40', walk: '#9b8f84', colors: ['#d9c7a3', '#cdb88f', '#bfae94', '#a89a86'], landmark: 'eiffel' },
  { name: 'TOKYO', sub: 'Japan', sky: ['#0b0f2a', '#3a2464'], tod: 'night', far: '#2a2448',
    ground: '#22222c', walk: '#4a4a58', colors: ['#3a3f58', '#4b3f63', '#2f4a5c', '#5a3d4f'], landmark: 'lattice' },
  { name: 'CAIRO', sub: 'Egypt', sky: ['#efbe5f', '#fff1c8'], tod: 'day', far: '#d4ab70',
    ground: '#6b5a44', walk: '#c8b08a', colors: ['#d6b98a', '#c9a57a', '#b8925f', '#e0c9a0'], landmark: 'pyramids' },
  { name: 'LONDON', sub: 'United Kingdom', sky: ['#7f8b98', '#c9d0d6'], tod: 'day', far: '#77828d',
    ground: '#3e4046', walk: '#7d7f84', colors: ['#8a4b3a', '#6e6a66', '#9a8f80', '#5c5f66'], landmark: 'clock' },
  { name: 'MOSCOW', sub: 'Russia', sky: ['#34457a', '#d39aa2'], tod: 'dusk', far: '#55578a',
    ground: '#3a3a44', walk: '#c7c9d1', colors: ['#b9b0a2', '#9c4b45', '#d1c7b2', '#7a8290'], landmark: 'domes' },
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
    this.dust(x, y, 6, '#555', 20 * s);
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
        if (p.shape === 'tri') { ctx.beginPath(); ctx.moveTo(-p.size, p.size); ctx.lineTo(p.size, p.size); ctx.lineTo(0, -p.size); ctx.fill(); }
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

function makeJag() { const a = []; for (let i = 0; i < 12; i++) a.push(rand(0, 6)); return a; }

class Building {
  constructor(x, cols, floors, city, rng, d) {
    this.x = x; this.cols = cols; this.floors = floors;
    this.w = cols * CW + BPAD * 2;
    this.color = city.colors[Math.floor(rng() * city.colors.length)];
    this.trim = shade(this.color, -0.28);
    const styles = ['antenna', 'tank', 'sign', 'plain', 'ac'];
    this.style = styles[Math.floor(rng() * styles.length)];
    if (city.landmark === 'domes' && rng() < 0.45) this.style = 'dome';
    if (city.eldritch) this.style = rng() < 0.6 ? 'spire' : 'plain';
    this.sign = BILLBOARDS[Math.floor(rng() * BILLBOARDS.length)];
    this.sink = 0; this.sinkV = 0; this.collapsing = false; this.gone = false;
    this.shakeT = 0; this.destroyed = 0;
    this.rubble = []; for (let i = 0; i < 9; i++) this.rubble.push(rng());
    this.cells = [];
    const pSol = Math.min(0.13, 0.035 * d);
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
      this.checkCollapse(game);
    } else {
      FX.debris(x, y, 3, [this.color, this.trim]);
      if (before <= 1) Sfx.play('punch');
    }
    return true;
  }
  checkCollapse(game) {
    if (this.collapsing) return;
    const total = this.floors * this.cols;
    let floorGone = false;
    for (let f = 0; f < this.floors; f++) if (this.cells[f].every(cl => cl.hp <= 0)) { floorGone = true; break; }
    if (this.destroyed >= Math.ceil(total * 0.48) || floorGone) game.collapseBuilding(this);
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
          game.fire(bx, by, 'shell'); FX.smoke(bx, by, '#ddd'); Sfx.play('cannon');
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
      if (chance(dt * 40)) FX.smoke(this.x, this.y, '#444');
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
    if (this.kind === 'shell' && chance(dt * 30)) FX.smoke(this.x, this.y, '#888', 0.4);
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
