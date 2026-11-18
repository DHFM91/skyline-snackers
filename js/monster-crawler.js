'use strict';
/* =========================================================
   MONSTER: AUTOMATED SOLUTION (id 'crawler')
   A huge, merciless robot spider. Original design, all art in canvas code.
   Special: TARGET LOCK. The eye paints up to six targets, then a salvo of homing micro-missiles
   goes out. The sequence lives in def.tick on m.beam (flagged `crawler`), which the shared
   pose() already turns into p.charge (scanning) and p.beam (launching).
   ========================================================= */
(function () {
  const TAU = Math.PI * 2;
  const GM1 = '#76808e', GM2 = '#4b525e', GM3 = '#2a2f38', GM4 = '#1a1d24', CHR = '#d6dde6', PLT = '#8d97a5';
  const YEL = '#f2c230', RED = '#ff2a1c', ORG = '#ff8a2a';

  const LIFT = 9, STRIDE = 18, L1 = 21, L2 = 31;
  // legs: side (near/far), hip x on the belly, resting foot x, tripod group (0/1), hip y offset
  const LEGS = [
    { far: 0, hx: -22, rest: -46, g: 0 }, { far: 0, hx: -8, rest: -20, g: 1 },
    { far: 0, hx: 8, rest: 16, g: 0 }, { far: 0, hx: 22, rest: 46, g: 1 },
    { far: 1, hx: -19, rest: -40, g: 1 }, { far: 1, hx: -5, rest: -13, g: 0 },
    { far: 1, hx: 11, rest: 22, g: 1 }, { far: 1, hx: 25, rest: 52, g: 0 },
  ];
  const NEAR_PUNCH = 3;   // the near front leg is the stabbing leg

  const ease = k => k * k * (3 - 2 * k);
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);

  function seg(ctx, x1, y1, x2, y2, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

  // two-bone IK: knee position, bending toward the hint direction
  function ik(ax, ay, bx, by, hintX, hintY) {
    let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 0.001;
    if (d >= L1 + L2 - 0.5) { const k = (L1 + L2 - 0.5) / d; bx = ax + dx * k; by = ay + dy * k; dx *= k; dy *= k; d = L1 + L2 - 0.5; }
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const mx = ax + dx / d * a, my = ay + dy / d * a, nx = -dy / d, ny = dx / d;
    const s = (nx * hintX + ny * hintY) >= 0 ? 1 : -1;
    return { kx: mx + nx * h * s, ky: my + ny * h * s, fx: bx, fy: by };
  }

  // gait: u 0..1 -> [x offset, lift, planted]
  function gait(u) {
    if (u < 0.4) { const k = u / 0.4; return [-STRIDE + 2 * STRIDE * ease(k), Math.sin(k * Math.PI) * LIFT, 0]; }
    const k = (u - 0.4) / 0.6; return [STRIDE - 2 * STRIDE * k, 0, 1];
  }

  function drawLeg(ctx, hx, hy, ik_, far, hot, mark) {
    const { kx, ky, fx, fy } = ik_;
    const o = far ? GM4 : GM3, m = far ? GM3 : GM2, hi = far ? GM2 : GM1;
    const wf = far ? 0.85 : 1;
    // femur
    seg(ctx, hx, hy, kx, ky, 9 * wf, o); seg(ctx, hx, hy, kx, ky, 6.6 * wf, m);
    seg(ctx, hx + 1, hy - 2, kx + 1, ky - 2, 1.3, hi);
    // tibia
    seg(ctx, kx, ky, fx, fy, 6.4 * wf, o); seg(ctx, kx, ky, fx, fy, 4.2 * wf, m);
    if (!far) {
      // piston alongside the femur
      const dx = kx - hx, dy = ky - hy, l = Math.hypot(dx, dy) || 1, nx = -dy / l * 4.6, ny = dx / l * 4.6;
      seg(ctx, hx + dx * 0.22 + nx, hy + dy * 0.22 + ny, hx + dx * 0.72 + nx, hy + dy * 0.72 + ny, 1.8, GM3);
      seg(ctx, hx + dx * 0.22 + nx, hy + dy * 0.22 + ny, hx + dx * 0.5 + nx, hy + dy * 0.5 + ny, 1, CHR);
      // warning band on the tibia
      const tx = fx - kx, ty = fy - ky;
      seg(ctx, kx + tx * 0.5, ky + ty * 0.5, kx + tx * 0.64, ky + ty * 0.64, 3.4, YEL);
      seg(ctx, kx + tx * 0.56, ky + ty * 0.56, kx + tx * 0.6, ky + ty * 0.6, 3.4, GM4);
    }
    // foot spike
    const tx = fx - kx, ty = fy - ky, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
    ctx.fillStyle = far ? GM3 : CHR;
    ctx.beginPath(); ctx.moveTo(fx - uy * 3, fy + ux * 3); ctx.lineTo(fx + ux * (mark ? 7 : 4.5), fy + uy * (mark ? 7 : 4.5)); ctx.lineTo(fx + uy * 3, fy - ux * 3); ctx.closePath(); ctx.fill();
    // joints
    disc(ctx, kx, ky, 4.9 * wf, o); disc(ctx, kx, ky, 3.4 * wf, far ? GM2 : CHR); disc(ctx, kx, ky, 1.1, GM4);
    disc(ctx, hx, hy, 5.2 * wf, o); disc(ctx, hx, hy, 3.4 * wf, far ? GM2 : PLT); disc(ctx, hx, hy, 0.9, GM4);
    if (hot) { ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(fx - 4, fy - 1); ctx.lineTo(fx - 7, fy - 4); ctx.moveTo(fx + 4, fy - 1); ctx.lineTo(fx + 7, fy - 4); ctx.moveTo(fx, fy - 2); ctx.lineTo(fx, fy - 6); ctx.stroke(); }
  }

  function printable(ctx) { const tr = ctx.getTransform(); return !(tr.a * (tr.d === undefined ? 1 : tr.d) - (tr.b || 0) * (tr.c || 0) < 0); }

  // The chassis, in its own frame: origin is the centre, nose +x, belly +y.
  function drawBody(ctx, p, k) {
    const t = p.t, CH = k.charge, BM = k.beam;
    const blink = (f, ph) => (Math.sin(t * f + ph) > 0.2 ? 1 : 0.18);
    // scanning light cone from the eye
    const sweep = CH > 0 ? Math.sin(t * 11) * 0.85 : Math.sin(t * 1.25) * 0.42 - 0.12;
    ctx.save(); ctx.translate(23, -3); ctx.rotate(sweep);
    ctx.fillStyle = `rgba(255,50,40,${CH > 0 ? 0.22 : 0.11})`;
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(78, -9); ctx.lineTo(78, 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,140,120,${CH > 0 ? 0.55 : 0.3})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(78, 0); ctx.stroke();
    ctx.restore();

    // antenna with beacon
    seg(ctx, -9, -13, -11, -26, 1.4, GM3);
    seg(ctx, -9, -13, -11, -26, 0.6, CHR);
    ctx.save(); ctx.translate(-11, -26); ctx.rotate(Math.sin(t * 2.2) * 0.9);
    ctx.fillStyle = GM2; ctx.fillRect(-4, -0.8, 8, 1.6); disc(ctx, 4, 0, 1.4, CHR); ctx.restore();
    disc(ctx, -11, -27.5, 1.5, `rgba(255,42,28,${blink(5, 0)})`);

    // cable bundle under the belly
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = i === 1 ? '#7a2a2a' : GM4; ctx.lineWidth = 2.6 - i * 0.4;
      ctx.beginPath(); ctx.moveTo(-26, 7 + i); ctx.bezierCurveTo(-14, 16 + i * 2, 12, 16 + i * 2, 26, 7 + i); ctx.stroke();
    }

    // hull
    const hull = () => {
      ctx.beginPath(); ctx.moveTo(-33, 3); ctx.lineTo(-30, -9); ctx.lineTo(-14, -14); ctx.lineTo(13, -14); ctx.lineTo(30, -7);
      ctx.lineTo(35, 1); ctx.lineTo(30, 10); ctx.lineTo(-25, 10); ctx.lineTo(-33, 6); ctx.closePath();
    };
    ctx.fillStyle = GM4; hull(); ctx.fill();
    // lower belly plate
    ctx.fillStyle = GM2; ctx.beginPath(); ctx.moveTo(-33, 3); ctx.lineTo(35, 1); ctx.lineTo(30, 10); ctx.lineTo(-25, 10); ctx.lineTo(-33, 6); ctx.closePath(); ctx.fill();
    // upper armour plates (two overlapping)
    ctx.fillStyle = GM1; ctx.beginPath(); ctx.moveTo(-29, -8); ctx.lineTo(-14, -13); ctx.lineTo(-1, -13); ctx.lineTo(-3, 1); ctx.lineTo(-31, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PLT; ctx.beginPath(); ctx.moveTo(-2, -13.5); ctx.lineTo(13, -13.5); ctx.lineTo(30, -6.5); ctx.lineTo(32, 0); ctx.lineTo(-3.5, 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = CHR; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-14, -13); ctx.lineTo(-1, -13); ctx.moveTo(-1.5, -13.5); ctx.lineTo(13, -13.5); ctx.lineTo(30, -6.5); ctx.stroke();
    ctx.strokeStyle = GM3; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -13); ctx.lineTo(-3.5, 1); ctx.moveTo(-31, 1); ctx.lineTo(32, 0); ctx.stroke();
    // warning-stripe band at the rear
    ctx.save(); ctx.beginPath(); ctx.rect(-33, 2, 17, 8); ctx.clip();
    ctx.fillStyle = YEL; ctx.fillRect(-33, 2, 17, 8);
    ctx.fillStyle = GM4; for (let i = -2; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-34 + i * 5, 10); ctx.lineTo(-30 + i * 5, 10); ctx.lineTo(-26 + i * 5, 2); ctx.lineTo(-30 + i * 5, 2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = GM4; ctx.lineWidth = 1; ctx.strokeRect(-33, 2, 17, 8);
    // stencilled unit number
    ctx.save(); ctx.translate(-16, -5); if (!printable(ctx)) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(30,34,42,0.8)'; ctx.font = 'bold 7px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('800', 0, 0); ctx.restore();
    // rivets
    ctx.fillStyle = CHR;
    [[-28, -5], [-5, -10], [-5, -3], [4, -10], [18, -10], [26, -4], [-28, 7], [-12, 8], [4, 8], [20, 8]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.8, 0, TAU); ctx.fill(); });

    // missile pod rack on the back
    const lid = ease(cl(CH * 2, 0, 1)) + (BM > 0 ? 1 : 0);
    ctx.fillStyle = GM3; ctx.fillRect(-27, -17, 18, 5);
    ctx.fillStyle = GM2; ctx.fillRect(-27, -17, 18, 1.6);
    for (let i = 0; i < 3; i++) {
      const open = Math.min(1, lid);
      ctx.fillStyle = GM4; ctx.fillRect(-25 + i * 6, -19 - open * 2, 4, 3 + open * 2);
      if (open > 0.2) { ctx.fillStyle = i === 1 ? '#fff' : '#ff4a3a'; ctx.beginPath(); ctx.moveTo(-25 + i * 6, -19 - open * 2); ctx.lineTo(-23 + i * 6, -23 - open * 3); ctx.lineTo(-21 + i * 6, -19 - open * 2); ctx.fill(); }
    }
    if (BM > 0) {
      for (let i = 0; i < 3; i++) { const fl = (Math.sin(t * 40 + i * 2) + 1) / 2; ctx.fillStyle = `rgba(255,${200 + 40 * fl | 0},120,${0.9 * BM})`; disc(ctx, -23 + i * 6, -23 - fl * 2, 2.2 + 3 * BM * fl, ctx.fillStyle); }
    }

    // exhaust vents with a heat glow, at the rear
    ctx.fillStyle = GM3; ctx.fillRect(-35, -9, 5, 10);
    const hotv = 0.45 + 0.35 * Math.sin(t * 3) + (CH > 0 ? 0.3 : 0);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(255,138,42,${cl(hotv, 0.2, 1)})`; ctx.fillRect(-34.5, -8 + i * 3, 4, 1.4); }

    // intake grille (underside of the nose)
    ctx.fillStyle = GM4; ctx.fillRect(26.5, 3.5, 7, 6.5);
    const eatGlow = p.eat ? 0.5 + 0.5 * Math.sin(t * 36) : 0;
    for (let i = 0; i < 3; i++) { ctx.fillStyle = eatGlow > 0 ? `rgba(255,${120 + 80 * eatGlow | 0},40,0.95)` : GM2; ctx.fillRect(27.5 + i * 2, 4.5, 1.2, 4.5); }

    // indicator lights
    [[-24, -2, 5.1, 0, RED], [-19.5, -2, 3.7, 1.4, ORG], [-10, -9, 6.3, 2.2, RED], [3, -9, 4.4, 0.7, '#ffd34d'], [8, -9, 2.6, 3, RED]].forEach(([x, y, f, ph, c]) => {
      ctx.globalAlpha = blink(f, ph); disc(ctx, x, y, 1.3, c); ctx.globalAlpha = 1;
    });

    // chrome hull edge highlights
    ctx.strokeStyle = 'rgba(214,221,230,0.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-30, -9); ctx.lineTo(-14, -14); ctx.lineTo(13, -14); ctx.stroke();
  }

  function drawEye(ctx, p, k) {
    const t = p.t, CH = k.charge, BM = k.beam;
    // eye housing and sensor eye
    const ex = 23, ey = -3;
    disc(ctx, ex, ey, 10.5, GM3); disc(ctx, ex, ey, 9.2, GM2);
    ctx.strokeStyle = CHR; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ex, ey, 9.2, Math.PI * 1.05, Math.PI * 1.85); ctx.stroke();
    const glow = 0.5 + 0.2 * Math.sin(t * 2.6) + CH * 0.4 + BM * 0.3;
    ctx.save();
    const hg = ctx.createRadialGradient(ex, ey, 6, ex, ey, 26); hg.addColorStop(0, `rgba(255,50,35,${0.3 * glow})`); hg.addColorStop(1, 'rgba(255,50,35,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(ex, ey, 26, 0, TAU); ctx.fill(); ctx.restore();
    const g = ctx.createRadialGradient(ex - 1.5, ey - 1.5, 0.5, ex, ey, 7.6);
    g.addColorStop(0, '#fff2ea'); g.addColorStop(0.25, '#ff7a64'); g.addColorStop(0.7, RED); g.addColorStop(1, '#5a0505');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 7.6, 0, TAU); ctx.fill();
    // scanning iris: a bright slit that sweeps, a dark iris ring that tightens on lock
    const sx = CH > 0 ? Math.sin(t * 11) * 4.5 : Math.sin(t * 1.25) * 3.6 - 0.4;
    ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, 7.2, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(40,0,0,0.55)'; ctx.fillRect(ex - 8, ey - 8, 16, 16 * (0.18 + 0.16 * (1 - CH)));
    ctx.fillStyle = 'rgba(40,0,0,0.55)'; ctx.fillRect(ex - 8, ey + 8 - 16 * (0.18 + 0.16 * (1 - CH)), 16, 16);
    ctx.fillStyle = '#fff6f0'; ctx.fillRect(ex + sx - 0.9, ey - 7, 1.8, 14);
    const lidK = 1 - CH * 0.7;
    ctx.fillStyle = GM3; ctx.beginPath(); ctx.moveTo(ex - 9, ey - 9); ctx.lineTo(ex + 9, ey - 9); ctx.lineTo(ex + 9, ey - 1 - 5 * (1 - lidK)); ctx.lineTo(ex - 9, ey - 9 + 1); ctx.closePath(); ctx.globalAlpha = lidK; ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,200,190,0.8)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(ex, ey, 4.4 + CH * 1.2, 0, TAU); ctx.stroke();
    disc(ctx, ex - 3.6, ey - 3.6, 1.2, 'rgba(255,255,255,0.85)');
    // small secondary eyes
    [[31.5, -6.5, 1.5], [33.2, -2.4, 1.2], [28.5, -11, 1.3], [16, -11.5, 1.1]].forEach(([x, y, r], i) => {
      disc(ctx, x, y, r + 0.9, GM4); ctx.globalAlpha = 0.65 + 0.35 * Math.sin(t * 3.1 + i * 1.7); disc(ctx, x, y, r, RED); ctx.globalAlpha = 1;
    });
  }

  // the feeding mandible: swings out, snaps, pulls back into the intake grille
  function drawMandible(ctx, p, k) {
    const t = p.t, e = p.eat;
    const reach = e > 0 ? Math.abs(Math.sin((1 - e) * Math.PI * 2.5)) : 0.1 + 0.08 * Math.sin(t * 2.3);
    const open = e > 0 ? 0.15 + 0.55 * Math.abs(Math.sin((1 - e) * Math.PI * 5)) : 0.22 + 0.12 * Math.sin(t * 2.9);
    const bx = 25, by = 11, tx = 31 + reach * 15, ty = 8 - reach * 9;
    seg(ctx, bx, by, (bx + tx) / 2 + 1, (by + ty) / 2 + 3, 4.2, GM3); seg(ctx, bx, by, (bx + tx) / 2 + 1, (by + ty) / 2 + 3, 2.8, GM2);
    seg(ctx, (bx + tx) / 2 + 1, (by + ty) / 2 + 3, tx, ty, 3.6, GM3); seg(ctx, (bx + tx) / 2 + 1, (by + ty) / 2 + 3, tx, ty, 2.2, GM1);
    disc(ctx, (bx + tx) / 2 + 1, (by + ty) / 2 + 3, 2.2, CHR); disc(ctx, bx, by, 2.4, GM3);
    for (const sgn of [-1, 1]) {
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(-0.5 + sgn * open);
      ctx.fillStyle = CHR; ctx.beginPath(); ctx.moveTo(0, -1.6); ctx.quadraticCurveTo(7, -2.2, 9, 0.4 * sgn); ctx.quadraticCurveTo(5, 0.6 * sgn, 0, 1.6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (e > 0.1 && reach > 0.6) { ctx.fillStyle = '#ffe9a0'; ctx.fillRect(tx + 5, ty - 1.2, 2, 2); }
  }

  function legTargets(p, hips, mode) {
    const out = [], t = p.t, moving = p.walk;
    for (let i = 0; i < LEGS.length; i++) {
      const L = LEGS[i], h = hips[i];
      let fx, fy, hot = false;
      if (mode === 'climb') {
        const wallX = 44 - (L.far ? 3 : 0), anchor = h.y - 0.95 * (L.rest - L.hx);
        const ph = p.climbPhase * 0.85 + (L.g ? Math.PI : 0), u = ((ph / TAU) % 1 + 1) % 1;
        const [sx, lift, planted] = gait(u);
        fx = wallX - lift * 0.9; fy = anchor - sx * 0.5;
        if (!L.far && i === NEAR_PUNCH) { fy -= 4; }
        hot = planted && u < 0.47 && !L.far;
      } else if (mode === 'air') {
        const w = Math.sin(t * 9 + i * 1.3);
        fx = L.rest * 0.75 + (L.far ? 3 : 0) + w * 2.5; fy = -9 + Math.cos(t * 7 + i) * 2.5 - (L.far ? 3 : 0);
      } else if (moving) {
        const ph = p.walkPhase + (L.g ? Math.PI : 0), u = ((ph / TAU) % 1 + 1) % 1;
        const [sx, lift] = gait(u);
        fx = L.rest + sx; fy = -lift; hot = u > 0.4 && u < 0.5 && !L.far;
      } else {
        // idle: legs shift one at a time
        const cyc = 5.2, off = t + i * 0.65 + (L.far ? 0.3 : 0), n = Math.floor(off / cyc), w = off - n * cyc, kk = cl(w / 0.55, 0, 1);
        const pa = ((n - 1) % 2 === 0 ? 1 : -1) * 3.5, pb = (n % 2 === 0 ? 1 : -1) * 3.5;
        fx = L.rest + (L.far ? 3 : 0) + pa + (pb - pa) * ease(kk); fy = -(w < 0.55 ? Math.sin(kk * Math.PI) * 7 : 0);
        hot = w > 0.5 && w < 0.62 && !L.far;
      }
      if (mode !== 'climb' && !L.far && i === NEAR_PUNCH && p.punch > 0 && p.hand) { [fx, fy] = handTarget(p, fx, fy); hot = false; }
      else if (mode === 'climb' && i === NEAR_PUNCH && p.punch > 0 && p.hand) { [fx, fy] = handTarget(p, fx, fy); }
      out.push({ x: fx, y: fy, hot });
    }
    return out;
  }

  function drawCrawler(ctx, p) {
    const t = p.t;
    const k = { charge: p.charge || 0, beam: p.beam || 0 };
    const climb = !!p.climb, air = !!p.air && !climb;
    const mode = climb ? 'climb' : air ? 'air' : 'walk';
    const punchE = p.punch > 0 ? punchExt(p.punch) : 0;
    // body frame: centre, rotation
    let cx, cy, th;
    if (climb) {
      cx = 2 + Math.sin(p.climbPhase * 0.5) * 0.8; cy = -30 + Math.sin(p.climbPhase) * 0.8; th = -Math.PI / 2;
      if (p.punch > 0 && p.hand && p.punchDir !== 'side') th += 0;
    } else if (air) {
      cx = 0; cy = -35 + Math.sin(t * 9) * 0.6; th = -0.12 + Math.sin(t * 5) * 0.03;
    } else {
      const bob = p.walk ? Math.abs(Math.cos(p.walkPhase)) * 2.2 : Math.sin(t * 1.7) * 0.9 + Math.sin(t * 13) * 0.12;
      cx = punchE * 5; cy = -30 - bob + 1.2 + punchE * 1.5;
      th = (p.walk ? Math.sin(p.walkPhase * 2) * 0.018 : Math.sin(t * 0.8) * 0.012) + (p.dash ? 0.1 : 0);
      // idle servo twitch
      const tw = Math.sin(t * 0.9) * Math.sin(t * 2.3 + 1);
      if (!p.walk && tw > 0.9) th += (tw - 0.9) * 0.3;
    }
    const cs = Math.cos(th), sn = Math.sin(th);
    const toW = (bx, by) => ({ x: cx + bx * cs - by * sn, y: cy + bx * sn + by * cs });
    const hips = LEGS.map(L => { const h = toW(L.hx + (L.far ? 3 : 0), L.far ? 6 : 8); return h; });
    const targets = legTargets(p, hips, mode);
    const hint = climb ? [-1, 0] : [0, -1];
    const iks = LEGS.map((L, i) => ik(hips[i].x, hips[i].y, targets[i].x, targets[i].y, hint[0], hint[1]));

    // far legs
    for (let i = 0; i < LEGS.length; i++) if (LEGS[i].far) drawLeg(ctx, hips[i].x, hips[i].y, iks[i], true, false, false);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(th);
    drawBody(ctx, p, k);
    ctx.restore();
    // near legs
    for (let i = 0; i < LEGS.length; i++) if (!LEGS[i].far) drawLeg(ctx, hips[i].x, hips[i].y, iks[i], false, targets[i].hot, i === NEAR_PUNCH);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(th); drawMandible(ctx, p, k); drawEye(ctx, p, k); ctx.restore();
    // stab flash at the tip of the punching leg
    if (p.punch > 0.12 && p.punch < 0.6 && p.hand) {
      const f = iks[NEAR_PUNCH], a = 1 - (p.punch - 0.12) / 0.48;
      ctx.strokeStyle = `rgba(255,243,176,${a})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(f.fx + 3, f.fy - 4); ctx.lineTo(f.fx + 11, f.fy - 9); ctx.moveTo(f.fx + 4, f.fy); ctx.lineTo(f.fx + 13, f.fy); ctx.moveTo(f.fx + 3, f.fy + 4); ctx.lineTo(f.fx + 11, f.fy + 9); ctx.stroke();
    }
  }

  function drawRevertCrawler(ctx, t) {
    // a tiny wind-up toy spider with a busted leg, a bent antenna and a few sparks
    const step = Math.sin(t * 11), hop = -Math.abs(step) * 1.6;
    ctx.save(); ctx.translate(0, hop - 5); ctx.rotate(-0.12 + step * 0.04);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const x0 = -5 + i * 4.5, ph = t * 11 + i * 2.1, bad = i === 2;
      ctx.strokeStyle = '#5a6270'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, 1); ctx.lineTo(x0 + (bad ? 4 : 3) + Math.sin(ph) * 1.5, bad ? 4 : 1 + 3.5 - Math.max(0, Math.cos(ph)) * 2); ctx.lineTo(x0 + 1 + Math.sin(ph) * 2, 5 - Math.max(0, Math.cos(ph)) * 1.5); ctx.stroke();
    }
    ctx.strokeStyle = '#3a404a'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) { const x0 = -5 + i * 4.5 + 1, ph = t * 11 + i * 2.1 + Math.PI; ctx.beginPath(); ctx.moveTo(x0, 0.5); ctx.lineTo(x0 - 2.5, -1 + Math.cos(ph)); ctx.lineTo(x0 - 3 + Math.sin(ph) * 2, 4.5); ctx.stroke(); }
    ctx.fillStyle = '#8a94a3'; ctx.beginPath(); ctx.roundRect(-9, -5, 18, 8, 3); ctx.fill();
    ctx.fillStyle = '#c9d1da'; ctx.fillRect(-7, -4.4, 13, 1.1);
    ctx.fillStyle = '#f2c230'; ctx.fillRect(-9, 0, 5, 3);
    ctx.fillStyle = '#1a1d24'; ctx.fillRect(-8, 0.6, 1.2, 2); ctx.fillRect(-5.6, 0.6, 1.2, 2);
    // wind-up key
    ctx.save(); ctx.translate(-1, -5); ctx.rotate(t * 3);
    ctx.fillStyle = '#d6dde6'; ctx.fillRect(-1.4, -4, 2.8, 4); ctx.fillRect(-3.4, -5.4, 6.8, 1.8); ctx.restore();
    // single dim red eye that flickers
    const on = Math.sin(t * 9) + Math.sin(t * 23) > -0.4;
    ctx.fillStyle = '#2a0a0a'; ctx.beginPath(); ctx.arc(6.5, -1.6, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = on ? '#ff3b2c' : '#5a1410'; ctx.beginPath(); ctx.arc(6.5, -1.6, 1.7, 0, TAU); ctx.fill();
    // bent antenna with a dangling wire
    ctx.strokeStyle = '#3a404a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(-4, -9); ctx.lineTo(-1, -10.5); ctx.stroke();
    ctx.strokeStyle = '#a33'; ctx.beginPath(); ctx.moveTo(4, 2.5); ctx.quadraticCurveTo(6, 6 + Math.sin(t * 8), 9, 4 + Math.sin(t * 8 + 1)); ctx.stroke();
    // sparks
    for (let i = 0; i < 3; i++) {
      const ph = (t * 5 + i * 0.37) % 1, a = 1 - ph;
      if (Math.sin(t * 17 + i * 5) < -0.1) continue;
      const sx = 4 + i * 1.5 + ph * (i - 1) * 7, sy = -4 - ph * 9;
      ctx.fillStyle = `rgba(255,${210 + i * 15},90,${a})`; ctx.fillRect(sx, sy, 1.6, 1.6);
    }
    ctx.restore();
  }

  /* ---------------- TARGET LOCK ---------------- */
  const FAR_PTS = 6;

  function tgtPos(tg) {
    if (tg.ent) {
      const e = tg.ent;
      if (e.dead || e.falling || e.air) { tg.gone = true; return tg.last; }
      tg.last = tg.kind === 'tank' ? { x: e.x, y: e.y - 12 } : tg.kind === 'heli' ? { x: e.x, y: e.y } : { x: e.x, y: e.y - 14 };
      return tg.last;
    }
    if (!tg.b.alive) { tg.gone = true; return tg.last; }
    tg.last = tg.b.cellCenter(tg.f, tg.c);
    return tg.last;
  }

  function acquire(m, game) {
    const targets = [];
    const near = (a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x);
    const ents = [];
    for (const h of game.helis) if (!h.dead && !h.falling) ents.push({ ent: h, kind: 'heli', n: 2 });
    for (const tk of game.tanks) if (!tk.dead) ents.push({ ent: tk, kind: 'tank', n: 2 });
    ents.sort((a, b) => Math.abs(a.ent.x - m.x) - Math.abs(b.ent.x - m.x));
    const sold = [];
    for (const w of game.walkers) if (w.kind === 'soldier' && !w.dead && !w.air) sold.push({ ent: w, kind: 'soldier', n: 1 });
    sold.sort((a, b) => Math.abs(a.ent.x - m.x) - Math.abs(b.ent.x - m.x));
    for (const e of ents.concat(sold)) { if (targets.length >= 4) break; targets.push(e); }
    const slots = Math.max(2, FAR_PTS - targets.length);
    const bs = game.buildings.filter(b => b.alive && b.x < W && b.x + b.w > 0).sort((a, b) => Math.abs(a.x + a.w / 2 - m.x) - Math.abs(b.x + b.w / 2 - m.x)).slice(0, 3);
    const cells = [];
    for (const b of bs) for (let f = 0; f < b.floors; f++) for (let c = 0; c < b.cols; c++) {
      const cell = b.cells[f][c]; if (cell.hp <= 0) continue;
      cells.push({ b, f, c, w: (cell.occ ? 3 : 1) * rand(0.5, 1) });
    }
    cells.sort((a, b) => b.w - a.w);
    const used = [];
    for (const cc of cells) {
      if (used.length >= slots) break;
      const p = cc.b.cellCenter(cc.f, cc.c);
      if (used.some(u => Math.hypot(u.x - p.x, u.y - p.y) < 55)) continue;
      used.push(p); targets.push({ win: true, b: cc.b, f: cc.f, c: cc.c, n: 1 });
    }
    for (const tg of targets) tgtPos(tg);
    return targets.filter(tg => tg.last);
  }

  function eyePos(m) {
    const f = m.facing;
    return m.state === 'climb' ? { x: m.x + f * 3, y: m.y - 53 } : { x: m.x + f * 22, y: m.y - 36 };
  }
  function podPos(m) {
    const f = m.facing;
    return m.state === 'climb' ? { x: m.x + f * 8, y: m.y - 12 } : { x: m.x - f * 8, y: m.y - 55 };
  }

  function reticle(x, y, r, rot, lockedK, dt) {
    const life = Math.max(0.04, dt * 1.6), col = lockedK >= 1 ? '#ff3b30' : '#ff9a8a';
    for (let i = 0; i < 8; i++) {
      const a = rot + i / 8 * TAU;
      FX.add({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, grav: 0, life, size: 2.2, color: col, ground: false });
    }
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      FX.add({ x: x + Math.cos(a) * (r + 5), y: y + Math.sin(a) * (r + 5), grav: 0, life, size: 3, color: '#ffffff', ground: false });
    }
    FX.add({ x, y, grav: 0, life, size: 2.6, color: '#ffffff', ground: false });
  }

  function paintLine(ex, ey, x, y, t, dt) {
    const life = Math.max(0.04, dt * 1.6);
    for (let j = 0; j < 6; j++) {
      const u = ((j + t * 7) % 6) / 6;
      FX.add({ x: ex + (x - ex) * u, y: ey + (y - ey) * u, grav: 0, life, size: 1.5, color: '#ff8a80', ground: false });
    }
  }

  function launch(m, L, game, q) {
    const pp = podPos(m), a = rand(-Math.PI * 0.85, -Math.PI * 0.15);
    const sp = rand(240, 340);
    L.missiles.push({ x: pp.x + rand(-5, 5), y: pp.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, tg: q.tg, age: 0, once: q.tg.n > 1 ? new Set() : L.once });
    FX.spark(pp.x, pp.y, 4, '#fff3b0');
    FX.ring(pp.x, pp.y, 16, '#ffb347', 0.18);
    Sfx.play('shoot');
  }

  function detonate(m, L, game, ms, x, y) {
    const tg = ms.tg;
    game.resolveHit(m, [{ x, y }], tg.win ? 14 : 22, 3, ms.once);
    if (tg.win) for (const [dx, dy] of [[32, 0], [-32, 0], [0, 38], [0, -38]]) game.resolveHit(m, [{ x: x + dx, y: y + dy }], 8, 1.5, ms.once);
    FX.spark(x, y, 10, '#ffd34d'); FX.spark(x, y, 5, '#ffffff'); FX.spark(x, y, 4, '#ff6a3d');
    FX.ring(x, y, 34, '#ff6a3d', 0.3); FX.ring(x, y, 20, '#fff3b0', 0.18);
    game.shake = Math.max(game.shake, 2.5);
    Sfx.play(L.det++ % 3 === 0 ? 'boom' : 'punch');
  }

  function stepLock(m, dt, game) {
    const L = m.beam;
    if (game.state !== 'play') { m.beam = null; return; }
    const eye = eyePos(m);
    if (L.st === 'charge') {
      L.t += dt;
      if (!L.targets.length) { if (L.t > 0.35) { m.beam = null; m.specialCd = Math.min(m.specialCd, 1.2); FX.text(m.x, m.y - 80, 'NO TARGETS', '#ff9a8a', 14); } return; }
      L.targets.forEach((tg, i) => {
        const at = 0.1 + i * (0.6 / Math.max(1, L.targets.length)), k = cl((L.t - at) / 0.2, 0, 1);
        if (L.t < at) return;
        if (!tg.gone) tgtPos(tg);
        if (!tg.last) return;
        if (!tg.locked && k >= 1) { tg.locked = true; FX.ring(tg.last.x, tg.last.y, 26, '#ff3b30', 0.25); Sfx.play('select'); }
        reticle(tg.last.x, tg.last.y, lerp(30, 13, ease(k)), L.t * (3 + 4 * (1 - k)), k, dt);
        paintLine(eye.x, eye.y, tg.last.x, tg.last.y, L.t, dt);
      });
      if (L.t >= L.chargeT) {
        L.st = 'fire'; L.ft = 0; L.once = new Set(); L.det = 0;
        const q = [];
        L.targets.forEach(tg => q.push({ tg, pass: 0 }));
        L.targets.forEach(tg => { if (tg.n > 1) q.push({ tg, pass: 1 }); });
        L.queue = q.map((e, i) => Object.assign(e, { at: i * 0.075 }));
        L.fireT = q.length * 0.075 + 0.25;
        FX.text(m.x, m.y - 84, 'LOCKED x' + L.targets.length, '#ff3b30', 16);
        game.shake = Math.max(game.shake, 3);
      }
      return;
    }
    // firing
    L.ft += dt;
    while (L.queue.length && L.queue[0].at <= L.ft) launch(m, L, game, L.queue.shift());
    for (const tg of L.targets) if (!tg.gone && !tg.dead) { const q = tgtPos(tg); if (q && L.ft < 0.9) reticle(q.x, q.y, 13, L.ft * 3, 1, dt); }
    for (const ms of L.missiles) {
      ms.age += dt;
      let aim = ms.tg.gone ? null : tgtPos(ms.tg);
      if (!aim) {
        const alt = L.targets.filter(t2 => !t2.gone && t2 !== ms.tg).sort((a, b) => Math.hypot(a.last.x - ms.x, a.last.y - ms.y) - Math.hypot(b.last.x - ms.x, b.last.y - ms.y))[0];
        if (alt) { ms.tg = alt; ms.once = alt.n > 1 ? new Set() : L.once; aim = alt.last; } else aim = ms.tg.last;
      }
      const sp = Math.min(620, Math.hypot(ms.vx, ms.vy) + 700 * dt);
      const want = Math.atan2(aim.y - ms.y, aim.x - ms.x), cur = Math.atan2(ms.vy, ms.vx);
      let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      const turn = Math.min(Math.abs(da), (5 + ms.age * 9) * dt) * sign(da);
      ms.vx = Math.cos(cur + turn) * sp; ms.vy = Math.sin(cur + turn) * sp;
      ms.x += ms.vx * dt; ms.y += ms.vy * dt;
      const life = Math.max(0.05, dt * 1.6);
      FX.add({ x: ms.x, y: ms.y, grav: 0, life, size: 4.2, color: '#ffffff', ground: false });
      FX.add({ x: ms.x - ms.vx * dt * 0.5, y: ms.y - ms.vy * dt * 0.5, grav: 0, life: 0.07, size: 3.2, color: '#ffe9a0', ground: false });
      for (let i = 0; i < 2; i++) FX.add({ x: ms.x - ms.vx * dt * (0.8 + i * 0.6), y: ms.y - ms.vy * dt * (0.8 + i * 0.6), vx: rand(-25, 25), vy: rand(-25, 25), grav: 0, life: rand(0.2, 0.34), size: rand(1.8, 3), color: pick(['#ffb347', '#ff6a3d', '#fff3b0']), ground: false });
      if (Math.hypot(aim.x - ms.x, aim.y - ms.y) < 15 || ms.age > 2.6 || ms.y > GROUND) { ms.done = true; detonate(m, L, game, ms, ms.y > GROUND ? ms.x : (ms.age > 2.6 ? ms.x : aim.x), ms.y > GROUND ? GROUND - 6 : (ms.age > 2.6 ? ms.y : aim.y)); }
    }
    L.missiles = L.missiles.filter(ms => !ms.done);
    if ((!L.queue.length && !L.missiles.length) || L.ft > 6) m.beam = null;
  }

  registerMonster({
    id: 'crawler', name: 'AUTOMATED SOLUTION', tagline: 'It does not stop. It does not snack-break. (It does snack.)',
    homage: 'Every robot uprising movie, ever',
    move: 'CLIMBS', specialName: 'TARGET LOCK', specialDesc: 'The eye paints up to 6 targets, then homing micro-missiles hit every one',
    passive: 'Armoured chassis: 30% less damage, slowly self-repairs',
    bars: { STR: 4, SPD: 1, REACH: 3, TOUGH: 5 },
    stats: { w: 72, h: 58, speed: 76, climb: 58, jump: 430, dmg: 2.4, reach: 40, hitR: 19, punchCd: 0.62,
      maxHp: 160, armor: 0.7, armY: 0.5, specialCd: 9 },
    portraitY: 0.6,
    special(m, game) {
      if (m.beam) return;
      const targets = acquire(m, game);
      m.beam = { crawler: true, st: 'charge', t: 0, chargeT: 0.8, ft: 0, fireT: 1, aim: 0, by: m.y, f: m.facing, once: null, targets, missiles: [], queue: [], det: 0 };
      const e = eyePos(m);
      FX.ring(e.x, e.y, 46, '#ff3b30', 0.5);
      FX.spark(e.x, e.y, 6, '#ffb0a0');
      Sfx.play('blink');
    },
    tick(m, dt, game) {
      if (!m.defeated && game.state === 'play' && m.hp > 0 && m.hp < m.s.maxHp) m.hp = Math.min(m.s.maxHp, m.hp + 0.3 * dt);
      const L = m.beam;
      if (!L || !L.crawler) return;
      if (m.defeated) { m.beam = null; return; }
      m.beam.by = m.y;
      stepLock(m, dt, game);
    },
    draw: drawCrawler,
    drawRevert: drawRevertCrawler,
  });
})();
