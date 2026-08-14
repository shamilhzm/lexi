# Lexi — Backlog

The one prioritised list of **open** work, reconciled against the actual `src/`, so
it overrides anything in the older strategy docs. Shipped work and the reasoning
behind it live in [CHANGELOG.md](CHANGELOG.md).

Effort key: **XS** <½ day · **S** ~1 day · **M** a few days · **L** 1–2 weeks.
Each item lists *Why · Do · Done-when · Touches*.

Where a number appears (1,021 duplicate cards, 1,493 flagged definitions) it came
from a script in `scripts/corpus/`, not an estimate. Re-run the script before
trusting it — the last four times a count was guessed here it was wrong by a third.

> **Consolidated 2026-08-04.** Four parallel branches were merged into one history
> (see the CHANGELOG entry). This file was rebuilt from both surviving backlogs —
> the Atlas/personas list on `main` and the open-work list on the stranded branch —
> with everything closed moved to the CHANGELOG and the duplicates folded together.
> Three pairs of items turned out to be the same item written twice: corpus growth,
> the mobile pass, and the reader. They are now one each.

---

## The 2026-08-05 quality pass — every card, every screen, every action

*Method: a new `npm run corpus:audit` over all 7,389 cards; a DOM harness run against
all five routes at 1280px and 375px in both themes; and the session loop driven
end-to-end. Numbers are measured, not estimated. **Two of my own audits were wrong
first** — see the "checks that were tried and removed" block at the top of
`scripts/corpus/audit.ts`, and the contrast note below — so treat any new check that
fires on thousands of rows as a bug in the check.*

### What is clean, stated so nobody re-audits it

- **Contrast passes everywhere**, light *and* dark, on all five routes. An initial run
  reported six dark-theme failures including one at 1.0:1; every one was an artifact of
  toggling `.dark` at runtime and measuring mid-transition, or of measuring the
  off-screen sidebar. Re-measured on-screen after settling: **zero**.
- **Every control has an accessible name** on every route. Zero unnamed.
- **No horizontal overflow** at 375px on any route.
- **No console errors** anywhere in the walk.
- **The session loop is correct.** Grade advances the counter and the headword; undo
  rewinds both; skip advances without grading; flag and mute are present and labelled.
  The card is a real focusable control (`role="button"`, `tabIndex 0`, `aria-label`).
- **Examples**: 0 cards under two examples, 0 leading with a scrape.
- **Corpus audit: 0 errors** across all 7,389 cards — no article/gender mismatch, no
  unknown sector, no untranslated example, no markup leaking into a field.

### 🔴 The matcher is wrong about verbs, and it is about to become the headline

**The finding that matters most, because it lands on Now #2.** The matcher fails to
resolve the headword in **3,611 of 16,681 example rows (21.6%)**. Verified by hand,
three distinct defects — and two produce *wrong* answers, not missing ones:

| Sentence | Token | Resolves to | Should be |
|---|---|---|---|
| Ich **weiß** es nicht. | weiß | **weiß** (white) | wissen |
| Ich **rufe** dich an. | rufe | **der Ruf** (the call) | anrufen |
| **Gib** mir das Buch. | Gib | *(no match)* | geben |

Stem changes are fine (`nimmt`→nehmen, `fährt`→fahren). What is broken is **strong-verb
homographs, separable verbs, and imperatives** — three of the most common things in
any German sentence. The hard cases by part of speech: **verb 593**, phrase 183,
*empty-`pos`* 107, noun 71.

**Why this is urgent rather than interesting.** The comprehension meter exists to state
one number honestly. A homograph that resolves to the wrong card makes that number too
*high* (knowing the colour *weiß* would count you as knowing *wissen*); a missing
imperative makes it too *low*. Shipping Phase 1 on this matcher ships a dishonest
meter — and "honest" is the entire competitive claim (COMPETITIVE-RESEARCH §5).
**Do this before Now #2 Phase 1.** *S–M · `src/lib/matcher.ts`, `conjugate.ts`.*

### 🟠 Real content defects

- **~71 cards whose example does not contain the word** — not an inflection the matcher
  missed, the word is simply absent. `das Pferd` is taught with *"Meine Tochter möchte
  gern reiten lernen."*; `die Uhr` with *"Können Sie mir sagen, wie spät es ist?"*.
  Thematically adjacent, lexically useless. *S, human-gated.*
- **370 cards carry an empty `pos`** — and this pass shows the cost is not latent: 107
  of them are matcher misses *because* nothing can classify them. Promoted out of Next.
- **1,493 definitions still flagged** (enumeration 1,064 · bare 363 · repeat 138) and
  **286 cards with no English definition** — unchanged, tracked as Now #5.
- Two singletons: `der Makler` lists itself as a synonym; `Verzeihung` is tagged
  `interjection` but is a noun.

### 🟡 Screens — measured at 375px with a coarse pointer

| Route | controls | <44px | clipped |
|---|---|---|---|
| Today | 18 | **4** | 0 |
| Progress | 31 | **9** | 0 |
| Progress → Decks | 1,197 | **311** | **77** |
| Library | 31 | **0** ✅ | 0 |
| Profile | 61 | **44** | 0 |

- **Library is the proof it can be done** — 31 controls, none under 44.
- **Decks is the worst surface in the app**: 311 sub-44 controls and **77 clipped deck
  subtitles** (e.g. *"Intermediate descriptive adjec…"* at 252px in a 142px box).
- The repeat offenders are the **CEFR filter chips at 31×25** (on both Progress and
  Decks), the **sort chips** (*Urgent* 62×23, *Size* 45×23), and the **Markt/Liste
  toggle** at 68×27 — a handful of shared components, not hundreds of separate fixes.
- **Today's *Start session* is 42px** — the app's primary action, 2px under.
- **Profile's name input is 151×22**, the shortest interactive target in the app.
- **`#/progress/decks` renders no `<h1>`** — the only route with no top-level heading.

---

## The 2026-08-06 grammar audit — comprehensive where it is easy, thin where it sells

*Measured over `public/data/grammar.json`: 131 points, 805 exercises, five widget
kinds (choose 404 · type 147 · error 106 · mc 93 · order 55).*

### What is genuinely good, so it is not "improved" by accident

- **A1–B1 is comprehensive** — 92 of the 131 points, and B1 (40) goes past a
  standard syllabus: Partizip Präsens als Adjektiv, Relativsätze mit Präpositionen,
  Konjunktiv II der Vergangenheit, `je … desto`. This is not the weak part.
- **Interaction variety is better than it looks.** I expected monotony and did not
  find it: **zero** of 131 points use a single widget kind; 53 use three and 60 use
  four. A learner drilling one concept does not get six identical gap-fills.
- **The instructions are adequate.** `error` says "Tap the wrong word", `order`
  says "Tap tiles to build the sentence", `type`/`order` carry a `DrillHeader`
  naming the concept. `choose`/`mc` (62% of all items) carry no instruction and do
  not need one — a gapped sentence over three options is self-evident, at every
  level sampled from A1 *"___ Mann ist groß."* to C2 *"Wer eine Wohnung ungesehen
  mietet, …"*.

> **Exercise depth closed 2026-08-12.** `npm run corpus:genex` took the bank
> **887 → 5,207** (4,320 generated across 35 derivable points; 101 points stay
> authored because their exercises cannot be derived). The interaction-variety
> finding below still stands and is unaffected — generated items are all `choose`,
> so they add depth to points that already had four widget kinds rather than
> flattening them. See the CHANGELOG entry, and in particular the six wrong forms
> the first run produced: the lesson is that a generator bug is four hundred bad
> exercises, so the spot-check is not optional.
>
> **Partly addressed 2026-08-11.** B2 now has 21 points, and the ones added since
> this audit are genuinely new rather than B1 re-treads: Zustandspassiv, the
> position of *nicht*, adversative connectors (dennoch/allerdings/hingegen),
> da-compounds, adjectives with a fixed preposition. `npm run corpus:gex` took the
> bank 835 → 887 exercises. The "11 of 16" count below is the state at the time of
> the audit and is now stale; the *shape* of the finding — B2 is where the money is
> and it was the thinnest real layer — is what stands.

### 🔴 B2 is mostly revision of B1, and B2 is where the money is

**11 of 16 B2 points re-tread a topic already taught at A2 or B1**, several under a
near-identical title:

| B2 point | already at |
|---|---|
| n-Deklination | A2 *and* B1 |
| Genitiv | B1 |
| Plusquamperfekt | B1 (*Plusquamperfekt & nachdem/bevor*) |
| Zweiteilige Konnektoren | B1 (same title) |
| Finalsätze (um … zu / damit) | B1 (*Finalsätze: damit & um … zu*) |
| Passiv · Passiv Perfekt | A2 Passiv Präsens, B1 ×2 |
| Konjunktiv II (Gegenwart) | A2, B1 ×2 |
| Adjektivdeklination | A2 ×3, B1 ×2 |
| Relativsätze | B1 |
| Temporale Nebensätze | B1 ×2 |

So B2 contributes roughly **four new points** — Konnektoren (deshalb/trotzdem),
Textadverbien, Modalpartikeln II, and arguably Verben mit Präpositionen. Goethe B2
is the certificate that gates university admission and many jobs; it is the second
most-taken exam in the category, and it is the thinnest real layer in the bank.
*M, human-gated.*

### ⚠️ Grammar points can only ever be appended — and nothing says so

*Found 2026-08-06 while costing the A1 reassignment below, which is what turned
that item from XS into a migration.*

`lib/grammar.ts:120` mints exercise card ids as **`gex:<level>:<pointIndex>:<exerciseIndex>`**,
where `pointIndex` is the point's **array position within its level**. Those ids are
what every learner's FSRS schedule is keyed on.

So inserting a point anywhere but the end of a level, reordering two points, or
moving one between levels **silently re-points every subsequent schedule at a
different exercise**. No error, no migration, no way to notice: a learner who had
mastered *Perfekt* would find their progress now attached to whatever slid into
that index.

It has never bitten because `corpus:grammar --write` only ever `push`es
(`grammar-supplement.ts:559`), and appending preserves every existing index. That
is load-bearing behaviour that reads like an implementation detail.

**Do (S):** either key exercises on something stable — the point's title, as
`gram:<level>:<title>` cards already are — with `src/data/idmap.ts` carrying the
one-time migration; or, if positional ids stay, assert the constraint in a test
that pins the current point order per level so any insertion fails CI loudly
rather than corrupting schedules quietly. The first is correct; the second is
cheap and would have caught this.

### ~~🟠 Four A1 exam topics are filed at A2~~ — **stale, verified 2026-08-11**

*Modalverben, Trennbare Verben, Imperativ and Perfekt are all in the A1 list today.
The block below is kept because its analysis of the `gex:` id hazard is still live
and still unfixed; the level assignment it describes is not.*

**Modalverben, trennbare Verben, Imperativ and Perfekt** all sit at A2. Goethe A1 /
Start Deutsch 1 tests all four, and Netzwerk/Menschen introduce them in A1.2. The
content exists and is good; the *level assignment* is wrong, and it matters
because the CEFR filter scopes what a learner is shown — an A1-scoped learner
never meets them.

**Re-costed 2026-08-06: not XS.** Moving a point between levels changes its
`gram:<level>:<title>` id (five hardcoded references in `Fundamentals.tsx`:
`TENSE_POINT`, `MODE_REMEDY` ×2, `separable`) *and* shifts the positional `gex:`
index of every later point in **both** levels — see the hazard above. It needs
`idmap` entries and a schedule migration, so **S–M**, and it should wait until
exercise ids are keyed on something stable. Still human-gated on the pedagogy:
whether Lexi follows Goethe's A1 or a stricter CEFR reading is your call, not a
script's.

### 🟡 C1/C2 are 23 points, but the choices are right

Thin, as the critique said. What is there is well chosen — Funktionsverbgefüge,
Nominalisierung ↔ Verbalstil, Passiv-Ersatzformen, Gerundivum, Stilebenen. This is
a volume problem, not a taste problem, which is the better of the two to have.

---

## The 2026-08-11 exam-readiness pass — the corpus has the words and hides them

*Method: the app's own `buildMatcher` run over every German word of the new telc B1
paper, scoped to a corpus filtered to each CEFR level; plus an 82-word probe of the
Start Deutsch 1 / telc A1 core lexicon (form-filling, time, shopping, housing,
transport, everyday health) against the shipped corpus. Numbers are measured.*

### ⚠️ A withdrawn finding, kept because the mistake is the lesson

**What was written here first — "an A1-placed learner reaches 34 of the 82 core A1
words, 41%; Wohnen 1 of 13" — was wrong, and it is worth saying loudly because it
briefly reordered this file.** The probe looked each word up in a `Map` built by
iterating the corpus, so for any term on more than one card it kept whichever copy
came *last* and reported that card's level. **874 terms sit on more than one card**
(Now #3). `der Tisch` exists at A1 *and* B1; the probe saw the B1 copy and concluded
the word was gated. Every alarming row in that table was a duplicate, not a gate.

Measured properly — *does an A1 card exist for this word* — the real figure before
any change was **69 of 81 = 85%**. Bad, not catastrophic.

The lesson is the one already at the top of this file, and I re-learned it the
expensive way: *treat any new check that fires on thousands of rows as a bug in the
check.* A first-wins/last-wins lookup over a corpus with a known duplicate problem
is exactly that bug.

**What this really found is Now #3.** A learner meets `der Tisch` at A1 in *Home*
and again at B1 in *Furniture*, with two FSRS schedules and two sectors. That is the
defect, and it is already ranked. This pass raised its evidence, not its position.

### ✅ The Goethe A1 relevel — done 2026-08-11, and smaller than advertised

`npm run corpus:relevel:a1`, against the published Goethe-Zertifikat A1 / Start
Deutsch 1 Wortliste (657 lemmas, extracted from the official PDF by column position
and committed as `scripts/corpus/data/goethe-a1-wordlist.txt`).

- **162 words promoted to A1** — every one a word the A1 exam examines that had *no*
  A1 card at all. A1 word cards **964 → 1,126**. On the 82-word probe: **85% → 91%**,
  gaining `Formular`, `Termin`, `die Kasse`, `der Balkon`, `E-Mail`.
- **Nothing demoted.** Lexi holding a word at A1 that Goethe omits is not an error,
  and pushing it up would take it from the learner who needs it most.
- **A part-of-speech guard earns its place.** Article-stripped matching let Goethe's
  noun `der Dank` find Lexi's *preposition* `dank`, `das Lokal` find the adjective
  `lokal`, the verb `reisen` find the nominalisation `das Reisen`, and the
  interjection `Achtung!` find the abstract noun `die Achtung` ("respect"). Four
  genuinely B1+ words would have been promoted on the authority of a homograph.
  Goethe prints the article for nouns and omits it otherwise, so the list carries
  the signal to catch all four.
- **A relevel is a schedule migration.** Word ids embed the level
  (`voc:B1:der Tisch`), so 162 `ID_MAP` entries shipped with it — plus **nine
  existing entries re-pointed**, because they aimed at ids this pass moved
  (`voc:A2:Oben` → `voc:A2:oben` → `voc:A1:oben`). Three files hold a card id and
  all three are migrated by the script: `vocab.json`, `provenance.json` (37 rows)
  and the id map; `cards.json`/`detail.json` follow via `corpus:split`.

**Was open here, now closed:** 109 syllabus entries were absent from the corpus.
**52 of the content words shipped 2026-08-11** through the new verified authoring
path — `der Euro`, `das Ticket`, `der Familienname`, `der Geburtsort`, `das Schild`,
`der Kilometer` and the rest. What remains is deliberate: closed-class function
words (`denn`, `kein`, `mehr`, `nichts`, `seit`) that `FUNCTION_WORDS` already
excludes from every count, and a handful of extraction artefacts.

### 🟠 Genuinely absent, and not obscure — verified, and unaffected by the above

`Euro` · `Prozent` · `Ticket` · `Anfang` · `Projekt` · `genug` · `Zustand` ·
`Familienname` · `Geburtsdatum` · `Geburtsort`. You cannot read a German newspaper
or a B1 reading paper without *Prozent* and *Euro*, and the last three are printed
on the A1 answer sheet itself.

**No feminine `-in` forms anywhere.** `der Lehrer` ships; `die Lehrerin` does not,
and neither do Sprecherin, Muttersprachlerin, Besucherin, Kundin, Teilnehmerin. Exam
texts use paired and Binnen-I forms constantly. Cheaper as a *matcher* rule
(derive `-in`/`-innen` from the masculine card) than as several hundred new cards —
which makes it the same fix as the item below.

### 🔴 The comprehension meter would under-report by ~8 points, for two fixable reasons

**This lands on Now #2, the flagship, whose entire claim is an honest number.** Run
over the B1 paper against the *whole* corpus, the matcher resolves 83.6% of content
tokens. Classified by hand, the shortfall is mostly not vocabulary:

| bucket | share of content tokens | examples |
|---|---|---|
| grammatical words missing from `FUNCTION_WORDS` | **3.9%** | etwas, alles, nichts, mehr, jeder/jede/jeden, andere, jemand, einige, solche, **ihren/ihrem/seinen/seines/unsere** (inflected possessives), zurück (particle), hause |
| proper nouns `isLikelyEntity` misses | **1.4%** | single-capital names — Reuter, Ahrens, Leipzig, Katja |
| inflections the matcher drops | **2.5%** | genitives (Kurses, Romans, Vaters, Hauses), adverbial `-s` (samstags, montags, nachmittags), `-in` feminines, spelled-out numerals (fünfzehn, achtzig) |
| genuine vocabulary gaps | 9.0% | the list above, plus authored compounds |

The first three are denominator bugs, not learning gaps, and together they are
**7.8 percentage points** — enough to move a text from "readable" to "not readable"
against the 95/98 bands the meter exists to report. Fix before Phase 1 ships, for
the same reason the verb-homograph defect above it is blocking.
**Do (S):** extend `FUNCTION_WORDS` with the indefinite/possessive inflections;
tighten `isLikelyEntity` with a name list or a capitalised-and-unresolvable rule;
add genitive `-s/-es`, adverbial `-s` and `-in/-innen` derivation to the index.

### ✅ Grammar is not the problem, and one item here was stale

Every structure the B1 paper tests has an authored point at or below its level —
weil-word-order, aber/trotzdem/sondern, Akkusativ endings, relative-pronoun case,
`am …sten`, `bei`+Dativ, damit vs. um…zu, verbs with fixed prepositions, `falls`,
Konjunktiv II. **And the "four A1 exam topics are filed at A2" item below is out of
date:** Modalverben, Trennbare Verben, Imperativ and Perfekt are all in the A1 list
today (points 21–24). Nothing in the CHANGELOG records the move, which is its own
small lesson. Struck from Next.

---

## Now

Ordered. The reasoning for the order is in each *Why*; the short version is that
**#1 unblocks eight items that are written but unproven**, and it costs a day.

### 1. The real-device pass · S · 📱 — *do this first*

**Why.** Not because it is the most valuable item, but because it is the cheapest
way to stop lying in this file. Eight items across the Fifty are **written,
plausible, and unverified on hardware**, and they cannot be called done from a
browser: the 44px touch targets (gated on `any-pointer: coarse`, which no desktop
viewport reports), the "Tap the card" hint, safe-area insets in standalone PWA
mode, Dynamic Type at the largest accessibility sizes, iOS storage eviction after
7 days of ITP, `haptic()` and the WebAudio blips (iOS needs a gesture to unlock
audio), the keyboard covering typed drills, and the HD voice's ~25 MB download on
a mobile connection. Every one of them is currently a claim.

The audit that produced the Fifty said this out loud and it is still true: the
iOS Simulator was unavailable (host had Command Line Tools only, no `simctl`), so
every "mobile" finding to date is a 375×812 *browser* viewport that reports
`(hover: hover) and (pointer: fine)`.

> **Partly done 2026-08-05 — and the premise was wrong.** The audit recorded that
> "no browser viewport reports `hover: none`", which is what made these items
> unverifiable and parked them behind hardware. That is true of *resizing* a window
> and false of **device emulation**: at the mobile preset the browser reports
> `any-pointer: coarse`, `hover: none`, `pointer: coarse`, `maxTouchPoints: 5`. So
> the touch-gated CSS was measurable all along. What that produced:
>
> - ✅ **`.tap-44` confirmed working.** All five gated controls measure ≥44 with a
>   coarse pointer active (sidebar rows 223×44, *Start session* 219×44, profile
>   223×48). Previously unprovable — the rule had never once fired in a test.
> - ✅ **A real bug, fixed.** `.desk-in` scaled from `.985`, and a stalled entrance
>   sits on its `from` frame — so every 44px control in the session rendered at
>   **43.34px** while its CSS said 44. See the DESIGN.md §7 corollary; the rule now
>   forbids scaling a subtree that holds sized targets, guarded and mutation-checked.
> - ❌ **The `.tap-44` pass never reached the content surfaces**, which is where the
>   audit's "16 to 69 controls under 44px" actually lives. Measured with a coarse
>   pointer, still open (below).
>
> **First run on real iOS, 2026-08-05.** Xcode 26.6 + the iOS 26.5 runtime are now
> installed; Lexi has been loaded in Safari on a booted **iPhone 17 Pro** simulator
> for the first time. Two findings confirmed against the real renderer:
> - ✅ **#30 confirmed, and understated.** The three stacked control rows are exactly
>   as described (Markt/Liste · the six CEFR chips · *Study all*) — and the treemap
>   does not begin until roughly **half the viewport** is spent, against the audit's
>   "~200px". Screenshot evidence, iPhone 17 Pro, Safari.
> - ✅ **#31 confirmed.** The play FAB sits directly on the treemap and **truncates
>   the tile label underneath it** ("Work & Eco…"), so it is a legibility bug as well
>   as two interactive things sharing pixels.
> - The bottom nav clears Safari's toolbar with no overlap in browser mode.
>
**Driven on the simulator, 2026-08-05 (tap + swipe, iPhone 17 Pro / iOS 26.5).**
- ✅ **The touch affordance is right on real iOS.** The session coach marks read
  **"Tap the card to flip it"**, not "Space to flip". This is the item the audit
  explicitly could not settle; settled.
- ✅ **The first-sight grade scale renders correctly**: two buttons (*Still learning*
  / *Got it*) with their interval previews (1 min / 10 min), and the first-sight
  line beneath. The four-grade scale correctly does not appear for an unseen card.
- ⚠️ **#32 sharpened, and a claim of mine withdrawn.** On first run the coach marks
  wrap to **three lines** at 402pt and push the grade buttons below the fold. I first
  wrote that this made grading impossible; **that was too strong and is withdrawn.**
  The outer session wrapper (`h-[100dvh] overflow-y-auto`) *does* scroll —
  `scrollHeight` 722 against `clientHeight` 640 — and swiping **off** the card
  scrolls the buttons into view. What is true: on first run the primary action
  starts below the fold, and it is the coach marks that put it there.
- ❓ **The card may swallow vertical scroll — needs a real finger.** A vertical swipe
  *starting on the flip card* scrolled nothing in the simulator, twice; the identical
  swipe starting on the session header scrolled fine. The card is a framer-motion
  `drag="x"` surface carrying `touch-pan-y`, which *should* permit vertical panning,
  and the card covers most of the screen — so if this reproduces under a real finger
  it means the natural scroll gesture is dead across the primary surface. **Not fixed,
  deliberately**: synthetic swipes and iOS's real touch-axis arbitration are not the
  same thing, and a speculative fix to the grading gesture is not worth the risk.
  Confirm on hardware first.

> ⛔ **The ceiling, now that the toolchain is clear.** `sudo xcode-select -s
> /Applications/Xcode.app/Contents/Developer` was run and the live panel works. What
> no simulator can settle: **real haptics**, **7-day ITP storage eviction**, **true
> network conditions for the ~25 MB voice**, and **real touch-axis arbitration** (the
> open question directly above). Those want a physical handset.

**Still open — measured, not guessed (375×812, coarse pointer, 2026-08-05).**
Every number below is a rendered `getBoundingClientRect`, not a reading of the CSS.
- **Session surface** (the primary one): the four speaker buttons at **23×23**;
  *Hear the example* at 45×24; *Where this came from* at 127×13; the first-sight
  *Got it* at 34×15.
- **Today**: *Start session* at 308×**42** — the app's primary action, 2px under;
  the time-budget chips (*3 min*) at 51×**25**; *Paste a list* at 99×33; the KPI
  chip at 115×34.
- The `IconButton` pattern itself is correct at exactly 44×44 once nothing scales
  it, so this is reach, not rebuild: the fix is applying it (or a `::before` hit
  area, as the sidebar chevron already does) to the controls above.
- No horizontal overflow at 375px on Today or in the session (`scrollWidth` 375).

**Do.** Install Xcode (for the Simulator) or attach a real handset, then run a full
session on a real iPhone *and* a real Android, in the browser and installed, at
default and largest text sizes, in both themes, offline after a cold start.
Specifically check: safe areas (notch, Dynamic Island, home indicator) on the
session surface and bottom nav; the `UmlautBar` sitting above the keyboard rather
than behind it; that a 90px horizontal swipe (`SWIPE_PX`) never fires during a
vertical scroll of a long C1 reveal; one-handed reach on the grade buttons;
landscape; and the 320px floor, where the Library's rule `pairs` render in a
three-column grid that already wraps at 375px.

**Done-when.** A full session — flip, every drill type, recap — is comfortable
one-handed on a 375px phone with the keyboard up, installed and offline; no
horizontal scroll at 320px; and each of the eight claims above is either confirmed
or has a bug filed under it.
**Touches.** `src/index.css`, `views/Review.tsx`, `components/BottomNav.tsx`,
`components/UmlautBar.tsx`, `views/GrammarDrill.tsx`.

### 2. The comprehension meter — the flagship · L (decided 2026-07-27)

**Why.** From the competitive pass ([COMPETITIVE-RESEARCH.md](COMPETITIVE-RESEARCH.md)):
Lexi builds an honest per-lemma knowledge model and spends it entirely on describing
itself. The 95–98% **lexical coverage threshold** (Hu & Nation; Kremmel et al. 2023) is
the most robust finding in reading-based SLA, and every competitor approximates it
badly — Lenguia scores text by generic CEFR band, LingQ by an admittedly inflated
word-form counter its own staff calls *"the mechanical rabbit at a dog race"*, graded
readers by a population average. FSRS state **is** a forgetting-aware per-lemma model,
which makes Lexi the only product in the category able to compute the number honestly.
It is also the first feature that makes the corpus bottleneck stop mattering: unknown
words arrive from the learner's own text instead of the hand-gated word list.

**Scope ruling (2026-07-27).** *Additive.* Known and the market **stay the headline**;
the meter is a new first-class surface, not a replacement identity. The full reframe was
argued and declined — see the ruling block in COMPETITIVE-RESEARCH §5.

> **Reconciled 2026-08-04.** A reading surface already shipped on the stranded
> branch — **Lesen** (`lib/reader.ts`, `components/ReadingList.tsx`, surfaced on
> Today): sentences you can almost read, drawn from the existing corpus. It is a
> genuine down-payment on this item and it does the **retrieval** half. What it does
> not do is the **measurement** half — report coverage against the 95/98 bands for a
> text the learner brings. Build Phase 1 *on* Lesen rather than beside it, or the app
> ends up with two reading surfaces that disagree.

**Phase 0 · prerequisites (S).** Land these first; each is independently defensible.
- ~~Port `buildMatcher` back app-side.~~ ✅ **2026-08-04.** Now `src/lib/matcher.ts`;
  `scripts/corpus/lib.ts` imports the app's copy. One implementation, so the meter and
  `corpus:coverage` cannot disagree about what "known" means. `corpus:selftest` 39/39
  and `corpus:validate` PASS through the moved module.
- ~~Order fresh cards by frequency *within* a CEFR band.~~ ✅ **2026-08-04.** Band is
  the outer sort, frequency the tiebreak, in both `firstRunIds` and the fresh-card fill
  in `buildBriefing`. New `src/lib/freq.ts` + `public/data/freq.json` (49 KB, emitted by
  `npm run corpus:freq` from the ranks provenance already carries). Unranked cards keep
  corpus order behind the ranked ones; a missing or failed `freq.json` degrades to the
  old behaviour rather than failing to boot. 11 tests, mutation-checked.
- **Extend `freqRank` to all cards · S, maintainer machine.** Still open, and now the
  only thing limiting the ordering above: ranks cover **1,986 of 7,389 cards (27%)** —
  the rest predate the provenance log. Not a random 27% either, since those cards were
  *discovered through* the frequency list, so today's ordering is mildly
  self-fulfilling. The ranks come from the Leipzig lists `build.ts` already loads, but
  filling them means a `corpus:build` run, which is human-gated (CLAUDE.md) and needs
  the network-enabled maintainer machine. **When it lands, re-run `npm run corpus:freq`
  and nothing else has to change** — the app side is finished and coverage-agnostic.

**Phase 1 · the meter (M).** Paste (or save a URL's text) → annotate via the matcher →
report coverage against the 95/98 bands, honestly and with the count, not just a
percentage. Then: *"the N words that get you over the line"*, ranked by frequency ×
recurrence in this text, one tap into the session as a `{kind:'custom', ids}` target
carrying a **new `SessionReason`** — `{ kind: 'unlock'; text: string }` — with a
`whyLine` case, so the scheduler shows its work here too ("because you want to read
this"). Plus the read-back view: known/learning/new tinting from FSRS state, tap for
gloss + gender/plural, tap to add.
**Done-when.** A pasted text reports a coverage figure that matches a hand count; the
unlock set demonstrably raises it on re-check after those cards reach Review; `whyLine`
has a tested `unlock` case; proper nouns and function words are excluded from the
denominator the way `isNeutralWord`/`isLikelyEntity` already decide.

**Phase 2 · the library that returns (M).** Saved texts, each with a **live meter that
moves as you study** — the app's first return mechanism that isn't self-referential.
Listening is *plumbed* here — `lib/audio.ts` and the Piper HD voice both ship — but human
audio covers **10 of 7,389 cards (0.14%)**, so in practice this still means synthesis.
⚠️ **Licensing:** ship learner-pasted text and learner-saved URLs only. Do not bundle a
feed of someone else's journalism — DW's *Langsam gesprochene Nachrichten* is the
obvious fit and is **not** automatically redistributable. Check terms before any
bundled content. (The Tatoeba audio allow-list in `corpus:audio` is the precedent for
how carefully this needs doing.)

**Phase 3 · output, narrowly (M).** Not a chatbot. *"Write one sentence using these
three words"* with grounded, mostly-deterministic checking, reusing `norm`, the
`editDistance1` near-miss grading that now ships, and the hint ladder. Local-first
survives. On-device WebGPU (a ~1B model is fine for a <100-token correction, useless
for conversation) is an implementation option here, not a strategy — see the refusals
list in COMPETITIVE-RESEARCH §5.

**Touches.** New `src/lib/matcher.ts` (moved), `src/lib/reader.ts` (extend),
`src/lib/coverage.ts` (new), `session.ts` (`SessionReason`, `whyLine`), `store.ts`
(saved texts), `scripts/corpus/build.ts` (freqRank fill).

### 3. ~~Cross-level duplicate cards~~ · ✅ done 2026-08-11

> ✅ **Closed 2026-08-11.** All 874 groups merged across two passes — **7,394 →
> 6,264 cards, 0 terms left on more than one card.** The second pass rejected the
> first pass's own framing: the question is not "is this a homograph?" but "should
> one German word have two cards?", and the corpus already answered it (`die Bank`
> is one card glossed "bank; bench"). So senses are **unioned** onto the keeper —
> `der Zug` is now one A1 card reading *"train; move / turn"* — instead of a second
> sense living on a card the learner met and re-learned separately.
>
> **The matcher improved enormously and for free.** `corpus:validate`'s reader
> probe, with `matcher.ts` untouched, went from **verb 0.75 · plural 0.84 · adj
> 0.84** to **verb 0.97 · plural 0.995 · adj 0.935**. Duplicates were shadowing each
> other in a first-wins index, so a token resolved to whichever copy came first —
> often the one with no plural recorded. This was also the mechanism behind the
> withdrawn A1 measurement above.
>
> *Left over:* **287 merged groups had disagreeing sectors** and kept the lowest
> copy's, flagged in `dupe-rulings.tsv` for `corpus:resector`. `die Handschuhe` now
> sits in *Skiing and snowboarding* rather than *Clothing*. 14 sectors emptied
> entirely and were dropped.

**Why.** **874 terms sit on more than one card; 1,021 cards are redundant — 14% of
the corpus.** The 2026-08-11 pass raised the evidence for this item and, briefly,
mistook it for a levelling problem: `der Tisch` is at A1 in *Home* and at B1 in
*Furniture*, `der Zug` at A1 in *Town & travel* and B1 in *Games*. `die Miete` exists at A1, A2, B1 *and* B2; `die Haltestelle` three
times. Each copy carries its own FSRS schedule, so a learner meets and re-learns
the same word up to four times. This is exactly the defect the capitalisation pass
fixed for 62 cards while a thousand more sat untouched. It also inflates every other
content programme: 75 duplicate groups still have a copy awaiting a definition, so
that authoring would be done two and three times over.
**Do.** Triage by group, never in bulk. Some pairs are genuine homographs — `der See`
/ `die See` differ by article and so do not collide on term, but check for others
before assuming. Keep the lowest level, fold the rest through the existing `casefix`
id-map path so schedules survive the merge (`store-idmap.test.ts` guards that the
schedules actually travel). Record a reason per group the way `case-rulings.tsv` does.
**Done-when.** Every duplicate group is merged or carries a written reason;
`src/data/idmap.ts` covers every retired id; tests still green.
**Touches.** `scripts/corpus/`, `public/data/vocab.json`, `src/data/idmap.ts`.
> **Do this before item 5.** Otherwise a share of those definitions gets authored
> more than once.

### 4. The Atlas, pass 2 — composition and continuity · M

**Why.** The five P0s are closed (CHANGELOG, July 28 + 31). What remains is the
diagnosis the twelve personas actually returned: the aesthetic promises density,
precision and liveness, and the implementation still ships sparseness and
compression in places. These are the ranked survivors, and they are mostly *layout*,
which is why they group into one pass rather than fifteen tickets.

**Composition (the largest remaining visual finding).**
- **Break the single-column stack (#19 · M · P1).** Six identical rounded rectangles
  at one width on a 1280px screen, each with 40–60% empty space to its right.
- **The desk is letterboxed on desktop (#22 · S · P1).** DESIGN.md §8 promises
  full-bleed; an ~800px column in a 1280px viewport is not that.
- **The card becomes a lexicon entry (#21 · M).** Headword · IPA · POS · sense ·
  citation is already the content model; the layout doesn't use it. Also closes the
  ~250px of dead space inside the card on desktop.
- **Content clips at both widths (#5 · S · P1).** One of the four measured clips was
  fixed; three remain — deck names 252→188, Today overflowing its own column by 8px
  (999>991 desktop, 350>342 mobile), and a Today `text-2xs` line clipping 406→237.
- **Mobile Progress spends ~200px on chrome before any map (#30 · S · P1)**, the FAB
  overlaps the treemap (#31 · XS · P1), and coach marks eat 200px of 812 (#32 · XS · P1).
- **The ticker is clipped, and on mobile it is noise (#28 · S · P2).** Partial "7%"
  against the sidebar edge on desktop; 3.5 items and a mid-word cut at 375px.
- **Empty and first-run states (#29 · S).** First-run Today spends ~60% of a desktop
  viewport on nothing — the one screen where density would reassure.

**Continuity and affordance.**
- ~~**Shared-element continuity, tile → sector (#9 · M · P1).**~~ **Shipped
  2026-08-13.** The group's frame expands from the tapped tile into the sector
  panel. It also produced §7's third correction: a `layout` animation may not
  drive a control, because the transform *is* the mechanism and there is no
  resting frame — so the shared element is inert decoration with a timer backstop.
  See the CHANGELOG.
- ~~**Tile hover/press affordance (#25 · XS · P1).**~~ **Shipped 2026-08-13.**
  Hover was already there (brightness + outline); *press* was not, even though
  `.tile` had declared `transition: filter .1s` since it was written. A tile
  acknowledged the pointer on the way in and went dead under it.
- **The interaction hint sits below the fold (#26 · XS).** "Long-press to study" is
  documented where it cannot be seen, on both viewports.
- **The goal line is styled as a footnote (#23 · XS · P1)** — the most motivating
  sentence in the app, at 14px between two large cards. And **"+ 4 drills targeting
  your blind spots" is red (#24 · XS · P1)**, which reads as an error for the app
  doing you a favour.

**Also here, cheaply.**
- **Category hue per theme group (#20 · M).** Fill encodes magnitude; hue should
  encode identity, consistently across map, decks, cards and stats.
- **Retire the `--color-amber` misnomer (#27 · XS).** A token named amber holding
  Atlas blue, having previously held cyan. Rename with a codemod.
- **`--color-der` and `--color-a1` are the same hex** in both themes (#2d5be3 light /
  #7fa5ff dark) — one colour carrying two unrelated meanings. Found during the July 27
  gender-ink work and preserved through the merge; needs a contrast pass, not a guess.

**Done-when.** The desk is full-bleed; no measured clip remains; the treemap
drill-down transforms rather than cross-fades; one documented motion scale applied.
**Touches.** `App.tsx`, `index.css`, `views/{Progress,Markt,Review,Today}.tsx`,
`components/CountUp.tsx`, `lib/ui.ts`, `docs/DESIGN.md`.

### 5. The definition programme · L, human-gated

Two items that were tracked separately and are one queue.

**5a. Definitions that discriminate senses, not enumerate translations.**
**Why.** `def` is largely raw sense-listing rather than a definition.
`corpus:definitions` reports **1,493 cards** across three kinds: *enumeration* (1,064 —
"railway depot, railroad station, railway station, train station"), *bare* (363 — a
lone synonym), *repeat* (138 — "to eat; to eat; to dine"). A list of translations only
says what else the word could be called, which the `en` gloss already did.
**Do.** `corpus:definitions --write` emits batches; author worst-class-first and apply
through `fix-authored.ts`, which refuses a replacement that merely repeats the gloss.
A1 and A2 are the most-seen and are already down to 15.6% / 24.5% flagged.
**Watch for sense bugs, not just style** — this pass has already turned up `der See`
defined as "sea, ocean" (that is *die* See), `das Fleisch` as "flesh", `billig` as
"appropriate, meet, fair" (the archaic sense), and `mir` carrying the definition of an
oriental carpet.
**Done-when.** `repeat` and `bare` at zero; `enumeration` trending down and no longer
concentrated below B1.

**5b. Finish the English definitions the German migration displaced · S.**
**Why.** 391 cards carry a German definition in `defDe`; **286 have no English one at
all** (A2 66, B1 165, B2 36, and a handful above). Those cards render without a
definition block for anyone below B2.
**Do.** Author English definitions for the B1 set next — it is the largest.
**Done-when.** `corpus:definitions` reports 0 cards with no English definition.

**Touches.** `scripts/authoring/batches/def/`, `public/data/vocab.json`.

### 6. Grow the corpus toward ~10k + rebalance A1/A2 · M, ongoing

**Why.** Distribution is B1-heavy — backwards for early reading — and core
high-frequency lemmas are still missing.
> ✅ **The human gate is gone, 2026-08-11 — replaced, not deleted.**
> `npm run authoring:new -- <batch.json>` refuses to write a card it cannot
> verify: gender, plural, part of speech and IPA are read from de.wiktionary and a
> disagreement is a hard reject; every example must contain a real inflection of
> its headword, proved with the app's own matcher rather than a substring test.
> Facts are never generated — only the gloss and the sentence are written, and both
> are checked. The rule it replaces was guarding against a plausible sentence with
> a wrong gender attached, which a machine now catches on card 300 as reliably as
> on card 3. First batch: **52 A1 cards, 0 rejected after three real defects the
> gate caught** (see the CHANGELOG).
**Do.** `corpus:coverage` → build A1/A2 batches → `corpus:validate --strict` → review
the diff → commit, in reviewable batches. Close the top-frequency gaps first.
**Source material:** `reference/DaF Wortschatz/` — 69 page-mapped scans of a complete
A1–B1 Lektionswortschatz (Lektion → Feld → Wortart); see its `MANIFEST.md`.
`IMG_4850` is the irregular-verbs appendix — feed it to the conjugation engine's
known-verb checks.
> **The extraction rules** used to live in `archive/COHESION-PLAN.md`, deleted in the
> July tidy and recoverable from git history only. They are: entries are *selected and authored* in the book's style, never
> transcribed wholesale; level is the book's placement, honesty-bumped where DaF runs
> ahead of CEFR; nouns map to existing sectors, verbs and adjectives fall to POS
> defaults. Recorded here because the file they were in is gone.
> *Still open from the DaF passes:* L19–L30 (B1 scans), ~197 A2 book lemmas below the
> frequency scan or without examples, and C1/C2 register.
**Done-when.** ≥95% of the top ~2,000 lemmas per level; A1/A2 filled; validate green;
load size still acceptable.
**Touches.** `scripts/corpus/*`, `public/data/*.json`.

---

## Next

**Games, and the navigation that has to come first.** *Decided 2026-08-12 with the
user; none of it is built.*
- ~~**Top-bar navigation · S**~~ **Shipped 2026-08-12.** `TopBar.tsx` replaces the
  240px rail with a 55px bar; the content column gained 240px on a laptop. The
  mobile drawer went with it — its focus trap, Escape handler and `inert` dance no
  longer have to be right because they no longer exist, and tabbable controls
  before `#main` went 7 → 3 on a phone. Destinations stay in `BottomNav` under the
  thumb; the profile is on the bar at every width. See the CHANGELOG.
- ~~**Typing race · M.**~~ **Shipped 2026-08-12.** `#/games` → Tipprennen. Three
  sentences from the learner's own cards, two fixed-pace rivals, case- and
  umlaut-strict. The WPM figure carries its disclaimer on the finish screen rather
  than in a help page. Digraphs (`ae` for `ä`) are accepted, counted, and named at
  the finish as the spelling errors they would be in the exam.
- **Connections · M.** Sixteen tiles, four groups of four. German gives the format
  better categories than English does: four nouns sharing a gender, four verbs
  sharing a separable prefix, four false friends, four in a semantic field — and the
  trap tile that plausibly belongs to two groups is exactly how gender and false
  friends actually bite. *Open question:* whether the groups are generated from the
  corpus (which can guarantee the facts but not that a category is *interesting*) or
  authored. The exercise generator's six-bug run is the argument for authoring the
  categories and generating only the members.
- **Artwork and animation pass · S–M.** *First pass shipped 2026-08-13* — it went
  to the two things DESIGN.md §7 had already reasoned out and marked "not yet
  built" (continuity, and the data-change rule on Today's headline) plus the press
  affordance, rather than to a list of my own. **Still open:** the treemap tile's
  percentage snaps while its colour animates — the remaining half of the
  data-change rule; and `Illustration` exists per sector but appears only in the
  hover card and the list view, so the artwork half of this item is genuinely
  untouched.

**The study loop.**
- **Show the queue shape · S** (#15). A progress rail distinguishing due from fresh
  from drill, so "246 left" becomes a thing with an end you can see.
- **Interleave the drill types visibly · S** (#11). A session can run 20+ flips before
  a drill. Surface the mix ("14 cards · 4 drills") *before* it happens, not only after.
- **Blind spots rank by raw count, not rate · S · P1** (#10). Drilling a mode makes it
  look worse; avoiding one makes it look fine. Divide by attempts.
- **The circuit breaker should offer a *softer* item, not just an exit · S** (#18).
  After four misses the kindest move is an easy win, not a door.
- **Undo should be reachable after the card leaves · XS** (#12). *Previous card* exists
  at 43×43 in the chrome; nobody finds it in the half-second they want it. (The undo
  *logic* bug — a rewound review still feeding `reviewedToday()` — is fixed.)
- **Grade from the front face without flipping · XS** (#13). A power user who knows the
  word shouldn't need the flip round-trip.
- **Typed answers need mobile keyboard hints · XS · 📱** (#16). No `autocapitalize`,
  `autocorrect`, `spellcheck` or `enterkeyhint` on the answer input. iOS will
  autocapitalise and autocorrect German, then mark the learner wrong for it. *Fold into
  item 1.*
- **Reduce the session chrome · S.** DESIGN.md promises the session is "full-bleed, no
  chrome at all"; it renders inside a card with a header, a chip, four icon buttons and
  a progress bar. Move flag / sound / undo / skip behind one overflow control. Pairs
  with the reach work in Now #1 and the letterboxing in Now #4.

**Legibility of the machine.**
- **Make the scheduler's reasoning visible from outside a session · S · P1** (#50).
  `WhyThisCard` is the app's genuine moat and its strongest word-of-mouth asset, and it
  is invisible unless you are three cards deep. The single cheapest thing on this list
  that changes how the product is *described*. Confirmed still session-only 2026-08-04.
- **Search across the 128 concepts · S · P1** (#38). No way to find *Konjunktiv* without
  expanding levels and scrolling. Confirmed still absent 2026-08-04.
- **Name the session's best moment on the card, not just the recap · XS** (#46).
  "Comeback of the day" exists and fires where nobody is looking.
- **The recap doesn't celebrate drill work distinctly · XS** (UX-PATHS H2). Flips and
  recall are reported; the interleaved drills — the harder half of the session — are
  folded into the same count. *Folded in from UX-PATHS.md when it was retired 08-13.*
- **The first-run hero doesn't acknowledge a retry · XS** (UX-PATHS S2). Abandoning the
  guided first run mid-placement correctly returns to the hero next launch, but it
  reads as a fresh start rather than "pick up where you left off." *Same source.*
- **Tokenizer: split fused paste artifacts · XS.** Pasted headlines and HTML sometimes
  concatenate two words with no separator ("TriumphBei"). A camelCase-boundary split
  (lower→Upper) is near-zero risk in German, which has no intra-word case transitions —
  and it becomes wrong the moment a second language pair lands, so gate it behind the
  per-language interface rather than hardcoding it. *Rescued from ROADMAP.md when it
  was retired 08-13.*
- **Finishable things · S** (#47). A fully-known sector is finite and earned; DESIGN.md
  §8c calls this out and only the recap ever mentions it.
- **Weekly arc · S** (#48). A seven-day view — words added, retention, the goal line's
  slope. Daily is too granular, "since forever" too coarse.

**Content and pedagogy.**
- **370 word cards carry an empty `pos` · XS–S.** Invisible today, but it is the same
  latent gap that produced the capitalisation mess: a card with no part of speech
  cannot be classified by any rule, so it silently opts out of the drills, the family
  index and half the validators. *Do:* infer where the article makes it unambiguous, rule
  on the rest by hand as `case-rulings.tsv` does.
- **The remaining C2 stylistic points · S, hand-authored.** Register, ellipsis and
  Ausklammerung were deliberately deferred from the grammar pass as judgement-heavy and
  a poor fit for auto-drilling. *Stilebenen* shipped; the other two have not. (Every
  other gap in the mastery pass now has a point with ≥5 exercises.)
- **C1/C2 register depth · L, human-gated** (#37). Confirmed by the two most credible
  personas. The promise "grows with you A1–C2" thins exactly where it is hardest to keep.
  > **The *exercise* half closed 2026-08-13.** C1 86 → 204 items, C2 70 → 174; both
  > levels now carry a higher minimum per point than A1–B2 do. What remains under this
  > item is **vocabulary and register depth**, not drill volume: 761 word cards across
  > C1+C2, and no collocation or register field on any of them (#45).
- **The thin layer is A1–B2, and the mean was hiding it · M, ongoing.** The bank's
  *means* look healthy because `corpus:genex` generated 50+ items for 29 derivable
  points; the **medians** are A2 **8**, B1 **6**, B2 **6**. Measured 2026-08-13:
  **76 of 113 points at A1–B2 held fewer than 12 exercises**, against zero at C1/C2.
  > ✅ **A1 closed 2026-08-13** — all 12 thin points authored, level min 5 → **14**,
  > median 27, bank 5,429 → 5,545.
  > ✅ **A2 closed 2026-08-13** — 17 thin points, min 5 → **14**, median 8 → **17**.
  > ✅ **B1 closed 2026-08-13** — 29 thin points across five batches, min 5 → **12**,
  > median 6 → **15**, bank 5,711 → **5,959**.
  > **Still open: B2 (18 of 21 points).** The only level left with a thin point, and
  > the certificate that gates university admission — see the 2026-08-06 audit above,
  > which already called B2 "where the money is and the thinnest real layer".
  *Do:* author in reviewable batches of ~6 points through `corpus:gex`, re-pin
  `GRAMMAR_COUNTS`, spot-check in the app. *Touches:* `scripts/corpus/batches/`,
  `public/data/grammar.json`, `src/lib/grammar.ts`.
- **Register and collocation on C1+ cards · M** (#45). Synonyms exist but aren't
  differentiated by register, which is most of what C1 vocabulary work *is*.
- ~~**Exam alignment without an exam simulator · M** (#43).~~ **Shipped 2026-08-11** —
  and it turned out to want the simulator after all. `#/exam` is a full telc Deutsch
  B1 paper in telc's own format and weighting, with the oral rehearsed against model
  answers at A2/B1/B2. See the CHANGELOG entry. *Still open under it:* the weakest-part
  readout on the result screen is per **subtest**, not per grammar concept — "your
  weakest area for B1 is Kasus" needs the miss log joined to the paper's items, which
  wants item-level grammar tags the paper does not yet carry. *S, and worth doing.*
- ~~**More papers · M each, authoring not building.**~~ **Shipped 2026-08-12** — all six
  levels now have a paper: telc B1, Goethe A1, A2, B2, C1 and C2. The prediction that
  they would only need the German was half right; each one also found something the
  engine had hard-coded from telc, and the last two found four scoring bugs. See the
  CHANGELOG entries for 08-11 and 08-12. *Still open under it:* Goethe's own **B1**
  differs from telc's in format and would be a second `provider` at the same level —
  the first case the paper registry has of two papers competing for one CEFR row, and
  the level picker currently assumes at most one full paper per level. *S.*
- **Second papers per level · M each** — every level ships exactly one, so a learner who
  sits it has spent it. The engine takes a second without changes (`PAPERS` is a list
  and `loadPaper` is keyed by id); what is missing is the German and a UI that offers a
  choice rather than a single card. Worth doing for B1 and B2 first, where people
  actually resit.
- **Heritage / uneven-profile learners · M** (#41). Placement assumes ignorance is
  uniform. Yusuf tests C1 on vocabulary and B1 on orthography and the app has one number
  for him. Skill-scoped drills rather than level-gated ones.
- **A maintenance mode for the arrived · S** (#42). At C2 the value inverts: low-volume,
  high-interval, rare vocabulary. FSRS is already excellent at this; the app never
  offers it as a shape.
- **Textbook-chapter decks · M** (#44). Netzwerk, Menschen, Schritte, Begegnungen.
  Becomes cheap once the comprehension meter lands — paste the chapter.
- **Discourse-level cloze · S–M.** Gaps are single words in single sentences; B2 needs a
  paragraph with the connectors removed. Blocked on having paragraphs — Lesen ships
  sentences — so it needs a short authored text set, or Now #2 Phase 2.
- **Reading-first mode above B2 · M.** Lesen exists; this is the surface around it —
  fewer numbers, longer texts, marginal glosses.
- **Listening, phase 2 · M — and phase 1 is thinner than it sounds.** Phase 1 shipped the
  licensing/fetch/cache layer and made the example
  audible. Phase 2 is the *mode*: a listen-first card where the prompt is the sound.

**Platform and reach.**
- **`ID_MAP` is on the boot path and grows without bound · XS–S.** Noticed
  2026-08-11: the two corpus passes that day took it from 159 entries to 920, and
  the main JS bundle from 694 KB to 719 KB — it is imported by `store.ts`, so every
  learner downloads every id the corpus has ever retired, forever. It is also
  append-only by design (that is what makes a schedule survive), so this only goes
  one way. *Do:* move it to a fetched JSON beside `freq.json`, or compact it once
  the app can be sure no live device still holds a pre-compaction schedule — which
  needs a stored schema version, so probably the former.

- **Performance budget · M · P2** (#49). `vocab.json` is ~5MB and the build warns above
  500kB (currently 630kB JS). Awwwards jurors test on real devices; so do learners on
  3G. Split the corpus by level and fetch on demand.
- **Storage durability re-check on iOS · S · 📱** (#36). `navigator.storage.persist()`
  ships; nobody has confirmed it survives 7 days of ITP on a real iPhone. The failure
  mode is total, silent data loss. *Fold into item 1.*
- **Web Push for installed PWAs · M** (#34). The deliberate day-2 return mechanism,
  still undecided. A local notification from the existing reminder watch is the
  serverless version.
- **Home-screen widget / Live Activity · M · 📱** (#35). "3 due" on the lock screen is
  the highest-leverage retention surface a local-first app can own without a backend.
- **Share and arrival readiness · S each.** The OG image still points at
  `/icon-512.png` with `twitter:card: summary`, so a shared link unfurls as a small
  square: render a real 1200×630 hero (reuse the canvas in `lib/sharecard.ts`) and
  switch to `summary_large_image`. Add a first-visit landing for link arrivals.
- **Illustration artwork — match the reference style · M.** The curated line-art layer
  that replaced emojis (`lib/illustration.tsx`, 54 concepts + a group-emblem fallback)
  is a solid first pass that does not match the intended look, and is **disabled**
  behind `SHOW_ILLUSTRATIONS = false`. ⚠️ The reference screenshots live in the
  gitignored `reference/` folder on the maintainer's machine — **pin the target style
  somewhere durable before starting, or this item cannot be picked up by anyone else.**

**Validation.**
- **Run the *real* friend session · S.** The flagged-cards list, typo tolerance and the
  day-2 habit anchor all shipped; what no simulation supplies is a person. *Do:* sit a
  real beginner down with it and record what the twelve personas got wrong. **That delta
  is the deliverable**, not the session notes. Every finding in this file above the
  "real-device" line came from a simulation or a DOM audit; none came from a learner.

---

## Later / needs a decision before it can be built

- **Extended production · L, part research** (#40, Swain). Diktat is the only writing,
  and it works *because* the target is known to the character. Free composition cannot
  be graded honestly without a model, and a drill that marks correct German wrong is
  worse than no drill. Decide the shape before building anything. Overlaps Now #2
  Phase 3, which is the narrow, deterministic version.
- **Billing / €5 supporter tier.** No infra; the Support link (→ GitHub) and any Pro
  gating wait on this. ⚠️ The freemium split this used to depend on lived in
  ROADMAP.md, retired 2026-08-13 because its two headline paid features (the AI tutor
  and the mining flow) were cut or re-scoped — so a tier has to be re-derived from what
  the app actually is now, not recovered. See [VISION.md](VISION.md) § open decisions.
- **B2B / Sprachschule.** Sequenced deliberately **after** consumer
  (COMPETITIVE-RESEARCH §5–6). Most of [SCHOOL-PITCH.md](SCHOOL-PITCH.md)'s gap list
  isn't built.

---

## Decisions required — not build items

- ~~**Commit out loud to "English-base learners"**~~ — **settled 2026-07-27.** Lexi is
  English-base, said out loud in the root README and the first-run hero. The German
  definition layer (`defDe`, shown from B2) is the deliberate exception, gated on the
  *learner's* level rather than the card's, and `showsGermanDefs` exists so the rule is
  testable on its own.
- ~~**The name and the aesthetic**~~ — **settled 2026-07-28.** The terminal was retired
  for the Atlas; the fintech reading goes with it. See [DESIGN.md §1](DESIGN.md).
- **Bundled reading content.** Open. Phase 2 of the meter wants a feed, and the obvious
  fit (DW's *Langsam gesprochene Nachrichten*) is not automatically redistributable.
  Decide whether Lexi ever ships someone else's text, or stays strictly
  learner-supplied. The Tatoeba audio allow-list is the precedent for doing it properly.

---

## Parked decisions — revisit deliberately, don't drift into

- ~~**Paper card faces.**~~ **Closed 2026-07-26: tried, and reverted.** Shipped
  2026-07-25 scoped to the flip faces and the two exercise surfaces; removed a day
  later, for two measurable reasons. `.paper` was authored as a *standalone whole-app
  theme*, so nesting it nested its accent — the brand hue swung 189° → 36° and every
  accented element inside a card inverted cyan→brown on entry. And it worked in one
  theme only: the cream card scored 18.4 contrast against the dark room and **1.07**
  against the light one, where it read as a stain rather than an object. The card is now
  distinguished by **material** inside one unchanging palette. The rule it produced — *a
  nested scope may change ground and ink, never the brand hue* — is in
  [DESIGN.md](DESIGN.md).
- **AI tutor.** Cut, and cut *on the record* rather than by omission: the
  conversation-app camp is commoditizing, needs a backend and keys, and breaks the
  DSGVO-by-architecture story that is Lexi's best B2B asset. `lib/ai.ts` and the
  OpenAI-compatible client stay for **build-time corpus enrichment**
  (`scripts/corpus/enrich-llm.ts`). The in-app "AI provider" widget is gone; its
  `store.ts` accessors (`aiConfig` / `setAiConfig` / `apiKey` / `setApiKey`) linger
  unused and can be deleted once a tutor is definitively off the table.
- **The Reader/Mine flow.** Un-parked 2026-07-27 and re-scoped as Now #2; see there.

---

*Maintenance: when an item ships, move it to [CHANGELOG.md](CHANGELOG.md) with the
reasoning intact — this file holds only what is still open.*
