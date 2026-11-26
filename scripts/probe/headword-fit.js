// How many headwords are wider than the surface that shows them — and the glyph
// table `src/lib/fit.ts` carries.
//
// A browser probe, because the answer depends on a webfont: paste it into the
// console of the running app (`npm run dev`, any route) and read the object it
// returns. It draws nothing and changes nothing.
//
// **Measure at the size the word is set.** The display face has an optical-size
// axis (Fraunces was 16–17% wider per em at 34–46px than at 100px; Bricolage,
// since 2026-11-26, narrows as it grows). The first run of this probe
// used 100px and reported 273 feed headwords; the answer at the real size was 758.
//
// The measures are what a 390pt iPhone gives each surface (read off the DOM on
// 2026-11-14): the feed and the entry 342pt, the session card 293pt, a drill
// prompt 300pt. Sizes are the type ramp's steps at a root of 17px — the iOS
// default, which `html { font: -apple-system-body }` adopts — and 19px, one
// Dynamic Type step up.
(async () => {
  const base = document.querySelector('base')?.href ?? (location.pathname.match(/^\/[^/]+\//)?.[0] ?? '/');
  const raw = await fetch(new URL('data/cards.json', new URL(base, location.origin))).then((r) => r.json());
  const cards = (Array.isArray(raw) ? raw : raw.cards ?? raw.words ?? Object.values(raw)).filter((c) => c.kind !== 'grammar');
  const strip = (t) => t.replace(/^(der|die|das)\s+/i, '');
  const tokens = [...new Set(cards.flatMap((c) => strip(c.term).split(/\s+/)))];
  const ctx = document.createElement('canvas').getContext('2d');
  const FACE = '"Bricolage Grotesque"', WEIGHT = 700;   // `.headword` in index.css
  const font = async (px) => { await document.fonts.load(`${WEIGHT} ${px}px ${FACE}`); ctx.font = `${WEIGHT} ${px}px ${FACE}`; };

  // -- how many break --------------------------------------------------------
  const TRACKING = -0.02;   // `.headword { letter-spacing }`
  const over = async (measure, px) => {
    await font(px);
    return cards.filter((c) => Math.max(...strip(c.term).split(/\s+/)
      .map((t) => ctx.measureText(t).width + TRACKING * px * t.length)) > measure).length;
  };
  const SURFACES = { feed: [342, 2.75], session: [293, 2.125], entry: [342, 2.125], prompt: [300, 1.625] };
  const counts = {};
  for (const [name, [measure, rem]] of Object.entries(SURFACES)) {
    for (const root of [17, 19]) counts[`${name}@${root}px`] = await over(measure, rem * root);
  }

  // -- the table, and how far a sum of advances is from the real word ---------
  await font(40);
  const advance = {};
  for (const ch of [...new Set(tokens.join(''))].sort()) advance[ch] = Math.round(ctx.measureText(ch).width / 40 * 1000) / 1000;
  const est = (t) => [...t].reduce((s, ch) => s + (advance[ch] ?? 0.8), 0);
  const error = [];
  for (const px of [24, 28, 34, 40, 46, 52]) {
    await font(px);
    let hi = 0, lo = 9;
    for (const t of tokens) {
      if (t.length < 6) continue;
      const r = ctx.measureText(t).width / px / est(t);
      hi = Math.max(hi, r); lo = Math.min(lo, r);
    }
    error.push(`${px}px: browser/estimate ${lo.toFixed(4)}–${hi.toFixed(4)}`);
  }
  return { cards: cards.length, fontLoaded: document.fonts.check(`${WEIGHT} 40px ${FACE}`), counts, error, advance: JSON.stringify(advance) };
})();
