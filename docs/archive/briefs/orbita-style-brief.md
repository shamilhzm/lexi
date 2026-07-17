# Orbita — Styling Brief

Visual system for the app specified in `orbita-product-brief.md`. Opinionated and concrete: implement these tokens directly. Token names are the contract — use them in code (a single `theme.ts`), not raw hex.

---

## North star

Modern, editorial, *expensive* cosmic — closer to a planetarium gift shop or a premium space documentary than to neon sci-fi. Confident bold type, generous negative space, restraint. Avoid the default "AI space" look (cyan neon grids, glowing-everything, Tron). See Do/Don't.

### The one structural decision: two surfaces

The app runs on **two surface families**, and components declare which they're on:

- **Deck (light, warm, readable)** — used for everything text-dense: cards, exercises, rule explanations, concept detail, lists, settings. Long grammar reading must be effortless; dark backgrounds punish it. Carries warmth forward from the reference app.
- **Void (dark, cosmic)** — used for the *journey* moments: galaxy map, hangar/ship, warp transitions, level-up. This is where the space drama lives.

Light for learning, dark for exploring. This split is deliberate and load-bearing; don't flatten it to a single theme.

---

## Color tokens

```
// DECK (light surface)
deck.bg          #F4F1E7   warm paper, app background for content
deck.surface     #FFFFFF   cards
deck.surfaceAlt  #FBF9F2   subtle fills, chips
deck.ink         #15161A   primary text (near-black, slight cool)
deck.inkMuted    #6A6B72   secondary text, captions
deck.hairline    #E7E2D2   borders, dividers

// VOID (dark surface)
void.bg          #0A0E27   deep space indigo-navy, map/hangar background
void.bgDeep      #060819   gradient floor, vignette edges
void.surface     #141A3A   elevated panels on void
void.text        #F1F3FF   primary text on void (cool near-white)
void.textMuted   #8A93C2   secondary on void
void.hairline    #232A52   borders on void

// ACCENTS (work on both surfaces)
accent.warp      #4361EE   primary action, links, focus rings, selection
accent.warpAlt   #6B83FF   warp on dark / hover / glow core
success.stable   #2FBF71   correct, "stabilized" orbit
success.fill     #D8F3E4   success backgrounds on deck
signal.decay     #FF6B4A   "learn again" / decaying orbit / errors (never harsh red)
signal.fill      #FFE4DC   error/attention backgrounds on deck
reward.stardust  #F5C84B   parts earned, XP, level-up gold
```

### Galaxy identity (one hue per CEFR level — cool→warm = rising mastery)

```
galaxy.A1  #4FB7B3  aqua
galaxy.A2  #57C77A  green
galaxy.B1  #4F86E8  blue
galaxy.B2  #7A5CF0  violet
galaxy.C1  #E0567E  rose
galaxy.C2  #F0A93B  amber (the summit)
```

Each galaxy tints its map nebula, its system rings, and accents within its content. Color is never the *only* level signal — always pair with the "A1…C2" label and the system name.

---

## Typography

Three real, free typefaces (bundle them; on-theme by name):

- **Display / headings — Space Grotesk** (Bold for headlines, Medium for subheads). Screen titles, headwords, galaxy names, level-up.
- **Body / UI — Inter** (Regular/Medium). All running text, buttons, lists, rule explanations.
- **Phonetics / numerics — Space Mono** (Regular). IPA, counters (`8/52`), small data labels.

```
display.xl   Space Grotesk Bold     44 / 48   galaxy title, level-up
display.l    Space Grotesk Bold     32 / 36   screen titles (Map, Explore)
heading.h1   Space Grotesk Bold     27 / 32   headword, card term
heading.h2   Space Grotesk SemiBold 21 / 28   section heads, rule titles
body.lg      Inter Regular          17 / 26   rule text, definitions, examples
body.md      Inter Regular          15 / 22   default UI, lists
label.caps   Inter Medium           12 / 16   UPPERCASE, tracking +0.08em (SYNONYMS, DEFINITION)
mono.ipa     Space Mono Regular     16 / 22   /ˈvɪsənʃaftlɐ/
mono.counter Space Mono Regular     15 / 20   progress counters, badges
```

Headlines are tight and heavy; body is calm and roomy. Never set long paragraphs in the display face.

---

## Spacing, radius, elevation

- **Base unit 4.** Scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Screen gutters 20–24.
- **Radius:** cards `24`; inner media/illustration `16`; buttons `16` (or full pill for primary CTAs); chips/tags **full pill**; toggles full pill.
- **Elevation (deck):** cards use a soft low shadow — `y 8, blur 24, color rgba(20,22,40,0.06)` — plus a 1px `deck.hairline`. No heavy drop shadows.
- **Elevation (void):** no shadows; separate planes with subtle inner glow and `void.hairline`. Depth on void comes from blur, scale, and parallax, not box-shadow.

---

## Core components (map to PRD screens; spec every state)

- **Concept card (deck):** white surface, radius 24. Layout: gender/article in muted small caps + headword (`heading.h1`), `body.md` "noun/verb", IPA in `mono.ipa`, translation in `accent.warp`, then example. Illustration block (radius 16) below for words. States: front / revealed / correct (success hairline + check) / incorrect (decay hairline + gentle shake).
- **Exercise widgets:** consistent chrome (progress bar top, audio + info bottom). Selectable options are pill or card tiles; selected = `accent.warp` fill + white text; correct = `success.stable`; wrong = `signal.decay`. **Match grid:** 2-col, locked correct pairs fill `success.fill` with `success.stable` text. **Sentence builder:** draggable word tiles (deck.surfaceAlt), drop slots as dashed hairlines; snap with a light spring.
- **Buttons:** *Primary* — `accent.warp` fill, white, pill, `body.md` SemiBold. *Secondary* — deck.surface with hairline. *Ghost* — text-only in `accent.warp`. *Destructive* — `signal.decay`. On void, primary uses `accent.warpAlt` with a faint outer glow.
- **Toggle (settings):** pill track, `accent.warp` when on, neutral hairline when off — matches the reference settings toggles.
- **Chips / tags:** full-pill `deck.surfaceAlt`, `body.md`; used for synonyms/antonyms/collocations.
- **Progress bar:** thin, rounded; filled portion `deck.ink` on deck, `accent.warpAlt` on void; counter in `mono.counter`.
- **Section label:** `label.caps` in `deck.inkMuted` (SYNONYMS, DEFINITION, EXAMPLE, SPACED REPETITION).
- **AI-content disclaimer:** muted `body.md` footnote, low-emphasis, matching the reference apps' "translations are AI-generated" note.

---

## Galaxy map & ship (the signature surfaces — build with Skia)

- **Galaxy map (void):** the current galaxy as a central luminous star (its `galaxy.*` hue) with **star systems orbiting** it as nodes on faint elliptical rings. Background is `void.bg → void.bgDeep` radial gradient with a generated **starfield** (hundreds of static + a few twinkling points; subtle parallax on scroll/tilt). Completed systems glow and carry a part icon; the current/available system pulses softly; locked future galaxies sit small and dim toward the edges. Node tap → spring-scale into System Detail. Keep the field elegant and sparse near the focal star — readability over density.
- **Ship:** a single illustrated craft that **visibly grows** across 6 tiers (one per galaxy). Parts (engine, navigation array, shields, modules, etc.) attach as systems are completed. Hangar shows the ship on void with earned parts lit in `reward.stardust` and ghosted silhouettes for parts still to earn.
- **Warp (galaxy → galaxy):** the marquee transition — stars elongate into light streaks toward a vanishing point, brief acceleration, then arrival in the next galaxy's hue. This is the emotional peak; give it room (see motion).

---

## Motion

Principle: physical, springy, purposeful. Ambient motion is slow and calm; reward motion is crisp and brief. Everything respects **Reduce Motion**.

```
spring.standard   stiffness 260  damping 24    // taps, selections, card reveal
spring.soft       stiffness 180  damping 22    // sheet/panel entrances
card.reveal       300ms flip/cross, spring.standard
correct.pulse     180ms scale 1→1.04→1 + success tint + light haptic
incorrect.shake   220ms ±6px x-shake + decay tint + warning haptic
part.earned       ~800ms: part flies in, snaps to ship, gold particle burst, success haptic
orbital.drift     systems revolve very slowly (60–120s/rev), eased; pauses on interaction
warp.transition   700–900ms: star-streak zoom-through + hue shift + heavy haptic
level.up          full-screen moment: ship upgrades, galaxy hue floods in, stardust burst
```

Reduce Motion: warp → 250ms crossfade; orbital drift frozen; particle bursts → a single soft fade; keep haptics.

---

## Illustration & iconography

- **Word illustrations:** one consistent editorial style across the whole library — flat, limited-palette, slightly retro print look (as in the reference app's word art). Define the style once and hold it; inconsistency reads as cheap. Note AI provenance per Open Decisions in the product brief.
- **Icons:** single-weight line icons (~1.75px), rounded caps. Reuse the reference set's vocabulary: sliders/filter, audio (speaker waves), info (i), back chevron, undo, add (+). Tab icons line-style; active tab in `accent.warp`.
- **Ship & parts art:** cohesive with word illustrations but rendered to sit on void (light strokes, subtle emissive accents in `reward.stardust` / the galaxy hue).

---

## Sound & haptics (light touch, optional but on-theme)

Soft, low-volume, never arcade. Subtle "stabilize" chime on correct; muted low tone on incorrect; a brief whoosh + swell on warp; a satisfying mechanical click on part-attach. Haptics: light on select/correct, warning on incorrect, heavy on warp/level-up. All toggleable.

---

## Accessibility

- **Contrast:** body text on `deck.bg`/`deck.surface` and on `void.bg`/`void.surface` must meet WCAG AA (4.5:1). The cool near-whites/near-blacks above are chosen for this; re-check any tint before shipping. Be especially careful with muted text on void.
- **Color never sole signal:** galaxies, correct/incorrect, and decay states always pair color with text/icon (label, check/cross, "decaying").
- **Type scaling:** support Dynamic Type; layouts must reflow, not clip, up to large sizes.
- **Targets:** ≥ 44×44pt tap targets, including map nodes and word tiles.
- **Reduce Motion** honored everywhere (see motion). Provide captions/labels for any audio-only exercise step.

---

## Do / Don't

**Do:** keep the void sparse and premium; let bold type and whitespace carry screens; use the galaxy hue as a quiet accent, not a flood; make reward moments brief and tactile; keep grammar reading on the light Deck surface.

**Don't:** neon cyan grids, lens flares on everything, glow on every element, gamer-RGB gradients, drop-shadow stacking, more than ~2 accent colors visible at once, long body copy set in Space Grotesk, or dark backgrounds behind dense explanatory text.
