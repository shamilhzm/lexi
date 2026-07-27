# Lexi — Backlog

The one prioritised list of **open** work, reconciled against the actual `src/`, so
it overrides anything in the older strategy docs. Shipped work and the reasoning
behind it live in [CHANGELOG.md](CHANGELOG.md).

Effort key: **XS** <½ day · **S** ~1 day · **M** a few days · **L** 1–2 weeks.
Each item lists *Why · Do · Done-when · Touches*.

Where a number appears (1,021 duplicate cards, 1,493 flagged definitions) it came
from a script in `scripts/corpus/`, not an estimate. Re-run the script before
trusting it — the last four times a count was guessed here it was wrong by a third.

---

## Now

### 1. Cross-level duplicate cards · M, human-gated
**Why.** **874 terms sit on more than one card; 1,021 cards are redundant — 14% of
the corpus.** `die Miete` exists at A1, A2, B1 *and* B2; `die Haltestelle` three
times. Each copy carries its own FSRS schedule, so a learner meets and re-learns
the same word up to four times. This is exactly the defect the capitalisation pass
fixed for 62 cards while a thousand more sat untouched.
It also inflates every other content programme: 75 duplicate groups still have a
copy awaiting a definition, so that authoring would be done two and three times over.
**Do.** Triage by group, never in bulk. Some pairs are genuine homographs — `der
See` / `die See` differ by article and so do not collide on term, but check for
others before assuming. Keep the lowest level, fold the rest through the existing
`casefix` id-map path so schedules survive the merge. Record a reason per group the
way `case-rulings.tsv` does.
**Done-when.** Every duplicate group is merged or carries a written reason;
`src/data/idmap.ts` covers every retired id; tests still green.
**Touches.** `scripts/corpus/`, `public/data/vocab.json`, `src/data/idmap.ts`.
> **Do this before item 3.** Otherwise a share of those definitions gets authored
> more than once.

### 2. Deep mobile pass · M
**Why.** Lexi is a phone app that has mostly been *verified* on a desktop viewport.
The PWA shell, bottom nav, hash routing and 44 pt targets all shipped, and one
responsive bug class (`mx-auto` on a flex item sizing to max-content) was found and
fixed — but no one has sat with it on a real handset for an hour. Everything below
is a specific thing to check, not a vibe:

- **Safe areas.** Notch, Dynamic Island and home indicator. `100dvh` is in use;
  confirm the session surface and the bottom nav respect `env(safe-area-inset-*)`
  in standalone PWA mode, which is where insets differ from the browser.
- **The keyboard.** Typed drills (`TypeItem`, Diktat, the class-list paste box) put
  a keyboard over the bottom half. Check the input stays visible, the `UmlautBar`
  is reachable above the keyboard rather than behind it, and Enter advances without
  the viewport jumping.
- **One-handed reach.** Grade buttons, skip and the flip target should sit in the
  lower two-thirds. The session header's controls currently sit top-right, which is
  the hardest place to reach on a large phone — this overlaps the "reduce session
  chrome" item under Next.
- **Swipe vs. scroll.** The flip card commits a grade at 90 px of horizontal travel
  (`SWIPE_PX`). Confirm it never fires during a vertical scroll of a long reveal,
  and that a C1 card with definition + `Auf Deutsch` + two examples + family + syn
  scrolls from the top rather than the middle.
- **Landscape**, and the small-phone floor (320 px). The Library's rule `pairs`
  render in a three-column grid that wraps at 375 px — check it degrades rather
  than overflowing.
- **Text scaling.** The ramp is rem-based and honours iOS Dynamic Type; test at the
  largest accessibility sizes, where fixed-height controls usually break first.
- **Offline and install.** Cold-start offline after install, and the HD voice's
  ~25 MB download on a mobile connection (Settings already warns; verify the
  failure path on a dropped connection).
- **Real-device haptics and audio.** `haptic()` and the WebAudio blips are
  unverified on iOS, where audio needs a user gesture to unlock.

**Do.** Run the app on a real iPhone and a real Android, in the browser *and*
installed, at default and largest text sizes. File what breaks; fix the layout and
reach problems in the same pass. Add a 375 × 812 render check to the verification
routine so regressions surface without a device.
**Done-when.** A full session — flip, every drill type, recap — is comfortable
one-handed on a 375 px phone with the keyboard up, in both themes, installed and
offline. No horizontal scroll anywhere at 320 px.
**Touches.** `src/index.css`, `src/views/Review.tsx`, `src/components/BottomNav.tsx`,
`src/components/UmlautBar.tsx`, `src/views/GrammarDrill.tsx`.

### 3. Definitions that discriminate senses, not enumerate translations · L, human-gated
**Why.** `def` is largely raw sense-listing rather than a definition. `corpus:definitions`
reports **1,493 cards** across three kinds: *enumeration* (1,064 — "railway depot,
railroad station, railway station, train station"), *bare* (363 — a lone synonym),
*repeat* (138 — "to eat; to eat; to dine"). A list of translations only says what
else the word could be called, which the `en` gloss already did.
**Do.** `corpus:definitions --write` emits batches; author worst-class-first and
apply through `fix-authored.ts`, which refuses a replacement that merely repeats the
gloss. A1 and A2 are the most-seen and are already down to 15.6% / 24.5% flagged.
**Watch for sense bugs, not just style** — this pass has already turned up `der See`
defined as "sea, ocean" (that is *die* See), `das Fleisch` as "flesh", `billig` as
"appropriate, meet, fair" (the archaic sense), and `mir` carrying the definition of
an oriental carpet.
**Done-when.** `repeat` and `bare` at zero; `enumeration` trending down and no
longer concentrated below B1.
**Touches.** `scripts/authoring/batches/def/`, `public/data/vocab.json`.

### 4. Finish the English definitions the German migration displaced · S
**Why.** 391 cards carry a German definition in `defDe`; **286 have no English one
at all** (A2 66, B1 165, B2 36, and a handful above). Those cards render without a
definition block for anyone below B2.
**Do.** Author English definitions for the B1 set next — it is the largest.
**Done-when.** `corpus:definitions` reports 0 cards with no English definition.
**Touches.** `scripts/authoring/batches/def/`, `public/data/vocab.json`.

### 5. Grow the corpus toward ~10k + rebalance A1/A2 · M, ongoing
**Why.** Distribution is B1-heavy (A1 965 · A2 1,802 · **B1 2,728** · B2 1,046 ·
C1 617 · C2 231) — backwards for early reading, and core high-frequency lemmas are
still missing. The pipeline is green (`corpus:selftest` 39/39, `corpus:validate`
PASS) but growth **needs a network- and LLM-enabled maintainer machine plus human
spot-checks of gender/plural/level — not an autonomous bulk commit.**
**Do.** `corpus:coverage` → build A1/A2 batches → `corpus:validate --strict` →
review the diff → commit, in reviewable batches. Close the top-frequency gaps first.
**Source material:** `reference/DaF Wortschatz/` — 69 page-mapped scans of a
complete A1–B1 Lektionswortschatz; see its `MANIFEST.md` and
[`archive/COHESION-PLAN.md`](archive/COHESION-PLAN.md) Phase 3 for the extraction
rules (entries are *selected and authored* in the book's style, never transcribed
wholesale). `IMG_4850` is the irregular-verbs appendix — feed it to the conjugation
engine's known-verb checks.
**Done-when.** ≥95% of the top ~2,000 lemmas per level; A1/A2 filled; validate
green; load size still acceptable.
**Touches.** `scripts/corpus/*`, `public/data/*.json`.

---

## Next

- **370 word cards carry an empty `pos`** (XS–S). Invisible today, but it is the
  same latent gap that produced the capitalisation mess: a card with no part of
  speech cannot be classified by any rule, so it silently opts out of the drills,
  the family index and half the validators. *Do:* infer where the article makes it
  unambiguous (a `der/die/das` headword is a noun), rule on the rest by hand as
  `case-rulings.tsv` does. *Done-when:* `pos` is populated or explicitly ruled for
  every word card.

- **Reduce the session chrome** (S — Part H of the session-quality plan). DESIGN.md
  promises the session is "full-bleed, no chrome at all"; it currently renders
  inside a card with a header, a chip, four icon buttons and a progress bar. *Do:*
  move flag / sound / undo / skip behind one overflow control, leaving the card, the
  grade and a way out. Pairs with the mobile reach work in Now #2.

- **Share and arrival readiness** (S each — Part G). The OG image still points at
  `/icon-512.png` with `twitter:card: summary`, so a shared link unfurls as a small
  square: render a real 1200 × 630 hero (reuse the canvas in `lib/sharecard.ts`) and
  switch to `summary_large_image`. Add a first-visit landing for link arrivals — one
  screen saying what Lexi is, that progress never leaves the device, the card count,
  one Start button. Lead the share card with a sentence rather than a treemap.

- **Illustration artwork — match the reference style** (M). The curated line-art
  layer that replaced emojis (`src/lib/illustration.tsx`, 54 concepts + a
  group-emblem fallback) is a solid first pass that does not yet match the intended
  look, and is **disabled** behind `SHOW_ILLUSTRATIONS = false`. *Note:* the
  reference screenshots live in the gitignored `reference/` folder on the
  maintainer's machine, not in the repo — pin the target style somewhere durable
  before starting, or this item cannot be picked up by anyone else. *Do:* redraw to
  that style, widen concept coverage, refine the weak ones (carrot, flower, dog),
  then flip the flag. *Done-when:* deck, market and word-map show art that
  matches, and every A1–B2 card resolves to a fitting icon.

- **Discourse-level cloze** (B2 #35 · S–M). Gaps are single words in single
  sentences; B2 needs a paragraph with the connectors removed. Blocked on having
  paragraphs — the reader ships sentences — so it needs a short authored text set
  first.

- **Reading-first mode above B2** (C1 #49 · M). Lesen exists; this is the surface
  around it — fewer numbers, longer texts, marginal glosses.

- **The remaining C2 stylistic points** (S, hand-authored). Register, ellipsis and
  Ausklammerung were deliberately deferred from the grammar pass as judgement-heavy
  and a poor fit for auto-drilling. *Stilebenen* shipped; ellipsis and Ausklammerung
  have not.

- **Run the *real* friend session** (S). The flagged-cards list, typo tolerance and
  the day-2 habit anchor all shipped; what no simulation supplies is a person. *Do:*
  sit a real beginner down with it and update
  [`SIMULATED-SESSION.md`](SIMULATED-SESSION.md) with what the simulation got wrong.
  That delta is the deliverable, not the session notes.

---

## Later / needs a decision before it can be built

- **Extended production** (C2 #57 · L, part research). Diktat is the only writing,
  and it works *because* the target is known to the character. Free composition
  cannot be graded honestly without a model, and a drill that marks correct German
  wrong is worse than no drill. Decide the shape before building anything.

- **Billing / €5 supporter tier.** The whole freemium split in
  [ROADMAP.md](ROADMAP.md) depends on it. No infra; the Support link (→ GitHub) and
  any Pro gating wait on this.

---

## Decisions required — not build items

- **Commit out loud to "English-base learners", or scope gloss-language layers**
  (persona S10). Silence drifts. The German-definition layer (`defDe`, shown from
  B2) is the first crack in a purely English-base assumption and was built anyway;
  decide whether that is a direction or an exception.
- **The name and the aesthetic** (persona C2 #58). "Lexi" plus a Bloomberg terminal
  reads fintech to an audience of language learners. The terminal earns itself in
  Progress and Explore and has less to say inside a session — which "two rooms"
  already concedes. Worth a deliberate call rather than a drift.

---

## Parked decisions — revisit deliberately, don't drift into

- ~~**Paper card faces.**~~ **Closed 2026-07-26: tried, and reverted.** Shipped
  2026-07-25 scoped to the flip faces and the two exercise surfaces; removed a day
  later, for two measurable reasons. `.paper` was authored as a *standalone
  whole-app theme*, so nesting it nested its accent — the brand hue swung 189° → 36°
  and every accented element inside a card inverted cyan→brown on entry. And it
  worked in one theme only: the cream card scored 18.4 contrast against the dark
  room and **1.07** against the light one, where it read as a stain rather than an
  object. The card is now distinguished by **material** inside one unchanging
  palette. The rule it produced — *a nested scope may change ground and ink, never
  the brand hue* — is in [DESIGN.md](DESIGN.md).
- **AI tutor & the Reader/Mine flow.** ROADMAP's two flagship paid features, cut
  from the core loop in the July prune. `lib/ai.ts` and the OpenAI-compatible client
  remain for **build-time corpus enrichment**, so re-adding a tutor is feasible —
  but it is roadmap-gated. The in-app "AI provider" widget is gone; its `store.ts`
  accessors (`aiConfig` / `setAiConfig` / `apiKey` / `setApiKey`) linger unused and
  can be deleted once a tutor is definitively off the table.

---

*Maintenance: when an item ships, move it to [CHANGELOG.md](CHANGELOG.md) with the
reasoning intact — this file holds only what is still open.*
