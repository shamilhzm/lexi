# Lexi — design system

**This is a living doc.** It describes what is true in `src/` right now and the
rules new work is held to. If the code and this file disagree, one of them is a
bug — say which and fix it. Nothing here is settled by seniority; the useful
version of this document is one you can argue with.

Its ancestor, [`archive/DESIGN-REVIEW-2026-07.md`](archive/DESIGN-REVIEW-2026-07.md),
was a dated critique that mixed a design system with a go-to-market strategy and
framed itself as coming from inside a famous design org. That framing invited
deference instead of argument, which is roughly why one of its recommendations
survived a year longer than it should have (see *Hue discipline*, below).

---

## 1. The identity — **the Atlas**

> **Changed 2026-07-28.** Lexi looked like a **market terminal** for a year. That
> was never chosen; it was the nearest available reference for "organise a vast
> information space well," reached for by someone whose vocabulary of precedents
> was Salesforce dashboards and the apps on a modern phone. The instinct was
> sound. The reference was borrowed from the wrong domain, and a twelve-persona
> review found it half-built besides — see [PERSONAS.md](PERSONAS.md).

**Why the terminal was wrong here.** A trading terminal is built for *extraction
under time pressure*: scanning **other people's** data for anomalies, in a dim
room, across ten hours. Lexi is *accretion over years* — something of your own,
built slowly, in daylight, **reading text**. Applying the aesthetics of
surveillance to self-cultivation is why a persona said answering correctly "feels
like a spreadsheet": the room was built for watching, and a person trying to grow
something was put inside it.

**What the Atlas is.** Three traditions, one per problem:

| | Tradition | Solves |
|---|---|---|
| The system | **Otl Aicher / HfG Ulm** | a rigorous, humane, *German* visual method |
| The instrument | **cartography** | a large space, partially known, that you move through |
| The desk | **the printed lexicon** | headword · IPA · sense · citation — already the card's content model |

Aicher's Munich 1972 was built so Germany could present itself in "cheerful
colours and democratic forms" — deliberate counter-design to 1936, with an
"apolitical light blue" as its official hue. That is not a surface resemblance:
**the values match.** Systematic, humane, anti-authoritarian, adult without being
cold — the one thing the terminal structurally could not be, since the review's
personas wanted both its seriousness *and* warmth.

It also makes form match subject. An app that teaches German drawing on the
German design tradition *feels like* what it is; a Bloomberg terminal never can.

**Light is primary.** Dark is a real, fully-designed alternate, not an
afterthought — but the default inverted, because all three traditions are
light-ground, because this app is *read*, and because the review measured the
light theme as already carrying better hierarchy than the dark one (the session
card's headline number reads as data on light and as *disabled* on dark).

**The risk is pastiche.** The defence: take the *principles* — colour as
category, grid as structure, white as active space, systematic construction — not
a 1972 costume.

**What survived the change unaltered**, because none of it was ever about the
terminal: the token architecture (still zero hardcoded palette classes and zero
hex literals in `src/`), the two-rooms split, the radius hierarchy, §10
Accessibility in full, and the gotchas in §11.

That identity belongs to the **instrument** (Progress, the heatmap, the
forecast). It is deliberately *not* the whole app: see *Two rooms*.

## 2. Colour

### Tokens

Every colour is a semantic token in `src/index.css`. There are **no** hardcoded
Tailwind palette classes anywhere in `src/`, and it should stay that way.

| Token | Job |
|---|---|
| `--color-bg` | the floor |
| `--color-panel` | chrome surfaces |
| `--color-panel2` | sunken fills, nested rows |
| `--color-card` | **the study surface** — the thing you read from |
| `--color-line` | hairlines |
| `--color-txt` / `--color-dim` | primary / secondary ink |
| `--color-amber` | the brand accent (**Atlas blue** — the name is doubly legacy: not amber, no longer cyan) |
| `--color-green` / `--color-red` / `--color-red-txt` | gains / losses / AA-safe small red |
| `--color-der` / `--color-die` / `--color-das` | grammatical gender |
| `--color-a1` … `--color-c2` | CEFR ink, deliberately decoupled from status colours |
| `--heat-0…4` / `--heat-ink-0…4` | the five-class coverage ramp, ink paired per class |

### The elevation ramp

Both themes use the **same three-step ramp**, so "raised" means the same thing in
each. Only luminance inverts.

| | light (primary) | dark |
|---|---|---|
| `bg` | `#e7ecee` | `#101619` |
| `panel` | `#f7f9fa` | `#192327` |
| `card` | `#ffffff` | `#1f2b30` |

Measured: bg→panel **1.12 / 1.12**, panel→card **1.05 / 1.07**.

Pure white is **reserved for the study surface** in light. Panel and card were
both `#ffffff` for a while, which gave the card exactly 1.00 contrast against the
chrome it sat on — no figure/ground at all.

### Rule: hue discipline

> **A nested scope may change ground and ink. It may never change the brand hue.**

The case study: a `.paper` scope re-skinned the flip card in warm cream. Because
it was authored as a *standalone whole-app theme*, nesting it also nested its
accent — `#38cde8` (hue 189°) became `#8a5300` (hue 36°). A **153° swing**, near
complementary. The speaker button, kicker, "New ·" label and status pip all
inverted cyan→brown on entering a card, and for those seconds it was not the same
product. It also only worked in one theme: 18.4 contrast against the dark room,
**1.07** against the light one, where it read as a stain rather than an object.

Every text pair must clear **4.5:1**. There is a contrast check in the
verification notes at the bottom of this file; run it when you touch a token.

## 3. The card is a material, not a colour

The study surface sits only ~1.05–1.07 luminance steps above its panel. Luminance
alone cannot carry that — which is precisely what tempted the cream. Four things
carry it instead, none of them hue:

1. **Grain.** A neutral `feTurbulence` noise, `background-blend-mode: soft-light`,
   composited into the card's own surface. It lightens where the ground is light
   and darkens where it's dark, so one texture serves both themes.
   It is a **background layer, not a pseudo-element overlay** — an overlay with
   `mix-blend-mode` paints on top of the text and quietly modulates the headword.
2. **Radius.** `rounded-lg` (16px), one step above every control.
3. **Elevation.** A deeper drop than a panel, plus a top-light inset.
4. **The serif headword** — Fraunces, `font-optical-sizing: auto`.

### Rule: a status colour is a mark, never a ground

> **Green means "you got this right." It may ink a word, rule an edge, or label a
> block. It may not fill a surface the learner hasn't been graded on yet.**

The flip card's back face used to set `background: var(--color-green-d)` inline —
which also meant it never applied `.bg-card`, so it had no grain and no top-light
gradient. Turning the card over changed what it was made of, and painted a verdict
across a card you might be about to fail. It also collided with the drills, where
the same fill means "correct answer" two seconds later.

The back is now the same material as the front, marked with a 4px green edge rule,
a green `ANSWER` kicker, and the translation in green ink. Verify by sampling
`background-color` and `background-image` on both `.flip-face` elements: they must
match.

### The front presents; the back is read

The front is centred — it shows one object. The back is flush-left on a single
gutter, because it is a dictionary entry you read: hairline-separated blocks, mono
labels (`SYN` / `OPP`), the English indented under its German. That asymmetry is
deliberate and replaces an accidental one — the old face was `items-center` with a
`text-left` examples block and centred synonyms, three alignments in 400px.

Reading faces start at the top. `justify-center` with `overflow-y-auto` scrolls
from the middle and clips silently, which is what a C1 card (definition + two
bilingual examples + synonyms + antonyms) did.

## 4. Typography

Self-hosted, so the identity survives offline and is identical on every OS.
Previously `--font-mono` resolved to SF Mono on macOS, Consolas on Windows and
Roboto Mono on Android — the terminal look only actually existed on a Mac.

| Role | Face | Where |
|---|---|---|
| Data | **IBM Plex Mono** (400/700) | every stat, kicker, CEFR badge, numeral, interval |
| UI | system sans | everything else — fast, familiar, zero bytes |
| The German | **Fraunces** variable | `.headword` — the flip faces **and the exercise prompt** |

`.headword` was scoped to the flip faces alone: two lines per screen, on the app's
only warm typeface, while the German being *tested* was set in system sans. The
prompt is a headword too. Fraunces is what makes German read as the subject of the
app rather than as data inside it, so it goes wherever the German is the point.

**Mono means data.** If it isn't a measurement, it isn't mono.

The ramp in `@theme` (`--text-2xs` … `--text-6xl`) is the **only** set of sizes.
No arbitrary `text-[…]`.

## 5. Radius carries hierarchy

| Radius | Means |
|---|---|
| `rounded-lg` (16px) | a **surface you read** |
| `rounded-md` (10px) | a **control you press**, or a row nested inside a surface |
| `rounded-sm` / `rounded-full` | a chip |

Before this rule everything was 10px and `--radius-lg` was used zero times, so
nothing read as more important than anything else.

## 6. Composition

Shared primitives live in `src/components/ui/`: `Button`, `IconButton`, `Card`,
`Chip`, `Kicker`. Reach for these before writing a class string. The tokens were
always consistent; it was the *composition* that drifted — eight variants of the
primary button, nine card paddings, five chip paddings.

Touch targets are **44×44 minimum** (`IconButton` enforces it; use `pull` to keep
a big target from inflating a tight row).

## 7. Motion

"Motion should explain, not decorate" was the whole of this section for a year,
and it got *applied* as "motion should be minimal" — a different rule. The result:
the session player and the recap got real craft, and the instrument room got
nothing. Below is a system rather than a restraint.

### The safety rule (rewritten — the old one was wrong)

> **An entrance may animate `transform`. It may never animate `opacity`, or scale
> to zero, on anything that holds content.**

The previous rule said no fill-mode was sufficient. It isn't. **A stalled
animation sits on its `from` frame** — so `from { opacity: 0 }` renders nothing
whether or not a fill-mode is set. That is not theoretical: the route container
was caught holding **1,769px of fully laid-out Progress at `opacity: 0`**, enter
transform frozen mid-flight, because a hash change landed while the tab was
backgrounded and rAF was throttled.

`.bar-grow` and `.node-in` were cited *in this document* as the safe pattern and
had the same defect (`scaleY(0)`, `opacity: 0`). All five entrances are now
transform-only: worst case is content 8px low, or at 94%, or a bar at 8% height —
always visible. Verify with a paused probe, which is the real test:

```js
const p = document.createElement('div');
p.className = 'route-in'; p.style.animationPlayState = 'paused';
document.body.appendChild(p);
getComputedStyle(p).opacity; // must be "1"
```

### The corollary (found 2026-08-05, by measuring instead of reasoning)

> **An entrance may translate. It must not *scale* a subtree that contains sized
> touch targets.**

Transform-only is necessary and **not sufficient**. It guarantees a stalled
entrance stays *visible*; it says nothing about whether the resting geometry is
correct — and a scale applies to the entire subtree.

`.desk-in` scaled from `.985`. Caught in a coarse-pointer viewport with animations
stalled (`playState: "running"`, `currentTime` pinned at 0 two minutes after load),
the desk sat on its `from` frame indefinitely, and **every 44px control inside the
session rendered at 43.34px** — the five chrome `IconButton`s included. Their
computed CSS read `width: 44px` throughout; only `getBoundingClientRect` disagreed.
So §6's "IconButton enforces 44×44" was false on the app's primary surface, and no
amount of reading the CSS would have shown it.

The fix cost nothing, which is the tell: **1.5% is below the perceptual threshold**
— the same fact that moved `.tile-in` off 1.5% to 6%. It was an animation nobody
could see that shrank every target in the session whenever it stalled. `.desk-in`
now translates 6px.

`.tile-in` and `.node-in` keep their scales: they scale the target *itself* rather
than a container of targets, both are far larger than 44px, and both are
perceptible animations doing real work. `.bar-grow` animates a chart bar, which is
not a control at all.

Guarded in `views/review-structure.test.ts`, mutation-checked. **The lesson worth
keeping:** the first version of this rule was derived by reasoning about
fill-modes, and was wrong. The second was derived by reasoning about visibility,
and was incomplete. Both gaps were found by measuring rendered geometry under the
failure condition — a paused probe for the first, a stalled tab for this one.

### The scale

One easing, `cubic-bezier(.32,.72,0,1)`, at three weights. If a duration isn't on
this scale, it needs a reason.

| Tier | Duration | For |
|---|---|---|
| **micro** | 80–120ms | press, toggle, hover — feedback you feel, not watch |
| **transition** | 200–320ms | route (`.route-in` 200), desk (`.desk-in` 280), panels |
| **narrative** | 400–700ms | tiles (`.tile-in` 420), recap, milestones, a chart's first paint |

### Continuity

> **Two views showing the same object transform that object. They do not
> cross-fade.**

Navigation went visible → invisible → visible, which is why the app read as a
slideshow of states rather than one place. **Built 2026-08-13** for the case that
most obviously wanted it: the heatmap tile → sector drill-down. Tapping a group
expands that group's own frame from the tile into the panel that holds its
sectors, so the second set visibly lives *inside* the first.

One rule came out of building it, and it is the third correction this section has
needed:

> **A `layout` animation may not drive a control. Put the shared element on
> something inert, and give it a timer backstop.**

Everything above protects a stalled animation by making its resting frame the
correct one. A framer `layout` animation cannot be protected that way, because
the transform *is* the mechanism — there is no resting frame to fall back to.
Measured in a hidden tab: rAF throttles, the projection freezes on its `from`
transform (`matrix(0.254, 0, 0, 0.936, -399.5, 0)`), `getAnimations()` is empty,
and it sits there indefinitely while the layout box is already correct.

So the shared element is a decorative outline rather than the tile itself — a
frozen projection then misplaces decoration, not a 44px target — and a
`setTimeout` past the duration clears the transform, which works because timers
keep running when rAF does not. That is the same backstop `CountUp` already runs,
for the same reason. Guarded in `views/markt-motion.test.ts`.

### Data change

> **A number or area that changed because the learner did something animates from
> its old value.**

`CountUp` fired only in the recap, so the number that moves for exactly one
reason — the learner studied — sat there already changed on every surface that
showed it.

**Built 2026-08-13 for the headline on Today**, which is the first number a
learner sees each day and the one a session moves. It counts from what *Today*
last showed, tracked separately from the map's own last-seen: `markSeen` fires
when the treemap paints, so a shared number would let whichever surface you
opened first eat the change and leave the other silently already moved. Each
surface reports it once, on its own terms. Pinned in `store-seen.test.ts`.

*Still open:* the treemap tile's **percentage** does not count up — the tile
animates its *colour* across a class boundary and its number snaps. That is the
remaining half of this rule.

### Still true

- Everything obeys `prefers-reduced-motion`, including route transitions.
- Motion should explain, not decorate. The graded card leaves in the direction it
  was judged; that is the standard to match.

## 8. Two rooms

One aesthetic cannot serve two opposite activities.

| | The instrument | The desk |
|---|---|---|
| Where | Today, Progress, Library | a session |
| Wants | density, comparison, scanning | calm, focus, one object |
| Gets | the terminal: mono, cool, hairlines, nav, ticker | full-bleed, no chrome at all |

The desk is an **early return** in `App.tsx`, not a view rendered inside the
shell. Nothing from the instrument follows you in: no sidebar, no bottom bar, no
ticker, no streak counter competing with the word.

The terminal metaphor is *earned* in the instrument. It is not a licence to talk
about markets while someone is trying to remember a word.

## 8a. Three destinations

The IA used to mirror `store.ts`: Home / Explore / Grammar / Stats, plus Decks
and Wortkarte underneath Explore and a KPI strip riding on one of them. Nine
places answering four questions, and `Explore.tsx` had to hand-roll a back-stack
because the router didn't model the depth.

| Destination | The question | Absorbs |
|---|---|---|
| **Today** | what do I do now? | the daily briefing, the one Start button |
| **Progress** | how am I doing? | the heatmap, decks, the word map, trend charts, blind spots |
| **Library** | what does this mean / how does this work? | the grammar syllabus |

Depth inside Progress is real routing — `#/progress/decks/<group>`,
`#/progress/map/<sector>` — so Back works and a deck is a linkable thing.

Two decisions this forced, both worth knowing:

- **The KPI strip is gone.** Putting the heatmap and the stats page on one
  surface made it obvious they were showing the same four numbers twice. The
  Known headline says it once.
- **The bottom bar has no embedded FAB.** With three destinations the old
  split-around-a-raised-button layout stops working, and embedding an *action*
  among *places* was always a category error. Start is a floating button above
  the bar, and it hides on Today, where the surface already leads with one.

## 8b. The scheduler shows its work

`session.ts` makes five pedagogical decisions per session — an interleaved drill,
grammar linked to a function word you just met, the rule for a system you keep
missing, drills in your worst modes, orphaned due drills — and every item carries
a `reason` recording which. `WhyThisCard` renders one line for it.

Two rules for that line:

- **Silence is a valid answer.** A new card already says "New ·"; a review that
  arrived on time needs no explanation. A caption on every card becomes wallpaper
  within one session.
- **Where the reason names a weakness, the line is also the way into the rule.**

The copy lives in one pure function (`whyLine`) rather than in JSX, so it is
unit-tested and there is exactly one source of truth for it.

## 8c. Something you can finish

FSRS never ends, and "session complete" recurs daily until it means nothing. A
fully-known sector is finite and earned. Completion is **ratcheted** — a later
lapse takes the card out of Review but cannot take back what you finished — using
the same high-water-mark pattern as `checkMilestones`, and measured across all
levels so narrowing the CEFR filter can't manufacture one.

## 9. Voice

- **German nouns for surfaces, English for actions.** *Markt*, *Wortkarte*,
  *Üben* name places; buttons say *Study*, *Open decks*, *Practise*.
- Curly apostrophes (`’`). Consistently.
- No emoji in UI strings. The illustration layer exists for this
  (`src/lib/illustration.tsx`).
- Say what is true. "0/6" beats "0%" when one correct answer has already
  happened; the interval preview on the grade buttons is the model — machinery,
  not magic.

## 10. Accessibility

Non-negotiable, and enforced by `eslint-plugin-jsx-a11y` (`npm run lint`):

- `lang="de"` on **every** German string. Without it a screen reader pronounces
  the entire lexicon of a German app in an English voice.
- No `maximum-scale` — pinch-zoom stays available (WCAG 1.4.4).
- Icon-only controls carry a real name. `title` alone is not reliably announced
  and is invisible on touch.
- The mobile drawer is a real dialog: focus trap, Escape, `inert` when closed.
- Colour is never the only signal — the drills pair ✓/✗ icons with it.

## 11. Gotchas that cost us time

- **A scoped token override does not change already-inherited `color`.**
  `.scope { --color-txt: … }` leaves text at whatever `<body>` resolved. Re-assert
  `color` in the scope.
- **`mx-auto` on a flex item sizes it to max-content**, not the container. Every
  view root overflowed the phone viewport this way — `w-full` restores stretch.
- **`animation-duration: 0` with `fill-mode: both` freezes at the `from` frame**,
  which is how you end up with invisible content instead of instant content.
- **Vite rewrites `content=` attributes** for the base path, not just `href`/`src`
  — so absolute `/icon.png` in an OG tag is correct on both deploy targets.

---

## Verifying a token change

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Then check the pairs. Any text pair below 4.5 is a bug:

```js
// paste in the browser console
const cs = getComputedStyle(document.documentElement);
const t = n => cs.getPropertyValue(n).trim();
// compare e.g. t('--color-dim') against t('--color-panel')
```

And check the two things that regress silently:

1. **The accent must not change between chrome and card.** Sample the computed
   accent colour on a panel and inside a card, in both themes. The hue must match.
2. **The card must still separate.** Panel→card is only ~1.05; confirm grain,
   radius and shadow are all still doing their share.
