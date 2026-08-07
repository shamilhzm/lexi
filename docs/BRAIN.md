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

**The hull is measured, not invented.** `public/data/brain-mesh.bin` is a
triangle mesh isosurfaced from the grey-matter probability map of the MNI
ICBM152 2009c nonlinear asymmetric template — a 152-subject average — by
`npm run brain:mesh`. The gyri, the Sylvian fissure, the temporal lobe and the
cerebellum are all real anatomy at 2.4mm sampling. See `ATTRIBUTIONS.md` for the
licence, which expressly permits shipping a derived mesh.

That matters beyond looks: **the template is MNI152, which is the space the
region coordinates were already quoted in.** Swapping the procedural hull for
real anatomy moved nothing about the science — every word kept its seat, and
`meshdata.test.ts` asserts that every region still lands within 30mm of the
cortical surface, which is what would catch a space or unit mismatch.

Pipeline, in `scripts/brain/mesh.ts`:

1. Fetch and cache the 7.2MB volume (git-ignored, never redistributed).
2. Box-average to a 2.4mm isotropic grid — a probability map's cell mean is its
   partial-volume estimate, so averaging is the right resample.
3. **Fill the interior.** Grey matter is a *ribbon*: white matter falls below
   threshold, so a naïve isosurface yields two shells, the pial surface and a
   ghost brain inside it. Flooding the background inward from the volume border
   marks what is genuinely outside; whatever is left below threshold is enclosed
   and gets filled.
4. Surface Nets rather than marching cubes — no 256-case tables, one vertex per
   surface cell instead of up to five, and near-uniform output.
5. Three passes of Laplacian smoothing. Six washed the gyri out.
6. Orient every triangle from the **field gradient**, which points from inside to
   outside by construction. The first version reasoned about the sign of each
   axis's quad and got 40% of faces wound inward, which lights as holes.
7. Quantise: int16 tenths of a millimetre, 16-bit indices, normals derived in the
   browser. 0.60MB gzipped.

It is fetched **only when the room is opened** — never on Today's first paint,
where the hero keeps the cheap procedural cloud. A 0.6MB surface has no business
on the boot path for a 210px strip that would downscale the detail away.

### Why the shell is alpha-blended

Everything else in the scene is additive, which is right for points of light.
The cortical surface is not a point of light, and rendering it additively cost
three revisions to work out: under `ONE, ONE` a fragment that shades to black
adds nothing, so the darkest parts of the cortex become windows onto the
background. The interhemispheric fissure — a real canyon that 2% of the surface
sits inside — read as a tear across the top of the brain, and each fix was a
floor on how dark the surface was allowed to go.

That trade is backwards for an organ whose character is deep shadowed grooves.
Alpha blending lets dark be dark and makes the silhouette solid by construction;
translucency comes from the alpha channel instead, low face-on and opaque at the
rim. The cost is that alpha blending is order-dependent, so the scene draws in
three explicit passes — depth, interior, shell — rather than trusting a sort.

### The procedural hull, which is still here

`src/lib/brain/geometry.ts` still builds an approximate brain from five deformed
superellipsoids with named sulci carved into them. It is what the 2D fallback
renderer draws, and what the hero draws, and `meshdata.test.ts` cross-checks the
measured surface against it — a sample of the real mesh has to land inside the
approximation, which is what would catch an axis flip or a tenfold scale error.

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
