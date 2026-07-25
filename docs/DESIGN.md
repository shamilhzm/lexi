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

## 1. The identity

Lexi looks like a **market terminal** because the app's real job is to show you a
territory — 7,464 cards across 284 sectors — and where you are thin in it. Cool
Glacier cyan, mono numerals, dense data, hairline separation.

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
| `--color-amber` | the brand accent (Glacier cyan — the name is legacy) |
| `--color-green` / `--color-red` / `--color-red-txt` | gains / losses / AA-safe small red |
| `--color-der` / `--color-die` / `--color-das` | grammatical gender |
| `--color-a1` … `--color-c2` | CEFR ink, deliberately decoupled from status colours |

### The elevation ramp

Both themes use the **same three-step ramp**, so "raised" means the same thing in
each. Only luminance inverts.

| | dark | light |
|---|---|---|
| `bg` | `#080b11` | `#e8eef5` |
| `panel` | `#111a25` | `#f8fafc` |
| `card` | `#16202e` | `#ffffff` |

Measured: bg→panel **1.12 / 1.12**, panel→card **1.07 / 1.05**.

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

## 4. Typography

Self-hosted, so the identity survives offline and is identical on every OS.
Previously `--font-mono` resolved to SF Mono on macOS, Consolas on Windows and
Roboto Mono on Android — the terminal look only actually existed on a Mac.

| Role | Face | Where |
|---|---|---|
| Data | **IBM Plex Mono** (400/700) | every stat, kicker, CEFR badge, numeral, interval |
| UI | system sans | everything else — fast, familiar, zero bytes |
| The German | **Fraunces** variable | `.headword` only |

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

- Everything obeys `prefers-reduced-motion`, including route transitions.
- **An entrance must never leave content invisible if it doesn't run.** No
  zero-height or zero-opacity resting states on data. See `.bar-grow` and
  `.node-in` in `index.css`: CSS animations with *no* fill-mode, so the resting
  state is the correct one and a stalled or disabled animation still shows the
  numbers. This was learned the hard way — bars animated from `height: 0` render
  an empty chart if the tab mounts in the background.
- Motion should explain, not decorate. The graded card leaves in the direction it
  was judged; that is the standard to match.

## 8. Two rooms

One aesthetic cannot serve two opposite activities.

| | The instrument | The desk |
|---|---|---|
| Where | Progress, the heatmap, the forecast | the session |
| Wants | density, comparison, scanning | calm, focus, one object |
| Gets | the terminal: mono, cool, hairlines | full-bleed, no chrome, the card |

The terminal metaphor is *earned* in the instrument. It is not a licence to talk
about markets while someone is trying to remember a word.

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
