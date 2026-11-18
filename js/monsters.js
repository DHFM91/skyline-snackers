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
    this.smite = null; this.beam = null; this.moveK = 1; this.slam = false; this.airTop = 0; this.slamCd = 0; this.landT = 0;
    this.entering = true;
  }
  box() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
  get vulnerable() { return !this.defeated && this.hurtT <= 0 && this.invuln <= 0 && this.dashT <= 0; }

  update(dt, game, control) {
    this.t += dt;
    this.punchCd -= dt; this.punchT -= dt; this.hurtT -= dt; this.invuln -= dt; this.specialCd -= dt; this.eatT -= dt; this.slamCd -= dt; this.landT -= dt;
    if (this.defeated) { this.updateDefeat(dt, game); return; }
    if (this.def.tick) this.def.tick(this, dt, game);
    this.turnT = (this.turnT || 0) - dt;
    if (this.lastFacing !== undefined && this.lastFacing !== this.facing) this.turnT = 0.22;
    this.lastFacing = this.facing;
    const C = control && !this.entering;
    const L = C && Input.held('left'), R = C && Input.held('right'), U = C && Input.held('up'), D = C && Input.held('down');
    const J = C && Input.held('jump'), Jhit = C && Input.hit('jump'), Dhit = C && Input.hit('down');
    if (this.dashT > 0) this.updateDash(dt, game);
    else if (this.s.flies) this.updateFly(dt, game, L, R, U, D);
    else this.updateWalk(dt, game, L, R, U, D, J, Jhit, Dhit);
    if (C && Input.hit('punch') && this.punchCd <= 0 && this.dashT <= 0) this.punch(game, U, D);
    if (C && Input.hit('special') && this.specialCd <= 0 && this.def.special) { this.def.special(this, game); this.specialCd = this.s.specialCd; }
    this.x = clamp(this.x, 16, W - 16);
    if (this.hp <= 0 && game.state === 'play') this.defeat(game);
  }

  updateWalk(dt, game, L, R, U, D, J, Jhit, Dhit) {
    const s = this.s, dir = (R ? 1 : 0) - (L ? 1 : 0);
    if (this.state === 'ground' || this.state === 'roof') {
      this.vx = dir * s.speed; if (dir) { this.facing = dir; this.walkPhase += dt * s.speed * 0.085; }
      this.x += this.vx * dt;
      if (this.state === 'roof') {
        const b = this.roofB;
        if (!b || !b.alive || this.x < b.x - 4 || this.x > b.x + b.w + 4) { this.state = 'air'; this.vy = 0; this.roofB = null; this.airTop = this.y; return; }
        this.y = b.top();
        if (Dhit && this.landT <= 0) { this.startClimb(b); this.y = b.top() + this.h * 0.8; return; }
      }
      if (U && this.state === 'ground') { const b = game.faceBuilding(this.x); if (b) { this.startClimb(b); return; } }
      if (Jhit) { this.vy = -s.jump; this.state = 'air'; this.roofB = null; this.airTop = this.y; Sfx.play('jump'); }
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
      if (Jhit) { this.state = 'air'; this.vy = -s.jump * 0.55; this.climbB = null; this.airTop = this.y; Sfx.play('jump'); }
    } else { // air
      this.vx = dir * s.speed * (this.slam ? 0.35 : 0.95); if (dir) this.facing = dir;
      const prevY = this.y;
      this.airTop = Math.min(this.airTop, this.y);
      // Roof Slam: press Down in the air to drop hard
      if (Dhit && !this.slam && !this.entering && this.slamCd <= 0) { this.slam = true; this.vy = Math.max(this.vy, 520); Sfx.play('dash'); }
      this.vy += GRAV * (this.slam ? 2.2 : 1) * dt;
      this.glide = !!(s.glide && J && this.vy > 0);
      if (this.glide) this.vy = Math.min(this.vy, 95);
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.vy > 0) {
        for (const b of game.buildings) {
          if (!b.alive) continue;
          const top = b.top();
          if (prevY <= top + 1 && this.y >= top && this.x >= b.x - 2 && this.x <= b.x + b.w + 2) {
            const fall = top - this.airTop, slam = this.slam;
            this.land(game, 'roof', b, top);
            if (slam) { game.roofSlam(this, b, clamp((fall - 60) / 170, 0.25, 1.2)); this.landT = 0.4; this.slamCd = 0.35; }
            return;
          }
        }
        if (this.y >= GROUND) {
          const slam = this.slam, fall = GROUND - this.airTop;
          this.land(game, 'ground', null, GROUND);
          // street shockwave needs a real drop (off a roof or wall), not a hop
          if (slam && fall > 150) { game.groundSlam(this); this.slamCd = 0.8; }
          return;
        }
      }
      if (U) { const b = game.faceBuilding(this.x); if (b && this.y > b.top() + this.h * 0.8) this.startClimb(b); }
    }
  }

  updateFly(dt, game, L, R, U, D) {
    const s = this.s;
    if (this.entering) { this.y += 240 * dt; if (this.y >= 300) { this.entering = false; this.vy = 0; } return; }
    const ax = (R ? 1 : 0) - (L ? 1 : 0), ay = (D ? 1 : 0) - (U ? 1 : 0);
    const mk = this.moveK;
    if (ax && mk >= 1) this.facing = ax;
    this.vx += ax * s.speed * 7 * dt * mk; this.vy += ay * s.speed * 7 * dt * mk;
    const damp = Math.pow(0.015, dt);
    if (!ax) this.vx *= damp; if (!ay) this.vy *= damp;
    const sp = Math.hypot(this.vx, this.vy);
    const cap = s.speed * mk;
    if (sp > cap) { this.vx *= cap / sp; this.vy *= cap / sp; }
    const prevY = this.y;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.y = clamp(this.y, this.h + 46, GROUND);
    // Dive Slam (flyers): dive down hard onto a roof
    if (D && this.vy > s.speed * 0.7 && this.slamCd <= 0) {
      for (const b of game.buildings) {
        if (!b.alive) continue;
        const top = b.top();
        if (prevY <= top && this.y >= top && this.x >= b.x && this.x <= b.x + b.w) {
          game.roofSlam(this, b, clamp(this.vy / s.speed, 0.5, 0.9));
          this.y = top - 1; this.vy = -s.speed * 0.8; this.slamCd = 1.2;
          break;
        }
      }
    }
  }

  updateDash(dt, game) {
    this.dashT -= dt;
    this.x += this.dashVX * dt; this.y += this.dashVY * dt;
    this.y = clamp(this.y, this.h + 46, GROUND);
    // "erased reality" streak
    if (chance(0.8)) FX.add({ x: this.x + rand(-20, 20), y: this.y - this.h * 0.5 + rand(-20, 20), grav: 0, life: 0.3, size: 2, color: '#fff', ground: false });
    const f = this.facing;
    const pts = [{ x: this.x + f * (this.w * 0.5 + 4), y: this.y - this.h * 0.5 }, { x: this.x, y: this.y - this.h * 0.5 }];
    game.resolveHit(this, pts, this.s.hitR + 4, 2, this.dashSet);
    if (this.dashT <= 0) { this.vx = this.dashVX * 0.2; this.vy = this.dashVY * 0.2; this.dashSet = null; }
  }

  land(game, state, b, y) {
    this.y = y; this.vy = 0; this.state = state; this.roofB = b; this.glide = false; this.slam = false;
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
  letGo() { this.state = 'air'; this.climbB = null; this.roofB = null; this.vy = 0; this.airTop = this.y; }

  // Points the punch checks, nearest-to-hand first. Also stored for drawing.
  hitPoints(dir) {
    const s = this.s, f = this.facing, cy = this.y - this.h * s.armY;
    let hx, hy;
    if (s.flies) {
      const fr = s.reach > 40 ? s.reach : 6, vr = s.reach > 40 ? s.reach * 0.7 : 8;   // long-reach flyers jab farther
      hx = this.x + f * (this.w * 0.5 + fr); hy = this.y - this.h * 0.5;
      if (dir === 'up') { hx = this.x + f * 14; hy = this.y - this.h - vr; }
      if (dir === 'down') { hx = this.x + f * 14; hy = this.y + vr - 2; }
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
    if (this.def.punch) { this.def.punch(this, game, dir); return; }
    const hit = game.resolveHit(this, this.hitPoints(dir), s.hitR, s.dmg, null);
    if (!hit) Sfx.play('whiff');
    else if (this.def.id === 'chronomunch') Sfx.play('chomp');
  }
  takeHit(dmg, game, force = false) {
    if (this.defeated || game.state !== 'play') return;   // no damage once a city is won (or before it starts)
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
      t: this.t, mon: this, turn: this.turnT > 0 ? 1 - this.turnT / 0.22 : 1,
      walk: (this.state === 'ground' || this.state === 'roof') && Math.abs(this.vx) > 1,
      walkPhase: this.walkPhase, climb: this.state === 'climb', climbPhase: this.climbPhase,
      punch: this.punchT > 0 ? 1 - this.punchT / 0.2 : 0, punchDir: this.punchDir, hand: this.hand,
      air: this.state === 'air', glide: this.glide, eat: this.eatT > 0 ? this.eatT / 0.35 : 0,
      dash: this.dashT > 0, fly: this.state === 'fly',
      charge: this.beamCharge(), aimDy: this.beam && !this.defeated ? this.beam.aim : 0,
      beam: this.beamPower(), beamDy: this.beam ? this.beam.by - this.y : 0,
      beamLen: (this.facing > 0 ? W - this.x : this.x) + 24,
    };
  }
  beamCharge() { const b = this.beam; return b && !this.defeated && b.st === 'charge' ? clamp(b.t / b.chargeT, 0, 1) : 0; }
  beamPower() { const b = this.beam; return b && !this.defeated && b.st === 'fire' ? clamp(1 - b.ft / b.fireT, 0, 1) : 0; }
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

/* ---------- 4. GENERIC KAIJU (original parody of the stock giant-crab movie monster) ---------- */
registerMonster({
  id: 'generickaiju', name: 'GENERIC KAIJU', tagline: 'Same giant crab, none of the brand.',
  homage: 'Every giant crab movie, ever',
  move: 'CLIMBS', specialName: 'FOAM BLAST', specialDesc: 'A frothy cone of suds that wrecks the block',
  passive: 'Hard shell: takes 10% less damage',
  bars: { STR: 4, SPD: 2, REACH: 2, TOUGH: 4 },
  stats: { w: 60, h: 88, speed: 115, climb: 84, jump: 600, dmg: 2, reach: 30, hitR: 24, punchCd: 0.32,
    maxHp: 120, armor: 0.9, armY: 0.6, specialCd: 6 },
  portraitY: 0.7,
  special(m, game) {
    const f = m.facing, mx = m.x + f * (m.w * 0.5 + 6), my = m.y - m.h * 0.5;
    const once = new Set();
    // sweep a short cone in front of the mouth, nearest points first
    for (let d = 20; d <= 190; d += 14) {
      for (let row = -1; row <= 1; row++) {
        const px = mx + f * d, py = my + d * 0.1 + row * d * 0.2;
        game.resolveHit(m, [{ x: px, y: py }], 12 + d * 0.05, 2, once);
      }
    }
    for (let i = 0; i < 28; i++) {
      const d = rand(10, 170);
      FX.add({ x: mx + f * d * 0.3, y: my + rand(-5, 5), vx: f * (d * 2.2 + rand(60, 140)), vy: rand(-40, 30) + d * 0.25, grav: 0,
        life: rand(0.4, 0.8), size: rand(5, 12), color: pick(['#ffffff', '#e6fbff', '#bfeaf0']), shape: 'puff', ground: false });
    }
    FX.spark(mx + f * 40, my, 6, '#e6fbff');
    FX.ring(mx + f * 20, my, 60, '#bfeaf0', 0.4);
    game.shake = Math.max(game.shake, 4);
    m.punchT = 0.2; m.punchDir = 'side';
    Sfx.play('dash');
  },
  draw(ctx, p) {
    const t = p.t, S1 = '#b8402e', S2 = '#8a281c', S3 = '#e8742c', CR = '#f0dfc2', SP = '#3b2a26', LBL = '#f5f4ee', INK = '#111';
    const sw = p.walk ? Math.sin(p.walkPhase) : 0;
    const bob = p.walk ? Math.abs(Math.cos(p.walkPhase)) * 2.5 : Math.sin(t * 1.6) * 0.8;
    // claw: palm plus two pincer fingers that open by openA radians
    const claw = (x, y, s, ang, openA, col, hi) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ell(ctx, 0, 0, 9 * s, 7 * s, col);
      ctx.save(); ctx.rotate(-openA * 0.5); ell(ctx, 10 * s, -2 * s, 9 * s, 3.4 * s, col); ell(ctx, 11 * s, -3 * s, 5 * s, 1 * s, hi); ctx.restore();
      ctx.save(); ctx.rotate(openA * 0.5); ell(ctx, 10 * s, 2.4 * s, 9 * s, 3.2 * s, col); ctx.restore();
      ctx.restore();
    };
    // a two-segment walking leg from the underside to a foot
    const leg = (x0, fx, fy, col) => {
      const kx = x0 + (fx - x0) * 0.55 - 5, ky = Math.min(-44, (-40 + fy) / 2 - 12);
      limb(ctx, x0, -38, kx, ky, 4.5, col, 0);
      limb(ctx, kx, ky, fx, fy, 3.8, col, 0);
      ell(ctx, fx, fy - 1, 2.4, 1.6, SP);
    };
    ctx.save(); ctx.translate(0, -bob);
    if (p.dash) ctx.rotate(0.1);
    // far-side legs and small claw (behind the shell)
    const legX = [-20, -8, 6, 18];
    for (let i = 0; i < 4; i++) {
      let fx, fy;
      if (p.climb) { fx = 28 + (i % 2) * 3; fy = -26 - i * 11 + Math.sin(p.climbPhase + i * 1.7 + 1) * 5; }
      else if (p.air) { fx = legX[i] * 1.5 - 4; fy = -12 + (i % 2) * 3; }
      else { const ph = p.walkPhase + i * Math.PI + 1; fx = legX[i] * 1.35 + 4 + Math.sin(ph) * 9; fy = -Math.max(0, Math.cos(ph)) * 4; }
      if (i % 2 === 0) leg(legX[i], fx, fy, S2);
    }
    const eatSnap = p.eat ? 0.45 + 0.4 * Math.sin(t * 32) : 0.15 + 0.06 * Math.sin(t * 2.3);
    let sr = p.climb ? [20, -82 + Math.sin(p.climbPhase + 3) * 6] : p.eat ? [26, -48] : [24 - sw * 5, -34];
    limb(ctx, 8, -52, sr[0], sr[1], 6, S2, -0.1);
    claw(sr[0] + 2, sr[1] - 1, 0.7, p.eat ? -0.5 : -0.2, eatSnap, S2, S3);
    // carapace
    ell(ctx, 0, -50, 31, 24, S1);
    ell(ctx, 0, -57, 27, 15, S3, 0);
    ell(ctx, 0, -54, 27, 17, S1);
    ctx.strokeStyle = S3; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -52, 28, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = S2;
    for (let i = 0; i < 5; i++) { const a = Math.PI * (1.08 + i * 0.2); ctx.beginPath(); ctx.arc(Math.cos(a) * 30, -50 + Math.sin(a) * 23, 3.4, 0, Math.PI * 2); ctx.fill(); }
    // underside plate
    ell(ctx, 6, -37, 22, 8, CR);
    ctx.strokeStyle = '#cdb994'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 7, -43); ctx.lineTo(-8 + i * 7, -32); ctx.stroke(); }
    // barnacle speckles
    ctx.fillStyle = SP;
    [[-22, -52, 2], [-16, -64, 1.6], [-26, -44, 1.5], [18, -66, 1.4], [24, -56, 1.8], [-8, -70, 1.3]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
    // generic label panel with barcode
    ctx.save(); ctx.translate(0, -52);
    if (ctx.getTransform().a < 0) ctx.scale(-1, 1);   // printed label: always reads the right way round
    ctx.fillStyle = LBL; ctx.fillRect(-10, -14, 20, 28);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.strokeRect(-10, -14, 20, 28);
    ctx.fillStyle = INK; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('KAIJU', 0, -7);
    ctx.fillRect(-8, -1, 16, 0.8);
    for (let i = 0; i < 11; i++) ctx.fillRect(-7.5 + i * 1.4, 3, (i % 3 === 0) ? 1.1 : 0.6, 9);
    ctx.restore();
    // mouthparts
    const mo = p.eat ? Math.abs(Math.sin(t * 28)) : 0.15 + 0.1 * Math.sin(t * 3);
    ctx.strokeStyle = CR; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(27, -40); ctx.lineTo(33 + mo * 2, -43 - mo * 5); ctx.moveTo(27, -38); ctx.lineTo(33 + mo * 2, -35 + mo * 5); ctx.stroke();
    ell(ctx, 29, -39, 3, 2, '#5a2a22');
    // eyestalks
    for (let i = 0; i < 2; i++) {
      const bx = 14 + i * 8, by = -68, ex = bx + 3 + Math.sin(t * 2.4 + i * 1.5) * 1.5 + (p.eat ? 2 : 0), ey = -84 - i * 2 + Math.sin(t * 3 + i) * 1;
      limb(ctx, bx, by, ex, ey, 3, S3, 0.05);
      ell(ctx, ex, ey, 4, 4, '#fff'); ell(ctx, ex + 1.2, ey, 1.8, 1.8, INK);
    }
    // near-side legs
    for (let i = 0; i < 4; i++) {
      let fx, fy;
      if (p.climb) { fx = 30 + ((i + 1) % 2) * 3; fy = -22 - i * 11 + Math.sin(p.climbPhase + i * 1.7) * 5; }
      else if (p.air) { fx = legX[i] * 1.5 + 4; fy = -8 + (i % 2) * 3; }
      else { const ph = p.walkPhase + i * Math.PI; fx = legX[i] * 1.35 + 6 + Math.sin(ph) * 9; fy = -Math.max(0, Math.cos(ph)) * 4; }
      if (i % 2 === 1) leg(legX[i], fx, fy, S1);
    }
    // big punching claw
    let rest;
    if (p.climb) rest = [30, -92 + Math.sin(p.climbPhase) * 6];
    else if (p.eat) rest = [28, -58];
    else rest = [34 - sw * 6, -44];
    const [hx, hy] = handTarget(p, rest[0], rest[1]);
    limb(ctx, 18, -54, hx - 8, hy, 9, S1, -0.18);
    const pa = p.punch > 0 ? (p.punch < 0.3 ? 0.8 : Math.max(0, 0.8 - (p.punch - 0.3) * 4)) : 0.14 + 0.05 * Math.sin(t * 2);
    claw(hx, hy, 1.3, p.eat ? -0.7 : p.climb ? -0.4 : 0, pa, S1, S3);
    ctx.restore();
  },
  drawRevert(ctx, t) {  // a stiff plastic toy crab with the price tag still on
    const sc = Math.sin(t * 16), hop = -Math.abs(sc) * 2.5;
    ctx.save(); ctx.translate(0, hop);
    ctx.strokeStyle = '#d9583f'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const lx = -6 + i * 4 + sc * 1.5; ctx.beginPath(); ctx.moveTo(lx, -6); ctx.lineTo(lx - 3, -1); ctx.moveTo(lx + 1, -6); ctx.lineTo(lx + 3, -1); ctx.stroke(); }
    ell(ctx, 0, -9, 10, 5.5, '#d9583f');
    ell(ctx, 0, -10.5, 8, 3, '#f08a3c');
    ell(ctx, 10, -13, 3.5, 3, '#d9583f'); ell(ctx, -3, -13, 3.5, 3, '#d9583f');
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2, -16, 1.8, 0, Math.PI * 2); ctx.arc(4, -16, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-1.6, -16, 0.8, 0, Math.PI * 2); ctx.arc(4.4, -16, 0.8, 0, Math.PI * 2); ctx.fill();
    ell(ctx, -9, -13, 3, 2.4, '#d9583f'); ell(ctx, 10, -12, 3.6, 2.8, '#d9583f');
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-2, -3); ctx.stroke();
    ctx.fillStyle = '#f5f4ee'; ctx.fillRect(-6, -4, 5, 4);
    ctx.fillStyle = '#111'; for (let i = 0; i < 4; i++) ctx.fillRect(-5.3 + i * 1.1, -3.3, 0.5, 2.6);
    ctx.restore();
  },
});

/* ---------- 5. ACT OF GOD (original: the thundercloud that insurance policies are afraid of) ---------- */
registerMonster({
  id: 'actofgod', name: 'ACT OF GOD', tagline: 'Not covered. Not even a little.',
  homage: "Every insurance policy's fine print",
  move: 'FLIES', specialName: 'SMITE', specialDesc: 'A volley of lightning strikes rains down across the block',
  passive: 'Overcast: soft and puffy, takes 15% less damage',
  bars: { STR: 2, SPD: 2, REACH: 5, TOUGH: 4 },
  stats: { w: 74, h: 56, speed: 135, climb: 0, jump: 0, dmg: 1.25, reach: 64, hitR: 16, punchCd: 0.42, maxHp: 130,
    armor: 0.85, armY: 0.5, flies: true, specialCd: 7 },
  portraitY: 0.5,
  special(m, game) {
    const n = 6, span = 150;
    const xs = [];
    for (let i = 0; i < n; i++) xs.push(clamp(m.x + (i / (n - 1) - 0.5) * 2 * span + rand(-14, 14), 20, W - 20));
    for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(rand(0, i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
    m.smite = { t: 0, next: 0, strikes: xs.map((x, i) => ({ x, at: i * 0.11 })), once: new Set() };
    for (const wk of game.walkers) if (!wk.air) wk.stun = Math.max(wk.stun || 0, 1.2);
    for (const tk of game.tanks) tk.stun = Math.max(tk.stun || 0, 1.2);
    for (const h of game.helis) if (!h.falling) h.stun = Math.max(h.stun || 0, 1.2);
    game.windowStun = Math.max(game.windowStun, 1.5);
    m.punchT = 0.2; m.punchDir = 'down';
    FX.ring(m.x, m.y - m.h * 0.5, 120, '#cdb8ff', 0.5);
    game.shake = Math.max(game.shake, 5);
    Sfx.play('roar');
  },
  tick(m, dt, game) {
    const sm = m.smite; if (!sm) return;
    sm.t += dt;
    const top = m.y - m.h * 0.5;
    while (sm.next < sm.strikes.length && sm.strikes[sm.next].at <= sm.t) {
      const x = sm.strikes[sm.next++].x;
      let px = m.x + (x - m.x) * 0.15, py = top;
      const steps = Math.max(8, Math.floor((GROUND - top) / 16));
      for (let i = 1; i <= steps; i++) {
        const nx = x + (i < steps ? rand(-9, 9) : 0), ny = top + (GROUND - top) * i / steps;
        for (let k = 0; k < 4; k++) {
          const u = k / 4;
          FX.add({ x: px + (nx - px) * u, y: py + (ny - py) * u, grav: 0, life: rand(0.18, 0.3), size: rand(2, 3.6), color: pick(['#ffffff', '#e9e2ff', '#cdb8ff']), ground: false });
        }
        px = nx; py = ny;
      }
      for (let y = top + 10; y <= GROUND; y += 14) game.resolveHit(m, [{ x, y }], 16, 2, sm.once);
      FX.spark(x, GROUND - 8, 8, '#e9e2ff');
      FX.ring(x, GROUND - 4, 50, '#cdb8ff', 0.3);
      FX.spark(x, GROUND - 14, 10, '#fff3b0');
      FX.dust(x, GROUND - 6, 2, '#d8d2e6', 14);
      game.shake = Math.max(game.shake, 5);
      Sfx.play('boom');
    }
    if (sm.next >= sm.strikes.length) m.smite = null;
  },
  draw(ctx, p) {
    const t = p.t, B1 = '#5d5472', B2 = '#443c58', B3 = '#7a6f92', DK = '#2b2540';
    const gulp = p.eat ? Math.abs(Math.sin(t * 22)) : 0;
    const ph = Math.sin(t * 17) * Math.sin(t * 5.3);
    const flick = ph > 0.72 ? (ph - 0.72) / 0.28 : 0;
    ctx.save(); ctx.translate(0, Math.sin(t * 2.2) * 3 + (p.walk ? Math.sin(p.walkPhase) * 2 : 0));
    if (p.dash) ctx.rotate(0.08);
    // rain streaks beneath
    ctx.strokeStyle = 'rgba(160,190,235,0.75)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = -30 + i * 7.5 + (i % 2) * 2, ph2 = (t * 2.4 + i * 0.37) % 1, y0 = -8 + ph2 * 34;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x - 2, y0 + 8); ctx.stroke();
    }
    // billows
    const puffs = [[-30, -22, 15, B2], [-16, -38, 17, B2], [4, -44, 19, B1], [24, -38, 16, B1], [34, -22, 14, B1], [22, -12, 16, B2], [-2, -10, 18, B2], [-20, -10, 15, B2], [0, -26, 26, B1]];
    puffs.forEach(([x, y, r, c], i) => ell(ctx, x + Math.sin(t * 1.6 + i) * 1.2, y + Math.cos(t * 1.3 + i * 2) * 1, r, r * 0.85, c));
    ctx.save(); ctx.globalAlpha = 0.5; ell(ctx, -6, -44, 13, 7, B3); ell(ctx, 20, -42, 9, 5, B3); ctx.restore();
    // internal lightning flicker
    if (flick > 0) {
      ctx.save(); ctx.globalAlpha = 0.25 * flick; ell(ctx, 0, -26, 30, 20, '#e9e2ff'); ctx.restore();
      ctx.strokeStyle = `rgba(240,235,255,${flick})`; ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(-26, -40); ctx.lineTo(-20, -32); ctx.lineTo(-25, -28); ctx.lineTo(-17, -18); ctx.stroke();
    }
    // face
    const fx = 8;
    ctx.fillStyle = '#17112a'; ctx.beginPath(); ctx.moveTo(fx - 14, -35); ctx.lineTo(fx + 14, -29); ctx.lineTo(fx + 14, -36); ctx.lineTo(fx - 14, -42); ctx.closePath(); ctx.fill();
    ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = 8 + flick * 8;
    ell(ctx, fx - 8, -29, 4.2, 3, '#fff6b8'); ell(ctx, fx + 9, -26, 4.2, 3, '#fff6b8');
    ctx.shadowBlur = 0;
    ell(ctx, fx - 7.5, -29, 1.5, 2.2, '#2a1a05'); ell(ctx, fx + 9.5, -26, 1.5, 2.2, '#2a1a05');
    // brow slashes over the eyes
    ctx.strokeStyle = '#17112a'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(fx - 15, -37); ctx.lineTo(fx - 3, -30); ctx.moveTo(fx + 16, -33); ctx.lineTo(fx + 3, -28); ctx.stroke();
    // mouth
    const mo = 2 + gulp * 8 + (p.punch > 0 ? 3 : 0);
    ctx.fillStyle = '#120a1f'; ctx.beginPath(); ctx.moveTo(fx - 8, -16); ctx.quadraticCurveTo(fx + 2, -16 - mo * 1.2, fx + 12, -15); ctx.quadraticCurveTo(fx + 2, -16 + mo, fx - 8, -16); ctx.fill();
    ctx.strokeStyle = '#17112a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(fx + 2, -9 - mo * 0.4, 12, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    // lightning jab to the hand
    if (p.punch > 0 && p.hand) {
      const [hx, hy] = handTarget(p, 30, -26), sx = 24, sy = -22;
      const dx = hx - sx, dy = hy - sy, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, seg = 9;
      const path = [[sx, sy]];
      for (let i = 1; i < seg; i++) { const j = (i % 2 ? 1 : -1) * 7 * Math.sin(t * 60 + i * 3.1); path.push([sx + dx * i / seg + nx * j, sy + dy * i / seg + ny * j]); }
      path.push([hx, hy]);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      [['rgba(150,120,255,0.55)', 8], ['#e9e2ff', 3.6], ['#ffffff', 1.5]].forEach(([c, w]) => {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      });
      ell(ctx, hx, hy, 6 + Math.sin(t * 50) * 1.5, 6, 'rgba(255,255,255,0.8)');
    }
    ctx.restore();
  },
  drawRevert(ctx, t) {  // one small, sad drizzle cloud
    const sc = Math.sin(t * 10), hop = -Math.abs(sc) * 2;
    ctx.save(); ctx.translate(0, hop);
    ctx.strokeStyle = '#8fb4e8'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const y0 = -9 + ((t * 3 + i * 0.33) % 1) * 9; ctx.beginPath(); ctx.moveTo(-4 + i * 4, y0); ctx.lineTo(-4.6 + i * 4, y0 + 2.4); ctx.stroke(); }
    ell(ctx, -4, -17, 5, 4, '#9a93ad'); ell(ctx, 3, -19, 6, 5, '#aaa3bd'); ell(ctx, 8, -16, 4.5, 3.6, '#9a93ad'); ell(ctx, 1, -15, 9, 3.6, '#b5aec7');
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(1, -18, 0.9, 0, Math.PI * 2); ctx.arc(6, -18, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(3.5, -13.5, 2, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.restore();
  },
});

/* ---------- 6. UNSCHEDULED VISITOR (original: the silent geometric invader of giant-robot fiction) ---------- */
registerMonster({
  id: 'visitor', name: 'UNSCHEDULED VISITOR', tagline: 'It has arrived. It did not call ahead.',
  homage: 'Mysterious invaders of a certain giant-robot genre',
  move: 'FLIES', specialName: 'LONG BEAM', specialDesc: 'Slow charge, then one red beam across the whole street',
  passive: 'Glass jaw: hits like a truck, breaks like a vase',
  bars: { STR: 5, SPD: 3, REACH: 4, TOUGH: 1 },
  stats: { w: 40, h: 60, speed: 150, climb: 0, jump: 0, dmg: 2.2, reach: 64, hitR: 12, punchCd: 0.8, maxHp: 70,
    armor: 1.4, armY: 0.5, flies: true, specialCd: 8 },
  portraitY: 0.5,
  special(m, game) {
    if (m.beam) return;
    m.beam = { st: 'charge', t: 0, chargeT: 1.0, fireT: 0.35, ft: 0, aim: 0, by: 0, f: m.facing, once: null };
    m.punchCd = Math.max(m.punchCd, 1.4);
    FX.ring(m.x, m.y - m.h * 0.5, 70, '#ff5a64', 0.9);
    Sfx.play('roar');
  },
  tick(m, dt, game) {
    const b = m.beam;
    if (!b) { m.moveK = 1; return; }
    if (m.defeated) { m.beam = null; m.moveK = 1; return; }
    const cx = m.x, cy = m.y - m.h * 0.5;
    m.moveK = 0.06; m.facing = b.f;
    m.punchCd = Math.max(m.punchCd, 0.1);
    if (b.st === 'charge') {
      b.t += dt;
      b.aim = clamp(b.aim + ((Input.held('down') ? 1 : 0) - (Input.held('up') ? 1 : 0)) * 70 * dt, -45, 45);
      if (chance(dt * 60)) {
        const a = rand(0, Math.PI * 2), d = rand(30, 55);
        FX.add({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: -Math.cos(a) * d * 2.2, vy: -Math.sin(a) * d * 2.2, grav: 0,
          life: 0.35, size: rand(2, 3.4), color: pick(['#ff4a5a', '#ffd5d8', '#fff']), ground: false });
      }
      game.shake = Math.max(game.shake, 0.6 + b.t * 1.5);
      if (b.t >= b.chargeT) {
        b.st = 'fire'; b.ft = 0; b.by = cy + b.aim; b.once = new Set();
        const f = b.f, y0 = b.by;
        for (let d = 10; ; d += 10) {
          const x = cx + f * d; if (x < -10 || x > W + 10) break;
          for (const dy of [-12, 0, 12]) game.resolveHit(m, [{ x, y: y0 + dy }], 12, 2.5, b.once);
          if (d % 80 === 0) { FX.spark(x, y0, 3, '#ffd5d8'); FX.add({ x, y: y0 + rand(-6, 6), vx: rand(-20, 20), vy: rand(-60, 60), grav: 0, life: rand(0.2, 0.4), size: rand(2, 4), color: '#ff4a5a', ground: false }); }
        }
        FX.ring(cx, y0, 90, '#ffffff', 0.4);
        FX.ring(cx + f * 40, y0, 60, '#ff4a5a', 0.5);
        game.shake = Math.max(game.shake, 14);
        Sfx.play('boom');
      }
    } else {
      b.ft += dt;
      game.shake = Math.max(game.shake, 6);
      if (chance(dt * 40)) {
        const x = cx + b.f * rand(20, W);
        FX.add({ x, y: b.by + rand(-8, 8), vx: rand(-30, 30), vy: rand(-70, 70), grav: 0, life: rand(0.2, 0.4), size: rand(2, 4), color: pick(['#ffffff', '#ff4a5a']), ground: false });
      }
      if (b.ft >= b.fireT) { m.beam = null; m.moveK = 1; }
    }
  },
  draw(ctx, p) {
    const t = p.t, CH = p.charge || 0, BM = p.beam || 0;
    const ease = CH * CH * (3 - 2 * CH);
    const open = clamp(Math.max(ease, BM > 0 ? 1 : 0, punchExt(p.punch) * 0.75, p.eat ? 0.6 : 0, 0.05 + 0.04 * Math.sin(t * 1.7)), 0, 1);
    const cy = -30, th = t * (0.5 + open * 0.6), tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
    const pulse = 0.5 + 0.5 * Math.sin(t * (3 + CH * 14));
    const coreR = 4.5 + pulse * 1.5 + ease * 5 + BM * 4;
    const bob = Math.sin(t * 1.9) * 3 + (p.walk ? Math.sin(p.walkPhase) * 2 : 0);
    ctx.save(); ctx.translate(0, bob);
    // plates of a five-sided double pyramid, pushed out along their own direction as it opens
    const Rr = 17, A = 26, eq = [];
    for (let k = 0; k < 5; k++) { const a = th + k * Math.PI * 2 / 5; eq.push([Math.cos(a) * Rr, 0, Math.sin(a) * Rr]); }
    const T = [0, -A, 0], Bt = [0, A, 0], plates = [];
    for (let k = 0; k < 5; k++) { plates.push([T, eq[k], eq[(k + 1) % 5], k]); plates.push([Bt, eq[(k + 1) % 5], eq[k], k + 5]); }
    const built = plates.map(([a, b, c, id]) => {
      const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      const push = open * 0.95, sc = 1 - 0.22 * open;
      const pts = [a, b, c].map(v => {
        let x = cen[0] + (v[0] - cen[0]) * sc + cen[0] * push, y = cen[1] + (v[1] - cen[1]) * sc + cen[1] * push, z = cen[2] + (v[2] - cen[2]) * sc + cen[2] * push;
        return [x, y * ct - z * st, y * st + z * ct];
      });
      const ux = pts[1][0] - pts[0][0], uy = pts[1][1] - pts[0][1], uz = pts[1][2] - pts[0][2];
      const vx = pts[2][0] - pts[0][0], vy = pts[2][1] - pts[0][1], vz = pts[2][2] - pts[0][2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      const lit = Math.abs((nx * -0.4 + ny * -0.6 + nz * 0.7) / nl);
      const z = (pts[0][2] + pts[1][2] + pts[2][2]) / 3;
      return { pts, z, lit, id };
    }).sort((a, b) => a.z - b.z);
    const plate = pl => {
      const hue = (310 + pl.id * 37 + pl.lit * 80 + t * 12) % 360;
      ctx.fillStyle = `hsl(${hue},${34 + pl.lit * 14}%,${66 + pl.lit * 24}%)`;
      ctx.strokeStyle = '#8d8896'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
      ctx.beginPath(); pl.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath();
      ctx.moveTo(pl.pts[0][0], pl.pts[0][1]); ctx.lineTo((pl.pts[0][0] + pl.pts[1][0]) / 2, (pl.pts[0][1] + pl.pts[1][1]) / 2);
      ctx.lineTo((pl.pts[0][0] + pl.pts[2][0]) / 2, (pl.pts[0][1] + pl.pts[2][1]) / 2); ctx.closePath(); ctx.fill();
    };
    ctx.save(); ctx.translate(0, cy);
    // slow drifting motes
    ctx.fillStyle = 'rgba(255,214,220,0.6)';
    for (let i = 0; i < 4; i++) { const a = t * 0.7 + i * 1.57, r = 30 + Math.sin(t + i) * 3; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a * 1.3) * 22, 1.2, 0, Math.PI * 2); ctx.fill(); }
    // pale feathered wings: folded tight while idle, spread wide while charging
    const spread = Math.max(ease, BM > 0 ? 1 : 0, open * 0.25);
    for (let row = 0; row < 2; row++) for (let sd = -1; sd <= 1; sd += 2) for (let i = 0; i < 3; i++) {
      const base = row ? Math.PI / 2 : -Math.PI / 2, ang = base + sd * (0.22 + i * 0.1 + spread * (0.55 + i * 0.5));
      const d = (row ? 20 : 24) + i * 3 + spread * 9, fl = (row ? 11 : 15) + i * 4 + spread * 6;
      ell(ctx, Math.cos(ang) * d, Math.sin(ang) * d, fl, 3, i % 2 ? '#e9e2ee' : '#f6f2f7', ang);
    }
    built.filter(pl => pl.z < 0).forEach(plate);
    // the core
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 2.6);
    cg.addColorStop(0, 'rgba(255,255,255,1)'); cg.addColorStop(0.25, 'rgba(255,60,70,0.95)'); cg.addColorStop(1, 'rgba(255,30,50,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, coreR * 2.6, 0, Math.PI * 2); ctx.fill();
    ell(ctx, 0, 0, coreR, coreR, '#ff2a3a'); ell(ctx, 0, 0, coreR * 0.45, coreR * 0.45, '#ffe8ea');
    built.filter(pl => pl.z >= 0).forEach(plate);
    // glow that leaks through the plates
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, 20 + open * 14);
    lg.addColorStop(0, `rgba(255,70,80,${0.3 + 0.25 * pulse + ease * 0.4})`); lg.addColorStop(1, 'rgba(255,40,60,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // interlocking gold-and-pearl wheels, rims studded with watchful eyes
    const ayt = p.aimDy || 0;
    for (let i = 0; i < 3; i++) {
      const R = 24 + i * 5 + open * 5, rot = t * (0.3 + 0.2 * i) * (i % 2 ? -1 : 1) + i * 1.05;
      const ty = Math.max(0.22, Math.abs(Math.cos(t * 0.5 + i * 1.3))), cr = Math.cos(rot), sr = Math.sin(rot);
      ctx.save(); ctx.rotate(rot);
      ctx.strokeStyle = '#b8902f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, R, R * ty, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#f3e3a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, R, R * ty, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#fbf7ef'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, 0, R, R * ty, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      for (let k = 0; k < 6; k++) {
        const a = t * (0.6 + 0.2 * i) * (i % 2 ? 1 : -1) + k * Math.PI / 3 + i;
        const lx = Math.cos(a) * R, ly = Math.sin(a) * R * ty;
        const ex = lx * cr - ly * sr, ey = lx * sr + ly * cr;
        const ph = Math.sin(t * 0.8 + k * 2.3 + i * 1.7), blink = ph > 0.93 ? 1 - (ph - 0.93) / 0.07 * 0.9 : 1;
        const rx = 3.4, ry = 3 * (0.3 + 0.7 * Math.max(ease, BM > 0 ? 1 : 0, 0.35)) * blink;
        ell(ctx, ex, ey, rx, Math.max(0.4, ry), '#fffdf6');
        const gx = 1.3, gy = Math.max(-1.2, Math.min(1.2, (ayt - ey) / 40));
        ell(ctx, ex + gx, ey + gy * ry / 3, 1.7, Math.max(0.4, Math.min(1.7, ry * 0.7)), '#d4202f');
        ell(ctx, ex + gx + 0.3, ey + gy * ry / 3, 0.7, Math.max(0.3, Math.min(0.7, ry * 0.4)), '#2a0508');
      }
    }
    // needle jab from the core to the fist point
    if (p.punch > 0 && p.hand) {
      const [hx, hy] = handTarget(p, 10, 0), ey = hy + 30;
      ctx.lineCap = 'round';
      [['rgba(255,50,70,0.45)', 6], ['#ff4a5a', 2.6], ['#ffffff', 1]].forEach(([c, w]) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hx, ey); ctx.stroke(); });
      ell(ctx, hx, ey, 4, 4, 'rgba(255,230,232,0.9)');
    }
    // targeting line while charging
    if (CH > 0) {
      const ay = (p.aimDy || 0), L = p.beamLen || 900;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255,60,80,${0.25 + 0.5 * CH})`; ctx.lineWidth = 1;
      ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, ay); ctx.lineTo(L, ay); ctx.stroke();
      ctx.setLineDash([]);
      ell(ctx, 0, ay, 2 + CH * 2, 2 + CH * 2, 'rgba(255,230,232,0.9)');
    }
    // the beam
    if (BM > 0) {
      const by = p.beamDy + 30, L = p.beamLen || 900, w = 6 + 26 * BM;
      ctx.lineCap = 'butt';
      [['rgba(255,40,60,0.28)', w * 1.8], ['rgba(255,60,80,0.6)', w], ['#ffc2c8', w * 0.45], ['#ffffff', w * 0.18]].forEach(([c, lw]) => {
        ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(L, by); ctx.stroke();
      });
      ell(ctx, 0, by, w * 0.9, w * 0.9, 'rgba(255,255,255,0.85)');
    }
    ctx.restore();
    ctx.restore();
  },
  drawRevert(ctx, t) {  // a lone four-sided die, rolling away, one pip short of a full set
    const sp = t * 7;
    ctx.save(); ctx.translate(0, -6 - Math.abs(Math.sin(sp)) * 2); ctx.rotate(sp);
    ctx.fillStyle = '#f1e9f3'; ctx.strokeStyle = '#8d8896'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(7, 5); ctx.lineTo(-7, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#cdbfd3'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(1, 5); ctx.stroke();
    ell(ctx, 0, 0, 1.6, 1.6, '#ff2a3a');
    ctx.restore();
  },
});

/* ---------- 7. ELDER STATESMAN (sprite: the owner's own art, art/statesman/*.png) ---------- */
// The owner's sprite art, cut into layered parts (art/statesman/*.png) and posed with simple joints.
const ST_PARTS = {};
if (typeof Image !== 'undefined') for (const k of ['legL', 'legR', 'base', 'head', 'arm']) { const im = new Image(); im.src = 'art/statesman/' + k + '.png'; ST_PARTS[k] = im; }
function drawStatesmanRig(ctx, p) {
  for (const k in ST_PARTS) if (!ST_PARTS[k].complete || !ST_PARTS[k].naturalWidth) return;
  const t = p.t || 0, IW = 309, IH = 420, K = 104 / IH;
  // pivots (image px): elbow of the reaching arm, neck, hips
  const ELB = [219, 182], NECK = [172, 104], HIPL = [81, 247], HIPR = [211, 247];
  // idle: a menacing sway, head bob and grasping claw (visible even on the roster's slow idle clock)
  let bodyRot = Math.sin(t * 3.1) * 0.025, bodyDY = Math.sin(t * 4.2) * 6, headRot = Math.sin(t * 3.7) * 0.07;
  let armRot = Math.sin(t * 5.3) * 0.16, armDX = 0, armDY = 0;
  let armSX = 1, legL = Math.sin(t * 3.1) * 0.03, legR = -Math.sin(t * 3.1) * 0.03, sy = 1 + Math.sin(t * 4.2) * 0.02;
  if (p.walk) {
    const k = Math.sin(p.walkPhase || 0);
    legL = k * 0.16; legR = -k * 0.16; bodyDY = -Math.abs(k) * 14; bodyRot = k * 0.03; headRot = k * 0.04; armRot = k * 0.12;
  }
  if (p.air) { legL = -0.14; legR = 0.14; armRot -= 0.35; }
  if (p.climb) {
    const k = Math.sin(p.climbPhase || 0);
    bodyRot = -0.14; armRot = -1.2 + k * 0.3; legL = 0.12 + k * 0.12; legR = -0.05 - k * 0.12; bodyDY = k * 8; headRot = -0.08;
  }
  if (p.punch) {
    const k = Math.sin(Math.min(1, p.punch) * Math.PI);
    const dir = p.punchDir || 'side';
    if (dir === 'up') { armRot += -1.05 * k; armSX = 1 + 0.15 * k; bodyRot -= 0.06 * k; }
    else if (dir === 'down') { armRot += 0.75 * k; armSX = 1 + 0.15 * k; bodyRot += 0.08 * k; }
    else { armRot += -0.1 * k; armSX = 1 + 0.45 * k; bodyRot += 0.07 * k; }
    headRot += 0.05 * k;
  }
  if (p.eat) { const k = Math.abs(Math.sin(t * 20)); armRot = -1.7; armSX = 0.9; headRot = 0.06 + k * 0.06; }
  if (p.dash) bodyRot += 0.1;
  const img = ST_PARTS;
  const piece = (im, px, py, rot, dx = 0, dy = 0, sx = 1) => {
    ctx.save(); ctx.translate(px + dx, py + dy); ctx.rotate(rot); ctx.scale(sx, 1); ctx.drawImage(im, -px, -py); ctx.restore();
  };
  ctx.save();
  ctx.scale(K, K);
  ctx.translate(-IW / 2, -IH);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
  // legs pivot at the hips; the body sits on top of them
  piece(img.legL, HIPL[0], HIPL[1], legL, 0, bodyDY * 0.4);
  piece(img.legR, HIPR[0], HIPR[1], legR, 0, bodyDY * 0.4);
  ctx.save();
  ctx.translate(IW / 2, IH * 0.6 + bodyDY); ctx.rotate(bodyRot); ctx.scale(1, sy); ctx.translate(-IW / 2, -IH * 0.6);
  ctx.drawImage(img.base, 0, 0);
  piece(img.head, NECK[0], NECK[1], headRot);
  piece(img.arm, ELB[0], ELB[1], armRot, armDX, armDY, armSX);
  ctx.restore();
  ctx.imageSmoothingEnabled = sm;
  ctx.restore();
}
registerMonster({
  id: 'statesman', name: 'ELDER STATESMAN', tagline: 'Has held this seat since before the seat was invented.',
  homage: 'The permanent ruling class',
  move: 'CLIMBS', specialName: 'FILIBUSTER', specialDesc: 'Talks forever: red tape stuns the army, and he heals',
  passive: 'Incumbency: each snack makes him hit harder (stacks, fades)',
  bars: { STR: 3, SPD: 2, REACH: 3, TOUGH: 4 },
  stats: { w: 46, h: 90, speed: 100, climb: 76, jump: 560, dmg: 1.75, reach: 40, hitR: 24, punchCd: 0.4,
    maxHp: 125, armor: 0.92, armY: 0.58, specialCd: 8 },
  portraitY: 1.0,
  tick(m, dt, game) {
    const base = m.def.stats;
    if (!m.inc) { m.inc = { n: 0, t: 0, prevEat: 0 }; m.s = Object.assign({}, base); }
    const inc = m.inc, fil = m.fil;
    if (fil) {
      fil.t += dt;
      m.eatT = 0.35;                       // reuse the chomping pose: jowls flapping
      const front = fil.t * 420;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const x = m.x + side * (front + rand(-14, 14)), y = GROUND - rand(4, 70);
          FX.add({ x, y, vx: side * rand(60, 180), vy: rand(-60, 20), grav: 40, life: rand(0.6, 1.1), size: rand(5, 9),
            color: pick(['#fffdf4', '#f3ead2', '#fffdf4']), rot: rand(0, 6), vr: rand(-6, 6), ground: false });
        }
        if (chance(0.7)) {
          const x0 = m.x + side * front, y0 = GROUND - rand(10, 60), v = side * rand(90, 200);
          for (let k = 0; k < 5; k++) FX.add({ x: x0 + side * k * 4, y: y0, vx: v, vy: 0, grav: 20, life: rand(0.5, 0.9), size: 3.2,
            color: k % 2 ? '#c0392b' : '#a52c20', ground: false });
        }
      }
      if (fil.t >= fil.dur) m.fil = null;
    } else if (m.eatT > inc.prevEat + 0.01) {
      if (inc.n < 5) { inc.n++; FX.text(m.x, m.y - m.h - 12, 'TERM +' + inc.n, '#ffd37a', 12); }
      inc.t = 6;
    }
    inc.prevEat = m.eatT;
    if (inc.n > 0) { inc.t -= dt; if (inc.t <= 0) { inc.n--; inc.t = 6; } }
    const slow = m.fil ? 0.12 : 1;
    m.s.speed = base.speed * slow; m.s.climb = base.climb * slow;
    m.s.dmg = base.dmg * (1 + 0.08 * inc.n);
    m.s.armor = base.armor * (1 - 0.02 * inc.n);
  },
  special(m, game) {
    m.fil = { t: 0, dur: 1 };
    m.vx = 0;
    for (const wk of game.walkers) if (!wk.air) { wk.stun = Math.max(wk.stun || 0, 3); if (wk.kind === 'civ') wk.panic = true; }
    for (const tk of game.tanks) tk.stun = Math.max(tk.stun || 0, 3);
    for (const h of game.helis) if (!h.falling) h.stun = Math.max(h.stun || 0, 3);
    game.windowStun = Math.max(game.windowStun, 3);
    m.heal(20);
    const cy = m.y - m.h * 0.6;
    for (let i = 0; i < 3; i++) setTimeout(() => FX.ring(m.x, cy, 240, '#c0392b', 0.8), i * 130);
    FX.text(m.x, cy - 46, 'FILIBUSTER!', '#ffd2c8', 18);
    game.shake = Math.max(game.shake, 6);
    Sfx.play('roar');
  },
  draw(ctx, p) { drawStatesmanRig(ctx, p); },
  drawRevert(ctx, t) {  // a frail old man, hobbling away behind his walker
    const st = Math.sin(t * 8), hop = Math.abs(st) * 1.2;
    ctx.save(); ctx.translate(0, -hop);
    ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(8, -14); ctx.lineTo(8, -2 + hop); ctx.moveTo(14, -14); ctx.lineTo(14, -2 + hop); ctx.moveTo(7, -14); ctx.lineTo(15, -14); ctx.stroke();
    ctx.fillStyle = '#d6c64a'; ctx.beginPath(); ctx.arc(8, -1 + hop, 1.2, 0, Math.PI * 2); ctx.arc(14, -1 + hop, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b2d5c'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(-2 + st * 2.5, hop); ctx.moveTo(1, -11); ctx.lineTo(2 - st * 2.5, hop); ctx.stroke();
    ctx.fillStyle = '#141414'; ctx.fillRect(-4 + st * 2.5, -1 + hop, 4, 1.6); ctx.fillRect(0 - st * 2.5, -1 + hop, 4, 1.6);
    ctx.save(); ctx.translate(0, -11); ctx.rotate(0.45);
    ctx.fillStyle = '#2b2d5c'; ctx.fillRect(-3.5, -12, 7, 12);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(0.5, -11, 1.2, 6);
    ctx.restore();
    ctx.strokeStyle = '#2b2d5c'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(3, -19); ctx.lineTo(9, -14); ctx.stroke();
    ell(ctx, 9, -14, 1.6, 1.6, '#e7c6a5');
    ell(ctx, 5.5, -25.5, 3.6, 3.8, '#e7c6a5');
    ell(ctx, 3.8, -27.5, 3.2, 2.4, '#f4f3ee');
    ctx.strokeStyle = '#f4f3ee'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(6.5, -27.6); ctx.lineTo(9, -26.6); ctx.stroke();
    ctx.restore();
  },
});
