'use strict';
/* =========================================================
   MONSTERS — the roster registry and shared monster physics.

   To add a new monster: call registerMonster({...}) at the
   bottom of this file (or in a new js/monsters/*.js file loaded
   after this one). See README.md for the full field list.
   ========================================================= */

const MONSTERS = [];
function registerMonster(def) { MONSTERS.push(def); return def; }

/* ---------- drawing helpers ---------- */
function limb(ctx, x1, y1, x2, y2, w, color, bend = 0) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1);
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
  ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
}
function noodle(ctx, x1, y1, x2, y2, w, color, wob, t) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const a = wob * Math.sin(t * 4) * len * 0.2, b = -wob * Math.sin(t * 4 + 1.5) * len * 0.2;
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(x1 + dx * 0.33 + nx * a, y1 + dy * 0.33 + ny * a, x1 + dx * 0.66 + nx * b, y1 + dy * 0.66 + ny * b, x2, y2);
  ctx.stroke();
}
function ell(ctx, x, y, rx, ry, color, rot = 0) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
}
// Punch extension curve: fast jab out, slower pull back. p goes 0→1.
function punchExt(p) { if (!p) return 0; return p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7; }
// Where the hand should be: rest pose blended toward the real hit point.
function handTarget(p, rx, ry) {
  if (p.punch > 0 && p.hand) { const e = punchExt(p.punch); return [lerp(rx, p.hand.x, e), lerp(ry, p.hand.y, e)]; }
  return [rx, ry];
}
// A pose for menus / previews (no Monster instance needed).
function demoPose(t, opts = {}) {
  return Object.assign({ t, walk: false, walkPhase: t * 9, climb: false, climbPhase: 0, punch: 0, punchDir: 'side',
    air: false, glide: false, eat: 0, dash: false, hand: null }, opts);
}

/* =========================================================
   Monster — one instance per player
   ========================================================= */
class Monster {
  constructor(def) { this.def = def; this.s = def.stats; this.w = this.s.w; this.h = this.s.h; this.t = 0; this.reset(W / 2); }
  reset(x) {
    this.x = x; this.y = -80; this.vx = 0; this.vy = 0; this.facing = 1;
    this.state = this.s.flies ? 'fly' : 'air';
    this.hp = this.s.maxHp; this.punchT = 0; this.punchCd = 0; this.punchDir = 'side'; this.hand = null;
    this.hurtT = 0; this.invuln = 2; this.specialCd = 0; this.climbB = null; this.roofB = null;
    this.walkPhase = 0; this.climbPhase = 0; this.eatT = 0; this.glide = false;
    this.defeated = false; this.defT = 0; this.onFloor = false; this.reverted = false; this.reported = false;
    this.dashT = 0; this.dashVX = 0; this.dashVY = 0; this.dashSet = null;
    this.entering = true;
  }
  box() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
  get vulnerable() { return !this.defeated && this.hurtT <= 0 && this.invuln <= 0 && this.dashT <= 0; }

  update(dt, game, control) {
    this.t += dt;
    this.punchCd -= dt; this.punchT -= dt; this.hurtT -= dt; this.invuln -= dt; this.specialCd -= dt; this.eatT -= dt;
    if (this.defeated) { this.updateDefeat(dt, game); return; }
    const C = control && !this.entering;
    const L = C && Input.held('left'), R = C && Input.held('right'), U = C && Input.held('up'), D = C && Input.held('down');
    const J = C && Input.held('jump'), Jhit = C && Input.hit('jump');
    if (this.dashT > 0) this.updateDash(dt, game);
    else if (this.s.flies) this.updateFly(dt, game, L, R, U, D);
    else this.updateWalk(dt, game, L, R, U, D, J, Jhit);
    if (C && Input.hit('punch') && this.punchCd <= 0 && this.dashT <= 0) this.punch(game, U, D);
    if (C && Input.hit('special') && this.specialCd <= 0 && this.def.special) { this.def.special(this, game); this.specialCd = this.s.specialCd; }
    this.x = clamp(this.x, 16, W - 16);
    if (this.hp <= 0) this.defeat(game);
  }

  updateWalk(dt, game, L, R, U, D, J, Jhit) {
    const s = this.s, dir = (R ? 1 : 0) - (L ? 1 : 0);
    if (this.state === 'ground' || this.state === 'roof') {
      this.vx = dir * s.speed; if (dir) { this.facing = dir; this.walkPhase += dt * s.speed * 0.085; }
      this.x += this.vx * dt;
      if (this.state === 'roof') {
        const b = this.roofB;
        if (!b || !b.alive || this.x < b.x - 4 || this.x > b.x + b.w + 4) { this.state = 'air'; this.vy = 0; this.roofB = null; return; }
        this.y = b.top();
        if (D) { this.startClimb(b); this.y = b.top() + this.h * 0.8; return; }
      }
      if (U && this.state === 'ground') { const b = game.faceBuilding(this.x); if (b) { this.startClimb(b); return; } }
      if (Jhit) { this.vy = -s.jump; this.state = 'air'; this.roofB = null; Sfx.play('jump'); }
    } else if (this.state === 'climb') {
      const b = this.climbB;
      if (!b || !b.alive) { this.letGo(); return; }
      const cy = (D ? 1 : 0) - (U ? 1 : 0);
      if (dir) this.facing = dir;
      this.x = clamp(this.x + dir * s.climb * 0.8 * dt, b.x + 8, b.x + b.w - 8);
      this.y += cy * s.climb * dt;
      if (cy || dir) this.climbPhase += dt * 8;
      const topLimit = b.top() + this.h * 0.8;
      if (this.y < topLimit) {
        if (U) { this.y = b.top(); this.state = 'roof'; this.roofB = b; this.climbB = null; return; }
        this.y = topLimit;
      }
      if (this.y >= GROUND) { this.y = GROUND; this.state = 'ground'; this.climbB = null; }
      if (Jhit) { this.state = 'air'; this.vy = -s.jump * 0.55; this.climbB = null; Sfx.play('jump'); }
    } else { // air
      this.vx = dir * s.speed * 0.95; if (dir) this.facing = dir;
      const prevY = this.y;
      this.vy += GRAV * dt;
      this.glide = !!(s.glide && J && this.vy > 0);
      if (this.glide) this.vy = Math.min(this.vy, 95);
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.vy > 0) {
        for (const b of game.buildings) {
          if (!b.alive) continue;
          const top = b.top();
          if (prevY <= top + 1 && this.y >= top && this.x >= b.x - 2 && this.x <= b.x + b.w + 2) { this.land(game, 'roof', b, top); return; }
        }
        if (this.y >= GROUND) { this.land(game, 'ground', null, GROUND); return; }
      }
      if (U) { const b = game.faceBuilding(this.x); if (b && this.y > b.top() + this.h * 0.8) this.startClimb(b); }
    }
  }

  updateFly(dt, game, L, R, U, D) {
    const s = this.s;
    if (this.entering) { this.y += 240 * dt; if (this.y >= 300) { this.entering = false; this.vy = 0; } return; }
    const ax = (R ? 1 : 0) - (L ? 1 : 0), ay = (D ? 1 : 0) - (U ? 1 : 0);
    if (ax) this.facing = ax;
    this.vx += ax * s.speed * 7 * dt; this.vy += ay * s.speed * 7 * dt;
    const damp = Math.pow(0.015, dt);
    if (!ax) this.vx *= damp; if (!ay) this.vy *= damp;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > s.speed) { this.vx *= s.speed / sp; this.vy *= s.speed / sp; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.y = clamp(this.y, this.h + 46, GROUND);
    if (chance(dt * 25)) FX.add({ x: this.x - this.facing * 18 + rand(-6, 6), y: this.y - this.h * 0.5 + rand(-14, 14), vx: -this.vx * 0.2, vy: 0,
      grav: 0, life: rand(0.4, 0.8), size: rand(5, 9), color: '#0b0306', shape: 'puff', ground: false });
  }

  updateDash(dt, game) {
    this.dashT -= dt;
    this.x += this.dashVX * dt; this.y += this.dashVY * dt;
    this.y = clamp(this.y, this.h + 46, GROUND);
    // "erased reality" streak
    FX.add({ x: this.x + rand(-10, 10), y: this.y - this.h * 0.5 + rand(-18, 18), grav: 0, life: 0.5, size: rand(8, 14), color: '#000', shape: 'puff', ground: false });
    if (chance(0.6)) FX.add({ x: this.x + rand(-20, 20), y: this.y - this.h * 0.5 + rand(-20, 20), grav: 0, life: 0.3, size: 2, color: '#fff', ground: false });
    const f = this.facing;
    const pts = [{ x: this.x + f * (this.w * 0.5 + 4), y: this.y - this.h * 0.5 }, { x: this.x, y: this.y - this.h * 0.5 }];
    game.resolveHit(this, pts, this.s.hitR + 4, 2, this.dashSet);
    if (this.dashT <= 0) { this.vx = this.dashVX * 0.2; this.vy = this.dashVY * 0.2; this.dashSet = null; }
  }

  land(game, state, b, y) {
    this.y = y; this.vy = 0; this.state = state; this.roofB = b; this.glide = false;
    if (this.entering) { this.entering = false; game.shake = Math.max(game.shake, 7); FX.dust(this.x, y, 8, '#cbbfae', 30); Sfx.play('boom'); }
    else FX.dust(this.x, y, 2, '#cbbfae', 14);
    // stomp anything underfoot
    for (const wk of game.walkers) if (!wk.dead && !wk.air && Math.abs(wk.x - this.x) < this.w * 0.5 && state === 'ground') {
      wk.dead = true; FX.dust(wk.x, GROUND - 6, 3, '#eee', 6); game.addScore(wk.kind === 'soldier' ? 150 : 50, wk.x, GROUND - 24);
    }
  }
  startClimb(b) {
    this.state = 'climb'; this.climbB = b; this.roofB = null; this.vx = 0; this.vy = 0;
    this.x = clamp(this.x, b.x + 8, b.x + b.w - 8);
  }
  letGo() { this.state = 'air'; this.climbB = null; this.roofB = null; this.vy = 0; }

  // Points the punch checks, nearest-to-hand first. Also stored for drawing.
  hitPoints(dir) {
    const s = this.s, f = this.facing, cy = this.y - this.h * s.armY;
    let hx, hy;
    if (s.flies) {
      hx = this.x + f * (this.w * 0.5 + 6); hy = this.y - this.h * 0.5;
      if (dir === 'up') { hx = this.x + f * 14; hy = this.y - this.h - 8; }
      if (dir === 'down') { hx = this.x + f * 14; hy = this.y + 6; }
    } else if (this.state === 'climb' && dir === 'side') {
      hx = this.x + f * (s.reach * 0.6 + 8); hy = cy;
    } else if (dir === 'up') {
      hx = this.x + f * this.w * 0.3; hy = this.y - this.h - s.reach * 0.8;
    } else if (dir === 'down') {
      if (this.state === 'roof') { hx = this.x + f * this.w * 0.3; hy = this.y + 16; }
      else { hx = this.x + f * (this.w * 0.4 + s.reach * 0.8); hy = this.y - 12; }
    } else {
      hx = this.x + f * (this.w * 0.4 + s.reach); hy = cy;
    }
    this.hand = { x: (hx - this.x) * f, y: hy - this.y };   // local, facing-normalized
    const pts = [{ x: hx, y: hy }];
    if (s.reach > 50) pts.push({ x: this.x + (hx - this.x) * 0.55, y: cy + (hy - cy) * 0.55 });
    return pts;
  }
  punch(game, U, D) {
    const s = this.s;
    this.punchCd = s.punchCd; this.punchT = 0.2;
    let dir = U ? 'up' : D ? 'down' : 'side';
    if (this.state === 'climb' && dir === 'down') dir = 'side';
    this.punchDir = dir;
    const hit = game.resolveHit(this, this.hitPoints(dir), s.hitR, s.dmg, null);
    if (!hit) Sfx.play('whiff');
    else if (this.def.id === 'chronomunch') Sfx.play('chomp');
  }
  takeHit(dmg, game, force = false) {
    if (this.defeated) return;
    if (!force && !this.vulnerable) return;
    this.hp -= dmg * this.s.armor; this.hurtT = 0.3;
    Sfx.play('hurt');
  }
  heal(n) { this.hp = Math.min(this.s.maxHp, this.hp + n); }

  defeat(game) {
    this.defeated = true; this.defT = 0; this.vy = 0; this.vx = 0; this.climbB = null; this.roofB = null; this.dashT = 0;
    this.onFloor = this.y >= GROUND - 1; if (this.onFloor) this.floorT = 0;
    Sfx.play('hurt');
  }
  updateDefeat(dt, game) {
    this.defT += dt;
    if (!this.onFloor) {
      this.vy += GRAV * dt; this.y += this.vy * dt;
      if (this.y >= GROUND) { this.y = GROUND; this.onFloor = true; this.floorT = this.defT; FX.dust(this.x, GROUND, 10, '#cbbfae', 40); Sfx.play('boom'); game.shake = 8; }
      return;
    }
    const k = this.defT - this.floorT;
    if (k > 1.0 && !this.reverted) {
      this.reverted = true; FX.dust(this.x, GROUND - 30, 14, '#eeeeee', 30); FX.ring(this.x, GROUND - 30, 70, '#ffffff');
      Sfx.play('poof'); this.facing = this.x < W / 2 ? -1 : 1;
    }
    if (this.reverted) {
      this.x += this.facing * 115 * dt;
      if ((this.x < -40 || this.x > W + 40 || k > 6) && !this.reported) { this.reported = true; game.onMonsterDefeated(); }
    }
  }

  pose() {
    return {
      t: this.t, walk: (this.state === 'ground' || this.state === 'roof') && Math.abs(this.vx) > 1,
      walkPhase: this.walkPhase, climb: this.state === 'climb', climbPhase: this.climbPhase,
      punch: this.punchT > 0 ? 1 - this.punchT / 0.2 : 0, punchDir: this.punchDir, hand: this.hand,
      air: this.state === 'air', glide: this.glide, eat: this.eatT > 0 ? this.eatT / 0.35 : 0,
      dash: this.dashT > 0, fly: this.state === 'fly',
    };
  }
  draw(ctx) {
    if (this.y < -200) return;
    // shadow
    if (!this.defeated && this.state !== 'climb') {
      const gy = this.state === 'roof' && this.roofB ? this.roofB.top() : GROUND;
      const hgt = clamp((gy - this.y) / 300, 0, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.3 * (1 - hgt)})`;
      ctx.beginPath(); ctx.ellipse(this.x, gy, this.w * 0.55 * (1 - hgt * 0.5), 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.facing < 0) ctx.scale(-1, 1);
    if ((this.hurtT > 0 || (this.invuln > 0 && !this.entering)) && Math.floor(this.t * 24) % 2 === 0) ctx.globalAlpha = 0.45;
    if (this.reverted) this.def.drawRevert(ctx, this.t);
    else if (this.defeated) {
      if (this.onFloor) { ctx.translate(0, -4); ctx.rotate(-Math.PI / 2 * clamp((this.defT - this.floorT) * 4, 0, 1)); ctx.translate(this.h * 0.0, 0); }
      if (Math.floor(this.t * 12) % 2 === 0) ctx.globalAlpha = 0.7;
      this.def.draw(ctx, this.pose());
    } else this.def.draw(ctx, this.pose());
    ctx.restore();
  }
}

/* =========================================================
   ROSTER
   Every monster is an original parody design. See LEGAL_NOTES.md
   before adding a new homage.
   ========================================================= */

/* ---------- 1. CTHULHU (public domain: The Call of Cthulhu, 1928) ---------- */
registerMonster({
  id: 'cthulhu', name: 'CTHULHU', tagline: 'Dead, but dreaming of downtown.',
  homage: "H.P. Lovecraft's Great Old One (public domain)",
  move: 'CLIMBS', specialName: 'MADNESS ROAR', specialDesc: 'Stuns the army, faints the crowd',
  passive: 'Hold JUMP mid-air to glide',
  bars: { STR: 5, SPD: 2, REACH: 2, TOUGH: 5 },
  stats: { w: 46, h: 88, speed: 118, climb: 82, jump: 660, dmg: 2, reach: 30, hitR: 20, punchCd: 0.34,
    maxHp: 120, armor: 0.85, armY: 0.62, glide: true, specialCd: 9 },
  portraitY: 0.8,
  special(m, game) { game.roar(m); },
  draw(ctx, p) {
    const t = p.t, G1 = '#3f8150', G2 = '#2a5b38', G3 = '#86c08a', DK = '#1d3d27';
    const sw = p.walk ? Math.sin(p.walkPhase) : 0;
    const bob = p.walk ? Math.abs(Math.cos(p.walkPhase)) * 2 : Math.sin(t * 2);
    ctx.save(); ctx.translate(0, -bob);
    // wings (behind)
    const spread = p.glide ? 1 : p.air ? 0.55 + 0.35 * Math.sin(t * 16) : 0.12 + 0.05 * Math.sin(t * 2.5);
    ctx.save(); ctx.translate(-8, -60); ctx.rotate(0.35 - spread * 0.9); ctx.scale(1 + spread * 0.35, 1);
    ctx.fillStyle = DK; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -34); ctx.lineTo(-40, -30);
    ctx.quadraticCurveTo(-31, -22, -31, -11); ctx.quadraticCurveTo(-23, -14, -18, -3); ctx.quadraticCurveTo(-10, -8, 0, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#122a1a'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-8, -34); ctx.lineTo(-40, -30); ctx.moveTo(-6, -30); ctx.lineTo(-31, -11); ctx.moveTo(-4, -22); ctx.lineTo(-18, -3); ctx.stroke();
    ctx.restore();
    // back arm
    const [bx, by] = p.climb ? [-4, -98 - Math.sin(p.climbPhase) * 6] : [-10 + sw * 8, -30];
    limb(ctx, -2, -56, bx, by, 10, G2, 0.15);
    // legs
    let f1, f2;
    if (p.climb) { f1 = [-8, -4 + Math.sin(p.climbPhase) * 5]; f2 = [10, -6 - Math.sin(p.climbPhase) * 5]; }
    else if (p.air) { f1 = [-10, -6]; f2 = [12, -9]; }
    else { f1 = [-4 - sw * 12, 0]; f2 = [6 + sw * 12, 0]; }
    limb(ctx, -4, -30, f1[0], f1[1], 12, G2, 0.1);
    ell(ctx, f1[0] + 3, f1[1] - 2, 8, 4, G2);
    limb(ctx, 4, -30, f2[0], f2[1], 13, G1, 0.1);
    ell(ctx, f2[0] + 3, f2[1] - 2, 8, 4, G1);
    // body
    ell(ctx, 0, -44, 19, 22, G1);
    ell(ctx, 6, -40, 11, 16, G3);
    ctx.strokeStyle = G2; ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(6, -52 + i * 7, 8, 0.3, Math.PI - 0.3); ctx.stroke(); }
    // head
    ell(ctx, -7, -80, 14, 15, G1);
    ell(ctx, 4, -74, 16, 17, G1);
    ell(ctx, 12, -80, 8, 3.5, G2);
    ell(ctx, 14, -77, 3.8, 2.8, '#ffe14d');
    ctx.fillStyle = '#111'; ctx.fillRect(13.5, -79.5, 1.2, 5);
    ell(ctx, 6, -78, 2.4, 2, '#ffe14d');
    // face tentacles
    for (let i = 0; i < 5; i++) {
      const x0 = 5 + i * 3.4, y0 = -66;
      const ex = x0 + 3 + Math.sin(t * 5 + i * 1.3) * 3 - sw * 2 + (p.eat ? 4 : 0), ey = -44 + (i % 2) * 5 - (p.eat ? 8 : 0);
      limb(ctx, x0, y0, ex, ey, 3.6, G2, 0.25 * Math.sin(t * 3 + i));
      ell(ctx, ex, ey, 1.8, 1.8, G2);
    }
    // front arm
    let rest;
    if (p.climb) rest = [12, -98 + Math.sin(p.climbPhase) * 6];
    else if (p.eat) rest = [16, -64];
    else rest = [14 - sw * 8, -30];
    const [hx, hy] = handTarget(p, rest[0], rest[1]);
    limb(ctx, 6, -56, hx, hy, 11, G1, -0.15);
    ctx.strokeStyle = '#d8e8c0'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(hx + 3, hy + i * 3); ctx.lineTo(hx + 8, hy + i * 4); } ctx.stroke();
    ctx.restore();
  },
  drawRevert(ctx, t) {  // a very small, very embarrassed squid
    const hop = -Math.abs(Math.sin(t * 12)) * 7;
    ctx.save(); ctx.translate(0, hop);
    ctx.strokeStyle = '#d27a8e'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-4 + i * 2.5, -6); ctx.lineTo(-7 + i * 3 + Math.sin(t * 20 + i) * 2, 0); ctx.stroke(); }
    ell(ctx, 0, -13, 6, 9, '#e48fa0', -0.2);
    ell(ctx, 3, -14, 1.6, 1.6, '#fff'); ell(ctx, 3.4, -14, 0.8, 0.8, '#000');
    ctx.fillStyle = '#9ad7ff'; ctx.beginPath(); ctx.arc(-6, -24, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
});

/* ---------- 2. LANKY HANK (original parody of the tall faceless internet legend) ---------- */
registerMonster({
  id: 'lanky', name: 'LANKY HANK', tagline: 'Six-foot-forty. No face. Great posture.',
  homage: 'A certain tall, faceless legend of the early internet',
  move: 'CLIMBS', specialName: 'BLINK', specialDesc: 'Short-range teleport, briefly untouchable',
  passive: 'Longest reach in the roster',
  bars: { STR: 3, SPD: 4, REACH: 5, TOUGH: 3 },
  stats: { w: 30, h: 124, speed: 150, climb: 112, jump: 600, dmg: 1.5, reach: 72, hitR: 16, punchCd: 0.28,
    maxHp: 100, armor: 1, armY: 0.62, specialCd: 2.2 },
  portraitY: 0.92,
  special(m, game) {
    const from = { x: m.x, y: m.y - m.h / 2 };
    m.x = clamp(m.x + m.facing * 160, 16, W - 16);
    m.invuln = Math.max(m.invuln, 0.35);
    if (m.state === 'climb' && m.climbB && (m.x < m.climbB.x + 4 || m.x > m.climbB.x + m.climbB.w - 4)) m.letGo();
    if (m.state === 'roof' && m.roofB && (m.x < m.roofB.x - 4 || m.x > m.roofB.x + m.roofB.w + 4)) { m.state = 'air'; m.roofB = null; m.vy = 0; }
    for (let i = 0; i < 18; i++) {
      FX.add({ x: from.x + rand(-12, 12), y: from.y + rand(-55, 55), grav: 0, life: rand(0.2, 0.5), size: rand(2, 5), color: pick(['#fff', '#888', '#000']), ground: false });
      FX.add({ x: m.x + rand(-12, 12), y: m.y - m.h / 2 + rand(-55, 55), grav: 0, life: rand(0.2, 0.5), size: rand(2, 5), color: pick(['#fff', '#888', '#000']), ground: false });
    }
    game.staticT = 0.25;
    Sfx.play('blink');
  },
  draw(ctx, p) {
    const t = p.t, SUIT = '#b39b6c', SUIT2 = '#8a7550', DARK = '#3a3022', SKIN = '#ece6dc', TIE = '#c0392b';
    const sw = p.walk ? Math.sin(p.walkPhase) : 0;
    const bob = p.walk ? Math.abs(Math.cos(p.walkPhase)) * 3 : 0;
    ctx.save(); ctx.translate(0, -bob);
    const hipY = -60;
    // back arm
    const back = p.climb ? [-6, -142 - Math.sin(p.climbPhase) * 8] : [-6 + sw * 10, -50 + Math.sin(t * 1.7) * 2];
    noodle(ctx, -2, -100, back[0], back[1], 4.5, SUIT2, 0.5, t);
    ell(ctx, back[0], back[1], 3.2, 3.2, '#d9d9d9');
    // legs
    let f1, f2;
    if (p.climb) { f1 = [-8, -10 + Math.sin(p.climbPhase) * 6]; f2 = [8, -14 - Math.sin(p.climbPhase) * 6]; }
    else if (p.air) { f1 = [-10, -10]; f2 = [10, -6]; }
    else { f1 = [-2 - sw * 16, 0]; f2 = [2 + sw * 16, 0]; }
    limb(ctx, -2, hipY, f1[0], f1[1], 6.5, SUIT2, 0.08);
    limb(ctx, 2, hipY, f2[0], f2[1], 6.5, SUIT, 0.08);
    ell(ctx, f1[0] + 3, f1[1] - 1, 6, 2.6, '#1b1b1b');
    ell(ctx, f2[0] + 3, f2[1] - 1, 6, 2.6, '#1b1b1b');
    // torso
    ctx.fillStyle = SUIT; ctx.beginPath(); ctx.moveTo(-10, -104); ctx.lineTo(12, -104); ctx.lineTo(9, hipY); ctx.lineTo(-8, hipY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.moveTo(-1, -104); ctx.lineTo(8, -104); ctx.lineTo(3.5, -90); ctx.fill();
    ctx.fillStyle = TIE; ctx.beginPath(); ctx.moveTo(2.5, -101); ctx.lineTo(5, -97); ctx.lineTo(3.5, -80); ctx.lineTo(1.5, -97); ctx.fill();
    ctx.strokeStyle = SUIT2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-1, -104); ctx.lineTo(2, -86); ctx.moveTo(8, -104); ctx.lineTo(5, -86); ctx.stroke();
    ctx.fillStyle = DARK; ctx.fillRect(-8, hipY - 3, 17, 3);
    // head (faceless — except for the sticky note)
    ctx.fillStyle = SKIN; ctx.fillRect(1, -110, 4, 7);
    ell(ctx, 3, -119, 9.5, 12.5, SKIN);
    ctx.save(); ctx.translate(7, -120); ctx.rotate(-0.12 + 0.05 * Math.sin(t * 3));
    ctx.fillStyle = '#ffe66b'; ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(-2, -1.5, 0.9, 0, Math.PI * 2); ctx.arc(2, -1.5, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0.2, 2.6, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.restore();
    // front arm
    let rest;
    if (p.climb) rest = [10, -146 + Math.sin(p.climbPhase) * 8];
    else if (p.eat) rest = [9, -112];
    else rest = [8 - sw * 10, -48 + Math.sin(t * 1.7 + 1) * 2];
    const [hx, hy] = handTarget(p, rest[0], rest[1]);
    noodle(ctx, 6, -100, hx, hy, 4.5, SUIT, p.punch > 0 ? 0.15 : 0.5, t + 1);
    ell(ctx, hx, hy, 3.8, 3.8, '#f4f4f4');
    ctx.restore();
  },
  drawRevert(ctx, t) {  // just a regular, very fast-walking man
    const lg = Math.sin(t * 18) * 4;
    ctx.strokeStyle = '#8a7550'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-lg, 0); ctx.moveTo(0, -12); ctx.lineTo(lg, 0); ctx.stroke();
    ctx.fillStyle = '#b39b6c'; ctx.fillRect(-4, -24, 8, 12);
    ell(ctx, 0, -28, 4, 4.5, '#ece6dc');
    ctx.fillStyle = '#ffe66b'; ctx.fillRect(1, -30, 3.5, 3.5);
    ctx.fillStyle = '#5a3d22'; ctx.fillRect(4, -14, 7, 5);
  },
});

/* ---------- 3. CHRONOMUNCH (original flying time-eater) ---------- */
registerMonster({
  id: 'chronomunch', name: 'CHRONOMUNCH', tagline: 'Eats the past. Also buildings.',
  homage: 'Certain famished time-eaters of horror literature',
  move: 'FLIES', specialName: 'TIME CHOMP', specialDesc: 'Lunge that devours everything in its path',
  passive: 'Free flight, never needs to climb',
  bars: { STR: 3, SPD: 5, REACH: 1, TOUGH: 2 },
  stats: { w: 52, h: 58, speed: 210, climb: 0, jump: 0, dmg: 1.25, reach: 26, hitR: 22, punchCd: 0.22,
    maxHp: 90, armor: 1.15, armY: 0.5, flies: true, specialCd: 3.5 },
  portraitY: 0.55,
  special(m, game) {
    let dx = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
    let dy = (Input.held('down') ? 1 : 0) - (Input.held('up') ? 1 : 0);
    if (!dx && !dy) dx = m.facing;
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    if (dx) m.facing = sign(dx);
    m.dashT = 0.3; m.dashVX = dx * 720; m.dashVY = dy * 720; m.dashSet = new Set();
    m.punchT = 0.2; m.punchDir = 'side';
    Sfx.play('dash');
  },
  draw(ctx, p) {
    const t = p.t, R = 26;
    const open = p.dash ? 1 : Math.max(punchExt(p.punch), p.eat ? 0.8 : 0.16 + 0.12 * Math.sin(t * 9));
    ctx.save(); ctx.translate(0, -30 + Math.sin(t * 3) * 3);
    // ragged outline
    ctx.fillStyle = '#12030a'; ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const a = i / 30 * Math.PI * 2, r = R + 3 + Math.sin(a * 7 + t * 12) * 2.4;
      i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.fill();
    const g = ctx.createRadialGradient(-8, -10, 3, 0, 0, R);
    g.addColorStop(0, '#7a1c33'); g.addColorStop(0.6, '#3a0a18'); g.addColorStop(1, '#14040a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    // mouth
    const mh = 4 + open * 15;
    const P0 = [-6, 0], P2 = [R + 3, 0];
    const up = [10, -mh], dn = [10, mh];
    ctx.fillStyle = '#2a0008'; ctx.beginPath(); ctx.moveTo(P0[0], P0[1]);
    ctx.quadraticCurveTo(up[0], up[1], P2[0], -mh * 0.85); ctx.lineTo(P2[0], mh * 0.85);
    ctx.quadraticCurveTo(dn[0], dn[1], P0[0], P0[1]); ctx.fill();
    ell(ctx, 12, mh * 0.45, 8, 2.5, '#a8284a');
    // teeth along both jaws
    ctx.fillStyle = '#f4efe2';
    const bez = (u, c, endY) => [(1 - u) ** 2 * P0[0] + 2 * (1 - u) * u * c[0] + u * u * P2[0], (1 - u) ** 2 * P0[1] + 2 * (1 - u) * u * c[1] + u * u * endY];
    for (let i = 0; i < 7; i++) {
      const u = 0.2 + i * 0.12;
      const [ux, uy] = bez(u, up, -mh * 0.85);
      ctx.beginPath(); ctx.moveTo(ux - 2.2, uy); ctx.lineTo(ux + 2.2, uy); ctx.lineTo(ux, uy + 5.5); ctx.fill();
      const [lx, ly] = bez(u + 0.06, dn, mh * 0.85);
      ctx.beginPath(); ctx.moveTo(lx - 2.2, ly); ctx.lineTo(lx + 2.2, ly); ctx.lineTo(lx, ly - 5.5); ctx.fill();
    }
    // eyes
    ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 8;
    ell(ctx, 3, -16, 2.6, 2, '#ff4040'); ell(ctx, 13, -14, 2.2, 1.8, '#ff4040');
    ctx.shadowBlur = 0;
    ctx.restore();
  },
  drawRevert(ctx, t) {  // a wind-up set of chattering teeth
    const hop = -Math.abs(Math.sin(t * 14)) * 6, o = Math.abs(Math.sin(t * 20)) * 3;
    ctx.save(); ctx.translate(0, hop);
    ctx.fillStyle = '#e88a9a'; ctx.beginPath(); ctx.roundRect(-8, -6, 16, 5, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-8, -13 - o, 16, 5, 2); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) { ctx.fillRect(-7 + i * 4, -8 - o, 3, 2.5); ctx.fillRect(-7 + i * 4, -6, 3, 2); }
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(-12, -9); ctx.moveTo(-12, -12); ctx.lineTo(-12, -6); ctx.stroke();
    ctx.restore();
  },
});
