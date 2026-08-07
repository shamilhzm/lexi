// The observatory palette.
//
// This surface is unconditionally dark, in light theme and dark alike. That is a
// deliberate exception to the token discipline in docs/DESIGN.md §2, taken for
// the same reason §8 lets the session desk drop every piece of chrome: it is a
// different room for a different activity. A field of bioluminescent points
// needs black to be luminous, and a glowing brain on a paper-white instrument
// panel is not a weaker version of this idea, it is a different and worse one.
//
// Colours live here as numbers rather than as CSS variables because WebGL needs
// floats, and one source beats two that can drift. `src/index.css` mirrors the
// same values into `--brain-*` for the region rail's chips.

export interface Rgb { r: number; g: number; b: number }

const rgb = (hex: number): Rgb => ({
  r: ((hex >> 16) & 255) / 255,
  g: ((hex >> 8) & 255) / 255,
  b: (hex & 255) / 255,
});

/** Hue per region. Warm for form, cool for meaning, white for memory — so the
 *  brain reads as warm at the front and cool behind even before a single label
 *  is shown, which is roughly how the language network is actually arranged. */
export const REGION_COLOR: Record<string, Rgb> = {
  ifg: rgb(0xffb35c),  // Broca's — amber
  pstg: rgb(0xffd487), // Wernicke's — pale gold
  smg: rgb(0xb6f28a),  // phonological loop — spring
  ag: rgb(0x8ab6ff),   // abstract — periwinkle
  atl: rgb(0xff8ad0),  // the hub — magenta
  ffg: rgb(0x5cf0b8),  // living things — mint
  ppa: rgb(0x63c8ff),  // places — sky
  pmc: rgb(0xff7a6b),  // actions — coral
  pmtg: rgb(0xb48aff), // artefacts — violet
  ips: rgb(0x6ef0f0),  // number & space — aqua
  ins: rgb(0xffa06b),  // taste & body — tangerine
  amy: rgb(0xff6b9d),  // feeling — rose
  tpj: rgb(0x9aa8ff),  // other minds — indigo
  stg: rgb(0xffe97a),  // sound & story — yellow
  hip: rgb(0xffffff),  // new memory — white, the source everything leaves
  cau: rgb(0x7affd4),  // switching — turquoise
};

export const HEX: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_COLOR).map(([k, c]) => [
    k,
    `#${[c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`,
  ]),
);

/** The tissue itself: cold, dim, and never quite black, so the silhouette holds
 *  even where no word has been learned yet. */
export const SUBSTRATE: Rgb = rgb(0x2f6f92);

/** Page behind the brain. Not pure black — a near-black with a blue cast reads
 *  as depth rather than as a hole in the screen. */
export const VOID = '#04070d';

export const fallbackColor = (id: string): Rgb => REGION_COLOR[id] ?? REGION_COLOR.ag;
