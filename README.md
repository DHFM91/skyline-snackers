# Skyline Snackers: An Eldritch World Tour

A single-player, browser-based monster parody in the spirit of the classic 90s
"climb it, punch it, eat the people inside" arcade games. Pick a monster, tour
the world, and leave every city as rubble.

**To play:** double-click `index.html`. You don't need to install or build anything. It runs offline. The title font
loads from Google Fonts when you're online, and falls back to Impact when you're not.

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move | Arrow keys / WASD | Left stick / D-pad |
| Climb (walkers) / Fly (flyers) | Up / Down | Up / Down |
| Punch / Bite | Z or J (hold Up or Down to aim) | X / B |
| Jump | X, K or Space | A |
| Special | C or L | Y / RB |
| Pause | P or Esc | Back |
| Mute | M | — |

On a roof, press **Down** to hang off the top of the building and punch in.

**On a phone or tablet** the game switches to touch controls automatically: a drag joystick on the
left (move, climb or fly), and **PUNCH**, **JUMP** and **SPECIAL** buttons on the right, plus a pause
button. Tap to start, tap a monster to pick it and tap it again to play. Landscape gives the
biggest view; in portrait the game sits on top with the controls underneath.

## How a city works

- Break windows (or knock them in) to grab whoever is inside. People and soldiers
  heal you. **Drumsticks** heal a lot. **Money bags** are worth points. **Toasters**
  shock you, so don't eat them.
- A building comes down when about a third of its windows are holes, or when a whole floor is gone.
- Level the whole street to "crunch" the city. You get a health bonus and a speed bonus.
- The army escalates over time: rifle squads first, then helicopters, then tanks.
  Soldiers also shoot from windows.
- When your health runs out, your monster shrinks into something embarrassing and
  slinks away. You get one life (`START_LIVES` in `js/game.js`).
- **Game Over** checks the **World Top 10**. If your score makes the list, you enter
  3 initials: just type them (e.g. C-A-T, Backspace to fix, Enter to confirm), or dial them
  arcade-style (↑↓ change the letter, ←→ move, Punch to confirm). On a phone, tap the letters
  to bring up the keyboard, or dial with the joystick.
  Then you go back to the monster select screen to continue from the city where you fell.
  You can switch monsters there, and your score resets.
- The tour runs Peoria → Paris → Tokyo → Cairo → London → Moscow → Rio → R'lyeh.
  It then loops, and each new tour is harder.

## The roster

| Monster | Moves by | Special | Notes |
|---|---|---|---|
| **Cthulhu** | Climbing | Madness Roar: stuns the army, makes the crowd faint | Toughest, hits hardest. Hold Jump in the air to glide. |
| **Lanky Hank** | Climbing | Blink: short teleport with brief invulnerability | Longest reach, fastest climber. |
| **Chronomunch** | Flying | Time Chomp: a lunge that eats everything in its path | Never climbs. Fragile. |

## Project layout

```
index.html        page shell, loads the scripts in order
js/core.js        constants, helpers, keyboard/gamepad input, synthesized sound
js/world.js       tour stops, effects, buildings, civilians, army, backdrops
js/monsters.js    Monster physics + the roster (registerMonster calls)
js/leaderboard.js global top-10 (shared JSON bin, read/written only at Game Over)
js/touch.js       on-screen joystick and buttons for phones/tablets
js/game.js        state machine, combat rules, HUD and menus, main loop
LEGAL_NOTES.md    IP reasoning, and the checklist to run before adding a homage
```

All art is drawn in code (canvas shapes) and every sound is synthesized. The project
has no image or audio files, so there's nothing borrowed to clear.

## Adding a monster

Add a `registerMonster({...})` call at the bottom of `js/monsters.js`. The
character-select screen picks it up automatically. Read `LEGAL_NOTES.md` first.

```js
registerMonster({
  id: 'mymonster',            // unique
  name: 'MY MONSTER',
  tagline: 'One funny line.',
  homage: 'What it nods to (shown small on the select card)',
  move: 'CLIMBS',             // or 'FLIES' (label only; behaviour comes from stats.flies)
  specialName: 'STOMP', specialDesc: 'What the special does', passive: 'Any passive trait',
  bars: { STR: 3, SPD: 3, REACH: 3, TOUGH: 3 },   // 1–5, select-screen display only
  portraitY: 0.8,             // HUD portrait framing (fraction of height to centre on)
  stats: {
    w: 40, h: 90,             // hitbox size in px (h = feet to top of head)
    speed: 130, climb: 90, jump: 640,
    dmg: 1.5,                 // window damage per punch (windows have 3 hp)
    reach: 32, hitR: 18,      // how far the punch lands, and how big the hit circle is
    punchCd: 0.3, maxHp: 100,
    armor: 1,                 // damage multiplier taken (lower = tougher)
    armY: 0.62,               // punch height as a fraction of h
    flies: false, glide: false, specialCd: 5,
  },
  special(m, game) { /* m = the Monster, game = Game */ },
  draw(ctx, p) { /* draw at origin = feet, facing right. p = pose (see demoPose) */ },
  drawRevert(ctx, t) { /* the tiny shameful form it shrinks into when defeated */ },
});
```

To test your art, use the pose fields that `draw` receives: `walk`, `walkPhase`,
`climb`, `climbPhase`, `air`, `glide`, `punch` (0→1), `punchDir`, `hand` (where the
punch lands), `eat`, `dash`, `t`.

## Play online

https://dhfm91.github.io/skyline-snackers/

The repo is named `skyline-snackers` on purpose, not `rampage`, because that name is a trademark
(see LEGAL_NOTES.md).
