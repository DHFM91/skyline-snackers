'use strict';
/* CTHULHU art: octopus-headed, scaly, hunched, with rudimentary wings. Original cartoon styling. */
(function () {
  const d = MONSTERS.find(m => m.id === 'cthulhu');
  if (!d) return;
  const BASE = '#2f7f5e', SHD = '#1b4d3b', DEEP = '#0e2b22', HI = '#74c38d', ACC = '#c3df5c';
  const BEL = '#a9d58a', BELS = '#78ad6c', MEM = '#173f35', MEM2 = '#2a6a55', CLAW = '#efe6b0', CLAWS = '#b9ad6a';
  const TEN = '#3b8f6a', TENS = '#215a45', EYE = '#ffe94a';
  const sin = Math.sin, cos = Math.cos, PI = Math.PI;

  function ik(x0, y0, x1, y1, l1, l2, s) {
    const dx = x1 - x0, dy = y1 - y0, dist = Math.hypot(dx, dy) || 0.001;
    const dd = Math.min(dist, l1 + l2 - 0.3), ux = dx / dist, uy = dy / dist;
    const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return [x0 + ux * a + s * uy * h, y0 + uy * a - s * ux * h];
  }
  // shaded blob: shadow base, lit core offset toward upper-front, highlight, dark outline
  function blob(ctx, x, y, rx, ry, rot, base, shade, hi, lw) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, PI * 2);
    ctx.fillStyle = shade; ctx.fill();
    ctx.clip();
    const c = cos(rot), s = sin(rot);
    const ox = rx * 0.14, oy = -ry * 0.12;
    ctx.fillStyle = base; ctx.beginPath();
    ctx.ellipse(x + ox * c - oy * s, y + ox * s + oy * c, rx * 0.88, ry * 0.88, rot, 0, PI * 2); ctx.fill();
    if (hi) {
      const hx = rx * 0.38, hy = -ry * 0.42;
      ctx.globalAlpha = 0.75; ctx.fillStyle = hi; ctx.beginPath();
      ctx.ellipse(x + hx * c - hy * s, y + hx * s + hy * c, rx * 0.36, ry * 0.22, rot - 0.4, 0, PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.strokeStyle = DEEP; ctx.lineWidth = lw || 2;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, PI * 2); ctx.stroke();
  }
  // shaded tube between two points
  function tube(ctx, x1, y1, x2, y2, w, base, shade, hi) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if (nx * 0.45 - ny * 0.9 < 0) { nx = -nx; ny = -ny; }
    ctx.lineCap = 'round';
    ctx.strokeStyle = DEEP; ctx.lineWidth = w + 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = shade; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const o = w * 0.14;
    ctx.strokeStyle = base; ctx.lineWidth = w * 0.68; ctx.beginPath(); ctx.moveTo(x1 + nx * o, y1 + ny * o); ctx.lineTo(x2 + nx * o, y2 + ny * o); ctx.stroke();
    if (hi) {
      ctx.globalAlpha = 0.7; ctx.strokeStyle = hi; ctx.lineWidth = Math.max(1, w * 0.2);
      ctx.beginPath(); ctx.moveTo(x1 + nx * w * 0.28, y1 + ny * w * 0.28); ctx.lineTo(x2 + nx * w * 0.28, y2 + ny * w * 0.28); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  function tri(ctx, x0, y0, x1, y1, x2, y2, col, line) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill();
    if (line) { ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function claws(ctx, x, y, ang, spread, len, grip) {
    for (let i = -1; i <= 1; i++) {
      const a = ang + i * spread + (grip ? -i * 0.0 : 0);
      const bx = x + cos(a) * 2.5, by = y + sin(a) * 2.5;
      const ex = x + cos(a) * (3 + len), ey = y + sin(a) * (3 + len);
      const px = -sin(a) * 1.9, py = cos(a) * 1.9;
      ctx.fillStyle = CLAW; ctx.strokeStyle = DEEP; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx + px, by + py);
      ctx.quadraticCurveTo(ex + px * 0.3 + cos(a + 1.2) * 2.2, ey + py * 0.3 + sin(a + 1.2) * 2.2, ex, ey);
      ctx.lineTo(bx - px, by - py); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  function hand(ctx, x, y, ang, w, spread, len) {
    claws(ctx, x, y, ang, spread, len, false);
    blob(ctx, x, y, w * 0.55, w * 0.5, ang, BASE, SHD, HI, 1.6);
  }

  // leg: hip -> knee -> ankle, with clawed foot
  function leg(ctx, hx, hy, fx, fy, back, ang) {
    const base = back ? SHD : BASE, shd = back ? DEEP : SHD, hi = back ? BASE : HI;
    const [kx, ky] = ik(hx, hy, fx, fy - 3, 18, 18, 1);
    blob(ctx, hx, hy, 8.5, 8.5, 0, base, shd, hi, 1.6);
    tube(ctx, hx, hy, kx, ky, 13, base, shd, hi);
    tube(ctx, kx, ky, fx, fy - 3, 8.5, base, shd, hi);
    blob(ctx, kx, ky, 5.6, 5.6, 0, base, shd, hi, 1.6);
    // webbed clawed foot
    const fa = ang || 0;
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(fa);
    ctx.fillStyle = shd; ctx.strokeStyle = DEEP; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-6, -7); ctx.quadraticCurveTo(0, 2, 12, 0); ctx.lineTo(11, -5); ctx.quadraticCurveTo(4, -9, -2, -9); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = base; ctx.beginPath(); ctx.moveTo(-4, -7); ctx.quadraticCurveTo(2, -9, 9, -4); ctx.lineTo(4, -4); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 3; i++) tri(ctx, 9 + i * 0.5, -5 + i * 2.2, 15.5, -3.5 + i * 2.4, 9, -2.5 + i * 2.2, CLAW, DEEP);
    ctx.restore();
  }

  // arm: shoulder -> elbow -> hand
  function arm(ctx, sx, sy, hx, hy, back, bendSign, clawAng, grip) {
    const base = back ? SHD : BASE, shd = back ? DEEP : SHD, hi = back ? BASE : HI;
    const [ex, ey] = ik(sx, sy, hx, hy, 18, 19, bendSign);
    blob(ctx, sx, sy, 6.4, 6.4, 0, base, shd, hi, 1.6);
    tube(ctx, sx, sy, ex, ey, 9, base, shd, hi);
    tube(ctx, ex, ey, hx, hy, 7, base, shd, hi);
    blob(ctx, ex, ey, 4.4, 4.4, 0, base, shd, hi, 1.5);
    // forearm spur
    const ang = Math.atan2(hy - ey, hx - ex);
    tri(ctx, ex + cos(ang - 1.4) * 4, ey + sin(ang - 1.4) * 4, ex + cos(ang - 1.0) * 10, ey + sin(ang - 1.0) * 10 - 2, ex + cos(ang) * 6, ey + sin(ang) * 6, ACC, DEEP);
    hand(ctx, hx, hy, clawAng === undefined ? ang : clawAng, 9, grip ? 0.5 : 0.42, grip ? 6 : 7);
    return [ex, ey];
  }

  // one face tentacle; returns tip
  function tentacle(ctx, x0, y0, len, w0, ang, ph, t, amp, curl, hiCol, sh) {
    const n = 9, pts = [[x0, y0]];
    let x = x0, y = y0, a = ang;
    const seg = len / n;
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      a = ang + sin(t * 3.6 - k * 0.55 + ph) * amp * f + curl * f * f;
      x += cos(a) * seg; y += sin(a) * seg; pts.push([x, y]);
    }
    for (let pass = 0; pass < 3; pass++) {
      for (let k = 0; k < n; k++) {
        const f = k / n, w = w0 * (1 - f * 0.8) + 0.8;
        ctx.lineCap = 'round';
        if (pass === 0) { ctx.strokeStyle = DEEP; ctx.lineWidth = w + 2.4; }
        else if (pass === 1) { ctx.strokeStyle = sh; ctx.lineWidth = w; }
        else { ctx.strokeStyle = hiCol; ctx.lineWidth = Math.max(0.8, w * 0.42); }
        ctx.beginPath();
        if (pass === 2) ctx.moveTo(pts[k][0] + 0.5, pts[k][1] - 0.9), ctx.lineTo(pts[k + 1][0] + 0.5, pts[k + 1][1] - 0.9);
        else ctx.moveTo(pts[k][0], pts[k][1]), ctx.lineTo(pts[k + 1][0], pts[k + 1][1]);
        ctx.stroke();
      }
    }
    // suckers
    ctx.fillStyle = ACC;
    for (let k = 2; k < n; k += 2) { ctx.beginPath(); ctx.arc(pts[k][0] + 0.3, pts[k][1] + 0.4, 0.9, 0, PI * 2); ctx.fill(); }
    return pts[n];
  }

  // bat-like wing. spread 0..1, fl = flap offset
  function wing(ctx, sx, sy, spread, fl, rot, col, bone, mem2, sc) {
    const L = (a, b) => a + (b - a) * spread;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot); ctx.scale(sc, sc);
    const W = [L(-9, -22), L(-15, -34) + fl * 0.5];
    const E = [L(-5, -11), L(-7, -28) + fl * 0.2];
    const F = [
      [L(-11, -50), L(-23, -56) + fl * 1.1],
      [L(-17, -56), L(-10, -28) + fl * 0.9],
      [L(-14, -44), L(2, -4) + fl * 0.6],
    ];
    ctx.fillStyle = col; ctx.strokeStyle = DEEP; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(E[0], E[1]); ctx.lineTo(W[0], W[1]); ctx.lineTo(F[0][0], F[0][1]);
    const pts = [F[0], F[1], F[2], [L(-4, -10), L(6, 6)]];
    for (let i = 0; i < 3; i++) {
      const a = pts[i], b = pts[i + 1];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      ctx.quadraticCurveTo(mx + (W[0] - mx) * 0.32, my + (W[1] - my) * 0.32 + 1, b[0], b[1]);
    }
    ctx.lineTo(0, 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.fillStyle = mem2;
    ctx.beginPath(); ctx.moveTo(W[0], W[1]); ctx.lineTo((F[0][0] + W[0]) / 2, (F[0][1] + W[1]) / 2 + 2); ctx.lineTo((F[1][0] + W[0]) / 2, (F[1][1] + W[1]) / 2); ctx.lineTo(E[0] * 0.6, E[1] * 0.6 + 4); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    ctx.strokeStyle = DEEP; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(E[0], E[1]); ctx.lineTo(W[0], W[1]); ctx.stroke();
    ctx.strokeStyle = bone; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(E[0], E[1]); ctx.lineTo(W[0], W[1]); ctx.stroke();
    for (const f of F) {
      ctx.strokeStyle = DEEP; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W[0], W[1]); ctx.lineTo(f[0], f[1]); ctx.stroke();
      ctx.strokeStyle = bone; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(W[0], W[1]); ctx.lineTo(f[0], f[1]); ctx.stroke();
      ctx.fillStyle = CLAW; ctx.beginPath(); ctx.arc(f[0], f[1], 1.5, 0, PI * 2); ctx.fill();
    }
    ctx.fillStyle = CLAW; ctx.beginPath(); ctx.arc(W[0], W[1], 2.4, 0, PI * 2); ctx.fill();
    ctx.restore();
  }

  function eye(ctx, x, y, rx, ry, rot, blink, glow, pupilShift) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, rx * 2.6);
    g.addColorStop(0, 'rgba(255,233,74,' + (0.45 + 0.25 * glow) + ')'); g.addColorStop(1, 'rgba(255,233,74,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx * 2.6, 0, PI * 2); ctx.fill();
    const k = 1 - blink * 0.9;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = EYE; ctx.strokeStyle = DEEP; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry * k, 0, 0, PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff6a8'; ctx.beginPath(); ctx.ellipse(-rx * 0.2, -ry * 0.3 * k, rx * 0.45, ry * 0.3 * k, 0, 0, PI * 2); ctx.fill();
    if (k > 0.3) { ctx.fillStyle = '#16120a'; ctx.beginPath(); ctx.ellipse(pupilShift, 0, rx * 0.2, ry * 0.85 * k, 0, 0, PI * 2); ctx.fill(); }
    ctx.restore();
    // heavy lid
    ctx.fillStyle = SHD; ctx.strokeStyle = DEEP; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x - rx * 1.1, y - ry * 0.2 * k - 0.5);
    ctx.quadraticCurveTo(x, y - ry * (1.5 - blink * 1.2), x + rx * 1.2, y - ry * 0.3);
    ctx.lineTo(x + rx * 1.1, y - ry * 0.9 + blink * ry * 1.1); ctx.quadraticCurveTo(x, y - ry * 1.9 + blink * ry, x - rx * 1.1, y - ry * 0.9 + blink * ry * 0.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  function head(ctx, p, x, y, rot, glow, blink, roar, eatK, sway, curlIn) {
    const t = p.t;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const dome = roar ? 1.04 : 1;
    // back tentacle row (behind skull edge)
    for (let i = 0; i < 3; i++) tentacle(ctx, 5 + i * 3, 6, 16 + i * 3, 4.3, 1.7 - i * 0.3 + roar * -0.4, i * 1.9 + 0.7, t, 0.5 + roar * 0.4, -0.3 + sway, TENS, DEEP);
    // cranium
    blob(ctx, -2, -5, 19 * dome, 15.5 * dome, -0.28, BASE, SHD, HI, 2.2);
    blob(ctx, 8, 0, 11, 9.5, 0.1, BASE, SHD, null, 1.8);
    ctx.fillStyle = SHD;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-10 + i * 3.2, -14 + (i % 2) * 4 + i * 0.8, 1.5 + (i % 3) * 0.4, 0, PI * 2); ctx.fill(); }
    // brow plates and scale flecks
    ctx.strokeStyle = SHD; ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-7 + i * 2.2, -9 - (i % 2) * 2.5, 1.8, PI * 0.15, PI * 0.9); ctx.stroke(); }
    // brow ridge
    ctx.fillStyle = SHD; ctx.strokeStyle = DEEP; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(1, -4); ctx.quadraticCurveTo(10, -13, 21, -6); ctx.lineTo(21, -2); ctx.quadraticCurveTo(10, -6, 1, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
    // eyes
    eye(ctx, 15.5, -3.6, 4.6, 3.8, 0.2, blink, glow, 0.5);
    eye(ctx, 5, -5, 3.4, 3, 0.15, blink, glow, 0.5);
    // jowl mass where tentacles root
    blob(ctx, 14, 6, 9.5, 7, -0.2, TEN, TENS, HI, 1.8);
    // front tentacles
    const R = [
      [7, 9, 20, 4.6, 2.2], [10, 11, 25, 4.5, 1.95], [13.5, 12, 22, 4.3, 1.7], [17, 12, 26, 4.3, 1.45],
      [20.5, 10, 21, 4.1, 1.2], [12, 5, 13, 3.4, 1.9], [18, 5, 13, 3.2, 1.3],
    ];
    R.forEach((r, i) => {
      const ang = r[4] + roar * (-0.8 - (i % 2) * 0.4) - eatK * 0.2;
      const curl = -0.1 - (i % 3) * 0.2 - eatK * 1.5 - curlIn * 0.5 + sway * (0.6 + (i % 3) * 0.3) + roar * 0.3;
      tentacle(ctx, r[0], r[1], r[2], r[3], ang, i * 1.1, t, 0.6 + roar * 0.5, curl, HI, TEN);
    });
    ctx.restore();
  }

  d.portraitY = 0.8;

  d.draw = function (ctx, p) {
    const t = p.t;
    const mon = p.mon;
    const roar = mon && !mon.defeated && mon.specialCd > (mon.s.specialCd - 0.8) ? 1 : 0;
    const sw = p.walk ? sin(p.walkPhase) : 0, cw = p.walk ? cos(p.walkPhase) : 0;
    const breath = sin(t * 2.6);
    const bob = p.walk ? Math.abs(cw) * 3 : (p.climb ? 0 : breath * 1.9 + 1.9);
    const lean = (p.walk ? 0.05 + sw * 0.02 : 0.02) + (p.punch ? punchExt(p.punch) * 0.1 : 0) + (p.eat ? 0.04 : 0) + (roar ? -0.12 : 0) + (p.glide ? 0.1 : 0);
    const blink = ((t * 0.9) % 2.4) < 0.16 ? 1 : 0;
    const glow = 0.5 + 0.5 * sin(t * 3.2);
    const sway = (p.walk ? -sw * 0.25 : 0) + (p.air && !p.glide ? -0.5 : 0) + sin(t * 1.9) * 0.1;
    const air = p.air || p.glide;
    const idleTwitch = Math.pow(Math.max(0, sin(t * 1.5)), 10);

    ctx.save(); ctx.translate(0, -bob);

    // wings
    let spread, flap = 0;
    if (p.glide) { spread = 1; flap = sin(t * 5) * 3; }
    else if (p.air) { spread = 0.6 + 0.4 * sin(t * 14); flap = cos(t * 14) * 10; }
    else if (p.climb) { spread = 0.1 + 0.05 * sin(t * 3); }
    else { spread = 0.06 + idleTwitch * 0.32 + 0.04 * breath; flap = idleTwitch * 4; }
    if (roar) { spread = 0.9; flap = sin(t * 30) * 3; }
    const wsx = -7, wsy = -64;
    wing(ctx, wsx - 2, wsy - 3, Math.min(1, spread * 0.95), flap * 0.8, -0.45 + (air ? 0.15 : 0), MEM, SHD, MEM2, 0.92);
    wing(ctx, wsx, wsy, spread, flap, 0.15 - spread * 0.35, MEM, BASE, MEM2, 1);

    // limb targets
    let f1, f2;
    if (p.climb) {
      const c = sin(p.climbPhase);
      f1 = [12, -8 - c * 6]; f2 = [10, -8 + c * 6];
    } else if (air) {
      const k = p.glide ? 4 : 0;
      f1 = [-12 - k, -9 + (p.glide ? -6 : 0)]; f2 = [8 - k, -13 + (p.glide ? -4 : 0)];
    } else if (p.walk) {
      f1 = [4 + sw * 11, -Math.max(0, -cw) * 8]; f2 = [4 - sw * 11, -Math.max(0, cw) * 8];
    } else { f1 = [-4, 0]; f2 = [10, 0]; }
    const hipB = [-5, -33], hipF = [5, -33];
    leg(ctx, hipB[0], hipB[1], f1[0], f1[1], true, 0);

    // back arm
    let ba;
    const bShoulder = [-5, -63];
    if (p.climb) { const c = sin(p.climbPhase); ba = [13, -92 - c * 10]; }
    else if (p.glide) ba = [-26, -56];
    else if (p.air) ba = [-14, -80 + sin(t * 14) * 4];
    else if (p.walk) ba = [-8 - sw * 11, -28 + Math.abs(sw) * 4];
    else ba = [-8 + sin(t * 2.2) * 2, -26 + breath * 1.2];
    arm(ctx, bShoulder[0], bShoulder[1], ba[0], ba[1], true, p.climb ? -1 : 1, p.climb ? -0.4 : undefined, p.climb);

    // torso (hunched)
    ctx.save(); ctx.translate(0, -34); ctx.rotate(lean); ctx.translate(0, 34);
    // dorsal ridge
    for (let i = 0; i < 6; i++) {
      const by = -70 + i * 6.5, bx = -13.5 + Math.abs(i - 1.5) * 1.1 + (i > 3 ? (i - 3) * 1.2 : 0);
      tri(ctx, bx + 2, by - 3, bx - 5.5 - (i % 2) * 1.5, by + 0.5, bx + 2, by + 3.5, ACC, DEEP);
    }
    // chest and trunk
    ctx.save(); ctx.translate(0, -(breath * 0.4));
    blob(ctx, -1, -52, 15.5, 19.5 + breath * 0.8, 0.14, BASE, SHD, HI, 2.4);
    // pot belly
    const bs = 1 + breath * 0.025;
    ctx.save(); ctx.translate(6, -40); ctx.scale(bs, bs + (p.eat ? 0.08 * sin(t * 30) : 0));
    blob(ctx, 0, 0, 12.5, 12.5, 0.1, BASE, SHD, HI, 2.4);
    // lighter belly plates
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 12, 12, 0.1, 0, PI * 2); ctx.clip();
    ctx.fillStyle = BELS; ctx.beginPath(); ctx.ellipse(2.8, 1.2, 8.8, 10.4, 0, 0, PI * 2); ctx.fill();
    ctx.fillStyle = BEL; ctx.beginPath(); ctx.ellipse(3.4, 0.3, 7.6, 9.4, 0, 0, PI * 2); ctx.fill();
    ctx.strokeStyle = BELS; ctx.lineWidth = 1.3;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(3.4, i * 3.1 - 1.5, 7.2, 0.25, PI - 0.25); ctx.stroke(); }
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#e5f5c0'; ctx.beginPath(); ctx.ellipse(6.5, -5, 2.2, 3.8, 0.3, 0, PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
    ctx.restore();
    // shoulder and back scale marks
    ctx.strokeStyle = SHD; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-9 + (i % 3) * 5, -64 + Math.floor(i / 3) * 6, 2.2, 0.2, PI - 0.2); ctx.stroke(); }
    // ragged loin wrap
    ctx.fillStyle = '#4b3a2a'; ctx.strokeStyle = DEEP; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-10, -30); ctx.quadraticCurveTo(3, -26, 16, -30); ctx.lineTo(15 + sin(t * 3) * 0.8, -24); ctx.lineTo(11, -26.5); ctx.lineTo(8, -20 + sin(t * 3.4) * 1.2); ctx.lineTo(3, -25.5); ctx.lineTo(-1, -21 + sin(t * 3.1 + 1) * 1.2); ctx.lineTo(-5, -26); ctx.lineTo(-10, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    // front leg
    ctx.restore();
    leg(ctx, hipF[0], hipF[1], f2[0], f2[1], false, 0);
    ctx.save(); ctx.translate(0, -34); ctx.rotate(lean); ctx.translate(0, 34);

    // head position follows the hunch
    const headBob = sin(t * 2.6 - 0.8) * 1.2;
    const eatK = p.eat ? Math.min(1, p.eat) : 0;
    const roarK = roar;
    head(ctx, p, 8 + (p.punch ? punchExt(p.punch) * 3 : 0) + roarK * -2, -81 + headBob - (p.climb ? 2 : 0), (p.walk ? sw * 0.03 : sin(t * 1.4) * 0.03) + (p.punch ? punchExt(p.punch) * 0.12 : 0) - roarK * 0.3 + (p.glide ? 0.1 : 0),
      glow, blink, roarK, eatK, sway, eatK * 1.0 + (p.climb ? 0.3 : 0));
    ctx.restore();

    // front arm
    let rest;
    const fSh = [6, -63];
    if (p.climb) { const c = sin(p.climbPhase); rest = [17, -94 + c * 10]; }
    else if (p.glide) rest = [26, -66];
    else if (p.air) rest = [18, -84 + cos(t * 14) * 4];
    else if (roar) rest = [22, -98 + sin(t * 24) * 2];
    else if (p.eat) rest = [26, -66 + sin(t * 20) * 1.5];
    else if (p.walk) rest = [14 + sw * 11, -30 + Math.abs(sw) * 3];
    else rest = [15 + sin(t * 2.2 + 1) * 2, -29 + breath * 1.4];
    const [hx, hy] = handTarget(p, rest[0], rest[1]);
    arm(ctx, fSh[0], fSh[1], hx, hy, false, p.punch > 0 || p.climb ? -1 : 1, p.climb ? -0.5 : undefined, p.climb);
    ctx.restore();
  };

  d.drawRevert = function (ctx, t) {  // a very small, very embarrassed octopus
    const hop = -Math.abs(sin(t * 12)) * 7;
    ctx.save(); ctx.translate(0, hop);
    for (let i = 0; i < 6; i++) {
      const x0 = -6 + i * 2.4, sw = sin(t * 18 + i * 1.1) * 2.2;
      ctx.strokeStyle = DEEP; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, -7); ctx.quadraticCurveTo(x0 + sw, -3, x0 * 1.7 + sw, 0); ctx.stroke();
      ctx.strokeStyle = TEN; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, -7); ctx.quadraticCurveTo(x0 + sw, -3, x0 * 1.7 + sw, 0); ctx.stroke();
    }
    blob(ctx, 0, -14, 7.5, 8.5, 0, BASE, SHD, HI, 1.6);
    ell(ctx, 3, -14, 2.4, 2.4, '#fff'); ell(ctx, 3.6, -14, 1.1, 1.3, '#000');
    ell(ctx, -3, -15, 1.8, 1.8, '#fff'); ell(ctx, -2.6, -15, 0.8, 1, '#000');
    ctx.strokeStyle = DEEP; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1, -19); ctx.lineTo(2, -18.2); ctx.stroke();
    ctx.fillStyle = '#9ad7ff'; ctx.beginPath(); ctx.arc(-8, -24, 1.6, 0, PI * 2); ctx.fill();
    ctx.restore();
  };
})();
