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

**Roof Slam:** in mid-air, press **Down** to drop hard. Land on a roof and the top floors cave in.
The longer the fall, the bigger the hit, so leaping from a tall building onto a shorter one is the
big play (a hop in place barely dents it). Slamming the street flattens people nearby. Flyers do a
**Dive Slam**: hold Down and dive onto a roof at speed.

**On a phone or tablet** the game switches to touch controls automatically: a drag joystick on the
left (move, climb or fly), and **PUNCH**, **JUMP** and **SPECIAL** buttons on the right, plus a pause
button. Tap to start, tap a monster to pick it and tap it again to play. The game is landscape
only on phones: held upright, it shows a "rotate your phone" prompt and pauses. On Android it also goes
fullscreen and locks to landscape on your first tap.

## How a city works

- Break windows (or knock them in) to grab whoever is inside. People and soldiers
  heal you. **Drumsticks** heal a lot. **Money bags** are worth points. **Toasters**
  shock you, so don't eat them.
- Punches splash: the window you hit plus the four around it (a plus-shaped cross) take damage,
  and any tank or helicopter in the blast gets hit too. To eat someone or grab a power-up you
  still have to punch that exact window (or that exact person on the street).
- Each building has a damage meter above its roof. It comes down once about 40% of its total
  window damage is done (`COLLAPSE_AT` in `js/world.js`). No single floor topples it, so working the
  whole face, climbing included, is the fast way through a city. Punch splash values are
  `PUNCH_CENTER`, `PUNCH_SPLASH` and `PUNCH_AOE_R` in `js/game.js`.
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
- The tour is 33 stops, heading west around the globe from Peoria (Chicago, Las Vegas, New York,
  Dunwich, London, Rome, Cairo, Dubai, Tokyo, Sydney, Rio and more) and ending at R'lyeh. Each city is
  noticeably harder than the last (more and deadlier soldiers, snipers, tanks and helicopters), and your
  health carries over between cities with only a small top-up, so damage adds up. After R'lyeh it loops
  back to Peoria, much harder again. It never just ends. Tuning lives at the top of `js/game.js`
  (`DIFF_PER_CITY`, `DIFF_PER_TOUR`, `CITY_REFILL`).
- The monster select screen is a fighting-game roster: everyone on one screen, no scrolling.
  It always uses at least two rows, and tiles shrink as more monsters are added. Arrows or the mouse move around the grid.

## The roster

| Monster | Moves by | Special | Notes |
|---|---|---|---|
| **Cthulhu** | Climbing | Madness Roar: stuns the army, makes the crowd faint | Toughest, hits hardest. Hold Jump in the air to glide. |
| **Lanky Hank** | Climbing | Blink: short teleport with brief invulnerability | Longest reach, fastest climber. |
| **Chronomunch** | Flying | Time Chomp: a lunge that eats everything in its path | Never climbs. Fragile. |
| **Generic Kaiju** | Climbing | Foam Blast: a frothy cone of suds that wrecks windows, vehicles and soldiers | A store-brand giant crab. Big punching claw, sturdy. Hard shell: takes 10% less damage. |
| **Act of God** | Flying | Smite: a volley of 6 lightning strikes rains down across the block, wrecking everything on the strike lines and briefly stunning the army | A grumpy thundercloud with long reach. Slow but sturdy. Overcast: takes 15% less damage. |
| **Unscheduled Visitor** | Flying | Long Beam: about 1s of charging (aim with Up/Down) while its plates, wings and many eyes spread open, then one red beam down the street that wrecks every window, vehicle and soldier on its line | A silent, many-eyed geometric guest. Glass cannon: hits hard with a long-reach needle jab, but takes 40% extra damage. Never climbs. |
| **Elder Statesman** | Climbing | Filibuster: plants himself for a second while a wave of red tape and paperwork stuns the army and window snipers for 3s and heals him | Incumbency: each snack stacks +8% punch damage and 2% less damage taken (max 5, fades over time). Slow, sturdy, wide grabby swipes. |
| **Gizzard** | Climbing | Blood Howl: a short howl with red shockwave rings, then a 5s frenzy (+32% speed, +50% damage, much faster punching) while the crowd panics | The BIG DEAD Dog, a hunched grey werewolf. Highest jump in the roster, so it's great at the Roof Slam. Scavenger: every snack heals a little extra. |
| **Automated Solution** | Climbing | Target Lock: the eye paints up to 6 targets, then homing micro-missiles hit every one | A slow, relentless robot spider tank. Armoured chassis: takes 30% less damage and slowly self-repairs. Highest health in the roster, low jump, slow stabbing punch. |
| **Gat Stanley** | Flattens | Gat Rampage: rooted for a moment, he sprays a sweeping tommy-gun arc across the block | A mailed-around paper boy with a tommy gun. His punch is a short burst that breaks windows and drops soldiers from range, but bullets can't eat: up close, the same button grabs snacks by hand. Turns edge-on like paper (shots slip past mid-turn), flutters when he falls (hold Jump). Return to Sender: some shots bounce back at the shooter. |

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

All art is drawn in code (canvas shapes) and every sound is synthesized, with one exception: the
Elder Statesman sprite (`art/statesman/`) is the owner's own art, and the Gat Stanley sprite
(`art/stanley/`) was supplied by the owner. Nothing is borrowed.

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
