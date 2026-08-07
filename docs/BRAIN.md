# Das Gehirn — the brain map, and what it does and does not claim

The surface at `#/brain`, and the hero on Today, draw your lexicon as a brain:
one point of light per card, placed in the cortical region the literature
associates with that card's meaning, migrating outward from the hippocampus as
FSRS decides the word has stuck.

This document exists because the visualisation makes a scientific-looking claim
on every pixel, and the project's rule is that a number it shows has to be one it
can defend (see `ATTRIBUTIONS.md`, `provenance.json`, and the ledger in
`src/lib/ledger.ts`). What follows is the claim, stated precisely.

## What this is not

**It is not a picture of your brain.** Nobody has been scanned. No measurement of
any individual is involved at any point, and none is implied.

**It is not a claim that your German vocabulary is stored where the dots are.**
Where a *concept* is processed in a group-averaged fMRI study is not where *your*
memory of a German noun lives, and a second language is not organised identically
to a first.

The standing caption on the surface says the first of these in one line. This
file says the rest.

## What it is

Three claims, each with a different amount of weight behind it.

### 1. Semantic knowledge is distributed, not localised — *established*

Category-selective cortical responses replicate across decades and methods, and
Huth et al. (2016, *Nature*) showed a continuous semantic space tiling the cortex
bilaterally, largely symmetrically, with consistent structure across subjects.
Meaning is not in one place, and *which* meaning predicts *which* place well
above chance. A map of vocabulary that puts every word in the same blob would be
the less accurate picture.

### 2. Consolidation moves a memory from hippocampus to neocortex — *established*

Complementary Learning Systems theory (McClelland, McNaughton & O'Reilly 1995)
holds that new memories are initially hippocampus-dependent and become
neocortical through repeated, spaced reactivation, slowly enough not to overwrite
what the cortex already knows. For novel *words* specifically, Davis & Gaskell
(2009) find a newly learned form behaves episodically on day one and lexically
after sleep-mediated consolidation.

This is the one place the visualisation stops illustrating and starts rendering.
FSRS `stability` — the days until recall probability decays to the retention
target — is a monotone estimate of consolidation derived from the same spacing
effect the theory is about. `src/lib/brain/consolidation.ts` maps it, on a log
scale, to the journey from hippocampus to cortical home. It is not a measurement
of your hippocampus. It is the scheduler's own belief, drawn.

### 3. This *particular* German sector belongs in that *particular* region — *an interpretation*

This is the weak joint, and it is labelled as such in the UI. Each region carries
a `confidence` tier, shown to the learner with its sources:

| Tier | Means |
|---|---|
| `established` | Replicated, uncontroversial, meta-analysed. |
| `converging` | Several independent lines agree; details are argued over. |
| `illustrative` | A defensible reading of the evidence, not a finding. |

## The sixteen regions

Coordinates are approximate MNI152 peaks drawn from the cited work, rounded. They
place a region; they do not claim millimetre precision. Full data, including
sources, is in `src/lib/brain/atlas.ts` — that file is the source of truth and
this table is a reading of it.

| id | Region | Claims | Tier |
|---|---|---|---|
| `ifg` | Inferior frontal gyrus (Broca's) | grammar, connectors, closed class | established |
| `pstg` | Posterior superior temporal (Wernicke's) | core vocabulary, communication, phrases | established |
| `smg` | Supramarginal gyrus | exam lists, first words, the vocabulary of studying | converging |
| `ag` | Angular gyrus | abstract nouns — **and the residual** | established |
| `atl` | Anterior temporal lobe | adjectives, adverbs, attributes | established |
| `ffg` | Fusiform gyrus | animals, people, family, body parts, colour | established |
| `ppa` | Parahippocampal place area | home, travel, city, countries, weather, nature | established |
| `pmc` | Premotor cortex | verbs, sport, games, leisure | converging |
| `pmtg` | Posterior middle temporal | clothing, furniture, technology, materials | established |
| `ips` | Intraparietal sulcus | numbers, time, money, spatial relations | established |
| `ins` | Insula | food, drink, health, the body | converging |
| `amy` | Amygdala & vmPFC | emotions, relationships, ethics, values | converging |
| `tpj` | TPJ & dmPFC | society, politics, institutions, **work** | converging |
| `stg` | Superior temporal gyrus | music, theatre, film, literature | converging |
| `hip` | Hippocampus | every new and learning card, whatever it means | established |
| `cau` | Caudate nucleus | the `gym:` direction drills | converging |

### The joins worth arguing about

- **Work & Economy → `tpj`.** Huth et al. found a "professional" semantic
  dimension but the atlas has no dedicated region for it, and working life is
  institutional before it is anything else. This is the loosest join in the file.
- **Adjectives and adverbs → `atl`.** 800 cards on one claim: that the amodal hub
  binds cross-modal *attributes*. Defensible from hub-and-spoke; not a finding
  about adjectives.
- **Leisure and games → `pmc`.** Filed as activities-you-do. Thin.
- **Weather and environment → `ppa`.** PPA responds to landscapes and open
  scenes, which covers weather better than it looks, but not perfectly.
- **The residual → `ag`.** `Miscellaneous` is 600 cards the corpus itself
  declined to classify. The angular gyrus is where the literature already puts
  abstract and heteromodal concepts, so the residual is a real destination rather
  than a bin — but it is still a residual.

## How a card finds its region

Rules, not a 291-row table, because the corpus moves: sectors get added, renamed
and merged by `scripts/corpus/*`, and a table would drop each new one silently.

1. Card-id namespace wins first. `gym:` → `cau` (switching, not meaning);
   `gram:`/`gex:` → `ifg`.
2. Otherwise, ordered patterns over the **normalised** sector name (lowercased,
   punctuation collapsed). First match wins. Normalisation is load-bearing: the
   corpus ships both `Festivals & Customs` and `Festivals & customs`, and
   `Colors` beside `Colours`.
3. Otherwise, the sector's **fine** corpus group decides — one of the sixteen in
   `sectors.json`, *not* the ten coarse market categories, which `GROUP_SUPER` in
   `src/data/index.ts` mutates into place at load.
4. Otherwise `ag`.

The mapping is total by construction. `src/lib/brain/atlas.test.ts` guards that
every sector resolves, that no region is left unclaimed, that the residual stays
under 5% once the corpus's own `Miscellaneous` is excluded, and that no single
region holds more than a quarter of the lexicon.

## The shape

There is no mesh asset. `src/lib/brain/geometry.ts` builds the hull from five
deformed superellipsoids merged at their seams, wrinkled by seeded anisotropic
noise, and carved by twelve named sulci — Sylvian, central, parieto-occipital,
superior and inferior frontal, pre- and postcentral, intraparietal, calcarine,
superior and inferior temporal, cingulate — plus the interhemispheric fissure.
Gyral noise alone cannot make a brain recognisable; what the eye identifies is
the *named* pattern, so those are drawn rather than left to chance.

Every point carries a surface normal (finite differences across the folded
surface) and its signed relief, which is what lets the renderer light the cortex
and darken the sulci instead of scattering uniform dots. Point brightness is
scaled by the cosine of the viewing angle — that is the projected area a patch of
surface covers, and without it uniform direction sampling piles unbounded density
onto the silhouette and additive blending draws a hard outline around every part.

That solves bundle size and licensing, but the real reason is the idea: this
brain is not a model with your vocabulary painted onto it, it is *made of* your
vocabulary, and every point in it is a card.

**Anatomical honesty stops at the silhouette and starts again at the
coordinates.** The hull is stylised. Where the regions sit inside it is not.

## Primary sources

- Huth, de Heer, Griffiths, Theunissen & Gallant (2016), *Nature* — natural
  speech reveals the semantic maps that tile human cerebral cortex
- Binder, Desai, Graves & Conant (2009), *Cerebral Cortex* — semantic system
  meta-analysis
- Patterson, Nestor & Rogers (2007) and Lambon Ralph et al. (2017), *Nat Rev
  Neurosci* — the hub-and-spoke account
- McClelland, McNaughton & O'Reilly (1995), *Psychological Review* —
  complementary learning systems
- Davis & Gaskell (2009), *Phil Trans R Soc B* — consolidation of novel spoken
  words
- Pulvermüller (2005), *Nat Rev Neurosci* — language and action
- Mechelli et al. (2004), *Nature* — structural plasticity from bilingualism
- Crinion et al. (2006), *Science* — language control in the bilingual brain
- Epstein & Kanwisher (1998), *Nature* — the parahippocampal place area
- Dehaene, Piazza, Pinel & Cohen (2003), *Cogn Neuropsychol* — parietal number
  circuits
- Saxe & Kanwisher (2003), *NeuroImage* — theory of mind and the TPJ

Per-region citations live in `src/lib/brain/atlas.ts` and are shown in the app.
