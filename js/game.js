'use strict';
/* =========================================================
   GAME — state machine, level flow, combat resolution, render
   ========================================================= */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let RES = 1;
function resize() {
  // On a phone held upright, fill the width and leave room below for the controls.
  const portrait = IS_TOUCH && innerHeight > innerWidth;
  document.body.classList.toggle('portrait', portrait);
  const s = portrait ? innerWidth / W : Math.min(innerWidth / W, innerHeight / H);
  RES = clamp(s * (devicePixelRatio || 1), 1, 3);
  canvas.width = Math.round(W * RES); canvas.height = Math.round(H * RES);
  canvas.style.width = Math.floor(W * s) + 'px'; canvas.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', resize); resize();

const TITLE = 'SKYLINE SNACKERS';
const SUBTITLE = 'AN ELDRITCH WORLD TOUR';
const START_LIVES = 1;   // lives per game (and per continue)
const T = (keys, touch) => (IS_TOUCH ? touch : keys);   // prompt text for keyboard vs touch

function loadHi() { try { return parseInt(localStorage.getItem('skyline-snackers-hi') || '0', 10) || 0; } catch (e) { return 0; } }
function saveHi(v) { try { localStorage.setItem('skyline-snackers-hi', String(v)); } catch (e) { /* storage unavailable */ } }

const Game = {
  state: 'title', stateT: 0, t: 0, sel: 0,
  cityIdx: 0, tour: 1, d: 1, score: 0, hi: loadHi(), lives: START_LIVES,
  monster: null, buildings: [], walkers: [], tanks: [], helis: [], shots: [],
  far: [], stars: [], shake: 0, staticT: 0, windowStun: 0, levelT: 0, paused: false,
  spawn: {}, bonus: null, helpT: 0,

  get city() { return CITIES[this.cityIdx]; },
  setState(s) { this.state = s; this.stateT = 0; },

  /* ---------- flow ---------- */
  newGame() {
    this.score = 0; this.lives = START_LIVES; this.cityIdx = 0; this.tour = 1; this.helpT = 9;
    this.startCity();
  },
  startCity() {
    this.d = Math.min(4, 1 + this.cityIdx * 0.2 + (this.tour - 1) * 0.9);
    this.buildLevel();
    this.monster = new Monster(MONSTERS[this.sel]);
    this.monster.reset(W / 2);
    this.walkers = []; this.tanks = []; this.helis = []; this.shots = [];
    FX.clear();
    this.spawn = { civ: 0.5, sol: 4, tank: 14, heli: 10 };
    this.levelT = 0; this.paused = false; this.windowStun = 0;
    this.setState('intro');
  },
  buildLevel() {
    const rng = mulberry(this.cityIdx * 977 + this.tour * 31 + 7);
    const city = this.city;
    const list = [];
    let x = 0;
    const extra = Math.min(3, this.tour - 1);
    while (true) {
      const cols = 2 + Math.floor(rng() * 3);
      const floors = 4 + Math.floor(rng() * (4 + extra)) + (city.eldritch ? 1 : 0);
      const w = cols * CW + BPAD * 2;
      if (x + w > W - 60) break;
      list.push(new Building(x, cols, Math.min(floors, 10), city, rng, this.d));
      x += w + 34 + rng() * 46;
    }
    const span = list[list.length - 1].x + list[list.length - 1].w;
    const off = (W - span) / 2;
    list.forEach(b => b.x += off);
    this.buildings = list;
    // background skyline + stars
    this.far = []; let fx = -10;
    while (fx < W) { const w = 26 + rng() * 50; this.far.push({ x: fx, w, h: 50 + rng() * 150, lit: rng() }); fx += w + rng() * 8; }
    this.stars = []; for (let i = 0; i < 70; i++) this.stars.push({ x: rng() * W, y: rng() * 300, s: rng() * 1.6 + 0.4, p: rng() * 6 });
  },
  nextCity() {
    this.cityIdx++;
    if (this.cityIdx >= CITIES.length) { this.setState('tourdone'); Sfx.play('clear'); return; }
    this.startCity();
  },
  onMonsterDefeated() {
    this.lives--;
    if (this.lives > 0) { this.monster.reset(rand(200, W - 200)); }
    else { this.setState('gameover'); Sfx.play('over'); this.saveHi(); this.startBoardCheck(); }
  },
  startBoardCheck() {
    this.goPhase = 'checking'; this.myEntryT = 0;
    Leaderboard.fetchList().then(() => {
      if (this.state !== 'gameover' || this.goPhase !== 'checking') return;
      if (Leaderboard.qualifies(this.score)) { this.goPhase = 'initials'; this.initials = [0, 0, 0]; this.slot = 0; this.full = false; this.goT = 0; }
      else this.goPhase = 'final';
    });
  },
  updateInitials() {
    // Typed letters (keyboard, or the phone keyboard via touch.js) fill the boxes left to right.
    // this.full = all three boxes typed (cursor parked on the last box).
    for (const ch of Input.typed) {
      if (ch === '\b') { if (this.full) this.full = false; else if (this.slot > 0) this.slot--; Sfx.play('select'); continue; }
      const i = LETTERS.indexOf(ch); if (i < 0) continue;
      this.initials[this.slot] = i; Sfx.play('select');
      if (this.slot < 2) this.slot++; else this.full = true;
    }
    // The arcade dial still works: arrows / stick / gamepad (letter keys excluded so typing can't trigger these).
    if (Input.hitNav('up'))    { this.initials[this.slot] = (this.initials[this.slot] + 1) % 26; Sfx.play('select'); }
    if (Input.hitNav('down'))  { this.initials[this.slot] = (this.initials[this.slot] + 25) % 26; Sfx.play('select'); }
    if (Input.hitNav('left') && this.slot > 0) { this.slot--; this.full = false; Sfx.play('select'); }
    if (Input.hitNav('right') && this.slot < 2) { this.slot++; this.full = false; Sfx.play('select'); }
    if (this.goT > 0.4 && (Input.hitNav('start') || Input.hitNav('punch') || Input.hitNav('jump'))) {
      Sfx.play('confirm');
      if (this.slot < 2) { this.slot++; return; }
      this.goPhase = 'submitting';
      const t = Date.now();
      this.myEntryT = t;
      const entry = {
        n: this.initials.map(i => LETTERS[i]).join(''), s: this.score, m: this.monster.def.name,
        c: (this.tour > 1 ? 'T' + this.tour + ' ' : '') + this.city.name, t,
      };
      Leaderboard.submit(entry).then(() => { if (this.state === 'gameover') this.goPhase = 'final'; });
    }
  },
  saveHi() { if (this.score > this.hi) { this.hi = this.score; saveHi(this.hi); } },
  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined && n >= 100) FX.text(x, y, '+' + n, '#ffe14d', 12);
  },

  /* ---------- touch / tap ---------- */
  cardAt(x, y) {   // which select-screen card is under a point (logical coords)
    const n = MONSTERS.length, cw = 280, gap = 24, x0 = (W - (n * cw + (n - 1) * gap)) / 2;
    for (let i = 0; i < n; i++) { const cx = x0 + i * (cw + gap); if (x >= cx && x <= cx + cw && y >= 78 && y <= 498) return i; }
    return -1;
  },
  onTap(x, y) {
    switch (this.state) {
      case 'select': {
        const i = this.cardAt(x, y);
        if (i < 0) return;
        if (i === this.sel) Input.tap('start'); else { this.sel = i; Sfx.play('select'); }
        break;
      }
      case 'title': case 'intro': case 'clear': case 'tourdone': Input.tap('start'); break;
      case 'gameover':
        if (this.goPhase === 'final') Input.tap('start');
        else if (this.goPhase === 'initials' && typeof TouchPad !== 'undefined') TouchPad.openKeyboard();
        break;
      case 'play': if (this.paused) this.paused = false; break;
    }
  },

  /* ---------- combat ---------- */
  faceBuilding(x) {
    for (const b of this.buildings) if (b.alive && x >= b.x + 4 && x <= b.x + b.w - 4) return b;
    return null;
  },
  stunMult(kind) { return kind === 'window' && this.windowStun > 0 ? 0 : 1; },
  fire(x, y, kind) {
    const m = this.monster; if (!m || m.defeated) return;
    const tx = m.x + rand(-12, 12), ty = m.y - m.h * 0.5 + rand(-18, 18);
    const sp = kind === 'shell' ? 300 : 330;
    const a = Math.atan2(ty - y, tx - x);
    this.shots.push(new Shot(x, y, Math.cos(a) * sp, Math.sin(a) * sp, kind));
    if (kind === 'bullet') Sfx.play('shoot');
  },
  // pts: candidate hit points (nearest first). once: a Set to prevent repeat hits (dash attacks).
  resolveHit(m, pts, r, dmg, once) {
    for (const p of pts) {
      for (const h of this.helis) {
        if (h.dead || h.falling || (once && once.has(h)) || !circleRect(p.x, p.y, r, h.box())) continue;
        if (once) once.add(h);
        h.hp -= 1; h.flash = 0.1; FX.debris(h.x, h.y, 6, ['#4f5d3a', '#333', '#9fd0ee']); Sfx.play('punch'); this.shake = Math.max(this.shake, 3);
        if (h.hp <= 0) { h.falling = true; h.vy = -60; this.addScore(800, h.x, h.y - 20); FX.boom(h.x, h.y, 0.6); }
        return true;
      }
      for (const tk of this.tanks) {
        if (tk.dead || (once && once.has(tk)) || !circleRect(p.x, p.y, r, tk.box())) continue;
        if (once) once.add(tk);
        tk.hp -= dmg >= 2 ? 1.5 : 1; tk.flash = 0.1; FX.debris(tk.x, tk.y - 12, 6, ['#5b6b34', '#333']); Sfx.play('punch'); this.shake = Math.max(this.shake, 3);
        if (tk.hp <= 0) { tk.dead = true; FX.boom(tk.x, tk.y - 12, 1.2); Sfx.play('boom'); this.addScore(500, tk.x, tk.y - 30); this.shake = 8; }
        return true;
      }
      for (const wk of this.walkers) {
        if (wk.dead || !circleRect(p.x, p.y, r + 4, wk.box())) continue;
        wk.dead = true; this.eat(m, wk.kind === 'soldier' ? 'soldier' : 'person', wk.x, wk.y - 12);
        return true;
      }
      for (let bi = 0; bi < this.buildings.length; bi++) {
        const b = this.buildings[bi];
        const hc = b.cellAt(p.x, p.y);
        if (!hc || hc.cell.hp <= 0) continue;
        const key = bi * 1000 + hc.f * 10 + hc.c;
        if (once && once.has(key)) continue;
        if (once) once.add(key);
        const cell = hc.cell;
        if (cell.hp <= 1 && cell.occ) {
          const c = b.cellCenter(hc.f, hc.c);
          const kind = cell.occ; cell.occ = null;
          this.eat(m, kind, c.x, c.y);
        } else {
          b.hit(hc.f, hc.c, dmg, this);
          this.shake = Math.max(this.shake, 2);
        }
        return true;
      }
    }
    return false;
  },
  eat(m, kind, x, y) {
    m.eatT = 0.35;
    switch (kind) {
      case 'person':  m.heal(6);  this.addScore(200, x, y); FX.text(x, y - 16, 'GULP!', '#fff', 14); Sfx.play('eat'); break;
      case 'soldier': m.heal(5);  this.addScore(250, x, y); FX.text(x, y - 16, 'CRUNCH!', '#fff', 14); Sfx.play('eat'); break;
      case 'food':    m.heal(18); this.addScore(300, x, y); FX.text(x, y - 16, 'YUM!', '#8dff8a', 16); Sfx.play('eat'); break;
      case 'toaster': m.takeHit(12, this, true); FX.spark(x, y, 14); FX.text(x, y - 16, 'ZAP!', '#ffe14d', 18); Sfx.play('yuck'); this.shake = 6; break;
      case 'cash':    this.addScore(1500, x, y); FX.text(x, y - 16, '$$$', '#8dff8a', 18); Sfx.play('coin'); break;
    }
  },
  roar(m) {
    const cx = m.x, cy = m.y - m.h * 0.7;
    for (let i = 0; i < 4; i++) setTimeout(() => FX.ring(cx, cy, 260, '#7dffb0', 0.8), i * 120);
    Sfx.play('roar'); this.shake = 12;
    for (const wk of this.walkers) if (!wk.air) { wk.stun = 3; if (wk.kind === 'civ') wk.panic = true; }
    for (const tk of this.tanks) tk.stun = 2.5;
    for (const h of this.helis) if (!h.falling) h.stun = 2.5;
    this.windowStun = 3;
    FX.text(cx, cy - 50, 'PH\'NGLUI!', '#7dffb0', 20);
  },
  collapseBuilding(b) {
    b.collapsing = true; b.sinkV = 20;
    Sfx.play('crumble'); this.shake = 12;
    this.addScore(300 * b.floors, b.x + b.w / 2, b.top() - 20);
    FX.dust(b.x + b.w / 2, GROUND - 20, 14, '#c8bca9', b.w / 2);
    const m = this.monster;
    if (m && !m.defeated && (m.climbB === b || m.roofB === b)) { m.letGo(); m.takeHit(5, this, true); }
  },
  spawnFaller(x, y, kind) {
    const w = new Walker(kind === 'soldier' ? 'soldier' : 'civ', x, chance(0.5) ? 1 : -1, this.d);
    w.y = y; w.air = true; w.vy = -80;
    if (kind === 'soldier') { w.arrived = true; w.stopX = x; }
    this.walkers.push(w);
  },

  /* ---------- update ---------- */
  update(dt) {
    Input.pollPad();
    this.t += dt; this.stateT += dt;
    if (Input.hit('mute') && !(this.state === 'gameover' && this.goPhase === 'initials')) Sfx.muted = !Sfx.muted;
    const go = Input.hit('start') || Input.hit('punch') || Input.hit('jump');
    switch (this.state) {
      case 'title':
        this.updateAmbient(dt);
        if (go && this.stateT > 0.3) { Sfx.play('confirm'); this.setState('select'); }
        break;
      case 'select':
        this.updateAmbient(dt);
        if (Input.hit('left'))  { this.sel = (this.sel + MONSTERS.length - 1) % MONSTERS.length; Sfx.play('select'); }
        if (Input.hit('right')) { this.sel = (this.sel + 1) % MONSTERS.length; Sfx.play('select'); }
        if (go && this.stateT > 0.3) {
          Sfx.play('confirm');
          if (this.continuing) { this.continuing = false; this.score = 0; this.lives = START_LIVES; this.startCity(); }
          else this.newGame();
        }
        break;
      case 'intro':
        this.updateWorld(dt, false);
        if (this.stateT > 2.6 || (go && this.stateT > 0.6)) this.setState('play');
        break;
      case 'play':
        if (Input.hit('pause')) this.paused = !this.paused;
        if (!this.paused) {
          this.updateWorld(dt, true);
          if (this.helpT > 0) this.helpT -= dt;
          if (this.buildings.every(b => b.gone) && !this.monster.defeated) {
            const m = this.monster;
            this.bonus = { hp: Math.ceil(m.hp) * 10, time: Math.max(0, Math.round(150 - this.levelT)) * 20 };
            this.addScore(this.bonus.hp + this.bonus.time);
            this.saveHi(); Sfx.play('clear'); this.setState('clear');
          }
        }
        break;
      case 'clear':
        this.updateWorld(dt, false);
        if (this.stateT > 6 || (Input.hit('start') && this.stateT > 1.2)) this.nextCity();
        break;
      case 'gameover':
        this.updateWorld(dt, false);
        this.goT = (this.goT || 0) + dt;
        if (this.goPhase === 'initials') this.updateInitials();
        else if (this.goPhase === 'final' && Input.hit('start') && this.stateT > 1.2) { this.continuing = true; Sfx.play('confirm'); this.setState('select'); }
        break;
      case 'tourdone':
        this.updateAmbient(dt);
        if (go && this.stateT > 1.5) { this.tour++; this.cityIdx = 0; this.startCity(); }
        break;
    }
    Input.endFrame();
  },
  updateAmbient(dt) {
    for (const b of this.buildings) b.update(dt, this);
    FX.update(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
  },
  updateWorld(dt, active) {
    this.levelT += dt;
    if (this.windowStun > 0) this.windowStun -= dt;
    if (this.staticT > 0) this.staticT -= dt;
    const m = this.monster;
    const control = this.state === 'play' || this.state === 'clear';
    m.update(dt, this, control);
    for (const b of this.buildings) b.update(dt, this);
    if (active) this.spawnStuff(dt);
    else if (chance(dt * 0.5)) this.spawnCiv();
    for (const wk of this.walkers) wk.update(dt, this);
    for (const tk of this.tanks) tk.update(dt, this);
    for (const h of this.helis) h.update(dt, this);
    for (const s of this.shots) {
      s.update(dt);
      if (!s.dead && m.vulnerable && circleRect(s.x, s.y, s.r, m.box())) {
        s.dead = true; m.takeHit(s.dmg, this);
        FX.spark(s.x, s.y, s.kind === 'shell' ? 10 : 4, s.kind === 'shell' ? '#ff9a3c' : '#fff6a8');
        if (s.kind === 'shell') { FX.boom(s.x, s.y, 0.5); Sfx.play('boom'); this.shake = Math.max(this.shake, 5); }
      }
    }
    this.walkers = this.walkers.filter(o => !o.dead);
    this.tanks = this.tanks.filter(o => !o.dead);
    this.helis = this.helis.filter(o => !o.dead && o.x > -150 && o.x < W + 150);
    this.shots = this.shots.filter(o => !o.dead);
    FX.update(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
  },
  spawnCiv() {
    const dir = chance(0.5) ? 1 : -1;
    this.walkers.push(new Walker('civ', dir > 0 ? -10 : W + 10, dir, this.d));
  },
  spawnStuff(dt) {
    const sp = this.spawn, d = this.d;
    sp.civ -= dt; sp.sol -= dt;
    if (sp.civ <= 0) { sp.civ = rand(1.4, 3.2); this.spawnCiv(); }
    const soldiers = this.walkers.filter(w => w.kind === 'soldier').length;
    if (sp.sol <= 0) {
      sp.sol = rand(5, 8) / d;
      if (soldiers < 2 + Math.floor(d * 1.5)) { const dir = chance(0.5) ? 1 : -1; this.walkers.push(new Walker('soldier', dir > 0 ? -10 : W + 10, dir, d)); }
    }
    if (this.levelT > 12) {
      sp.tank -= dt;
      if (sp.tank <= 0) { sp.tank = rand(14, 20) / d; if (this.tanks.length < 1 + Math.floor((d - 1) * 1.2)) this.tanks.push(new Tank(chance(0.5) ? 1 : -1, d)); }
    }
    if (this.levelT > 8) {
      sp.heli -= dt;
      if (sp.heli <= 0) { sp.heli = rand(12, 18) / d; if (this.helis.filter(h => !h.falling).length < 1 + Math.floor((d - 1) * 1.5)) this.helis.push(new Heli(chance(0.5) ? 1 : -1, d)); }
    }
  },

  /* ---------- render ---------- */
  render() {
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.save();
    if (this.shake > 0.3) ctx.translate(rand(-this.shake, this.shake) * 0.5, rand(-this.shake, this.shake) * 0.5);
    this.drawBackdrop();
    const inLevel = !['title', 'select', 'tourdone'].includes(this.state);
    for (const b of this.buildings) b.draw(ctx, this.city, this.t, inLevel ? this.monster : null);
    if (inLevel) {
      for (const tk of this.tanks) tk.draw(ctx);
      for (const wk of this.walkers) wk.draw(ctx, this.t);
      this.monster.draw(ctx);
      for (const h of this.helis) h.draw(ctx);
      for (const s of this.shots) s.draw(ctx);
    }
    FX.draw(ctx);
    if (this.city.eldritch) { ctx.fillStyle = 'rgba(20,80,60,0.12)'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    if (this.staticT > 0) this.drawStatic();
    switch (this.state) {
      case 'title': this.drawTitle(); break;
      case 'select': this.drawSelect(); break;
      case 'intro': this.drawHUD(); this.drawIntro(); break;
      case 'play': this.drawHUD(); if (this.paused) this.drawBanner('PAUSED', T('P to resume  ·  M to mute', 'Tap the screen to resume')); else if (this.helpT > 0) this.drawHelp(); break;
      case 'clear': this.drawHUD(); this.drawClear(); break;
      case 'gameover': this.drawHUD(); this.drawGameOver(); break;
      case 'tourdone': this.drawTourDone(); break;
    }
  },
  drawBackdrop() {
    const c = this.city, t = this.t;
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, c.sky[0]); g.addColorStop(1, c.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (c.tod === 'night') {
      for (const s of this.stars) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + s.p); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.s, s.s); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.eldritch ? '#bfffd8' : '#f4f1dc'; ctx.beginPath(); ctx.arc(140, 80, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.sky[0]; ctx.beginPath(); ctx.arc(152, 72, 24, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = c.tod === 'dusk' ? 'rgba(255,230,160,0.9)' : 'rgba(255,250,220,0.9)';
      ctx.beginPath(); ctx.arc(c.tod === 'dusk' ? 200 : 120, c.tod === 'dusk' ? 330 : 80, c.tod === 'dusk' ? 50 : 32, 0, Math.PI * 2); ctx.fill();
    }
    if (c.eldritch) {
      ctx.strokeStyle = 'rgba(125,255,176,0.15)'; ctx.lineWidth = 18;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); for (let x = 0; x <= W; x += 20) { const y = 120 + i * 40 + Math.sin(x * 0.01 + t * 0.6 + i) * 20; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    }
    drawLandmark(ctx, c.landmark, shade(c.far, -0.12), t, c);
    for (const f of this.far) {
      ctx.fillStyle = c.far; ctx.fillRect(f.x, GROUND - 14 - f.h, f.w, f.h + 14);
      if (c.tod !== 'day') {
        ctx.fillStyle = c.eldritch ? 'rgba(125,255,176,0.35)' : 'rgba(255,220,120,0.35)';
        for (let yy = GROUND - f.h; yy < GROUND - 20; yy += 14) for (let xx = f.x + 4; xx < f.x + f.w - 4; xx += 9) if (((xx * 7 + yy * 13) % 5) < 2) ctx.fillRect(xx, yy, 3, 4);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, GROUND - 160, W, 160);
    ctx.fillStyle = c.walk; ctx.fillRect(0, GROUND, W, 12);
    ctx.fillStyle = shade(c.walk, -0.2); ctx.fillRect(0, GROUND + 12, W, 3);
    ctx.fillStyle = c.ground; ctx.fillRect(0, GROUND + 15, W, H - GROUND - 15);
    ctx.fillStyle = c.tod === 'night' ? 'rgba(255,220,120,0.4)' : 'rgba(255,255,255,0.55)';
    for (let x = ((-t * 0) % 60); x < W; x += 60) ctx.fillRect(x + 10, GROUND + 38, 30, 4);
  },
  drawStatic() {
    ctx.save(); ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.globalAlpha = clamp(this.staticT * 2.5, 0, 0.5);
    for (let i = 0; i < 400; i++) { ctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#000'; ctx.fillRect(Math.random() * W, Math.random() * H, 3, 2); }
    ctx.restore();
  },
  /* ---------- UI ---------- */
  text(str, x, y, size, color = '#fff', align = 'center', stroke = 4) {
    ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = stroke; ctx.strokeStyle = '#000'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  },
  drawPortrait(def, x, y, r, t) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#1a1a24'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.clip();
    const s = (r * 2.1) / def.stats.h * (def.stats.flies ? 0.85 : 1.25);
    ctx.translate(x, y + def.stats.h * s * (def.portraitY || 0.6)); ctx.scale(s, s);
    def.draw(ctx, demoPose(t));
    ctx.restore();
  },
  drawHUD() {
    const m = this.monster; if (!m) return;
    const def = m.def;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(8, 8, 300, 60, 10); ctx.fill();
    this.drawPortrait(def, 38, 38, 24, this.t);
    this.text(def.name, 70, 28, 13, '#fff', 'left', 3);
    const ratio = clamp(m.hp / m.s.maxHp, 0, 1);
    ctx.fillStyle = '#2a0b0b'; ctx.fillRect(70, 34, 226, 12);
    ctx.fillStyle = ratio > 0.5 ? '#4cd964' : ratio > 0.25 ? '#ffcc00' : '#ff3b30';
    ctx.fillRect(70, 34, 226 * ratio, 12);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(70, 34, 226, 12);
    const ready = m.specialCd <= 0;
    const sc = ready ? 1 : clamp(1 - m.specialCd / m.s.specialCd, 0, 1);
    ctx.fillStyle = '#222'; ctx.fillRect(70, 52, 110, 6);
    ctx.fillStyle = ready ? (Math.sin(this.t * 8) > 0 ? '#7dffb0' : '#4fd38a') : '#5a7a8a'; ctx.fillRect(70, 52, 110 * sc, 6);
    this.text(def.specialName, 186, 59, 8, ready ? '#7dffb0' : '#999', 'left', 2);
    for (let i = 0; i < this.lives; i++) { ctx.fillStyle = '#ff5a7a'; ctx.beginPath(); ctx.arc(284 - i * 12, 24, 4, 0, Math.PI * 2); ctx.fill(); }
    this.text('SCORE ' + String(this.score).padStart(7, '0'), W - 14, 30, 16, '#ffe14d', 'right', 4);
    this.text('HIGH SCORE ' + String(Math.max(this.hi, this.score)).padStart(7, '0'), W - 14, 50, 11, '#ddd', 'right', 3);
    this.text(this.city.name + (this.tour > 1 ? '  ·  TOUR ' + this.tour : ''), W / 2, 26, 13, '#fff', 'center', 3);
    if (Sfx.muted) this.text('MUTED', W / 2, 44, 9, '#aaa', 'center', 2);
  },
  drawHelp() {
    const a = clamp(this.helpT, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(W / 2 - 330, H - 42, 660, 30, 8); ctx.fill();
    const m = this.monster;
    if (IS_TOUCH) {
      this.text(`STICK: ${m.s.flies ? 'FLY' : 'WALK / CLIMB'}   PUNCH (+ STICK UP/DOWN TO AIM)   ${m.s.flies ? '' : 'JUMP   '}SPECIAL: ${m.def.specialName}`, W / 2, H - 22, 11, '#fff', 'center', 0);
      ctx.globalAlpha = 1;
      return;
    }
    const move = m.s.flies ? 'ARROWS/WASD fly' : '←→ walk  ↑↓ climb';
    this.text(`${move}   Z/J punch (+↑/↓ to aim)   ${m.s.flies ? '' : 'X/K jump   '}C/L ${m.def.specialName}   P pause`, W / 2, H - 22, 11, '#fff', 'center', 0);
    ctx.globalAlpha = 1;
  },
  drawBanner(big, small, color = '#ffe14d') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H / 2 - 60, W, 120);
    this.text(big, W / 2, H / 2 + 6, 44, color, 'center', 6);
    if (small) this.text(small, W / 2, H / 2 + 40, 14, '#fff', 'center', 3);
  },
  drawIntro() {
    const k = clamp(this.stateT * 3, 0, 1), out = clamp((this.stateT - 2.1) * 3, 0, 1);
    const x = lerp(-W, 0, k) + lerp(0, W, out);
    ctx.save(); ctx.translate(x, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 150, W, 140);
    this.text(this.cityIdx === 0 && this.tour === 1 ? 'FIRST STOP' : 'NEXT STOP', W / 2, 190, 16, '#ff9a3c', 'center', 3);
    this.text(this.city.name, W / 2, 246, 50, '#fff', 'center', 6);
    this.text(this.city.sub.toUpperCase(), W / 2, 274, 13, '#ccc', 'center', 3);
    ctx.restore();
  },
  drawClear() {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 140, W, 200);
    this.text(this.city.name + ' — CRUNCHED!', W / 2, 200, 36, '#7dffb0', 'center', 6);
    if (this.bonus) {
      if (this.stateT > 0.6) this.text('HEALTH BONUS   ' + this.bonus.hp, W / 2, 245, 16, '#fff', 'center', 3);
      if (this.stateT > 1.0) this.text('SPEED BONUS   ' + this.bonus.time, W / 2, 272, 16, '#fff', 'center', 3);
    }
    if (this.stateT > 1.4) this.text(T('PRESS ENTER TO TRAVEL ON', 'TAP TO TRAVEL ON'), W / 2, 315, 12, Math.sin(this.t * 6) > 0 ? '#ffe14d' : '#fff', 'center', 3);
  },
  drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    const blink = Math.sin(this.t * 6) > 0;
    this.text('GAME OVER', W / 2, 76, 36, '#ff3b30', 'center', 6);
    this.text(this.monster.def.name + ' HAS SHUFFLED OFF IN SHAME  ·  SCORE ' + this.score, W / 2, 98, 12, '#ffe14d', 'center', 3);
    const ph = this.goPhase;
    if (ph === 'checking' || ph === 'submitting') {
      this.text(ph === 'checking' ? 'CHECKING THE WORLD TOP 10...' : 'CARVING YOUR NAME INTO THE RUBBLE...', W / 2, 270, 16, '#fff', 'center', 3);
      return;
    }
    if (ph === 'initials') {
      this.text('NEW WORLD HIGH SCORE!', W / 2, 170, 26, '#7dffb0', 'center', 5);
      this.text('ENTER YOUR INITIALS', W / 2, 200, 13, '#fff', 'center', 3);
      for (let i = 0; i < 3; i++) {
        const x = W / 2 - 90 + i * 90, on = i === this.slot;
        ctx.fillStyle = on ? 'rgba(255,225,77,0.2)' : 'rgba(255,255,255,0.06)';
        ctx.beginPath(); ctx.roundRect(x - 34, 225, 68, 84, 10); ctx.fill();
        ctx.lineWidth = on ? 3 : 1.5; ctx.strokeStyle = on ? '#ffe14d' : 'rgba(255,255,255,0.3)'; ctx.stroke();
        this.text(LETTERS[this.initials[i]], x, 287, 50, on ? '#ffe14d' : '#fff', 'center', 5);
        if (on) { this.text('▲', x, 220, 14, blink ? '#ffe14d' : '#fff', 'center', 2); this.text('▼', x, 328, 14, blink ? '#ffe14d' : '#fff', 'center', 2); }
      }
      this.text(T('TYPE YOUR INITIALS (OR ↑↓ ←→ TO DIAL)   ·   ENTER TO CONFIRM', 'TAP THE LETTERS TO TYPE, OR DIAL WITH THE STICK   ·   PUNCH TO CONFIRM'), W / 2, 372, 11, '#ccc', 'center', 2);
      return;
    }
    // final: the board
    this.text('WORLD TOP 10' + (Leaderboard.offline ? '  (OFFLINE — LAST KNOWN)' : ''), W / 2, 134, 18, '#7dffb0', 'center', 4);
    const cols = [W / 2 - 300, W / 2 - 250, W / 2 - 60, W / 2 + 40, W / 2 + 300];
    this.text('#', cols[0], 154, 10, '#888', 'left', 0); this.text('NAME', cols[1], 154, 10, '#888', 'left', 0);
    this.text('SCORE', cols[2] + 40, 154, 10, '#888', 'right', 0); this.text('MONSTER', cols[3], 154, 10, '#888', 'left', 0);
    this.text('REACHED', cols[4], 154, 10, '#888', 'right', 0);
    for (let i = 0; i < LEADERBOARD_SIZE; i++) {
      const e = Leaderboard.list[i], y = 180 + i * 24;
      const mine = e && this.myEntryT && e.t === this.myEntryT;
      const col = mine ? (blink ? '#7dffb0' : '#fff') : e ? '#fff' : '#555';
      this.text(String(i + 1), cols[0], y, 14, col, 'left', 3);
      this.text(e ? e.n : '---', cols[1], y, 14, col, 'left', 3);
      this.text(e ? String(e.s) : '-------', cols[2] + 40, y, 14, mine ? col : '#ffe14d', 'right', 3);
      this.text(e ? e.m : '', cols[3], y, 11, col, 'left', 3);
      this.text(e ? e.c : '', cols[4], y, 11, col, 'right', 3);
    }
    if (this.stateT > 1.2) this.text(T('PRESS ENTER', 'TAP') + ' TO PICK A MONSTER AND CONTINUE (SCORE RESETS)', W / 2, H - 22, 12, blink ? '#fff' : '#aaa', 'center', 3);
  },
  drawTourDone() {
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
    this.text('WORLD TOUR COMPLETE', W / 2, 200, 44, '#7dffb0', 'center', 6);
    this.text('The stars are right. The cities are not.', W / 2, 240, 15, '#fff', 'center', 3);
    this.text('SCORE ' + this.score, W / 2, 285, 20, '#ffe14d', 'center', 4);
    if (this.stateT > 1.5) this.text(T('PRESS ENTER', 'TAP') + ' FOR TOUR ' + (this.tour + 1) + ' (HARDER)', W / 2, 340, 13, Math.sin(this.t * 6) > 0 ? '#fff' : '#aaa', 'center', 3);
  },
  drawTitle() {
    const t = this.t;
    ctx.fillStyle = 'rgba(8,6,20,0.55)'; ctx.fillRect(0, 0, W, H);
    // parade
    MONSTERS.forEach((def, i) => {
      const span = W + 300;
      const x = ((t * 70 + i * span / MONSTERS.length) % span) - 150;
      ctx.save(); ctx.translate(x, GROUND + (def.stats.flies ? -60 : 0));
      def.draw(ctx, demoPose(t + i, { walk: true, walkPhase: t * 9 + i, fly: def.stats.flies }));
      ctx.restore();
    });
    ctx.save(); ctx.translate(W / 2, 170); ctx.rotate(-0.03);
    const wob = Math.sin(t * 2) * 2;
    this.text(TITLE, 4, 6 + wob, 64, '#5a1424', 'center', 0);
    this.text(TITLE, 0, wob, 64, '#ffe14d', 'center', 8);
    ctx.restore();
    this.text(SUBTITLE, W / 2, 222, 18, '#7dffb0', 'center', 4);
    if (Math.sin(t * 5) > -0.3) this.text(T('PRESS ENTER', 'TAP TO START'), W / 2, 310, 22, '#fff', 'center', 5);
    this.text('HIGH SCORE: ' + this.hi, W / 2, 345, 12, '#ccc', 'center', 3);
    this.text('PARODY GAME -- ALL CHARACTERS ARE ORIGINAL DESIGNS OR PUBLIC DOMAIN', W / 2, H - 14, 9, '#aaa', 'center', 2);
  },
  drawSelect() {
    const t = this.t;
    ctx.fillStyle = 'rgba(8,6,20,0.7)'; ctx.fillRect(0, 0, W, H);
    this.text('CHOOSE YOUR MONSTER', W / 2, this.continuing ? 44 : 52, 30, '#ffe14d', 'center', 5);
    if (this.continuing) this.text('CONTINUE IN ' + this.city.name + '  ·  SCORE RESETS', W / 2, 66, 11, '#7dffb0', 'center', 3);
    const n = MONSTERS.length, cw = 280, gap = 24, x0 = (W - (n * cw + (n - 1) * gap)) / 2;
    MONSTERS.forEach((def, i) => {
      const x = x0 + i * (cw + gap), y = 78, h = 420, on = i === this.sel;
      ctx.fillStyle = on ? 'rgba(255,225,77,0.14)' : 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.roundRect(x, y, cw, h, 14); ctx.fill();
      ctx.lineWidth = on ? 3 : 1.5; ctx.strokeStyle = on ? '#ffe14d' : 'rgba(255,255,255,0.25)'; ctx.stroke();
      // preview
      const s = def.stats, scale = s.flies ? 1.9 : Math.min(1.6, 170 / s.h);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw, 214); ctx.clip();
      ctx.translate(x + cw / 2, y + 205 - (s.flies ? 40 : 0)); ctx.scale(scale, scale);
      const pp = on ? (Math.floor(t * 1.2) % 3 === 2 ? { punch: (t * 5) % 1, hand: { x: s.w * 0.4 + s.reach, y: -s.h * s.armY } } : { walk: true, walkPhase: t * 9 }) : {};
      def.draw(ctx, demoPose(t + i, pp));
      ctx.restore();
      this.text(def.name, x + cw / 2, y + 240, 20, on ? '#ffe14d' : '#fff', 'center', 4);
      this.text(def.tagline, x + cw / 2, y + 258, 10, '#ddd', 'center', 0);
      let yy = y + 280;
      for (const [k, v] of Object.entries(def.bars)) {
        this.text(k, x + 22, yy + 8, 10, '#bbb', 'left', 0);
        for (let j = 0; j < 5; j++) { ctx.fillStyle = j < v ? (on ? '#ffe14d' : '#ccc') : 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 92 + j * 34, yy, 30, 9); }
        yy += 16;
      }
      this.text(def.move + '  ·  ' + def.specialName, x + cw / 2, yy + 14, 11, '#7dffb0', 'center', 0);
      this.text(def.specialDesc, x + cw / 2, yy + 30, 9, '#ccc', 'center', 0);
      this.text(def.passive, x + cw / 2, yy + 44, 9, '#ccc', 'center', 0);
      this.text(def.homage, x + cw / 2, y + h - 8, 8, '#888', 'center', 0);
    });
    this.text(T('←  →  TO CHOOSE   ·   ENTER TO STOMP', 'TAP A MONSTER   ·   TAP IT AGAIN TO STOMP'), W / 2, H - 16, 12, '#fff', 'center', 3);
  },
};

/* ---------- boot ---------- */
Game.buildLevel();
let last = performance.now(), acc = 0;
const STEP = 1 / 60;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000); last = now;
  while (acc >= STEP) { Game.update(STEP); acc -= STEP; }
  Game.render();
  if (typeof TouchPad !== 'undefined') TouchPad.sync();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.Game = Game;  // handy for debugging in the console
