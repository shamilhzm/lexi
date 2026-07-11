> **⚠️ ARCHIVED — delivered.** Phases 1–5 (Known as the headline number, card status pips, the unified `SessionRecap`, the type/color/radius cleanup, haptics, level milestones, the first-run guided session, and the IA collapse) are in the shipped code. Superseded by the codebase and [`../BACKLOG.md`](../BACKLOG.md). Kept for provenance — not current.

# Lexi — Implementation Plan (from DESIGN-REVIEW.md)

*Instructions for the implementing agent (Claude Opus 4.8). Scope: every design and
experience recommendation in DESIGN-REVIEW.md. Explicitly OUT of scope: the school-pitch
machinery (Klassen-Report, textbook deck packs, pilot protocol, guarantee instrumentation) —
that section existed to focus priorities, not as a build list.*

---

## Ground rules

- **Stack:** React 19 + TypeScript + Vite + Tailwind 4 (`@theme` tokens in `src/index.css`),
  motion/react, lucide-react, ts-fsrs. Local-first; all state in localStorage via `src/store.ts`.
- **Verify after every phase:** `npx tsc --noEmit` clean, `npm run build` clean, and a manual
  smoke pass of the touched surface. Commit per phase, not per file.
- **Surgical diffs.** Match existing style. Don't refactor what a phase doesn't name.
- **Key files:** `src/store.ts` (state/stats), `src/session.ts` (mixed queue),
  `src/views/Review.tsx` (session player), `src/views/Today.tsx`, `src/App.tsx` (nav/IA),
  `src/index.css` (all tokens/materials), `src/views/{Markt,Decks,Galaxy,Wortkarte}.tsx`.
- Card status semantics already exist: `statusOf(id): 'new' | 'learning' | 'known'`
  (known = FSRS `Review` state). Do not invent a parallel mastery model.

---

## Phase 1 — "Known" becomes the headline number

**Goal: the learner's mental model is "my Known count goes up when I show up."**

1. **Today (`Today.tsx`, `Kpis.tsx`, `LevelProgress.tsx`):** replace "Coverage" as the lead
   stat with **Known** (`totals().known`). Keep coverage available as a secondary stat where
   space allows. The session card subline gains a forward-looking phrase driven by real data:
   e.g. "Finish today to push Known to {known + likely new}" (computable: known + new cards
   in queue that would enter learning — keep the claim conservative: "X words in today's
   session are new").
2. **Card status pips (`Review.tsx`):** small dot on the card front — `text-dim` for new,
   amber for learning, green for known — with an accessible `title`/`aria-label`. Position:
   top-left of the card face, 8px, unobtrusive.
3. **Deck/sector surfaces (`Decks.tsx`, `Markt.tsx`, `Galaxy.tsx`):** wherever a coverage %
   is shown, show **known %** (`known/count`) as the primary bar/number; coverage may remain
   as a thinner secondary indicator.
4. **Unified recap — define the data contract first, before writing any JSX.** Extract one
   `SessionRecap` component (new file `src/components/SessionRecap.tsx`) used by both
   `Review.tsx` DoneState and `Gym.tsx` Summary. Its single prop is a `SessionRecap` summary
   object with **every field optional except `streak`**, so a flip-only or drill-only session
   omits what it didn't produce and the component renders only the stats present:

   ```ts
   // src/store.ts (or a new src/session-recap.ts) — the ONE source of truth
   export interface RecapData {
     reviewed?: number;      // flip cards graded (Review)
     recall?: number;        // % Good+ over reviewed; undefined if reviewed === 0
     newLearned?: number;    // cards that entered `learning` this session
     drills?: number;        // grammar/gym items answered
     drillsCorrect?: number; // for the drill recall line; undefined if drills === 0
     streak: number;         // always present
     minedCount?: number;    // Phase 5.5 fills this; Phase 1 leaves it undefined
     milestone?: string;     // Phase 5.3 fills this; Phase 1 leaves it undefined
   }
   ```

   `SessionRecap` takes `RecapData` and nothing else. It must render correctly when only
   `{ reviewed, recall, newLearned, streak }` are set (pure Review) AND when only
   `{ drills, drillsCorrect, streak }` are set (pure Gym). This contract is frozen in Phase 1
   so Phases 3 (copy) and 5 (streak/milestone/mining) extend it by *populating already-declared
   optional fields*, never by changing the shape. Delete the two bespoke recaps once the shared
   one renders both cases.

**Acceptance:** Today, Decks, Market, Galaxy all lead with Known; every card front shows a
status pip; a pure-Review session and a pure-Gym session both render through `SessionRecap`
with no missing-field crashes and no empty stat tiles; `RecapData` is the only recap prop type
in `src/`.

## Phase 2 — Type scale, color semantics, radii, a11y

**Goal: entropy out.**

1. **Type scale — two scales, not one, because the app is responsive.** Most large sizes in
   the code are not stray values; they are the mobile base of a `text-[Xpx] sm:text-[Ypx]`
   pair (e.g. `text-[18px] sm:text-[20px]`, `text-[34px] sm:text-[46px]`). A flat six-value
   list describes only the mobile column; a naive sweep would collapse the `sm:` step and
   silently kill responsiveness. So define **two** allowed sets and never merge across them:

   - **UI scale** (single-size body/labels/chips, no `sm:` step): **11 / 13 / 15 / 20**.
     Sweep only these non-responsive occurrences:
     `text-[10px]`→11 · `text-[11.5px]`→11 · `text-[12px]`/`text-[12.5px]`→13 ·
     `text-[13.5px]`/`text-[14px]`→13 or 15 by role · `text-[14.5px]`→15 · `text-[16px]`/
     `text-[17px]`→15. Uppercase-tracked labels: 11px floor. Leave `sm:`-paired text alone —
     **except** Gym's non-big card `text-[18px] sm:text-[20px]` (`Gym.tsx` ~L287), which is the
     only surviving `18px`: promote it to `text-[20px] sm:text-[24px]` so 18 is fully retired and
     stays off the allow-list.
   - **Display tiers** (headers, numerals, headwords — responsive pairs, keep both steps):
     the existing pairs are already systematic — `[22px] sm:[26px]` (h1/KPI),
     `[20px] sm:[24px]` (drill prompt), `[26px] sm:[32px]` (Gym "big" card),
     `[34px] sm:[46px]`/`[22px] sm:[28px]`/`[28px] sm:[38px]` (Review headwords),
     `[34px] sm:[40px]`/`[52px]` (Placement), `[44px] sm:[56px]`/`[40px]` (Today numerals).
     **Do not sweep these.** If you touch one, the pair stays a pair. The only cleanup here is
     to *enumerate* them (below) so the acceptance gate can assert nothing new drifts in.

   Do this as one mechanical commit; no layout redesign.
2. **CEFR ink decoupling (`index.css`).** `--color-b1` currently equals `--color-green`.
   Give the CEFR ramp its own six values distinct from the semantic green/red pair
   (suggestion: a blue→teal→violet ramp; A1 `#3b82f6`, A2 `#0ea5e9`, B1 `#14b8a6`,
   B2 `#8b5cf6`, C1 `#d946ef`, C2 — final values at implementer's discretion, but **no CEFR
   color may collide with any _status_ color, i.e. not `--color-green`, not `--color-red`, and
   not `--color-amber` (`#ffb000`)**. This last one matters: Phase 1.2 makes amber the
   *learning* pip, so a C2 badge in amber would read as a status. Do **not** end the ramp on an
   amber/orange (`#f59e0b`); pick a distinct C2 hue (e.g. warm rose/coral clear of both red and
   amber). Update the `.paper` scope equivalents (there `--color-b1` == `--color-green` ==
   `#1e7a49` and `--color-amber` == `#b06a00` — decouple both). Check `GENDER_COLOR` maps in
   Review/Gym still read.
3. **Radii.** Two values: 10px controls, 16px cards/panels. The code currently holds
   `rounded-[7px]` (1×), `rounded-[9px]` (2×), `rounded-[10px]` (35×), `rounded-[12px]` (16×),
   `rounded-[14px]` (5×), `rounded-[16px]` (2×). Sweep **all** non-conforming values, not just
   9/12: `rounded-[7px]`/`rounded-[9px]`→10 · `rounded-[12px]`→10 (control) or 16 (card) by
   role · `rounded-[14px]`→16. Note 14 is the *de facto* card radius today (5 uses vs. 2 at 16),
   so 14→16 will visibly enlarge those corners — that is the intended normalization, but eyeball
   each card afterward.
4. **Accessibility fixes:** lighten small-size red text (add `--color-red-txt: #f0545e` or
   similar, AA at 13px on `#141b26`; use it wherever red renders below 15px). All icon
   buttons ≥ 44×44 hit area (ExamCard save/clear, header back buttons — padding, not visual
   size). Extend `prefers-reduced-motion` to the swipe rotation (disable `rotate` transform).
5. **Haptics:** `navigator.vibrate?.(10)` on grade commit (flip swipe + drill answer),
   wrapped in a tiny `haptic()` helper in `src/lib/ui.ts`. **Caveat, state it in the commit:**
   `navigator.vibrate` is unsupported in iOS Safari — this is a no-op on every iPhone. It is a
   real win on Android/Chrome and installed PWAs only. Do not describe it as "the biggest change
   to how it feels on a phone" for iOS; the `?.` guard makes it safe, not universal. If iOS
   feedback matters later, that's a separate task (Taptic via a wrapper), out of scope here.

**Acceptance (exhaustive, not spot-check).** The gate is *set equality*, not "these four are
gone." Extract every size/radius token and assert it belongs to the allowed union:

```bash
# Type: every text-[…px] must be in the UI scale OR an enumerated display pair.
grep -rhoE 'text-\[[0-9.]+px\]' src \
  | sort -u | grep -vE '^text-\[(11|13|15|20|22|24|26|28|32|34|38|40|44|46|52|56)px\]$'
# Radius: every rounded-[…px] must be 10 or 16.
grep -rhoE 'rounded-\[[0-9]+px\]' src | sort -u | grep -vE '^rounded-\[(10|16)px\]$'
```

Both commands must print **nothing**. (The type allow-list is UI scale 11/13/15/20 plus the
display-tier values that only ever appear inside `sm:` responsive pairs — if you add a size,
add it to the list *and* justify it.) Plus: no CEFR color equals green, red, or amber in either
`:root` or `.paper`; tsc/build clean.

## Phase 3 — Metaphor discipline & voice

**Goal: terminal in the room, plain language in the lesson.**

1. **Study-surface copy pass** (`Review.tsx`, `Gym.tsx`, `GrammarDrill.tsx`, session-related
   strings in `Today.tsx`): "Markets open · today's session" → "Today's session"; sidebar
   "Sector" → "Topic"; "OPEN" chip → "{n} left"; "To market" → "Done". Terminal vocabulary
   (markets, sectors, ticker, gains) remains ONLY in: the ticker, Markt/Explore, Galaxy,
   and marketing surfaces.
2. **Voice rule:** German nouns for surfaces (Üben, Wortkarte, Markt), English for actions
   and explanations. One pass over nav labels and headings in `App.tsx` to apply it
   consistently. Keep "Guten Tag".

**Acceptance:** no trading jargon rendered inside the session player or drill screens.

## Phase 4 — IA collapse: four surfaces

**Goal: Today · Study · Explore · Profile.**

> **Risk note — this is the one structural phase, budget it as such.** Markt, Decks, Wortkarte
> and Galaxy are today four *top-level* views, each owning its own back/nav and callbacks
> (`onStudySector`, `openMap`, `drillFor`). Nesting them into one Explore with a three-level
> drill-down (Markt → Decks → Wortkarte) plus a Market/Map segmented toggle is a rewrite of
> navigation state in `App.tsx`, not "just composition." Treat the back stack as the deliverable:
> write down the state machine (which level, which `initialGroup`, whether the toggle is on Map)
> before coding, and test every back path first. Do this phase alone, on an otherwise-clean tree.

1. **Explore (`App.tsx` + new thin wrapper `src/views/Explore.tsx`):** Markt is the landing
   level. Tapping a group drills into its Decks view (pass `initialGroup`); a deck's map
   action opens Wortkarte; Galaxy becomes a toggle within Explore (segmented control:
   "Market / Map"), not a top-level tab. Reuse the existing components — this is composition
   and navigation state, not rewrites.
2. **Nav:** PRIMARY = Today, Study, Explore, More. Gym moves under Study's landing (Study
   opens the session directly when something is due; a small "Targeted drills" link opens the
   Gym landing). MORE keeps Tutor, Mine, Blind Spots, Settings, Duel.
3. Preserve all existing deep-link callbacks (`onStudySector`, `openMap`, `drillFor`) —
   they now route through Explore's internal state.

**Acceptance:** bottom bar has 4 tabs + More; every previously reachable screen remains
reachable in ≤ 2 taps; back behavior within Explore is coherent.

## Phase 5 — Paper card faces + session aliveness

**Goal: the terminal is the room, the card is the thing in your hand.**

1. **Paper faces (`index.css`, `Review.tsx`):** apply the existing `.paper` token scope to
   the flip-card faces only (front and back) — cream surface, ink text, Fraunces headword
   (`.headword` already wired). The surrounding player chrome stays terminal-dark. Drill
   cards (`Gym.tsx` `Card`) get the same paper treatment for consistency within a session.
   Tune `GENDER_COLOR` for legibility on cream (the `.paper` scope already defines adjusted
   CEFR/semantic inks — reuse them).
2. **Item-type transition:** drill cards carry a small corner tag ("DRILL" or the mode name)
   ON the card, plus a 200ms crossfade/scale between item types in the player (motion
   `AnimatePresence` keyed by `item.srsId`). Remove the header DRILL chip from Phase-0 code.
3. **Streak & level moments:** in `SessionRecap`, animate the streak count in (motion spring,
   `Flame` icon pulse once). Level milestones need **crossing detection, which requires the
   prior value** — "shown milestones" alone cannot tell a crossing from a returning user who is
   already past the threshold. Store both:
   - `lexi.milestones.v1` → `{ [level]: highestThresholdShown }` (e.g. `{ B1: 50 }`).
   On recap, for each band compute the current known% from `levelStats()`, find the highest
   threshold ≤ current% among 25/50/75/100, and fire **only if it exceeds
   `highestThresholdShown[level]`** — then update the stored value to it. This means: a session
   that jumps a band 40→60% fires "50%" once; a returning user already at 80% has their stored
   value seeded to 75 on first recap **without firing** (seed silently if the store is empty for
   that band, so we never dump 25/50/75 at once); and an FSRS lapse dropping the band back below
   a threshold never re-fires, because the stored high-water mark only ratchets up. Populate
   `RecapData.milestone` with at most one line per recap (highest new threshold across bands).
   No confetti physics; restraint — one moment, well made.
4. **First-run guided session (`Today.tsx` + `App.tsx`):** if no placement AND zero cards
   learned, Today shows a single hero CTA ("Start here — 2 minutes") that chains placement →
   an auto-built 10-card first session → recap that explains the loop in one sentence
   ("These 8 words come back tomorrow — that's the whole system."). Store
   `lexi.onboarded.v1`. Reuse Placement and the session player; the only new UI is the hero
   card and recap copy variant.
5. **Mining ownership surfacing:** populate `RecapData.minedCount` from session items whose
   `id.startsWith('usr:')`; when > 0, `SessionRecap` renders "{n} of today's words came from
   your own texts." (Field already declared in the Phase 1 contract — no shape change.)

**Acceptance:** cards render paper-on-terminal in both flip and drill modes; transitions are
card-level; milestones fire once; a fresh profile (cleared localStorage) lands in the guided
first-run.

---

## Sequencing & verification

Phases are ordered by risk: 1–2 are mostly mechanical; 3 is copy; 4 is the only *navigation*
structural change; 5 is felt polish. **One caveat to the "stable base" story:** `SessionRecap`
is genuinely touched in three phases — built in 1, re-copied in 3, extended in 5 — which is why
its `RecapData` contract is frozen up front in Phase 1.4. As long as later phases only populate
already-declared optional fields, they don't reopen the component's shape; if you find yourself
changing `RecapData`, stop and reconcile, because two call sites depend on it.

After each phase: `npx tsc --noEmit` && `npm run build`, then `git diff --stat` review against
the phase's named files — any file outside the list needs a one-line justification in the
commit body. Final pass: clear localStorage, walk first-run → placement → session → recap →
Explore drill-down → Gym targeted drill, on a 380px viewport and desktop.
