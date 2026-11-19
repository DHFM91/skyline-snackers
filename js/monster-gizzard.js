'use strict';
/* =========================================================
   GIZZARD: The BIG DEAD Dog. A hunched, ash-grey werewolf.
   Original design: grey fur, blood-red highlights, ragged red
   collar with a broken chain. See LEGAL_NOTES.md.
   ========================================================= */
(function () {
  const F1 = '#6b6f78', F2 = '#43464e', F3 = '#2b2d33', FB = '#a9adb5', FT = '#8c9099';
  const R1 = '#c1121f', R2 = '#ec2b3a', RD = '#6e0a12', BONE = '#efe9d8', INKC = '#14090b';

  // shared with draw(): the draw hook only sees the pose, so tick() leaves a stamp keyed to the monster clock
  const FX_STATE = { stamp: -99, fz: false, howl: false };
  function live(p) { return Math.abs(p.t - FX_STATE.stamp) < 0.12; }
  function frenzyOn(p) { return live(p) && FX_STATE.fz; }
  function howlOn(p) { return live(p) && FX_STATE.howl; }

  const FRENZY = { dur: 5, speed: 1.32, climb: 1.25, dmg: 1.5, punchCd: 0.6 };
  const HOWL_T = 0.6;

  // two-bone IK: returns the middle joint. s picks which side it bends toward.
  function ik(x0, y0, x1, y1, l1, l2, s) {
    let dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 0.001;
    const dd = Math.min(d, l1 + l2 - 0.2);
    const ux = dx / d, uy = dy / d;
    const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return [x0 + ux * a + s * uy * h, y0 + uy * a - s * ux * h];
  }
  // fur spikes along a line, on one side
  function spikes(ctx, x0, y0, x1, y1, n, len, wid, col, side) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ax = dx / L, ay = dy / L, nx = -ay * side, ny = ax * side;
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n, bx = x0 + dx * k, by = y0 + dy * k, ln = len * (0.75 + 0.25 * Math.sin(i * 2.3));
      ctx.beginPath(); ctx.moveTo(bx - ax * wid, by - ay * wid); ctx.lineTo(bx + nx * ln - ax * ln * 0.5, by + ny * ln - ay * ln * 0.5);
      ctx.lineTo(bx + ax * wid, by + ay * wid); ctx.closePath(); ctx.fill();
    }
  }
  function tri(ctx, x0, y0, x1, y1, x2, y2, col) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill();
  }
  function claws(ctx, x, y, ang, n, len, spread) {
    ctx.fillStyle = R1;
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * spread, bx = x + Math.cos(a) * 3, by = y + Math.sin(a) * 3;
      const ex = x + Math.cos(a) * (3 + len), ey = y + Math.sin(a) * (3 + len);
      const px = -Math.sin(a) * 1.5, py = Math.cos(a) * 1.5;
      ctx.beginPath(); ctx.moveTo(bx + px, by + py); ctx.quadraticCurveTo(ex + px * 0.5 + Math.cos(a + 0.5) * 2, ey + py * 0.5 + Math.sin(a + 0.5) * 2, ex, ey);
      ctx.lineTo(bx - px, by - py); ctx.closePath(); ctx.fill();
    }
  }

  function head(ctx, p, x, y, rot, jaw, glow, ear, tongueOut) {
    const t = p.t;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1.18, 1.18);
    // ears
    ctx.save(); ctx.translate(-5, -7); ctx.rotate(-0.1 + ear * 0.5);
    tri(ctx, -3, 2, 0, -24, 7, 0, F3); ctx.restore();
    ctx.save(); ctx.translate(-9, -5); ctx.rotate(-0.2 - ear);
    tri(ctx, -3, 2, -2, -27, 8, 0, F2); tri(ctx, -1, 0, -1, -19, 4, -1, RD); ctx.restore();
    // ruff behind the jaw
    spikes(ctx, -10, 2, -2, 14, 5, 7, 3, F2, -1);
    spikes(ctx, -4, 12, 6, 12, 4, 6, 3, FT, 1);
    // lower jaw
    ctx.save(); ctx.translate(3, 4); ctx.rotate(jaw);
    ctx.fillStyle = '#7d0a14'; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(22, -1); ctx.lineTo(19, 5); ctx.lineTo(1, 6); ctx.closePath(); ctx.fill();
    ell(ctx, 11, 1.5, 8.5, 2.6, R2);
    if (tongueOut > 0) {
      ctx.strokeStyle = R2; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(14, 2); ctx.quadraticCurveTo(24, 5 + tongueOut * 3, 24 + tongueOut * 2, 8 + tongueOut * 6); ctx.stroke();
      ctx.strokeStyle = R1; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(15, 3); ctx.lineTo(24, 7 + tongueOut * 3); ctx.stroke();
    }
    ctx.fillStyle = F2; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(23, 1); ctx.lineTo(22, 6); ctx.quadraticCurveTo(12, 12, -1, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = FB; ctx.beginPath(); ctx.moveTo(2, 6); ctx.quadraticCurveTo(12, 10, 20, 5); ctx.lineTo(19, 3.5); ctx.lineTo(2, 4.5); ctx.closePath(); ctx.fill();
    tri(ctx, 21, 1, 19, -5, 17, 1, BONE); tri(ctx, 15, 1, 13.5, -3, 12, 1, BONE); tri(ctx, 9, 1, 8, -2, 7, 1, BONE);
    // blood dribbling off the chin
    ctx.strokeStyle = R1; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(15, 8); ctx.lineTo(14, 13 + Math.sin(t * 3) * 1.2); ctx.moveTo(9, 9); ctx.lineTo(8, 12); ctx.stroke();
    ctx.restore();
    // skull and upper muzzle
    ell(ctx, 0, -2, 12.5, 11, F1);
    ctx.fillStyle = F1; ctx.beginPath(); ctx.moveTo(-2, -11); ctx.quadraticCurveTo(14, -12, 27, -3); ctx.lineTo(30, 1); ctx.lineTo(28, 4); ctx.lineTo(4, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = F2; ctx.beginPath(); ctx.moveTo(-6, -11); ctx.quadraticCurveTo(3, -16, 10, -9); ctx.quadraticCurveTo(2, -8, -6, -3); ctx.closePath(); ctx.fill();
    // gums and fangs
    ctx.fillStyle = R1; ctx.beginPath(); ctx.moveTo(7, 3); ctx.lineTo(28, 3); ctx.lineTo(28, 5.2); ctx.lineTo(8, 5.2); ctx.closePath(); ctx.fill();
    tri(ctx, 26, 4, 24.5, 10.5, 22, 4, BONE); tri(ctx, 20, 4, 19, 8.5, 17, 4, BONE); tri(ctx, 14, 4, 13, 7.5, 11.5, 4, BONE);
    // wrinkled snarl and red-streaked muzzle
    ctx.strokeStyle = F3; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(22, -3); ctx.lineTo(16, -2); ctx.stroke();
    ctx.strokeStyle = R1; ctx.lineWidth = 1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(24, -1); ctx.lineTo(16, 0.5); ctx.moveTo(9, -4); ctx.lineTo(6, 2); ctx.moveTo(12, 2); ctx.lineTo(11, 7); ctx.stroke();
    ell(ctx, 29, -1.5, 3.2, 2.6, INKC); ell(ctx, 28.2, -2.4, 1, 0.7, '#ff7d86');
    // eye
    const ge = glow;
    const g = ctx.createRadialGradient(8, -5, 1, 8, -5, 10 + ge * 4);
    g.addColorStop(0, 'rgba(255,60,60,' + (0.6 + 0.2 * ge) + ')'); g.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(8, -5, 10 + ge * 4, 0, Math.PI * 2); ctx.fill();
    ell(ctx, 8.5, -5, 4, 2.5, '#ff2d2d', 0.35); ell(ctx, 9, -5.2, 2.6, 1.3, '#ffd0c0', 0.35);
    ctx.fillStyle = INKC; ctx.fillRect(8.6, -6.6, 1, 3);
    ctx.strokeStyle = F3; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(1, -11); ctx.lineTo(14, -6.5); ctx.stroke();
    // cheek tufts
    spikes(ctx, -9, 2, 3, 9, 4, 6, 2.5, F1, 1);
    ctx.restore();
  }

  function collar(ctx, p, nx, ny, ang, sway) {
    const t = p.t;
    ctx.save(); ctx.translate(nx, ny); ctx.rotate(ang);
    ctx.fillStyle = RD; ctx.fillRect(-3, -9, 7, 18);
    ctx.fillStyle = R1; ctx.fillRect(-3, -9, 5.5, 18);
    ctx.fillStyle = '#e8434f'; ctx.fillRect(-3, -9, 1.5, 18);
    for (let i = 0; i < 3; i++) tri(ctx, -3 + i * 2.4, 9, -2 + i * 2.4, 13 + (i % 2) * 2, 0.4 + i * 2.4, 9, R1);
    for (let i = 0; i < 4; i++) tri(ctx, 4, -8 + i * 4.5, 7 + (i % 2) * 1.5, -6 + i * 4.5, 4, -4 + i * 4.5, RD);
    ctx.strokeStyle = '#5a0710'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // ring and broken chain hang straight down in world space
    const cs = Math.cos(ang), sn = Math.sin(ang), rx = nx + (-sn) * 8 + cs * 2, ry = ny + cs * 8 + sn * 2;
    ell(ctx, rx, ry, 3.2, 3.2, '#868b95'); ell(ctx, rx, ry, 1.5, 1.5, F3);
    let px = rx, py = ry;
    for (let i = 0; i < 5; i++) {
      const a = sway * (0.35 + i * 0.22) + Math.sin(t * 3 + i * 0.7) * 0.07;
      const lx = px + Math.sin(a) * 4.6, ly = py + Math.cos(a) * 4.6;
      ctx.save(); ctx.translate((px + lx) / 2, (py + ly) / 2); ctx.rotate(-a);
      ctx.strokeStyle = i % 2 ? '#a4a9b3' : '#6f747e'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, i % 2 ? 1.4 : 2.1, i % 2 ? 2.7 : 1.4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      px = lx; py = ly;
    }
    // snapped end link
    ctx.strokeStyle = '#a4a9b3'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(px, py + 2, 2.4, 0.6, 5.2); ctx.stroke();
  }

  function arm(ctx, sx, sy, hx, hy, col, hiCol, bendUp, scale) {
    const [ex, ey] = ik(sx, sy, hx, hy, 25, 27, bendUp ? 1 : -1);
    limb(ctx, sx, sy, ex, ey, 11 * scale, col, 0);
    limb(ctx, ex, ey, hx, hy, 8 * scale, col, 0);
    ell(ctx, ex, ey, 5.5 * scale, 5.5 * scale, col);
    spikes(ctx, sx, sy, ex, ey, 4, 5, 2.4, hiCol, bendUp ? -1 : 1);
    spikes(ctx, ex, ey, hx, hy, 4, 4.5, 2.2, hiCol, bendUp ? -1 : 1);
    // blood on the forearm
    ctx.strokeStyle = R1; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    const mx = (ex + hx) / 2, my = (ey + hy) / 2;
    ctx.beginPath(); ctx.moveTo(mx - 1, my - 2); ctx.lineTo(mx + 2, my + 4); ctx.stroke();
    ell(ctx, hx, hy, 5.5 * scale, 4.6 * scale, col);
    const ang = Math.atan2(hy - ey, hx - ex);
    claws(ctx, hx, hy, ang, 3, 8, 0.38);
  }

  function leg(ctx, hx, hy, ax, ay, tx, ty, col, hiCol, s, thick) {
    const [kx, ky] = ik(hx, hy, ax, ay, 21, 23, s);
    ell(ctx, (hx + kx) / 2, (hy + ky) / 2, 8 * thick, 12 * thick, col, Math.atan2(ky - hy, kx - hx) - Math.PI / 2);
    limb(ctx, hx, hy, kx, ky, 12 * thick, col, 0);
    limb(ctx, kx, ky, ax, ay, 7, col, 0);
    limb(ctx, ax, ay, tx, ty, 6, col, 0);
    spikes(ctx, kx, ky, ax, ay, 3, 5, 2, hiCol, -s);
    ell(ctx, tx + 1, ty - 1, 4.6, 2.8, col);
    claws(ctx, tx + 2, ty - 1, 0.25, 3, 5.5, 0.3);
  }

  function drawGizzard(ctx, p) {
    const t = p.t, fz = frenzyOn(p), howl = howlOn(p);
    const wk = p.walk && !p.climb && !p.air, wph = p.walkPhase, cph = p.climbPhase;
    const sw = wk ? Math.sin(wph) : 0;
    const breath = Math.sin(t * 2.6), br2 = Math.sin(t * 1.3 + 1);
    const ext = p.punch > 0 ? punchExt(p.punch) : 0;
    const bob = wk ? Math.abs(Math.cos(wph)) * 3.5 : 0;
    const dashK = p.dash ? 1 : 0;

    // pose: hip, shoulder, head
    let hipX = -8, hipY = -44 - bob + breath * 1.6 + ext * 2;
    let shX = 8 + (wk ? 4 : 0) + ext * 6 + dashK * 12, shY = -76 - bob * 0.8 + breath * 1.4 + (wk ? 2 : 0) + ext * 2;
    let hdRot = 0.12 + Math.sin(t * 1.1) * 0.1, hdX = shX + 15, hdY = shY - 10 + Math.sin(t * 1.7) * 1.5;
    let jaw = 0.16 + 0.12 * Math.max(0, Math.sin(t * 3.1)), tongue = 0.4 + 0.6 * Math.max(0, Math.sin(t * 3.1)), ear = Math.sin(t * 2) * 0.12 + (Math.sin(t * 0.8) > 0.93 ? 0.5 : 0);
    const sniff = Math.pow(Math.max(0, Math.sin(t * 0.9)), 6);
    if (!p.climb && !p.air && !wk && !p.punch && !p.eat && !howl) { hdRot -= sniff * 0.45; hdY -= sniff * 4; hdX += sniff * 3; }
    if (wk) { hdRot += 0.1 + Math.sin(wph * 2) * 0.06; hdX += 3; jaw = 0.3 + 0.1 * Math.sin(wph * 2); tongue = 1; }
    if (p.climb) { shX = 8; shY = -84 + Math.sin(cph * 2) * 1.5; hipY = -48 + Math.cos(cph * 2) * 1.5; hdRot = -0.3 + Math.sin(cph) * 0.08; hdX = shX + 13; hdY = shY - 12; jaw = 0.3; tongue = 1; }
    if (p.air) { hipY = -48; shX = 10; shY = -76 - Math.sin(t * 6) * 1.2; hdRot = -0.12; jaw = 0.45; tongue = 1; }
    if (p.punch > 0) { hdRot += 0.12 * ext; jaw = 0.6 * ext + 0.2; ear = 0.45; }
    if (p.eat > 0) { const c = Math.abs(Math.sin(t * 30)); hdX += 7 * p.eat; hdY += 3 * p.eat; hdRot += 0.2; jaw = 0.15 + 0.7 * c; tongue = 0; ear = 0.4; }
    let chest = 1 + breath * 0.025;
    if (howl) { shX = 4; shY = -80; hipX = -10; hdRot = -1.0 + Math.sin(t * 24) * 0.02; hdX = shX + 13; hdY = shY - 14; jaw = 0.9; tongue = 1.2; chest = 1.12; ear = -0.3; }
    const eyeGlow = fz || howl ? 1 : 0.5 + 0.5 * Math.sin(t * 3);

    ctx.save();
    if (p.dash) ctx.rotate(0.18);

    // frenzy aura
    if (fz) {
      const g = ctx.createRadialGradient(4, -56, 6, 4, -56, 72);
      g.addColorStop(0, 'rgba(255,40,50,' + (0.34 + 0.1 * Math.sin(t * 14)) + ')'); g.addColorStop(1, 'rgba(255,0,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(4, -56, 72, 0, Math.PI * 2); ctx.fill();
    }

    // tail
    let tipX = -50 + Math.sin(t * 2.2) * 9, tipY = -34 + Math.cos(t * 1.7) * 6;
    if (wk) { tipX = -52 - sw * 7; tipY = -48 + Math.cos(wph * 2) * 5; }
    if (p.air) { tipX = -50; tipY = -62 + Math.sin(t * 9) * 4; }
    if (p.climb) { tipX = -26 + Math.sin(cph) * 4; tipY = -14; }
    if (howl) { tipX = -46; tipY = -66; }
    const bx0 = hipX - 6, by0 = hipY + 2, cx0 = (bx0 + tipX) / 2 - 6, cy0 = Math.min(by0, tipY) + 16;
    for (let i = 0; i <= 8; i++) {
      const k = i / 8, qx = (1 - k) * (1 - k) * bx0 + 2 * (1 - k) * k * cx0 + k * k * tipX, qy = (1 - k) * (1 - k) * by0 + 2 * (1 - k) * k * cy0 + k * k * tipY;
      const r = 4 + Math.sin(k * Math.PI) * 4.5 + k * 2;
      ell(ctx, qx, qy, r, r * 0.85, k > 0.8 ? F1 : F2);
      if (i > 1 && i < 8) { ctx.fillStyle = F3; ctx.beginPath(); ctx.moveTo(qx - 3, qy - r * 0.8); ctx.lineTo(qx - 6, qy - r - 4); ctx.lineTo(qx + 2, qy - r * 0.8); ctx.fill(); }
    }
    ell(ctx, tipX, tipY, 4.5, 3.6, '#b4b8c0');
    ctx.strokeStyle = R1; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tipX - 9, tipY - 1); ctx.lineTo(tipX - 3, tipY + 2); ctx.stroke();

    // legs: far one first
    let nA, fA, nT, fT;
    if (p.climb) {
      nA = [14, -24 + Math.sin(cph) * 9]; fA = [14, -42 + Math.sin(cph + Math.PI) * 9]; nT = [nA[0] + 6, nA[1] + 3]; fT = [fA[0] + 6, fA[1] + 3];
    } else if (p.air) {
      nA = [-6 + Math.sin(t * 7), -26]; fA = [6, -32 + Math.sin(t * 7 + 1)]; nT = [nA[0] + 9, nA[1] + 5]; fT = [fA[0] + 9, fA[1] + 6];
      if (howl) { nA = [-10, -24]; fA = [2, -26]; nT = [nA[0] + 9, nA[1] + 5]; fT = [fA[0] + 9, fA[1] + 5]; }
    } else if (wk) {
      const a1 = wph, a2 = wph + Math.PI;
      nA = [-13 + Math.sin(a1) * 17, -15 - Math.max(0, Math.cos(a1)) * 13]; fA = [-1 + Math.sin(a2) * 17, -15 - Math.max(0, Math.cos(a2)) * 13];
      nT = [nA[0] + 12, nA[1] + 14]; fT = [fA[0] + 12, fA[1] + 14];
    } else {
      const crouch = ext * 2;
      nA = [-13 - breath * 0.6, -15]; fA = [0 + (p.punch ? 6 : 0), -15]; nT = [nA[0] + 12, 0]; fT = [fA[0] + 12, 0];
      hipY += crouch;
    }
    const lh = hipY + 1;
    leg(ctx, hipX + 2, lh, fA[0], fA[1], fT[0], fT[1], F3, F2, 1, 0.9);

    // far arm
    let fh, nh;
    if (p.climb) { fh = [28, -78 + Math.sin(cph + Math.PI) * 11]; nh = [30, -98 + Math.sin(cph) * 11]; }
    else if (p.air) { fh = [18, -94 + Math.sin(t * 6) * 2]; nh = [34, -88 + Math.sin(t * 6 + 1) * 2]; }
    else if (wk) { fh = [20 + sw * 10, -36 - Math.max(0, Math.cos(wph)) * 6]; nh = [22 - sw * 10, -36 - Math.max(0, -Math.cos(wph)) * 6]; }
    else {
      fh = [16 + Math.sin(t * 1.7) * 3, -34 + Math.cos(t * 2.4) * 3]; nh = [28 + Math.sin(t * 1.5 + 1) * 4, -38 + Math.cos(t * 2.1) * 3 - breath * 1.5];
    }
    if (p.eat > 0) nh = [34, -66 + Math.sin(t * 30) * 2];
    if (howl) { fh = [-14, -92]; nh = [34, -100]; }
    const bendUp = p.climb || p.air || howl;
    arm(ctx, shX - 4, shY + 3, fh[0], fh[1], F3, F3, bendUp, 0.92);

    // torso
    const lean = Math.atan2(shX - hipX, hipY - shY) ;
    ell(ctx, hipX - 1, hipY - 2, 13, 13, F2);
    ell(ctx, (hipX + shX) / 2 - 3, (hipY + shY) / 2 + 3, 14, 17, F2, -lean * 0.5);
    ctx.save(); ctx.translate(shX, shY + 9); ctx.scale(chest, chest);
    ell(ctx, -2, 0, 18, 20, F1, 0.25);
    ell(ctx, 2, 6, 11, 14, FB, 0.2);
    ctx.restore();
    ell(ctx, shX - 13, shY - 4 + (howl ? 3 : 0), 17, 11, F2, -0.25);
    spikes(ctx, shX - 28, shY - 2, shX - 10, shY - 14, 5, 6, 3, F3, -1);
    // spine ridge
    spikes(ctx, hipX - 11, hipY - 4, shX - 18, shY - 6, 6, 8, 3.2, F3, -1);
    // chest fur and belly tufts
    spikes(ctx, shX + 4, shY + 22, shX + 14, shY + 4, 4, 6, 2.6, '#c3c6cc', 1);
    spikes(ctx, hipX + 6, hipY + 6, shX + 2, shY + 28, 4, 5, 2.4, FB, 1);
    // rib marks and bloody claw streaks on the chest
    ctx.strokeStyle = '#8a8e97'; ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(shX + 4, shY + 10 + i * 5); ctx.quadraticCurveTo(shX + 9, shY + 12 + i * 5, shX + 12, shY + 9 + i * 5); ctx.stroke(); }
    ctx.strokeStyle = R1; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(shX - 3 + i * 5, shY + 3); ctx.lineTo(shX + 1 + i * 5, shY + 16 + (i % 2) * 3); ctx.stroke(); }
    ctx.strokeStyle = R2; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(shX + 1, shY + 4); ctx.lineTo(shX + 4, shY + 14); ctx.stroke();
    ell(ctx, shX + 3, shY + 20 + Math.sin(t * 2) * 0.5, 1.6, 2.3, R1);

    // near leg: haunch over the torso
    leg(ctx, hipX - 2, lh, nA[0], nA[1], nT[0], nT[1], F1, FT, 1, 1.1);

    // head, collar
    const nkx = (shX + hdX) / 2 - 1, nky = (shY + hdY) / 2 + 3, nAng = Math.atan2(hdY - shY, hdX - shX) + 0.2;
    ell(ctx, nkx - 3, nky + 1, 11, 10, F2);
    spikes(ctx, shX - 12, shY - 10, hdX - 8, hdY - 8, 4, 6, 3, F3, -1);
    head(ctx, p, hdX, hdY, hdRot, jaw, eyeGlow, ear, tongue);
    collar(ctx, p, nkx + 1, nky + 2, nAng, wk ? Math.sin(wph * 2) * 0.55 : p.air ? -0.5 : Math.sin(t * 2) * 0.35 + (p.punch ? 0.4 : 0));

    // near arm (punches)
    let rest = nh;
    const [px, py] = p.punch > 0 && p.hand ? handTarget(p, rest[0], rest[1]) : rest;
    arm(ctx, shX + 2, shY + 3, px, py, F1, F2, bendUp, 1);

    // claw slash marks
    if (p.punch > 0.05 && p.punch < 0.75 && p.hand) {
      const a = 1 - p.punch / 0.75;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = R2; ctx.lineCap = 'round'; ctx.lineWidth = 2.4;
      const dir = p.punchDir === 'up' ? -1 : p.punchDir === 'down' ? 1 : 0;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        if (dir === 0) { ctx.moveTo(px + 18 + i * 2, py - 10 + i * 7); ctx.lineTo(px + 22 + i * 2, py + 4 + i * 7); }
        else { ctx.moveTo(px - 14 + i * 7, py + dir * 12 + i * 2); ctx.lineTo(px + 12 + i * 7, py - dir * 6 + i * 2); }
        ctx.stroke();
      }
      ctx.restore();
    }

    // howl: red sound arcs from the mouth
    if (howl) {
      const mx = hdX + Math.cos(hdRot) * 28 - Math.sin(hdRot) * 4, my = hdY + Math.sin(hdRot) * 28 + Math.cos(hdRot) * 4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const k = ((t * 2.2 + i / 3) % 1), r = 10 + k * 34;
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = i % 2 ? R2 : R1; ctx.lineWidth = 3 - k * 1.5;
        ctx.beginPath(); ctx.arc(mx, my, r, hdRot - 0.55, hdRot + 0.55); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawChihuahua(ctx, t) {
    const sc = Math.sin(t * 26), hop = -Math.abs(Math.sin(t * 13)) * 2.2;
    ctx.save(); ctx.translate(0, hop);
    const CT = '#d8b080', CD = '#b08756';
    ctx.strokeStyle = CD; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const ph = t * 26 + i * Math.PI;
      ctx.beginPath(); ctx.moveTo(-6 + i * 11, -5); ctx.lineTo(-6 + i * 11 + Math.sin(ph) * 3, -0.5 + Math.min(0, Math.cos(ph)) * 1.5);
      ctx.moveTo(-3 + i * 11, -5); ctx.lineTo(-3 + i * 11 - Math.sin(ph) * 3, -0.5); ctx.stroke();
    }
    ctx.strokeStyle = CT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -8); ctx.quadraticCurveTo(-16, -12, -14 + sc, -17); ctx.stroke();
    ell(ctx, 0, -8, 9, 4.6, CT); ell(ctx, 1, -6.5, 6, 2.4, '#f0dcb8');
    ell(ctx, 10, -12, 5.3, 4.8, CT);
    ell(ctx, 15, -11, 3, 2, CT); ell(ctx, 17.5, -11.5, 1.2, 1, INKC);
    ctx.fillStyle = CT; ctx.beginPath(); ctx.moveTo(6, -15); ctx.lineTo(4, -23); ctx.lineTo(10, -16.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = CD; ctx.beginPath(); ctx.moveTo(10, -16.5); ctx.lineTo(10.5, -24); ctx.lineTo(13.5, -15.5); ctx.closePath(); ctx.fill();
    ell(ctx, 11.5, -13.5, 2.4, 2.4, '#fff'); ell(ctx, 12.3, -13.4, 1.2, 1.2, INKC);
    const yap = Math.abs(Math.sin(t * 18));
    ctx.fillStyle = '#7a1b24'; ctx.beginPath(); ctx.moveTo(14, -9.5); ctx.lineTo(17.5, -9.5 + yap * 2.4); ctx.lineTo(14, -8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = R1; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(6.5, -9); ctx.lineTo(8.5, -7.5); ctx.stroke();
    ctx.strokeStyle = '#8b8f98'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(7.5, -8); ctx.lineTo(7 + sc * 0.6, -5); ctx.lineTo(8.2 + sc * 0.6, -3.6); ctx.stroke();
    ctx.restore();
  }

  registerMonster({
    id: 'gizzard', name: 'GIZZARD', tagline: 'The BIG DEAD Dog.',
    homage: 'Every full moon, ever',
    move: 'CLIMBS', specialName: 'BLOOD HOWL',
    specialDesc: 'Howls up a 5s red frenzy: faster, harder, quicker punches',
    passive: 'Scavenger: heals 4 extra from every snack',
    bars: { STR: 4, SPD: 4, REACH: 2, TOUGH: 3 },
    specialHeal: 35,
  stats: { w: 44, h: 96, speed: 152, climb: 104, jump: 780, dmg: 2.1, reach: 34, hitR: 20, punchCd: 0.28,
      maxHp: 125, armor: 0.96, armY: 0.6, specialCd: 9 },
    portraitY: 0.8,
    tick(m, dt, game) {
      const base = m.def.stats;
      if (!m.gz) { m.gz = { fz: 0, howl: 0, prevEat: 0, acc: 0, panicT: 0 }; m.s = Object.assign({}, base); }
      const g = m.gz;
      if (m.eatT > g.prevEat + 0.01) {
        m.heal(4);
        FX.spark(m.x + m.facing * 20, m.y - m.h * 0.7, 6, '#ff3b3b');
      }
      g.prevEat = m.eatT;
      if (g.howl > 0) g.howl -= dt;
      if (g.fz > 0) {
        g.fz -= dt;
        g.acc += dt * 46;
        while (g.acc >= 1) {
          g.acc -= 1;
          FX.add({ x: m.x + rand(-20, 20), y: m.y - rand(8, m.h), vx: rand(-25, 25), vy: -rand(40, 120), grav: -30, life: rand(0.35, 0.75),
            size: rand(1.8, 3.4), color: pick(['#ff2a2a', '#ff6a4a', '#c1121f', '#ffb0a0']), ground: false });
        }
        g.panicT -= dt;
        if (g.panicT <= 0) {
          g.panicT = 0.25;
          for (const wk of game.walkers) {
            if (!wk.air && wk.kind === 'civ' && Math.abs(wk.x - m.x) < 560) { wk.panic = true; wk.dir = Math.sign(wk.x - m.x) || 1; }
          }
        }
      }
      const fz = g.fz > 0, root = g.howl > 0 ? 0 : 1;
      m.s.speed = base.speed * (fz ? FRENZY.speed : 1) * root;
      m.s.climb = base.climb * (fz ? FRENZY.climb : 1) * root;
      m.s.dmg = base.dmg * (fz ? FRENZY.dmg : 1);
      m.s.punchCd = base.punchCd * (fz ? FRENZY.punchCd : 1);
      FX_STATE.stamp = m.t; FX_STATE.fz = fz; FX_STATE.howl = g.howl > 0;
    },
    special(m, game) {
      const g = m.gz || (m.gz = { fz: 0, howl: 0, prevEat: 0, acc: 0, panicT: 0 });
      g.howl = HOWL_T; g.fz = FRENZY.dur + HOWL_T; g.panicT = 0;
      m.vx = 0;
      const cx = m.x, cy = m.y - m.h * 0.75;
      for (let i = 0; i < 4; i++) setTimeout(() => FX.ring(cx + m.facing * 12, cy, 230 + i * 20, i % 2 ? '#ff4a52' : '#c1121f', 0.7), i * 110);
      FX.spark(cx, cy, 14, '#ff3b3b');
      FX.text(cx, cy - 46, 'BLOOD HOWL!', '#ff5560', 20);
      for (const wk of game.walkers) if (!wk.air && wk.kind === 'civ') { wk.panic = true; wk.dir = Math.sign(wk.x - m.x) || 1; }
      game.shake = Math.max(game.shake, 9);
      Sfx.play('roar');
    },
    draw(ctx, p) { drawGizzard(ctx, p); },
    drawRevert(ctx, t) { drawChihuahua(ctx, t); },
  });
})();
