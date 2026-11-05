'use strict';
/* =========================================================
   TOUCH — on-screen controls for phones and tablets.
   Left: a drag joystick (move / climb / fly, and menu navigation).
   Right: PUNCH, JUMP, SPECIAL. Top: pause.
   Taps on the game itself drive the menus (Game.onTap).
   Everything here feeds the same Input actions the keyboard uses.
   ========================================================= */

const TouchPad = {
  root: document.getElementById('touch'),
  stick: document.getElementById('stick'),
  knob: document.getElementById('knob'),
  jumpBtn: document.getElementById('b-jump'),
  pauseBtn: document.getElementById('b-pause'),
  kbd: document.getElementById('kbd'),
  stickId: null, cx: 0, cy: 0, dirs: { left: false, right: false, up: false, down: false },
  shown: null, jumpShown: null, pauseShown: null,

  init() {
    this.blockZoom();
    if (IS_TOUCH) this.enable();
    // A real finger on the screen also turns touch mode on (covers laptops with touchscreens).
    addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !IS_TOUCH) { IS_TOUCH = true; this.enable(); } }, true);

    // --- joystick ---
    const st = this.stick;
    st.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.stickId = e.pointerId;
      try { st.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events can't be captured */ }
      const r = st.getBoundingClientRect();
      this.cx = r.left + r.width / 2; this.cy = r.top + r.height / 2;
      this.moveStick(e);
    });
    st.addEventListener('pointermove', e => { if (e.pointerId === this.stickId) this.moveStick(e); });
    const endStick = e => { if (e.pointerId === this.stickId) this.resetStick(); };
    st.addEventListener('pointerup', endStick);
    st.addEventListener('pointercancel', endStick);
    st.addEventListener('lostpointercapture', endStick);

    // --- buttons ---
    for (const b of document.querySelectorAll('#touch .tb')) {
      const act = b.dataset.act;
      const down = e => {
        e.preventDefault();
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        b.classList.add('on'); Input.press(act); Sfx.unlock();
      };
      const up = () => { b.classList.remove('on'); Input.release(act); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
    }

    // --- taps on the game canvas (menus, resume) ---
    canvas.addEventListener('pointerdown', e => {
      if (!IS_TOUCH) return;
      const r = canvas.getBoundingClientRect();
      Game.onTap((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
    });

    // Phone keyboard for initials: tapping the initials screen focuses a hidden text field.
    // (Also on pointerup, since some phones only allow the keyboard to open at the end of a tap.)
    const kbdTap = () => { if (IS_TOUCH && Game.state === 'gameover' && Game.goPhase === 'initials') this.openKeyboard(); };
    canvas.addEventListener('pointerup', kbdTap);
    canvas.addEventListener('click', kbdTap);
    const k = this.kbd;
    k.addEventListener('input', () => {
      for (const ch of k.value.toUpperCase()) if (ch >= 'A' && ch <= 'Z') Input.typed.push(ch);
      k.value = '';
    });
    k.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); Input.tap('start'); }
      else if (e.key === 'Backspace' && !k.value) Input.typed.push('\b');
    });

    for (const el of [this.root, canvas]) el.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('blur', () => this.releaseAll());
  },

  // iPhone Safari ignores "user-scalable=no", so block pinch and double-tap zoom here,
  // and snap the page back to 100% if it ever does zoom (e.g. after the keyboard opens).
  blockZoom() {
    const stop = e => e.preventDefault();
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, stop, { passive: false });
    document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    let lastEnd = 0;
    document.addEventListener('touchend', e => {
      const now = Date.now();
      if (now - lastEnd < 350 && e.target !== this.kbd) e.preventDefault();   // second tap of a double-tap
      lastEnd = now;
    }, { passive: false });
    document.addEventListener('dblclick', stop, { passive: false });
    document.addEventListener('gestureend', () => this.resetZoom());
    this.kbd.addEventListener('blur', () => this.resetZoom());
    addEventListener('orientationchange', () => setTimeout(() => this.resetZoom(), 300));
  },
  resetZoom() {
    const m = document.querySelector('meta[name=viewport]');
    if (!m) return;
    const c = m.getAttribute('content');
    m.setAttribute('content', 'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
    setTimeout(() => { m.setAttribute('content', c); window.scrollTo(0, 0); resize(); }, 60);
  },

  openKeyboard() {
    try { this.kbd.value = ''; this.kbd.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  },

  enable() {
    document.body.classList.add('touch');
    resize();
  },

  moveStick(e) {
    const R = this.stick.clientWidth / 2;
    let dx = e.clientX - this.cx, dy = e.clientY - this.cy;
    const len = Math.hypot(dx, dy), max = R * 0.62;
    if (len > max) { dx *= max / len; dy *= max / len; }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const t = R * 0.28;   // dead zone
    this.setDir('left', dx < -t); this.setDir('right', dx > t);
    this.setDir('up', dy < -t);   this.setDir('down', dy > t);
  },
  resetStick() {
    this.stickId = null;
    this.knob.style.transform = '';
    for (const d in this.dirs) this.setDir(d, false);
  },
  setDir(name, on) {
    if (on && !this.dirs[name]) Input.press(name);
    if (!on && this.dirs[name]) Input.release(name);
    this.dirs[name] = on;
  },
  releaseAll() {
    this.resetStick();
    for (const a of ['punch', 'jump', 'special', 'pause']) Input.release(a);
    for (const b of document.querySelectorAll('#touch .tb')) b.classList.remove('on');
  },

  // Called every frame: show the controls only when they're useful.
  sync() {
    const st = Game.state;
    if (document.activeElement === this.kbd && !(st === 'gameover' && Game.goPhase === 'initials')) this.kbd.blur();
    const show = IS_TOUCH && (st === 'intro' || st === 'play' || st === 'clear' || (st === 'gameover' && Game.goPhase === 'initials'));
    if (show !== this.shown) { this.root.hidden = !show; this.shown = show; if (!show) this.releaseAll(); }
    if (!show) return;
    const jump = !(Game.monster && Game.monster.s.flies);
    if (jump !== this.jumpShown) { this.jumpBtn.style.display = jump ? '' : 'none'; this.jumpShown = jump; }
    const pause = st === 'play' && !Game.paused;
    if (pause !== this.pauseShown) { this.pauseBtn.style.visibility = pause ? '' : 'hidden'; this.pauseShown = pause; }
  },
};
TouchPad.init();
