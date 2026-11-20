---
name: lexi-persona-drive
description: How to see Lexi the way a learner does. Seed a learner state with the dev-only `?seed=` URL parameter and drive it in Mobile Safari on the iPhone Simulator. Use it for any visual, layout, gesture, scroll, dwell or multi-screen check, for persona or design passes, for screenshots, for reproducing a UI bug, and before reporting or closing any visual defect. Also use it when the user says "does this look right", "test it on the phone" or "check it in the app", even if they don't mention the simulator or seeds.
---

# Driving Lexi as a persona

## Why the simulator and not the browser pane

The pane runs **hidden**: `document.hidden` is true, and IntersectionObserver and rAF
are suspended. So every gesture, scroll and dwell test reports "nothing happened" on
code that works. It also has no status bar and no Safari toolbar, so it once reported
zero overflow on a layout that clipped the grade buttons on a real iPhone. Use the pane
to read the DOM. Use the simulator for anything that has to be *seen* or *touched*.

## 1. Pin the build

If you are judging the product rather than your own change, test what production runs:
`curl -s https://lexi-eosin.vercel.app/version.json`, then match it to a commit. A
whole persona pass was once run against a checkout nine days and one restructure behind
production. Name the commit you tested in the write-up.

## 2. Start a server on a clean origin

`.claude/launch.json` has `lexi` (5173), `lexi-clean` (5179, 127.0.0.1) and
`lexi-shots` (5183, 127.0.0.1). The simulator reaches the Mac's localhost directly.
Repeated seeding **wedges Safari's storage** for an origin: localStorage holds the new
seed and IndexedDB the old one, which looks exactly like `importData` merging. It
doesn't. Switch to another port instead of diagnosing it again.

## 3. Seed

Open `http://127.0.0.1:<port>/?seed=<name>` in Mobile Safari on the simulator (the
simulator tool's `open_url`, or `xcrun simctl openurl booted <url>`). The seeder writes
through `store.importData`, the app's own restore path. It runs in dev only.

| Seed | Persona | Exercises |
|---|---|---|
| `cold` | Cold visitor | the welcome slot; can a stranger tell what this is |
| `day2` | Day two, not placed | the placement nudge; 10 words in Learning, 0 known |
| `a1` | A1, three weeks in | first real numbers, A1 descriptors, small heatmap, gender misses |
| `saver` | A2 who bookmarks everything | the goal pill at 5/5; Üben opening with saved words |
| `b1` | B1 with a gender blind spot | blind spots ranked by rate; the one-tap drill |
| `backlog` | B1 back after a month away | the return notice, backlog burn-down, a bounded day |
| `b2` | B2 producing | the recall drill; "Auf Deutsch" in the word sheet |
| `c1` | C1, narrow filter | a feed scoped to two bands; the level strip agreeing |
| `c2` | C2 near the end of the corpus | the feed's end-of-list slot; no fake 100% |
| `clear` | Nothing due | the caught-up state; fresh words offered, not forced |

The source of truth is `src/lib/devseed.ts` (`looksAt` on each persona). Read it if this
table and the code disagree.

## 4. Drive

- Open the simulator panel before building, then screenshot, tap and swipe. A swipe
  that starts within 4pt of an edge becomes an OS gesture (back, home, Control Center).
  Start further in.
- **Don't edit source while judging a stateful flow.** A hot reload remounts the app,
  and session counters restart mid-run.
- **Before reporting a visual defect, hard-reload.** HMR can leave a stale stylesheet: a
  button once measured 1.23:1 contrast in dev and 5.01:1 in production. Check the same
  element in production.
- Check the tight layouts at an iOS accessibility text size too. Lexi has collapsed
  there before.
- Read feed slots with `textContent`, not `innerText`. `content-visibility: auto` hides
  their text from `innerText`.
- **A sweep is only as wide as its route list.** Enumerate routes from `src/route.ts`
  and `src/App.tsx`, not from memory. One touch-target sweep missed six surfaces, four
  of them with real defects.

## 5. Report

For each finding give the build sha, the persona, the device, what you did, what you
saw, and a screenshot. A finding that doesn't name its build can't be reproduced or
closed.

## Keep the seeder out of production

`npm run build && grep -c devseed dist/assets/*.js` must print 0 for every file. CI
enforces this in `scripts/budget.ts`. Any new call site has to stay inside
`if (import.meta.env.DEV)`.
