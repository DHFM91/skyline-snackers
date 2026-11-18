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

## Next monster: hungry caterpillar parody

A parody of "The Very Hungry Caterpillar", with snake-style movement.

- **Body:** only the head matters for gameplay. Its hit box is about the size of Act of God's.
- **Segments:** a chain of decorative circles trails behind the head, snake-style, to make him long
  like a caterpillar. They follow the head's path and do nothing else (no hit box, no damage).
- **Look:** must be an original design. The book's caterpillar (Eric Carle, still under copyright) is a
  protected character, so no red head with green segments, no copy of its face or the book's
  collage art style, and no title or quotes from the book. The parody is the idea of an
  insatiably hungry caterpillar eating through everything.
- Still to decide: how he moves (crawls on the ground and up walls, or slithers freely like a flyer),
  his special and passive, and what he turns into when defeated.
