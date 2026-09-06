# Fireline

A top-down wildfire game you play with one thumb. You fly a single scooper
aircraft, pick up water, and cut a wet line ahead of a heath fire before it
reaches three villages.

**MVP scope:** one aircraft, one scenario, one technique. It is a complete
game — briefing, five-ish minutes of play, a scored result — not a demo.

```
git clone <this repo> && cd fireline
npx http-server -p 8080      # or: python3 -m http.server 8080
# open http://<your-lan-ip>:8080 on your phone
```

No build step, no dependencies, no backend. `index.html` is the entire game.

---

## The one idea

You cannot put out a running head fire with water. Real aerial firefighting
gets *in front* of the fire and wets a line it cannot cross, anchored on
something that will not burn — a lake, a road, ground already burnt. The
game is built so that this is the only thing that works:

- **Dropping on the head fire does nothing.** A burning cell is only knocked
  down if it has three or fewer burning neighbours, so direct attack kills
  spot fires and thin flanks and nothing else.
- **A wet line is a real barrier.** Moisture blocks ignition completely until
  it evaporates. Measured undisturbed: **56 s of total block, 111 s of
  residual effect**. Beside flame it dries roughly twice as fast.
- **Lay it too early and it dries. Lay it too late and you are behind the
  fire.** That tension is the game.

The scenario is modelled on the 2025 heath fires in eastern Germany
(Gohrischheide, Jüterbog): drought-cured *Calluna* over sandy pine on a
former artillery range. The ground is contaminated with unexploded ordnance,
so no crew can walk in — which is the in-world reason you are alone in an
aeroplane, and the reason that zone spreads faster and throws embers.

## Simulation

An 8-neighbour stochastic cellular automaton over 56 × 100 cells at 50 m —
**2.8 × 5.0 km**, stepped at 10 Hz.

Ignition probability per neighbour per tick is
`base × fuel × dryness × wind × terrain`, where `wind` is the dot product of
the wind vector with the spread direction (so the fire burns as an elongated
ellipse — fast head, slow flanks, crawling back), `dryness` falls to zero on
a wet line, and `terrain` makes cured heath the fast stuff and forest tracks
near-inert. Cells consume fuel while alight and go out when it is gone, so a
fire enclosed by a line **starves inside it**. Above a threshold fire size,
the flaming perimeter throws embers 4–10 cells downwind — this is how fires
jump roads, and it is what turns a good line into a bad one.

## Balance

`tools/balance.mjs` extracts the simulation straight out of `index.html`
(marked `---8<--- SIM START/END`, so there is never a second copy) and runs
it headless.

```
node tools/balance.mjs --seeds 8
```

It reports free burn, a scripted autopilot at three sortie rates, how long a
wet line holds, and a **containment ceiling** — a perfectly-flown continuous
line. That last one is the honesty check: if a perfect line cannot contain
the fire, no amount of skill can, and the game is a lie.

The shipped map is `MAP_SEED = 4`, chosen with this harness. Same terrain
every run, different fire every run. Measured over 24 fire streams:

| | burned | villages lost |
|---|---|---|
| do nothing | 851 ha | 2.5 of 3 |
| hold a line | ~100–230 ha | 0 of 3 |

That gap is the game.

## Layout

| | |
|---|---|
| `index.html` | the whole game — sim, renderer, input, UI |
| `tools/balance.mjs` | headless balance harness |
| `tools/build-artifact.mjs` | strips the standalone wrapper for embedding |

## Next

The aircraft is one tool. The pieces below are what turns this into the
firefighting game rather than the scooper game — the sim already has the
hooks for most of them (`TERR` rates, `moist`, `ord`, the event stream).

- **Retardant** — a second load type from a land base, not the lake: lasts
  far longer, longer turnaround. Water vs. retardant becomes a real choice.
- **Helicopter with a bucket** — slower, smaller load, but it can hover and
  work a village edge precisely.
- **Ground crews and dozer lines** — outside the ordnance zone only, which
  finally makes that red rectangle cost you something.
- **Backburning** — deliberately burning fuel out ahead of the front. The
  highest-skill technique and the one the sim is already capable of.
- **Terrain slope**, which in a real fire matters as much as wind.
- **More incidents**: a wind-reversal scenario, a night drop, a
  wildland–urban interface where the villages are the fuel.

## Licence

MIT. See `LICENSE`.
