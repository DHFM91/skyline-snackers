/* ---------- GAT STANLEY (sprite: a friend's original art, art/stanley/*.png) ----------
   A paper boy who gets mailed around, with a tommy gun. He turns like a sheet of paper (edge-on),
   flutters when he falls, and sends enemy fire back where it came from. His punch button fires a
   short burst; bullets break things but can't eat, so he still has to grab snacks by hand. */
(function () {
  const PARTS = {};
  if (typeof Image !== 'undefined') for (const k of ['base', 'gun', 'gun-slung']) { const im = new Image(); im.src = 'art/stanley/' + k + '.png?v=35'; PARTS[k] = im; }
  const ready = () => PARTS.base && PARTS.base.complete && PARTS.base.naturalWidth && PARTS.gun.complete && PARTS.gun.naturalWidth;

  // Art space: the cut-out is 420 x 528 units; the lower legs and shoes are drawn below it.
  const IW = 420, IH = 528, LEG = 92, SHOE = 30, TOT = IH + LEG + SHOE, CX = 222;
  const LEGS = [[88, 203], [250, 352]];        // jeans at the bottom edge of the art: left and right leg
  const GRIP = [197, 373];                      // rear hand on the grip: the gun pivots here when aiming
  const MUZZLE = [419, 258];
  const FISTS = [[138, 392], [372, 346]];       // sleeve ends, for bare fists while the gun is slung
  const STAMP = [140, 410];

  // gameplay tuning
  const BURST = 3, BURST_GAP = 0.05, BULLET_SPEED = 950, BULLET_RANGE = 240, BULLET_DMG = 0.55, VEHICLE_DMG = 0.34;
  const RAMPAGE_T = 2.6, RAMPAGE_GAP = 0.04, RAMPAGE_RANGE = 430, RAMPAGE_DMG = 0.6;
  const REFLECT_CHANCE = 0.35;

  const JEANS = '#496d8d', JEANS_D = '#3b5a76', OUT = '#2a2526', SHOE_C = '#3d2a20', SKIN = '#f2b48d';

  function drawLeg(ctx, xl, xr, rot, sy) {
    const cx = (xl + xr) / 2, wTop = xr - xl, wBot = wTop * 0.82;
    ctx.save(); ctx.translate(cx, IH - 6); ctx.rotate(rot); ctx.scale(1, sy);
    ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = OUT;
    ctx.beginPath(); ctx.moveTo(-wTop / 2, 0); ctx.lineTo(wTop / 2, 0); ctx.lineTo(wBot / 2, LEG + 6); ctx.lineTo(-wBot / 2, LEG + 6); ctx.closePath();
    ctx.fillStyle = JEANS; ctx.fill(); ctx.stroke();
    ctx.fillStyle = JEANS_D; ctx.fillRect(wBot * 0.12, 4, wBot * 0.3, LEG);   // inner shadow
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-wTop / 2 + 10, 6, 6, LEG - 6);
    // shoe, pointing forward (+x)
    ctx.beginPath(); ctx.moveTo(-wBot / 2 - 4, LEG + 4); ctx.lineTo(wBot / 2 + 26, LEG + 4);
    ctx.quadraticCurveTo(wBot / 2 + 40, LEG + 4, wBot / 2 + 40, LEG + SHOE - 4); ctx.lineTo(-wBot / 2 - 4, LEG + SHOE - 4); ctx.closePath();
    ctx.fillStyle = SHOE_C; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(wBot * 0.1, LEG + 9, wBot * 0.45, 5);
    ctx.restore();
  }

  function drawStamp(ctx, t) {
    // a big, obvious postage stamp: perforated white edge, blue picture, wavy postmark
    ctx.save(); ctx.translate(STAMP[0], STAMP[1]); ctx.rotate(-0.12 + Math.sin(t * 2) * 0.02);
    const w = 92, h = 74;
    ctx.fillStyle = '#fbfbf4'; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = OUT;
    for (let x = -w / 2 + 6; x < w / 2; x += 10) { ctx.beginPath(); ctx.arc(x, -h / 2, 3, 0, Math.PI * 2); ctx.arc(x, h / 2, 3, 0, Math.PI * 2); ctx.fill(); }
    for (let y = -h / 2 + 6; y < h / 2; y += 10) { ctx.beginPath(); ctx.arc(-w / 2, y, 3, 0, Math.PI * 2); ctx.arc(w / 2, y, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#8fb8e8'; ctx.fillRect(-w / 2 + 11, -h / 2 + 11, w - 22, h - 22);
    ctx.fillStyle = '#5a89c6'; ctx.beginPath(); ctx.moveTo(-w / 2 + 11, h / 2 - 11); ctx.lineTo(-8, -6); ctx.lineTo(8, 6); ctx.lineTo(18, -2); ctx.lineTo(w / 2 - 11, h / 2 - 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(20, -16, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,40,0.85)'; ctx.lineWidth = 3.5;   // postmark waves
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      for (let x = -w / 2 - 14; x <= 6; x += 4) { const y = -h / 2 + 12 + i * 11 + Math.sin(x * 0.18) * 3.5; x === -w / 2 - 14 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(-w / 2 - 4, -6, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function fist(ctx, x, y) {
    ctx.beginPath(); ctx.arc(x, y, 32, 0, Math.PI * 2); ctx.fillStyle = SKIN; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 14, y - 6); ctx.lineTo(x + 12, y - 6); ctx.moveTo(x - 14, y + 8); ctx.lineTo(x + 12, y + 8); ctx.lineWidth = 4; ctx.stroke();
  }

  function drawStan(ctx, p) {
    if (!ready()) return;
    const m = p.mon, t = p.t || 0;
    const rp = m && m.stan && m.stan.ramp > 0;
    const firing = p.punch > 0 || rp;
    const slung = p.climb && !firing;
    // paper turn: squash through edge-on, from the old facing to the new one
    const sx = p.turn < 1 ? -Math.cos(Math.PI * p.turn) : 1;
    const K = 104 / TOT;
    ctx.save();
    ctx.scale(K, K);
    let bob = Math.sin(t * 3.3) * 5, tilt = Math.sin(t * 2.1) * 0.015, legL = 0, legR = 0, syL = 1, syR = 1;
    if (p.walk) { const k = Math.sin(p.walkPhase || 0); legL = k * 0.32; legR = -k * 0.32; bob = -Math.abs(k) * 14; tilt = k * 0.03; }
    if (p.climb) { const k = Math.sin(p.climbPhase || 0); syL = 0.8 + 0.2 * k; syR = 0.8 - 0.2 * k; bob = k * 10; tilt = 0; }
    if (p.air) { legL = -0.2; legR = 0.25; if (p.glide) { tilt = Math.sin(t * 9) * 0.12; bob = Math.sin(t * 6) * 6; } }
    ctx.translate(0, -TOT + bob);
    if (Math.abs(sx) < 0.12) {
      // edge-on: just a thin sheet of paper
      ctx.fillStyle = '#f4efe2'; ctx.strokeStyle = OUT; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.rect(-7, 10, 14, TOT - 10); ctx.fill(); ctx.stroke();
      ctx.restore(); return;
    }
    ctx.scale(sx, 1);
    ctx.rotate(tilt);
    ctx.translate(-CX, 0);
    if (slung) {   // gun slung across his back while he climbs
      ctx.save(); ctx.translate(395, 225); ctx.rotate(-1.2); if (PARTS['gun-slung'].complete && PARTS['gun-slung'].naturalWidth) ctx.drawImage(PARTS['gun-slung'], -300, -330, IW, IH); ctx.restore();
    }
    drawLeg(ctx, LEGS[0][0], LEGS[0][1], legL, syL);
    drawLeg(ctx, LEGS[1][0], LEGS[1][1], legR, syR);
    ctx.drawImage(PARTS.base, 0, 0, IW, IH);
    drawStamp(ctx, t);
    if (slung) { fist(ctx, FISTS[0][0], FISTS[0][1]); fist(ctx, FISTS[1][0], FISTS[1][1]); }
    else {
      let aim = 0, kick = 0;
      if (rp) aim = m.stan.aim;
      else if (p.punch > 0) { aim = p.punchDir === 'up' ? -0.32 : p.punchDir === 'down' ? 0.26 : 0; kick = Math.sin(p.punch * Math.PI * 6) * 6; }
      ctx.save(); ctx.translate(GRIP[0] - kick, GRIP[1]); ctx.rotate(aim); ctx.translate(-GRIP[0], -GRIP[1]);
      ctx.drawImage(PARTS.gun, 0, 0, IW, IH);
      if (firing && Math.floor(t * 30) % 2 === 0) {   // muzzle flash
        ctx.save(); ctx.translate(MUZZLE[0] + 8, MUZZLE[1]);
        ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(44, 0); ctx.lineTo(0, 14); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffb23a'; ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(26, 0); ctx.lineTo(4, 8); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- bullets: they break windows and hurt the army, but never eat ----
  function muzzleWorld(m, aim) {
    const K = 104 / TOT, f = m.facing;
    const lx = (MUZZLE[0] - CX), ly = (MUZZLE[1] - TOT);
    const gx = (GRIP[0] - CX), gy = (GRIP[1] - TOT);
    const dx = lx - gx, dy = ly - gy, c = Math.cos(aim), s = Math.sin(aim);
    const rx = gx + dx * c - dy * s, ry = gy + dx * s + dy * c;
    return { x: m.x + f * rx * K, y: m.y + ry * K };
  }
  function fire(m, game, aim, range, dmg, opt = {}) {
    const f = m.facing, mz = opt.from || muzzleWorld(m, aim);
    const ang = opt.ang !== undefined ? opt.ang : (f > 0 ? aim : Math.PI - aim);
    const vx = Math.cos(ang) * (opt.speed || BULLET_SPEED), vy = Math.sin(ang) * (opt.speed || BULLET_SPEED);
    const tracer = FX.add({ x: mz.x, y: mz.y, vx, vy, grav: 0, life: range / Math.hypot(vx, vy), size: opt.big ? 4 : 2.5, len: opt.big ? 22 : 14,
      color: opt.big ? '#ff8a3a' : '#fff1a0', shape: 'line', rot: ang, ground: false });
    m.stan.bullets.push({ x: mz.x, y: mz.y, vx, vy, left: range, dmg, veh: opt.big ? 1 : VEHICLE_DMG, tracer });
    FX.spark(mz.x, mz.y, 2, '#fff3b0');
  }
  function bulletHits(b, game) {
    for (const h of game.helis) {
      if (h.dead || h.falling || !circleRect(b.x, b.y, 4, h.box())) continue;
      h.hp -= b.veh; h.flash = 0.1; FX.spark(b.x, b.y, 4, '#fff6a8');
      if (h.hp <= 0) { h.falling = true; h.vy = -60; game.addScore(800, h.x, h.y - 20); FX.ring(h.x, h.y, 40, '#ffb23a', 0.4); }
      return true;
    }
    for (const tk of game.tanks) {
      if (tk.dead || !circleRect(b.x, b.y, 4, tk.box())) continue;
      tk.hp -= b.veh; tk.flash = 0.1; FX.spark(b.x, b.y, 4, '#fff6a8');
      if (tk.hp <= 0) { tk.dead = true; Sfx.play('boom'); game.addScore(500, tk.x, tk.y - 30); FX.ring(tk.x, tk.y - 12, 50, '#ffb23a', 0.4); game.shake = 8; }
      return true;
    }
    for (const wk of game.walkers) {   // soldiers drop; civilians are snacks, so bullets fly past them
      if (wk.dead || wk.kind !== 'soldier' || !circleRect(b.x, b.y, 8, wk.box())) continue;
      wk.dead = true; game.addScore(150, wk.x, wk.y - 24); FX.spark(wk.x, wk.y - 10, 5, '#ffffff');
      return true;
    }
    for (const bd of game.buildings) {
      const hc = bd.cellAt(b.x, b.y);
      if (!hc || hc.cell.hp <= 0) continue;
      if (hc.cell.hp <= 1 && hc.cell.occ) continue;   // an exposed snack: leave it for the grab
      bd.hit(hc.f, hc.c, b.dmg, game);
      return true;
    }
    return false;
  }

  // Is there something to eat within arm's reach? Returns the punch direction that reaches it.
  function nearbySnack(m, game, dir) {
    const dirs = m.state === 'climb' ? [dir] : [dir, 'down'];
    for (const d of dirs) {
      const p = m.hitPoints(d)[0], r = m.s.hitR + 10;
      for (const wk of game.walkers) if (!wk.dead && circleRect(p.x, p.y, r, wk.box())) return d;
      for (const bd of game.buildings) { const hc = bd.cellAt(p.x, p.y); if (hc && hc.cell.hp > 0 && hc.cell.hp <= 1 && hc.cell.occ) return d; }
    }
    return null;
  }

  registerMonster({
    id: 'stanley', name: 'GAT STANLEY',
    tagline: 'Return to sender.',
    homage: 'A mailed-around paper boy, armed (a friend\'s art)',
    move: 'FLATTENS', specialName: 'GAT RAMPAGE', specialDesc: 'Sweeping tommy-gun spray across the block',
    passive: 'Return to sender: some shots bounce back at the shooter',
    bars: { STR: 2, SPD: 3, REACH: 5, TOUGH: 2 },
    stats: { w: 44, h: 96, speed: 128, climb: 86, jump: 560, dmg: 1.6, reach: 30, hitR: 18, punchCd: 0.34,
      maxHp: 105, armor: 0.95, armY: 0.52, glide: true, specialCd: 9 },
    portraitY: 1.03,
    punch(m, game, dir) {
      // up close to a snack: grab it by hand. Otherwise: a short burst.
      const reach = nearbySnack(m, game, dir);
      if (reach) { m.punchDir = reach; game.resolveHit(m, m.hitPoints(reach), m.s.hitR + 6, m.s.dmg, null); return; }
      if (!m.stan) return;
      m.hitPoints(dir);   // updates the pose's hand point
      const aim = dir === 'up' ? -0.32 : dir === 'down' ? 0.26 : 0;
      m.stan.burst = { n: BURST, t: 0, aim: dir === 'down' ? 0.4 : aim };
      Sfx.play('shoot');
    },
    special(m, game) {
      if (!m.stan) return;
      m.stan.ramp = RAMPAGE_T; m.stan.rampT = 0;
      FX.text(m.x, m.y - m.h - 20, 'GAT RAMPAGE!', '#ffe14d', 20);
      game.shake = Math.max(game.shake, 4);
    },
    onShot(m, shot, game) {
      const turning = m.turnT > 0 && Math.abs(Math.cos(Math.PI * (1 - m.turnT / 0.22))) < 0.35;
      if (turning) return 'pass';                       // edge-on: nothing to hit
      if (Math.random() < REFLECT_CHANCE) {             // RETURN TO SENDER
        const ang = Math.atan2(-shot.vy, -shot.vx);
        fire(m, game, 0, 600, shot.kind === 'shell' ? 1.6 : 0.8, { from: { x: shot.x, y: shot.y }, ang, speed: 750, big: shot.kind === 'shell' });
        FX.text(shot.x, shot.y - 18, 'RETURN TO SENDER', '#7dffb0', 11);
        Sfx.play('punch');
        return 'reflect';
      }
      return null;
    },
    tick(m, dt, game) {
      if (!m.stan) { m.stan = { bullets: [], burst: null, ramp: 0, rampT: 0, aim: 0 }; m.s = Object.assign({}, m.def.stats); }
      const st = m.stan, base = m.def.stats;
      if (m.defeated || game.state !== 'play') { st.burst = null; st.ramp = 0; }
      // burst fire from the punch button
      if (st.burst) {
        st.burst.t -= dt;
        if (st.burst.t <= 0) { fire(m, game, st.burst.aim, BULLET_RANGE, BULLET_DMG); st.burst.n--; st.burst.t = BURST_GAP; m.punchT = 0.2; }
        if (st.burst.n <= 0) st.burst = null;
      }
      // GAT RAMPAGE: rooted, sweeping spray
      if (st.ramp > 0) {
        st.ramp -= dt; st.rampT += dt;
        st.aim = -0.4 + (Math.sin(st.rampT * 5) * 0.5 + 0.5) * 0.68;
        m.s.speed = base.speed * 0.3; m.s.climb = base.climb * 0.3;
        st.fireAcc = (st.fireAcc || 0) + dt;
        while (st.fireAcc >= RAMPAGE_GAP) { st.fireAcc -= RAMPAGE_GAP; fire(m, game, st.aim, RAMPAGE_RANGE, RAMPAGE_DMG); }
        if (Math.random() < dt * 20) Sfx.play('shoot');
        game.shake = Math.max(game.shake, 2);
        if (st.ramp <= 0) { m.s.speed = base.speed; m.s.climb = base.climb; }
      }
      // move bullets
      for (const b of st.bullets) {
        const steps = 3;
        for (let i = 0; i < steps && b.left > 0; i++) {
          b.x += b.vx * dt / steps; b.y += b.vy * dt / steps; b.left -= Math.hypot(b.vx, b.vy) * dt / steps;
          if (b.y > GROUND || b.x < -20 || b.x > W + 20) { b.left = 0; break; }
          if (bulletHits(b, game)) { b.left = 0; if (b.tracer) b.tracer.life = 0; break; }
        }
      }
      st.bullets = st.bullets.filter(b => b.left > 0);
    },
    draw: drawStan,
    drawRevert(ctx, t) {
      // shrinks into a little envelope (with a stamp), fluttering off
      ctx.save(); ctx.translate(0, -14 + Math.sin(t * 8) * 3); ctx.rotate(Math.sin(t * 6) * 0.25);
      ctx.fillStyle = '#f4efe2'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
      ctx.fillRect(-12, -8, 24, 16); ctx.strokeRect(-12, -8, 24, 16);
      ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(0, 1); ctx.lineTo(12, -8); ctx.stroke();
      ctx.fillStyle = '#8fb8e8'; ctx.fillRect(5, -6, 5, 5); ctx.strokeRect(5, -6, 5, 5);
      ctx.restore();
    },
  });
})();
