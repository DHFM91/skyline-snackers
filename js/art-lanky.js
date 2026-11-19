'use strict';
/* LANKY HANK: redrawn art. Replaces draw/drawRevert on the existing definition. */
(function () {
  const d = MONSTERS.find(m => m.id === 'lanky');
  if (!d) return;

  const INK = '#2e2418';
  const S1 = '#c9b182', S2 = '#a58c5c', S3 = '#85703f', S4 = '#e0cf9f';          // khaki: base / shadow / deep / highlight
  const K1 = '#f1ece1', K2 = '#d7cfbd', K3 = '#b3a995', K4 = '#fffdf6';            // pale skin & shirt: base / shadow / deep / highlight
  const T1 = '#c8392b', T2 = '#8f2218', T3 = '#e5604f';                            // tie
  const B1 = '#6e4528', B2 = '#472a15', B3 = '#9a6a42';                            // shoes
  const SK = '#5d5546';                                                            // skin outline

  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sstep = v => { v = cl(v, 0, 1); return v * v * (3 - 2 * v); };

  // two-bone IK with a rubbery stretch so a reaching arm always arrives. s picks the bend side.
  function ik(x0, y0, x1, y1, l1, l2, s) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 0.001;
    const k = Math.max(1, d / (l1 + l2 - 0.3));
    const a1 = l1 * k, a2 = l2 * k;
    const dd = Math.min(d, a1 + a2 - 0.2);
    const ux = dx / d, uy = dy / d;
    const a = (a1 * a1 - a2 * a2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, a1 * a1 - a * a));
    return [x0 + ux * a + s * uy * h, y0 + uy * a - s * ux * h];
  }

  function path2(ctx, a, b, c) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); }
  function stroke(ctx, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }

  // a jointed tube: outline, shadow body, lit body, thin highlight
  function tube(ctx, a, b, c, w1, w2, base, shade, hi, ink) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let pass = 0; pass < 4; pass++) {
      const col = pass === 0 ? ink : pass === 1 ? shade : pass === 2 ? base : hi;
      const ox = pass === 2 ? -0.7 : pass === 3 ? -1.5 : 0, oy = pass === 2 ? -0.2 : 0;
      const wf = pass === 0 ? 2.4 : pass === 1 ? 0 : pass === 2 ? -1.5 : -w1 * 0.72;
      ctx.beginPath(); ctx.moveTo(a[0] + ox, a[1] + oy); ctx.lineTo(b[0] + ox, b[1] + oy);
      stroke(ctx, col, Math.max(0.8, w1 + wf));
      ctx.beginPath(); ctx.moveTo(b[0] + ox, b[1] + oy); ctx.lineTo(c[0] + ox, c[1] + oy);
      stroke(ctx, col, Math.max(0.8, w2 + wf * (w2 / w1)));
    }
  }

  function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  // little wrinkle arcs across a joint
  function creases(ctx, a, b, c, w, n, col) {
    const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
    let bx = v1[0] / l1 + v2[0] / l2, by = v1[1] / l1 + v2[1] / l2; const bl = Math.hypot(bx, by);
    if (bl < 0.2) { bx = -(c[1] - a[1]); by = (c[0] - a[0]); const q = Math.hypot(bx, by) || 1; bx /= q; by /= q; } else { bx /= bl; by /= bl; }
    const px = -by, py = bx;
    ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const k = 1.2 + i * 1.8, cx = b[0] + bx * k, cy = b[1] + by * k;
      ctx.beginPath(); ctx.moveTo(cx + px * w * 0.35, cy + py * w * 0.35); ctx.lineTo(cx - px * w * 0.35, cy - py * w * 0.35); ctx.stroke();
    }
  }

  function shoe(ctx, x, y, ang, far) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const body = far ? B2 : B1;
    ctx.beginPath();
    ctx.moveTo(-5.2, -7.2); ctx.lineTo(0.5, -7.6); ctx.quadraticCurveTo(4, -6, 6, -3.4);
    ctx.quadraticCurveTo(10, -1.6, 15.5, 0.4); ctx.lineTo(15.2, 2); ctx.lineTo(-5.8, 2); ctx.quadraticCurveTo(-7, -2, -5.2, -7.2);
    ctx.closePath();
    ctx.fillStyle = body; ctx.fill(); stroke(ctx, INK, 1.3);
    // lit top, dark sole, heel
    ctx.fillStyle = far ? B1 : B3; ctx.beginPath(); ctx.moveTo(-3.6, -6.6); ctx.lineTo(0.5, -6.9); ctx.quadraticCurveTo(4, -5.4, 6.2, -3); ctx.quadraticCurveTo(3, -4, -3.6, -4.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = INK; ctx.fillRect(-5.8, 0.2, 21, 1.8);
    ctx.fillStyle = B2; ctx.fillRect(-5.8, -0.9, 5, 1.2);
    ctx.restore();
  }

  function finger(ctx, bx, by, a, l1, l2, bend, w, col) {
    const mx = bx + Math.cos(a) * l1, my = by + Math.sin(a) * l1;
    const a2 = a + bend, ex = mx + Math.cos(a2) * l2, ey = my + Math.sin(a2) * l2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); stroke(ctx, col, w);
  }

  // cartoon hand: palm path plus a fixed fan of finger capsules, rotated as one unit.
  // ang: direction the forearm points. spread 0..1, curl 0..1.2 (toward the little-finger side), wave: finger drumming
  function hand(ctx, x, y, ang, spread, curl, wave, t, far) {
    const skin = far ? '#d9c3a8' : '#f2e2cd', sh = far ? '#b79b7c' : '#d3b894';
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
    // fingers point toward -y, thumb on the -x side
    const FX = [-3.3, -1.1, 1.1, 3.2], FY = [-3.4, -3.9, -3.7, -3.1], FL = [7.4, 8.8, 8.2, 6.4];
    const fan = [-0.2, -0.06, 0.08, 0.24];
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const w = wave > 0 ? Math.max(0, Math.sin(t * 6.4 - i * 1.0)) * wave : 0;
      const a0 = -Math.PI / 2 + fan[i] * (0.35 + spread * 1.9);
      const c = curl * (0.8 + i * 0.07) + 0.18 + w * 1.0;
      const l1 = FL[i] * 0.5, l2 = FL[i] * 0.3, l3 = FL[i] * 0.2;
      const x1 = FX[i] + Math.cos(a0) * l1, y1 = FY[i] + Math.sin(a0) * l1;
      const a1 = a0 + c * 0.9, x2 = x1 + Math.cos(a1) * l2, y2 = y1 + Math.sin(a1) * l2;
      const a2 = a1 + c * 0.9, x3 = x2 + Math.cos(a2) * (l3 + 1.2), y3 = y2 + Math.sin(a2) * (l3 + 1.2);
      fingers.push([[FX[i], FY[i]], [x1, y1], [x2, y2], [x3, y3]]);
    }
    const ta = -Math.PI / 2 - (0.75 + spread * 0.55) + curl * 0.25;
    const tb = ta + 0.35 + curl * 0.5;
    const th0 = [-3.6, 1.2], th1 = [th0[0] + Math.cos(ta) * 4, th0[1] + Math.sin(ta) * 4];
    const th2 = [th1[0] + Math.cos(tb) * 3.4, th1[1] + Math.sin(tb) * 3.4];
    const palm = () => {
      ctx.beginPath(); ctx.moveTo(-4.4, -3.2);
      ctx.quadraticCurveTo(0, -5.4, 4.2, -3.2);
      ctx.quadraticCurveTo(5.6, 0.5, 3.4, 4.6);
      ctx.quadraticCurveTo(0, 6.2, -3.4, 4.6);
      ctx.quadraticCurveTo(-5.4, 1.2, -4.4, -3.2); ctx.closePath();
    };
    const cap = (pts, w, col) => {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      stroke(ctx, col, w);
    };
    // outlines first so the hand reads as one shape
    for (const f of fingers) cap(f, 4.2, INK);
    cap([th0, th1, th2], 4.8, INK);
    palm(); stroke(ctx, INK, 2.2);
    // fills
    for (const f of fingers) cap(f, 2.8, skin);
    cap([th0, th1, th2], 3.4, skin);
    palm(); ctx.fillStyle = skin; ctx.fill();
    // shadow side of fingers and palm, thumb pad
    for (const f of fingers) { cap([[f[1][0] + 0.6, f[1][1]], [f[2][0] + 0.6, f[2][1]]], 0.7, sh); }
    ctx.save(); palm(); ctx.clip();
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(3.4, 3, 3.4, 4.4, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6e8'; ctx.beginPath(); ctx.ellipse(-1.6, -1.2, 1.5, 2.2, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = sh; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2.6, 1.6); ctx.quadraticCurveTo(0, 2.8, 3, 1.2); ctx.stroke();
    // knuckles
    ctx.fillStyle = sh;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(FX[i], FY[i] + 0.9, 0.55, 0, Math.PI * 2); ctx.fill(); }
    palm(); stroke(ctx, INK, 0.0001);
    ctx.restore();
  }

  // sleeve + cuff + hand for one arm
  function arm(ctx, sh, el, wr, far, p, spread, curl, wave) {
    const base = far ? S2 : S1, sh2 = far ? S3 : S2, hi = far ? S1 : S4;
    const ang = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
    hand(ctx, wr[0] + Math.cos(ang) * 5.2, wr[1] + Math.sin(ang) * 5.2, ang, spread, curl, wave, p.t, far);
    tube(ctx, sh, el, wr, 5.8, 4.8, base, sh2, hi, INK);
    // white shirt cuff
    const cx = wr[0] - Math.cos(ang) * 2, cy = wr[1] - Math.sin(ang) * 2, c0x = wr[0] - Math.cos(ang) * 0.2, c0y = wr[1] - Math.sin(ang) * 0.2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(c0x + Math.cos(ang) * 2.6, c0y + Math.sin(ang) * 2.6);
    stroke(ctx, INK, 5.6); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(c0x + Math.cos(ang) * 2.6, c0y + Math.sin(ang) * 2.6); stroke(ctx, far ? K2 : K1, 3.4);
    creases(ctx, sh, el, wr, 4.8, 2, sh2);
  }

  // the long tie: a chain of points that flutters
  function tie(ctx, p, kx, ky, air, move, lean) {
    const t = p.t, N = 9, len = 40;
    const pts = [];
    const amp = 1.4 + move * 3.6 + (air ? 3 : 0);
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      let x = kx + Math.sin(t * 3.4 - u * 3.2) * amp * u * u * 1.8 - move * 5 * u * u;
      let y = ky + u * len * (1 - (air ? 0.2 : 0) * u);
      if (air) { x -= 3 * u; y = ky + u * len * 0.55 - Math.sin(u * 2.4) * 2 + Math.sin(t * 9 - u * 4) * 2.5 * u; }
      pts.push([x, y]);
    }
    const wid = u => (u < 0.08 ? 3.3 : 2.2 + u * 3.4);
    const edge = side => pts.map((q, i) => {
      const nx = i < N ? pts[i + 1][0] - q[0] : q[0] - pts[i - 1][0], ny = i < N ? pts[i + 1][1] - q[1] : q[1] - pts[i - 1][1];
      const l = Math.hypot(nx, ny) || 1, u = i / N, w = wid(u) * side * (i === N ? 0.5 : 1);
      return [q[0] - ny / l * w, q[1] + nx / l * w];
    });
    const E1 = edge(1), E2 = edge(-1);
    const tip = pts[N];
    const tipDir = [pts[N][0] - pts[N - 1][0], pts[N][1] - pts[N - 1][1]]; const tl = Math.hypot(tipDir[0], tipDir[1]) || 1;
    const poly = () => {
      ctx.beginPath(); ctx.moveTo(E1[0][0], E1[0][1]);
      for (let i = 1; i <= N; i++) ctx.lineTo(E1[i][0], E1[i][1]);
      ctx.lineTo(tip[0] + tipDir[0] / tl * 3.2, tip[1] + tipDir[1] / tl * 3.2);
      for (let i = N; i >= 0; i--) ctx.lineTo(E2[i][0], E2[i][1]);
      ctx.closePath();
    };
    poly(); ctx.fillStyle = T1; ctx.fill();
    ctx.save(); poly(); ctx.clip();
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= N; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    stroke(ctx, T2, 2.2); // shaded centre fold
    ctx.beginPath(); ctx.moveTo(E1[1][0] + 0.8, E1[1][1]); for (let i = 2; i <= N; i++) ctx.lineTo(E1[i][0] + 0.8, E1[i][1]);
    stroke(ctx, T3, 1);
    // diagonal stripes
    ctx.strokeStyle = 'rgba(255,230,200,0.32)'; ctx.lineWidth = 1.2;
    for (let i = 3; i < N; i += 2) { ctx.beginPath(); ctx.moveTo(E2[i][0] - 1, E2[i][1] + 2); ctx.lineTo(E1[i][0] + 1, E1[i][1] - 2); ctx.stroke(); }
    ctx.restore();
    poly(); stroke(ctx, INK, 1.1);
    // knot
    ctx.beginPath(); ctx.moveTo(kx - 2.8, ky - 2.2); ctx.lineTo(kx + 2.8, ky - 2.2); ctx.lineTo(kx + 3.4, ky + 3.2); ctx.lineTo(kx, ky + 4.6); ctx.lineTo(kx - 3.4, ky + 3.2); ctx.closePath();
    ctx.fillStyle = T1; ctx.fill(); stroke(ctx, INK, 1.1);
    ctx.fillStyle = T3; ctx.beginPath(); ctx.moveTo(kx - 2.4, ky - 1.6); ctx.lineTo(kx - 0.4, ky - 1.6); ctx.lineTo(kx - 0.8, ky + 3); ctx.lineTo(kx - 2.6, ky + 2.4); ctx.fill();
  }

  // blank egg head with a yellow sticky note and a marker smiley on it
  function head(ctx, p, x, y, rot, mood, mouthOpen, flutter) {
    const t = p.t;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(0.92, 0.92);
    const egg = () => {
      ctx.beginPath(); ctx.moveTo(0, -12.8);
      ctx.bezierCurveTo(7.6, -12.8, 10.2, -4, 9.2, 2.2);
      ctx.bezierCurveTo(8.2, 9, 4.6, 12.4, 0, 12.4);
      ctx.bezierCurveTo(-4.6, 12.4, -8.4, 9, -9.4, 2.2);
      ctx.bezierCurveTo(-10.4, -4, -7.6, -12.8, 0, -12.8); ctx.closePath();
    };
    egg(); ctx.fillStyle = K2; ctx.fill();
    ctx.save(); egg(); ctx.clip();
    ctx.fillStyle = K1; ctx.beginPath(); ctx.ellipse(1.6, -1.2, 9.6, 12.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = K4; ctx.beginPath(); ctx.ellipse(-0.6, -7.2, 3.6, 4.6, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = K3; ctx.beginPath(); ctx.ellipse(-10.4, 3, 3.4, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    egg(); stroke(ctx, SK, 1.3);

    // the note
    const N = 5.8, fl = flutter * Math.sin(t * 7.5) + Math.sin(t * 1.7) * 0.25;
    ctx.save(); ctx.translate(3.2, 1.6); ctx.rotate(-0.1 + Math.sin(t * 1.3) * 0.025);
    const cx = N - 1.9 + fl * 0.8, cy = N - 1.9 + Math.abs(fl) * 0.6;   // curled corner tip
    const notePath = () => {
      ctx.beginPath(); ctx.moveTo(-N, -N); ctx.lineTo(N, -N); ctx.lineTo(N + fl * 0.3, N - 2.6); ctx.lineTo(N - 2.4, N + fl * 0.5);
      ctx.lineTo(-N, N + 0.4); ctx.closePath();
    };
    ctx.save(); ctx.translate(0.9, 1.3); notePath(); ctx.fillStyle = 'rgba(40,30,20,0.28)'; ctx.fill(); ctx.restore();
    notePath(); ctx.fillStyle = '#ffe56a'; ctx.fill();
    ctx.save(); notePath(); ctx.clip();
    ctx.fillStyle = '#f5cd3c'; ctx.fillRect(-N, -N, 2 * N, 2.1);
    ctx.fillStyle = 'rgba(255,255,230,0.55)'; ctx.fillRect(-N, -N + 2.1, 1.3, 2 * N);
    ctx.fillStyle = 'rgba(214,160,30,0.35)'; ctx.fillRect(-N, N - 2.6, 2 * N, 3);
    ctx.restore();
    notePath(); stroke(ctx, '#a07a1c', 0.8);
    // lifted corner
    ctx.beginPath(); ctx.moveTo(N + fl * 0.3, N - 2.6); ctx.lineTo(N - 2.4, N + fl * 0.5); ctx.lineTo(N - 2.6 + fl * 0.3, N - 2.6 - fl * 0.2 + 0.9);
    ctx.closePath(); ctx.fillStyle = '#d9ae2c'; ctx.fill(); stroke(ctx, '#a07a1c', 0.6);

    // marker smiley
    const blink = Math.sin(t * 1.35 + 0.6) > 0.94, wink = Math.sin(t * 0.55 + 2) > 0.985;
    const lookX = Math.sin(t * 0.8) * 0.5;
    const MK = '#1c1710';
    ctx.strokeStyle = MK; ctx.fillStyle = MK; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.25;
    const eye = (ex, ey, closed, sg) => {
      if (mood === 2) { ctx.beginPath(); ctx.moveTo(ex - 1.3, ey - 1.3); ctx.lineTo(ex + 1.3, ey + 1.3); ctx.moveTo(ex + 1.3, ey - 1.3); ctx.lineTo(ex - 1.3, ey + 1.3); ctx.stroke(); return; }
      if (mood === 1) { ctx.beginPath(); ctx.moveTo(ex - 1.3 * sg, ey - 1.4); ctx.lineTo(ex + 1.2 * sg, ey); ctx.lineTo(ex - 1.3 * sg, ey + 1.4); ctx.stroke(); return; }
      if (closed) { ctx.beginPath(); ctx.moveTo(ex - 1.5, ey + 0.2); ctx.quadraticCurveTo(ex, ey + 1.3, ex + 1.5, ey + 0.2); ctx.stroke(); return; }
      ctx.beginPath(); ctx.ellipse(ex + lookX * 0.3, ey, 0.85, 1.45, 0, 0, Math.PI * 2); ctx.fill();
    };
    eye(-2.1, -1.7, blink, 1); eye(2.3, -1.7, blink || wink, -1);
    if (mouthOpen > 0.05) {
      const o = 0.9 + mouthOpen * 1.9;
      ctx.beginPath(); ctx.ellipse(0.1, 2.3, 2.3, o, 0, 0, Math.PI * 2); ctx.fillStyle = '#4a1a1a'; ctx.fill(); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0.1, 2.3 + o * 0.5, 1.4, o * 0.4, 0, 0, Math.PI * 2); ctx.fillStyle = '#d96b72'; ctx.fill();
    } else if (mood === 1) {
      ctx.beginPath(); ctx.moveTo(-2.8, 3); ctx.quadraticCurveTo(-1.4, 1.4, 0, 2.8); ctx.quadraticCurveTo(1.4, 4.2, 2.8, 2.6); ctx.stroke();
    } else {
      const sm = 1 + Math.sin(t * 1.9) * 0.1;
      ctx.beginPath(); ctx.moveTo(-3.2, 1.2); ctx.quadraticCurveTo(0, 1.2 + 4.6 * sm, 3.4, 1); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  function figure(ctx, p, ghost) {
    const t = p.t, mon = p.mon;
    const walk = !!p.walk, climb = !!p.climb, air = !!p.air && !climb, dash = !!p.dash;
    const mood = mon && mon.defeated ? 2 : mon && mon.hurtT > 0 ? 1 : 0;
    const pe = p.punch > 0 && p.hand ? punchExt(p.punch) : 0;
    const eat = p.eat > 0 ? Math.min(1, p.eat) : 0;
    const ph = p.walkPhase || 0, sn = Math.sin(ph), cs = Math.cos(ph);
    const cp = p.climbPhase || 0;

    // ---- body placement ----
    let swayX = Math.sin(t * 1.5) * 2.4, bob = Math.sin(t * 2.1) * 1.1, lean = Math.sin(t * 1.5) * 0.045 - 0.01;
    if (walk) { bob = Math.abs(cs) * 5 - 2.5; swayX = sn * 1.2 + 1.5; lean = 0.1 + cs * 0.025; }
    if (climb) { bob = Math.sin(cp) * 1.5; swayX = 3 + Math.sin(cp) * 1.2; lean = 0.14 + Math.sin(cp) * 0.03; }
    if (air) { bob = 0; swayX = -1; lean = -0.1 + Math.sin(t * 7) * 0.04; }
    if (dash) { swayX = 4; lean = 0.38; bob = 0; }
    lean += pe * 0.14; swayX += pe * 3;
    if (eat) lean += 0.02;
    const px = swayX, py = -64 - bob + (walk ? 0 : 0);
    const ca = Math.cos(lean), sa = Math.sin(lean);
    const W = (x, y) => [px + x * ca - y * sa, py + x * sa + y * ca];

    // ---- feet and legs ----
    let nf, ff, nang = 0, fang = 0;
    const HIPN = [px + 3.2, py + 3], HIPF = [px - 3.2, py + 3];
    if (climb) {
      const a = Math.sin(cp), b = -a;
      nf = [10, -28 + a * 11]; ff = [9, -26 + b * 11]; nang = -1.25; fang = -1.25;
    } else if (air) {
      nf = [10 + Math.sin(t * 6) * 2, -29]; ff = [-13, -14 + Math.sin(t * 6 + 1) * 3]; nang = 0.5; fang = 0.9;
    } else if (dash) {
      nf = [26, -22]; ff = [-22, -8]; nang = 0.6; fang = 0.7;
    } else if (walk) {
      const S = 20;
      const sw = (u) => [Math.sin(u) * S, -Math.max(0, Math.cos(u)) * 15 - 3];
      nf = sw(ph); ff = sw(ph + Math.PI);
      nang = -Math.max(0, Math.cos(ph)) * 0.35 + Math.max(0, -Math.cos(ph)) * 0.05;
      fang = -Math.max(0, -Math.cos(ph)) * 0.35 + Math.max(0, Math.cos(ph)) * 0.05;
      nf[0] += 2; ff[0] += 2;
    } else {
      const k = Math.sin(t * 1.5) * 0.8;
      nf = [10, -3 + Math.max(0, Math.sin(t * 1.1 + 2)) * 1.2]; ff = [-8 + k, -3]; nang = 0; fang = 0;
      // stance foot tap
      nang = -Math.max(0, Math.sin(t * 2.2)) * 0.12;
    }
    const kneeSide = climb ? 1 : 1;
    const kn = ik(HIPN[0], HIPN[1], nf[0], nf[1] - 3.5, 27.5, 27.5, kneeSide);
    const kf = ik(HIPF[0], HIPF[1], ff[0], ff[1] - 3.5, 27.5, 27.5, kneeSide);

    // ---- coat tails (behind everything) ----
    const flap = Math.sin(t * 2.4) * 2 + (walk ? sn * 4 + 4 : 0) + (air ? 6 : 0) + (dash ? 10 : 0) + (climb ? 3 : 0);
    const lift = air ? -10 : 0;
    // far arm
    const farSh = W(-5.5, -34.2), nearSh = W(6.5, -34.2);
    let faH, naH, spreadN = 0.1, curlN = 0.35, spreadF = 0.1, curlF = 0.35, waveN = 0, waveF = 0;
    if (climb) {
      faH = [14, -145 - Math.sin(cp) * 8]; naH = [15, -145 + Math.sin(cp) * 8]; spreadN = 0.05; spreadF = 0.05; curlN = 1.05; curlF = 1.05;
      faH = [7, -153 + Math.sin(cp) * 8]; naH = [19, -153 - Math.sin(cp) * 8];
    } else if (air) {
      faH = [-9 + Math.sin(t * 8) * 3, -120 + Math.sin(t * 8) * 5]; naH = [15 + Math.sin(t * 8 + 1) * 3, -126 + Math.sin(t * 8 + 1) * 5];
      spreadN = 1; spreadF = 1; curlN = 0.1; curlF = 0.1;
    } else if (dash) {
      faH = [-24, -92]; naH = [-14, -110]; spreadN = 0.2; spreadF = 0.2;
    } else if (walk) {
      const sa2 = Math.sin(ph + Math.PI), sb2 = Math.sin(ph);
      faH = [px + sa2 * 15 - 1, -45 - Math.max(0, Math.cos(ph + Math.PI)) * 6];
      naH = [px + sb2 * 15 + 3, -44 - Math.max(0, Math.cos(ph)) * 6];
      waveN = 0.35; waveF = 0.35;
    } else {
      faH = [px - 8 + Math.sin(t * 1.5 + 1) * 3, -43 + Math.sin(t * 1.8) * 2.5];
      naH = [px + 12 + Math.sin(t * 1.5) * 3, -43 + Math.sin(t * 1.8 + 1.7) * 2.5];
      waveN = 1; waveF = 0.55;
    }
    if (pe > 0) {
      const hx = lerp(naH[0], p.hand.x, pe), hy = lerp(naH[1], p.hand.y, pe);
      naH = [hx, hy]; spreadN = 0.2 + pe * 1.1; curlN = 0.35 - pe * 0.45; waveN = 0;
      faH = [lerp(faH[0], -12, pe), lerp(faH[1], -76, pe)];
    }
    let head0 = W(1.5, -54);
    if (eat) {
      const chew = Math.sin(t * 28) * 1.2;
      naH = [head0[0] + 15 + chew * 0.4, head0[1] + 16 + chew];
      curlN = 0.6; spreadN = 0.1; waveN = 0;
    }
    const sideF = -1, sideN = -1;
    const farEl = ik(farSh[0], farSh[1], faH[0], faH[1], 29.5, 30, climb || air ? 1 : sideF);
    const nearEl = ik(nearSh[0], nearSh[1], naH[0], naH[1], 29.5, 30, climb ? 1 : (eat ? -1 : (pe > 0.2 ? 1 : sideN)));

    // draw far arm
    arm(ctx, farSh, farEl, faH, true, p, spreadF, curlF, waveF);

    // coat tails
    ctx.save(); ctx.translate(px, py);
    ctx.rotate(lean);
    const tl = (air ? 20 : 25) + flap * 0.2;
    ctx.beginPath(); ctx.moveTo(-6.5, -14);
    ctx.lineTo(-9, 8);
    ctx.quadraticCurveTo(-13 - flap * 0.8, 15 + lift * 0.3, -14 - flap * 1.5, tl + lift);
    ctx.lineTo(-9 - flap * 0.8, tl + 2 + lift * 1.1);
    ctx.quadraticCurveTo(-5 - flap * 0.3, 14 + lift * 0.4, -1, 10);
    ctx.lineTo(0, -14); ctx.closePath();
    ctx.fillStyle = S3; ctx.fill(); stroke(ctx, INK, 1.2);
    ctx.beginPath(); ctx.moveTo(-8.5, 8); ctx.quadraticCurveTo(-11 - flap, 14 + lift * 0.3, -11 - flap * 1.3, tl - 6 + lift); stroke(ctx, S2, 1);
    ctx.restore();

    // far leg then near leg
    const leg = (hip, k, f, ang, far) => {
      const base = far ? S2 : S1, sh = far ? S3 : S2, hi = far ? S1 : S4;
      const ankle = [f[0], f[1] - 3.5];
      shoe(ctx, f[0], f[1], ang, far);
      tube(ctx, hip, k, ankle, 8, 6.2, base, sh, hi, INK);
      // trouser break and cuff
      const ax = ankle[0] - k[0], ay = ankle[1] - k[1], al = Math.hypot(ax, ay) || 1;
      ctx.beginPath(); ctx.moveTo(ankle[0] - ax / al * 4.5, ankle[1] - ay / al * 4.5); ctx.lineTo(ankle[0] + ax / al * 0.5, ankle[1] + ay / al * 0.5);
      stroke(ctx, INK, 7.8); ctx.beginPath(); ctx.moveTo(ankle[0] - ax / al * 4, ankle[1] - ay / al * 4); ctx.lineTo(ankle[0] + ax / al * 0.2, ankle[1] + ay / al * 0.2); stroke(ctx, sh, 5.2);
      // knee
      creases(ctx, hip, k, ankle, 6, 2, sh);
      // front crease line
      ctx.strokeStyle = sh; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hip[0] + 1, hip[1] + 5); ctx.lineTo(k[0] + 0.5, k[1] - 4); ctx.stroke();
    };
    leg(HIPF, kf, ff, fang, true);
    leg(HIPN, kn, nf, nang, false);

    // ---- torso ----
    ctx.save(); ctx.translate(px, py); ctx.rotate(lean); ctx.scale(1, 0.88);
    const breath = Math.sin(t * 2) * 0.45;
    const jacket = () => {
      ctx.beginPath(); ctx.moveTo(-6, -41 - breath);
      ctx.quadraticCurveTo(0, -43 - breath, 7, -41 - breath);
      ctx.quadraticCurveTo(10.4, -40 - breath, 9.8, -34); ctx.lineTo(8.2, -14);
      ctx.lineTo(9.8, 10.5); ctx.lineTo(-9.6, 10.5); ctx.lineTo(-6.8, -14); ctx.lineTo(-9.4, -34);
      ctx.quadraticCurveTo(-9.8, -40 - breath, -6, -41 - breath); ctx.closePath();
    };
    jacket(); ctx.fillStyle = S1; ctx.fill();
    ctx.save(); jacket(); ctx.clip();
    ctx.fillStyle = S2; ctx.beginPath(); ctx.moveTo(-12, -44); ctx.lineTo(-5, -44); ctx.lineTo(-3.4, -14); ctx.lineTo(-4.4, 12); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = S3; ctx.beginPath(); ctx.moveTo(-12, -44); ctx.lineTo(-8.4, -44); ctx.lineTo(-6.4, -14); ctx.lineTo(-7, 12); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = S4; ctx.beginPath(); ctx.moveTo(5.4, -40); ctx.lineTo(8.6, -39); ctx.lineTo(7.6, -14); ctx.lineTo(8.6, 10); ctx.lineTo(6.4, 10); ctx.lineTo(6.2, -14); ctx.closePath(); ctx.fill();
    // hem band
    ctx.fillStyle = S3; ctx.fillRect(-12, 8, 24, 3);
    ctx.restore();
    jacket(); stroke(ctx, INK, 1.3);
    // shirt V
    ctx.beginPath(); ctx.moveTo(-3.2, -41.5 - breath); ctx.lineTo(6.6, -41.5 - breath); ctx.lineTo(2.2, -6); ctx.closePath();
    ctx.fillStyle = K1; ctx.fill();
    ctx.fillStyle = K2; ctx.beginPath(); ctx.moveTo(-3.2, -41.5 - breath); ctx.lineTo(1.4, -41.5 - breath); ctx.lineTo(2.2, -6); ctx.closePath(); ctx.fill();
    // lapels
    ctx.beginPath(); ctx.moveTo(-3.6, -41.5 - breath); ctx.lineTo(-7.2, -37.5); ctx.lineTo(-5.4, -31); ctx.lineTo(0.2, -22); ctx.lineTo(2.2, -6); ctx.lineTo(-1.4, -9); ctx.lineTo(-3, -25); ctx.closePath();
    ctx.fillStyle = S2; ctx.fill(); stroke(ctx, INK, 1);
    ctx.beginPath(); ctx.moveTo(6.8, -41.5 - breath); ctx.lineTo(9.6, -37.5); ctx.lineTo(9, -30.5); ctx.lineTo(4.6, -22); ctx.lineTo(2.2, -6); ctx.lineTo(5.4, -9); ctx.lineTo(6, -25); ctx.closePath();
    ctx.fillStyle = S4; ctx.fill(); stroke(ctx, INK, 1);
    ctx.strokeStyle = S2; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-5.4, -31); ctx.lineTo(-7.2, -37.5); ctx.moveTo(9, -30.5); ctx.lineTo(7.4, -34); ctx.stroke();
    // collar
    ctx.fillStyle = K4; ctx.beginPath(); ctx.moveTo(-4.4, -42); ctx.lineTo(-3.4, -36); ctx.lineTo(0.6, -39); ctx.lineTo(2, -41.2); ctx.fill(); stroke(ctx, SK, 0.9);
    ctx.fillStyle = K1; ctx.beginPath(); ctx.moveTo(7.6, -42); ctx.lineTo(7, -36); ctx.lineTo(3.4, -39); ctx.lineTo(2.4, -41.2); ctx.fill(); stroke(ctx, SK, 0.9);
    // buttons, seam, pocket
    ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(2.2, -6); ctx.lineTo(2, 10.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5.4, -31); ctx.quadraticCurveTo(-6.4, -22, -4.4, -14); ctx.moveTo(7.4, -30); ctx.quadraticCurveTo(8.2, -22, 6.6, -14); stroke(ctx, S3, 0.8);
    disc(ctx, 0.2, -2, 1.1, INK); disc(ctx, 0.2, 5, 1.1, INK); disc(ctx, 0.0 - 0.3, -2.4, 0.4, S4);
    ctx.beginPath(); ctx.moveTo(-6.4, -29); ctx.lineTo(-1.8, -29.6); stroke(ctx, INK, 1);
    ctx.fillStyle = '#fbf8f0'; ctx.beginPath(); ctx.moveTo(-6, -29.3); ctx.lineTo(-5.4, -32.6); ctx.lineTo(-4, -30.8); ctx.lineTo(-2.9, -32.4); ctx.lineTo(-2.3, -29.6); ctx.closePath(); ctx.fill(); stroke(ctx, SK, 0.7);
    ctx.fillStyle = T1; ctx.beginPath(); ctx.moveTo(-4.1, -30.2); ctx.lineTo(-2.9, -30.7); ctx.lineTo(-3.1, -29.6); ctx.fill();
    // belt peek
    ctx.restore();

    // ---- neck, tie, head ----
    ctx.save(); ctx.translate(px, py); ctx.rotate(lean); ctx.scale(1, 0.88);
    const nk = [[0.5, -41], [1.2, -47]];
    ctx.beginPath(); ctx.moveTo(nk[0][0], nk[0][1]); ctx.lineTo(nk[1][0], nk[1][1]); stroke(ctx, SK, 6); ctx.beginPath(); ctx.moveTo(nk[0][0], nk[0][1]); ctx.lineTo(nk[1][0], nk[1][1]); stroke(ctx, K2, 4.4);
    ctx.beginPath(); ctx.moveTo(1.2, -41); ctx.lineTo(1.6, -47); stroke(ctx, K1, 2);
    ctx.restore();
    // collar re-drawn lightly over neck base
    ctx.save(); ctx.translate(px, py); ctx.rotate(lean); ctx.scale(1, 0.88);
    tie(ctx, p, 2.2, -39.4 - breath, air || dash, walk ? 1 : climb ? 0.7 : dash ? 1.6 : 0, lean);
    ctx.restore();

    const tilt = Math.sin(t * 1.1) * 0.11 + Math.sin(t * 2.6 + 1) * 0.03 + (walk ? -lean * 0.8 + Math.sin(ph * 2) * 0.03 : 0) + (climb ? -0.18 : 0) + (air ? 0.12 : 0) - pe * 0.1 + (eat ? -0.1 : 0);
    const hp = W(1.5 + Math.sin(t * 1.1) * 0.6, -54 + Math.sin(t * 2.1 + 1) * 0.5);
    head(ctx, p, hp[0], hp[1], tilt, mood, eat ? Math.min(1, 0.4 + Math.abs(Math.sin(t * 28)) * 0.6) : 0, (walk ? 0.7 : 0) + (air || dash ? 1.4 : 0) + pe * 1.2 + (climb ? 0.4 : 0));

    // near arm over everything
    arm(ctx, nearSh, nearEl, naH, false, p, spreadN, curlN, waveN);
  }

  d.draw = function (ctx, p) {
    const mon = p.mon;
    if (mon && !mon.entering && mon.invuln > 0 && mon.specialCd > 1.75 && mon.specialCd < 2.25) {
      const ga = ctx.globalAlpha;
      for (let i = 3; i >= 1; i--) {
        ctx.save(); ctx.globalAlpha = ga * 0.16 * (4 - i); ctx.translate(-i * 22, 0); ctx.transform(1, 0, -0.1 * i, 1, 0, 0);
        figure(ctx, p, true); ctx.restore();
      }
    }
    figure(ctx, p, false);
  };

  d.drawRevert = function (ctx, t) {  // just a regular, very fast-walking man with a briefcase
    const s = Math.sin(t * 18), c = Math.cos(t * 18), hop = Math.abs(c) * 1.4;
    ctx.save(); ctx.translate(0, -hop);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const leg = (u, col) => {
      const fx = Math.sin(u) * 5, fy = -Math.max(0, Math.cos(u)) * 3;
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(fx * 0.4 + 1, -6); ctx.lineTo(fx, fy - 1);
      stroke(ctx, INK, 4.2); ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(fx * 0.4 + 1, -6); ctx.lineTo(fx, fy - 1); stroke(ctx, col, 2.6);
      ctx.fillStyle = B1; ctx.beginPath(); ctx.ellipse(fx + 2, fy - 0.6, 3.6, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.stroke();
    };
    leg(t * 18 + Math.PI, S2); leg(t * 18, S1);
    // jacket and tails
    ctx.beginPath(); ctx.moveTo(-4.4, -25); ctx.lineTo(4.4, -25); ctx.lineTo(4.8, -11); ctx.lineTo(-5.4 - s * 1.6, -10.5); ctx.closePath();
    ctx.fillStyle = S1; ctx.fill(); stroke(ctx, INK, 1);
    ctx.fillStyle = S2; ctx.fillRect(-4.2, -24.6, 2.6, 13);
    ctx.fillStyle = K1; ctx.beginPath(); ctx.moveTo(-0.6, -25); ctx.lineTo(2.6, -25); ctx.lineTo(1, -18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1, -24); ctx.lineTo(1.4 - 2.6 - s * 1.2, -17); stroke(ctx, T1, 1.6);
    // swinging arm with briefcase
    ctx.beginPath(); ctx.moveTo(2, -23); ctx.lineTo(5 + s * 2, -16); stroke(ctx, INK, 3.2); ctx.beginPath(); ctx.moveTo(2, -23); ctx.lineTo(5 + s * 2, -16); stroke(ctx, S1, 1.8);
    ctx.fillStyle = B1; ctx.fillRect(3.4 + s * 2, -15, 7, 5); ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.strokeRect(3.4 + s * 2, -15, 7, 5);
    ctx.fillStyle = B3; ctx.fillRect(3.8 + s * 2, -14.6, 6.2, 1.2);
    // egg head with smiley
    ctx.save(); ctx.translate(0.6, -31); ctx.rotate(Math.sin(t * 18) * 0.05);
    ctx.beginPath(); ctx.ellipse(0, 0, 4.4, 5.6, 0, 0, Math.PI * 2); ctx.fillStyle = K1; ctx.fill(); stroke(ctx, SK, 0.9);
    ctx.fillStyle = K4; ctx.beginPath(); ctx.ellipse(-1.2, -2.2, 1.4, 1.9, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(1.8, 0.6); ctx.rotate(-0.1); ctx.fillStyle = '#ffe56a'; ctx.fillRect(-2.6, -2.6, 5.2, 5.2); ctx.fillStyle = '#f5cd3c'; ctx.fillRect(-2.6, -2.6, 5.2, 1);
    ctx.fillStyle = '#1c1710'; ctx.beginPath(); ctx.arc(-0.9, -0.6, 0.4, 0, Math.PI * 2); ctx.arc(1, -0.6, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0.4, 1.3, 0.3, Math.PI - 0.3); stroke(ctx, '#1c1710', 0.6); ctx.restore();
    ctx.restore();
    ctx.restore();
  };
})();
