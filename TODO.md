# Skyline Snackers — TODO

Loose ideas and planned work. Newest at the bottom.

## Standing rule: the roster screen

- Keep the monster tiles on "Choose your monster" at their current size (as of 10 monsters).
- New monsters join the existing rows in a balanced way: if one new monster makes the rows uneven
  (e.g. 6 + 5), the next one evens them out again (6 + 6).
- The current code already does this up to 24 monsters (two rows of up to 12 at this tile size).
  Past that, add a third row at the same tile size rather than shrinking the tiles.

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

## Next monster: hungry caterpillar parody

A parody of "The Very Hungry Caterpillar", with snake-style movement.

- **Body:** only the head matters for gameplay. Its hit box is about the size of Act of God's.
- **Segments:** a chain of decorative circles trails behind the head, snake-style, to make him long
  like a caterpillar. They follow the head's path and do nothing else (no hit box, no damage).
- **Look:** must be an original design. The book's caterpillar (Eric Carle, still under copyright) is a
  protected character, so no red head with green segments, no copy of its face or the book's
  collage art style, and no title or quotes from the book. The parody is the idea of an
  insatiably hungry caterpillar eating through everything.
- **Decided:** he's a crawler (walks and climbs walls; the trailing segments follow him up the wall),
  and the snake mechanics above are confirmed. The parody look, special, passive and defeat form are
  left to the builder's judgment.
