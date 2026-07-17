# Orbita — Home Galaxy (Practice / Home screen)
### A product requirements prompt for Claude Code

**Verdict / what we're building:** expand Orbita's home "galaxy" from a small flat star-field into a **zoomable, pannable star map of the learner's entire vocabulary, organized into concentric CEFR orbital rings (A1 → C2)** — scaling smoothly from a single-term close-up to a whole-collection overview of hundreds or thousands of terms. This is the reference behavior in the screen recording (Karteto's Practice tab).

**Before writing code:** inspect the repo. Find and reuse (a) the current galaxy/Practice screen and its rendering approach (this is an *upgrade* to an existing screen, not a new one), (b) the **Term** data layer (the demo shows 103 terms — terms already exist), (c) the shared **CEFR level** taxonomy used by the grammar packs (A1–C2 — the rings reuse it), (d) theme tokens, (e) the bottom-sheet and search-field components. Hex/px below are the target look; substitute Orbita tokens where they exist.

---

## What the reference demonstrates (the target)

The current galaxy is essentially a flat scatter of dots. The demo adds the structure and scale we want:

1. **Every term is a star** on one large canvas (103 in the demo; design for far more).
2. **Concentric orbital rings = CEFR levels**, each tagged with a small badge (A1 innermost → C2 outermost). Terms sit on the ring matching their level, so the map literally **grows outward as the learner advances**.
3. **Deep, smooth zoom + pan.** Pull back to see the whole labeled cloud; mid-zoom shows the ring skeleton; zoom in to individual stars.
4. **Word labels surface contextually** — the German headword appears next to its star as you move through the map.
5. **State coloring:** faint grey = ordinary term; **blue = the active practice set** ("Practice 25 terms") and **blue = a search hit**.
6. **Search flies to a term:** typing in the top field filters + autocompletes; selecting a word pans/zooms the camera to that star and highlights it.
7. A **bottom sheet** floats over the galaxy: a primary "**Practice N terms →**" CTA and a "**My terms — Manage N terms**" row.

## Screen anatomy

```
Home Galaxy (screen)
├── Header: "Practice" · premium badge · language selector
├── Search field (magnifier + placeholder) + translate/lang toggle
├── Galaxy canvas (full-bleed, behind everything)
│   ├── Orbital rings A1…C2 (thin, with level badges)
│   ├── Stars (one per term) with contextual labels
│   └── Camera: pan + pinch-zoom
└── Bottom sheet (over canvas)
    ├── "Practice N terms →"  (primary CTA)
    └── "My terms — Manage N terms >"
```

## The galaxy canvas

**Camera / navigation**
- Free **pan** (drag) and **pinch-zoom** with inertia; double-tap to zoom in. Clamp to min zoom (whole galaxy fits) and max zoom (single star comfortably framed).
- Respect **reduced-motion**: disable inertia and auto-fly; jump instead of animate.

**Orbital rings (the scale skeleton)**
- Concentric circles centered on the galaxy core. Six rings: **A1 (inner) → A2 → B1 → B2 → C1 → C2 (outer)**. Each ring carries a small **CEFR badge** on its circumference.
- A term is placed on (or in a thin band around) the ring for its `level`. **Angular position is stable** across sessions — derive it deterministically from the term id (hash → angle) so the user's galaxy looks the same each visit. (Semantic angular clustering of related words is a Backlog nice-to-have.)
- The inner rings are dense (most learners have more A1/A2 terms); outer rings sparse — this asymmetry is the visual of progress.

**Stars**
- One point per term. Default: faint, low-opacity neutral dot.
- **Active practice set** (`inActiveSet`): blue, brighter/larger.
- **Search match**: blue + emphasized, camera flies to it.
- *(Proposed, if SRS/strength data exists)* map **mastery → brightness/size** (well-known terms glow brighter; weak/new terms dimmer) and give **due-for-review** terms a subtle pulse. If no progress data exists yet, stars are uniform until it does — flag this.

**Labels (level-of-detail + de-clutter)**
- Show the headword beside a star based on zoom and available space. Far zoom → a **de-cluttered** subset (drop overlapping labels so it reads as a legible word-cloud, not mush); closer zoom → labels for most/all visible stars; closest zoom → full label + tap target per star.
- Labels are dark text; rings/badges green; background cream (see Visual spec). Never let overlapping labels render unreadably stacked — collision-cull them.

**Tap targets**
- Tap a **star** → term detail / quick actions (reuse Orbita's term detail). Requires hit-testing at scale — use a spatial index (e.g. quadtree), not per-node listeners.
- *(Optional)* tap a **ring badge** → filter/emphasize that level.

## Search
- Top **search field** (magnifier, "Search word…"). Typing filters the galaxy and shows **autocomplete suggestions** (demo: "hallo / halloumi"). Selecting a suggestion **flies the camera** to that term's star and highlights it blue. Clearing search returns to the prior view.

## Bottom sheet (over the galaxy)
- **"Practice N terms →"** — primary blue CTA; starts a practice session over the active/due set (N = size of that set).
- **"My terms — Manage N terms >"** — opens the full, non-spatial term list (also serves as the accessible alternative to the spatial map). N = total terms.
- Reuse Orbita's existing sheet; it should sit above the canvas without blocking pan/zoom on the visible galaxy area.

## Data (a view over existing Terms — no heavy new entities)

The galaxy is a **rendering of the user's term collection**, not new content. Per term it needs:

```ts
GalaxyTerm {              // derived from Term (+ progress, if available)
  termId; headword;
  level: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2';   // → orbital ring (shared CEFR taxonomy)
  strength?: number;      // 0..1 mastery, drives visual weight (if SRS exists)
  dueForReview?: boolean;
  inActiveSet?: boolean;  // member of the "Practice N" set → blue
  // position is DERIVED, not stored: ring = level, angle = stableHash(termId)
}
```

If Orbita's terms don't yet carry a CEFR `level`, that's the prerequisite to resolve (assign or estimate one) — the rings can't place a term without it.

## Visual spec (match the reference; use Orbita tokens)
- **Background:** Orbita cream (~#FAF6E8) — this is a *light* galaxy, not dark space.
- **Stars:** translucent neutral grey; **active/selected/search:** royal blue (~#2D5BE3).
- **Rings + level badges:** thin **green** lines and small green CEFR pills (green = structure; blue = active — keep them distinct).
- **Labels:** near-black text. **Header H1 "Practice"** heavy display; crown + flag top-right as elsewhere.

## Performance & tech (this is what makes "scale" non-trivial)
- Rendering hundreds–thousands of animated points + labels at **60fps pinch-zoom** rules out DOM-node-per-star. Use a **canvas/WebGL** renderer (web) or the native equivalent (Skia / SceneKit / RN Skia). 
- Use a **spatial index (quadtree)** for hit-testing and label de-clutter; **virtualize labels** (only lay out those in view). Keep star positions precomputed/cached per session.
- Target smooth interaction at the largest realistic collection, not just 103.

## States
- **Loading:** render rings immediately; fade stars in as data resolves.
- **Sparse collection** (few terms): still show rings; the galaxy looks like a small core — that's expected and motivating, not an error.
- **Empty** (no terms yet): show rings + a prompt to add terms (route to Add Term / Explore).
- **Reduced-motion:** static jumps, no inertia/auto-fly.

## Out of scope (this build)
The Explore surface (separate PRD), audio wiring, billing, and everything in Backlog below.

## Acceptance criteria
1. Home/Practice renders the user's terms as a **pannable, pinch-zoomable** star map on the cream canvas.
2. **Six concentric CEFR rings (A1→C2)** with level badges; each term sits on the ring for its level at a **stable** angular position.
3. **Zoom LOD works:** whole-galaxy overview shows rings + a de-cluttered label cloud; zooming in shows individual labeled stars; labels never render as unreadable overlap.
4. **Coloring:** active practice set and search hits are blue; ordinary terms faint grey.
5. **Search** filters + autocompletes and **flies the camera** to the selected term, highlighting it.
6. **Bottom sheet** shows "Practice N terms →" (launches a session) and "My terms — Manage N terms" (opens the list).
7. Interaction stays smooth (60fps target) at large term counts via a canvas/WebGL-class renderer + spatial index — not DOM-per-star.
8. Colors, type, header, and bottom nav match Orbita's system.

## Assumptions to confirm
- "Home galaxy" = the **Practice/Home** star-map screen shown in the demo.
- Orbita terms carry (or can be given) a **CEFR level** — required for ring placement.
- **Green rings = CEFR levels**; **blue = active practice set + search hit**.
- "**Practice N terms**" starts a session over the due/active set; "**Manage N terms**" opens the full list.
- Whether **mastery/SRS** data exists to drive star brightness/size; if not, stars are uniform for now.

---

## Backlog *(not in this build)*
- **Semantic clustering:** position related words near each other angularly (e.g. by topic/embedding), so regions of the galaxy become meaningful neighborhoods.
- **Constellations / links:** draw connections between related terms (synonyms, word families, same deck).
- **Mastery-driven visuals** once SRS lands: brightness, size, pulse for due reviews; "supernova" on mastering a term.
- **Galaxy by deck or by Explore category** as alternate layouts/filters.
- **Multi-language galaxies:** one galaxy per target language, switchable via the language selector.
- **Shareable galaxy snapshot** (image/state) — ties into the social/tandem backlog in the Explore PRD.
