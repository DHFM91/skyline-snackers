# Skyline Snackers — TODO

Loose ideas and planned work. Newest at the bottom.

## Online 3-player co-op

The original Rampage has 3 players on screen at once. Skyline Snackers needs a whole keyboard
and mouse per player, so local couch play won't work. Instead, design basic network play so
3 people on 3 computers can rampage through the same city together.

Things to work out when we get to it:
- **Connection:** how players find each other. A simple room code is the likely starting point.
- **Hosting:** probably one player's browser runs the city, with the others connected peer-to-peer
  (WebRTC), so no game server is needed. A small signalling/relay service may still be needed to
  connect players at first.
- **Sync:** what has to stay in step between players (monsters, buildings, army, snacks, score)
  and how to hide lag.
- **Rules:** each player picks a different monster; shared or separate scores; what happens when
  one player is knocked out; whether the leaderboard counts co-op runs.
- **Tour:** whether all 3 players advance through the world tour together.
