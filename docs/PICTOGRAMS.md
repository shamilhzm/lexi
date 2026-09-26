# Lexi pictogram grammar v1: LLM-authored SVG word pictograms

*Drafted by the UI/UX reviewer in the 2026-09-25 panel review; adopted for pilot 01 the same
day. It is strict so that a validator can enforce every rule and a model can follow them
without taste.*

## Status — pilot 01 (2026-09-26)

- **Shipped:** 51 pictograms (A1 47, A2 4), 7.2 KB in `public/data/picto/`, built by
  `node scripts/corpus/picto-build.ts` from `scripts/corpus/picto/pilot-01.jsonl`.
  Rendered in the feed (96 pt) and the full entry (120 pt) by `components/Picto.tsx`.
- **Implemented:** §4–§6 as `src/lib/picto.ts` — allowlist, integer geometry, live area,
  the direction set, quarter/half arcs of the radius set, element/command/byte budgets,
  at most two solids. It runs at build time and again before render. §10.4 blind
  recognition: each render shown without the word to free OpenRouter vision models (Qwen,
  Gemma, dots), ten per request; a pictogram ships only if a guess shares a stem with the
  gloss or a synonym, or a reviewer accepts it in the batch's `accept` map with a reason.
  Results: `scripts/corpus/picto/pilot-01.qa.json`.
- **Not yet implemented:** §5.4 spacing and §10.3 render checks (ink coverage, holes at
  24 px), §10.5 raster collision — the pilot used a human contact sheet instead. §7
  centring is not machine-checked.
- **Measured:** nouns 38 of 41 after one redraw round (*der Löffel* never read as a spoon;
  *das Ei* read as a drop), verbs 5 of 5, contrast-pair adjectives 3 of 8. **The §8
  adjective recipe does not survive blind recognition** — a solid bar beside an outline
  one reads as "minus" or "box" — so adjectives wait for a better recipe before they scale.
- **Colour:** the asset has none; the page's ink is used. Gender ink (§6) is not turned on.

The three worked examples at the end **pass a validator sketch covering §4, §5.1–5.3 and the fill and radius rules of §6**, and were checked by hand against the rest. They were rendered with `qlmanage` and inspected: a cup, a runner, and a tall tower beside a short one. With the root element they weigh 315–416 bytes each.

## 0. What a pictogram is for, and where it may appear

- **Its job.** A pictogram is a *mnemonic mark* for a word whose meaning has a single drawable referent. It is not the meaning, and it never replaces the gloss.
- **It is a claim about meaning.** So it passes a gate (§10), exactly as a gloss does. Anything that cannot pass is **skipped**. There is no fallback emblem: drop `GROUP_EMBLEM`/`'star'` and the `pferd → 'paw'` mappings from `lib/illustration.tsx`.
- **Where it may render:** the feed slot, `WordDetail`, the card **back**, and a **first-sight** front.
- **Where it may never render:**
  - any surface that asks "what does this mean?", such as a review front or a `meaning` or `reverse` drill;
  - any gender or plural drill;
  - inside a button, or in a row of UI icons.
- **Size and accessibility.** It renders at 96–120 pt. At that size its 3-unit stroke draws at 6–7.5 pt, about four times a UI icon's stroke, so it never reads as a control. It is always `aria-hidden="true"`, because the word is the content.

## 1. The model's output contract

For each card the model outputs exactly one JSON line:

```json
{"id":"voc:A1:die Tasse","verdict":"svg","inner":"<path d=\"…\"/>…","shows":"a cup of hot drink on a saucer"}
{"id":"voc:B1:die Frist","verdict":"skip","code":"ABSTRACT","shows":""}
```

- **`inner`** is the markup *inside* the root. The root in §3 is injected by the renderer and never authored.
- **`shows`** is at most 8 English words. It exists for the human reviewer only; the QA in §10 never trusts it.

## 2. Deciding whether to skip (ordered; the first match wins)

| # | Condition | Code |
|---|---|---|
| 1 | `pos` ∈ {adverb, pronoun, preposition, conjunction, particle, interjection, number, phrase, grammar}, or the headword is a demonym or proper-noun-like (*der Berliner*) | `CLASS` |
| 2 | No single physical object, creature, place or visible action that a stranger could name from its silhouette (*die Frist, der Beitrag, der Sinn, die Beratungsstelle*) | `ABSTRACT` |
| 3 | Drawing it needs text, digits, letters, a flag, a map outline, a logo, a currency sign, or a religious or political symbol | `SYMBOL` |
| 4 | Drawing it needs injury, weapons, drugs, nudity, medical procedures or death | `SENSITIVE` |
| 5 | The natural drawing is indistinguishable from a more frequent non-synonym card's (*der Mantel* vs *die Jacke*, *der Kaffee* vs *die Tasse*) | `COLLIDES:<id>` |

**The default is to skip.** A missing pictogram costs nothing. A wrong one teaches a wrong meaning.

## 3. Canvas and root (fixed; the renderer injects it)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"
     stroke="currentColor" stroke-width="3" stroke-linecap="round"
     stroke-linejoin="round" aria-hidden="true" focusable="false">…inner…</svg>
```

- **Grid.** 48×48, in 1-unit steps.
- **Live area.** Every coordinate an element defines lies in **[4, 44]**. That leaves a 4-unit margin, so the round caps at 1.5 units never clip.
- **Baseline.** **y = 42.** Anything that rests, rests on it.
- **Ground line.** Optional, and only when motion or height needs a floor. It is exactly `<path d="M6 42H42"/>`. Objects that carry their own floor, such as a saucer, draw it as part of the object instead.

## 4. Elements and attributes (allowlist; anything else is a hard reject)

| Element | Allowed attributes | Constraints |
|---|---|---|
| `path` | `d`, `fill` | Absolute commands **M L H V A Z** only. No lowercase or relative commands. No **C Q S T** curves. |
| `circle` | `cx`, `cy`, `r`, `fill` | `r` ∈ {2, 3, 4, 6, 8, 12, 16} |
| `rect` | `x`, `y`, `width`, `height`, `fill` | no `rx`: rounded corners come from `stroke-linejoin` |
| `line` | `x1`, `y1`, `x2`, `y2` | the same direction rule as paths |

`fill` may be `currentColor` and nothing else. The absence of `fill` means the root's `none`.

**Forbidden everywhere:**
- elements: `text`, `image`, `use`, `defs`, `g`, `style`, `script`, `foreignObject`, `a`, gradients, `pattern`, `filter`, `mask`, `clipPath`
- attributes: `transform`, `opacity`, `stroke-width`, `stroke`, `class`, `id`, `style`, any `on*`, any `href`
- colour values: any hex, rgb or named colour

## 5. Geometry

1. **Integers.** Every coordinate and every radius is an integer.
2. **Directions.** Every straight segment (L, H, V, the closing Z, and `line`) has a direction whose reduced |dx|:|dy| is in **{1:0, 2:1, 1:1, 1:2, 0:1}**. That gives 0°, ≈27°, 45°, ≈63° and 90° with every sign, which is enough for figures and still checkable as integer ratios.
3. **Arcs.** `A r r 0 f s x y`: rx = ry, rotation 0, and r ∈ the circle set. Arcs are quarter or half circles only: the endpoint differs from the start by (±r, ±r) or (0, ±2r) or (±2r, 0).
4. **Spacing.** Centrelines of strokes that do not touch are at least **5 units** apart, so there is 2 units of clear space at stroke 3. §10 verifies this by render.
5. **Budget.** At most **10 elements** and **40 path commands**. `inner` is at most **600 bytes**.

## 6. Stroke, fill and colour

- **One weight.** Every stroke is 3 and cannot be overridden. That single weight is what makes 10k marks look like one hand.
- **Solids** (`fill="currentColor"`) are allowed only for:
  - (a) a figure's head (a circle, r = 3);
  - (b) dots of r = 2 (an eye, a wheel hub, a button);
  - (c) the **target** of a contrast pair (§8, adjectives).

  At most **two solid elements** per pictogram.
- **Colour belongs to the host, never to the asset.** The asset inherits `currentColor`.
  - The default ink is `text-txt`.
  - On the feed, `WordDetail` and the card back, a noun **may** render in its gender ink (`style={{ color: genderColor(g) }}`). That is safe only because §0 already keeps pictograms off every test surface, and the article, spelled out beside it, carries the gender. The colour is redundant, never the sole signal.
  - Dark mode, reduced transparency and new themes cost nothing, because there is no colour inside the asset.

## 7. Composition

- **One subject.** A verb may add at most one prop.
- **The subject is large.** Its longest axis spans at least **60% of the live area** (≥ 24 units). Scale is not realistic: a key is drawn as big as a house.
- **Centring.** The horizontal centre of the bounding box (ground line excluded) lies in **24 ± 4**. Things that rest sit on y = 42. Things that fly or hang are centred vertically in 24 ± 6.
- **Views.**
  - Objects: a flat front or side elevation, with no perspective and no 3/4 view.
  - Figures: side view, facing and moving **right**. Face left only when the meaning is "away" or "back" (*zurückgehen*).

## 8. Recipes by word class

- **Concrete noun.** Draw the object itself in its canonical elevation. If it is identifiable only in use (*die Brille*, *der Schirm*), draw one figure (the §9 kit) using it.
- **Verb.** Draw one figure mid-action, using the kit, plus at most one prop. Choose the most distinctive frame of the action: the start of a throw, not its end.
- **Adjective.** Draw a **contrast pair**:
  - two instances of the same shape side by side on the baseline;
  - the **foil** on the left, as an outline;
  - the **target** on the right, **solid**.

  Solid means "this is the word". The pair must differ in the property alone. For state adjectives (*nass, heiß, kalt*), draw one object plus one sign from the §9 sign set.
- **Anything else:** skip (§2).

## 9. Kits (shared parts; reuse them exactly)

- **Figure kit.**
  - Head: a solid circle, r = 3.
  - Neck gap: the torso starts at least 6 units from the head's centre.
  - Torso: 11 units along (0,1) or (1,2).
  - Limbs: two segments of 4–9 units each, from the direction set.
  - Shoulder: 2 units below the torso's start. Arms and legs join exactly on the torso line.
  - Hands and feet are the ends of the lines. No fingers, no faces, no clothing detail.
- **Sign set** (the only symbols allowed, drawn only as given):
  - *heat / steam:* the zigzag `M x y L x+2 y-2 L x y-4 L x+2 y-6`
  - *water / rain drop:* one segment along (1,2), 4 units long
  - *sound:* two concentric arcs, r = 4 and r = 8
  - *cold:* three 6-unit segments crossing at a point, along (1,0), (1,1) and (1,−1)

  Never ✓ or ✗: those are the grading marks.

## 10. QA gate (build-time scripts only; nothing ships unverified)

1. **Parse and allowlist** (§4). Re-run the same validator at **runtime** before the SVG is set via `dangerouslySetInnerHTML` (`lib/illustration.tsx:171–181`). It is a few lines, and it is the security boundary.
2. **Geometry** (§5–§7), numerically.
3. **Render** at 24, 48 and 120 px with `@resvg/resvg-js` (a devDependency in `scripts/`, never in the bundle).
   - At 48 px, ink covers **6–45%** of the live area.
   - At 24 px, the number of enclosed holes equals the count at 120 px, so no counter fills in.
4. **Blind recognition.** A vision model sees only the 120 px PNG and returns its top 3 English guesses. The pictogram passes if any guess matches `en`/`syn`, using the app's matcher with stemming. The model never sees the word.
5. **Collision.** A pictogram is rejected if its raster IoU is ≥ 0.9 with an accepted pictogram of a non-synonym card.
6. **Human contact sheet.** 100 pictograms per sheet, in both themes, at 96 pt. The reviewer may **reject only**, never hand-edit; a reject is re-authored by the script, as with the corpus rule.
7. **Record keeping and licence.** Store the model, the prompt version and the date per batch. Pictograms are dedicated **CC0 1.0**; add a section to `ATTRIBUTIONS.md` rather than labelling them CC BY-SA (panel 06).

**Where the files live.** The data goes in `public/data/picto/<level>.json` (`{id: inner}`), written only by `scripts/corpus/picto-*.ts`. It is lazy-loaded per level and never precached.

**Size.** An estimate for the whole set is ~150 bytes of `inner` on average, so a few hundred KB before gzip. The real figure comes from the pilot.

**Pilot.** Start with 100 cards: 40 concrete nouns, 20 abstract nouns (these should mostly skip), 20 verbs and 20 adjectives. Its pass rate and skip rate are the imageability measurement Lexi does not yet have.

## 11. Worked examples (all pass §4–§7; rendered and inspected)

### A. Concrete noun: `voc:A1:die Tasse` — *cup*

```svg
<path d="M12 20V30A8 8 0 0 0 20 38H24A8 8 0 0 0 32 30V20Z"/>
<path d="M32 23A4 4 0 0 1 32 31"/>
<path d="M10 42H34"/>
<path d="M19 16L21 14L19 12L21 10"/>
<path d="M25 16L27 14L25 12L27 10"/>
```

- **Body:** a closed path with two quarter-arcs, r = 8, for the rounded base. The rim is the closing Z, which is horizontal.
- **Handle:** a half-arc, r = 4.
- **Saucer:** the object's own floor, centred under the body.
- **Steam:** two sign-set zigzags. They separate *cup* from *bowl* and *pot*, the likely blind-test confusions.
- **Checks:** four outline shapes, no solids. Bounding-box centre x = 22 ✓. **389 bytes with the root.**

### B. Verb: `voc:A1:laufen` — *to run, to walk*

```svg
<circle cx="31" cy="9" r="3" fill="currentColor"/>
<path d="M28 15L23 25"/>
<path d="M27 17L31 21L35 17"/>
<path d="M27 17L21 20L19 16"/>
<path d="M23 25L31 29L27 37"/>
<path d="M23 25L19 33L11 37"/>
<path d="M6 42H42"/>
```

- **Kit figure facing right.**
  - Torso: along (1,2) from the neck (28,15) to the hip (23,25).
  - Shoulder: (27,17), which lies exactly on the torso line.
  - Arms: (4,4) then (4,−4) forward; (−6,3) then (−2,−4) back.
  - Legs: (8,4) then (−4,8) for the knee drive; (−4,8) then (−8,4) for the back kick.
- **Ground line:** present because both feet are off the ground. Motion is exactly what it exists for.
- **Gloss match:** blind guesses of "running" match the gloss's *to run*. The gloss also says *walk*, and a walker would be the weaker drawing.
- **Checks:** one solid (the head). **416 bytes.**

### C. Adjective: `voc:A1:hoch` — *high, tall*

```svg
<path d="M28 42V16L33 11L38 16V42Z" fill="currentColor"/>
<path d="M10 42V33L14 29L18 33V42"/>
<path d="M6 42H42"/>
```

- **Contrast pair.** The foil on the left is a short outline tower with a 45° roof. The target on the right is the same shape, **solid**, 3.5 times taller.
- **Why the roofs:** without them the pair reads as a bar chart. With them it reads as buildings, and height is the only difference, as §8 requires.
- **Checks:** one solid. **315 bytes.**

## 12. The authoring prompt (few-shot; paste §2–§9 above it verbatim)

```
You draw Lexi pictograms. For each card {id, term, pos, en, syn, ex_en} decide by
§2 whether to SKIP (default when in doubt). Otherwise output `inner` markup that
obeys §4–§9 exactly: 48-unit grid, integer coordinates in [4,44], absolute M L H V
A Z only, directions 1:0 2:1 1:1 1:2 0:1, one stroke weight (never set it), fill
only "currentColor" and only on heads, r=2 dots and adjective targets, ≤10
elements, no text, no colour, no transform. Draw the referent a stranger would
name first. Output one JSON line per card as in §1 and nothing else.
Examples: [A] [B] [C] above, plus one SKIP (die Frist → ABSTRACT).
```
