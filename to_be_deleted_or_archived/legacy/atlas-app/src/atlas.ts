// The Atlas — ink-on-paper cartography of every card. Concentric CEFR contour
// rings (A1 core → C2 rim); each A1/A2/B1 annulus is partitioned into labeled
// Lektion arc-sectors from the curriculum, and tagged stars scatter inside
// their lesson's arc. Untagged stars scatter freely in their level, as before.
// Mechanics kept from the galaxy map: drag-pan, wheel/pinch zoom, ring focus
// with label LOD + collision culling, search fly-to, terms panel, bottom sheet.
import './atlas.css';
import { wortartRank, galaxies, allStars, starById, hashStr, LEVELS, type CEFR, type Star, type Galaxy } from './model.ts';
import { lessonsFor, type Lektion } from './curriculum.ts';
import { reviewStateOf, dueCount, lessonState, type LessonState } from './store.ts';
import { icon } from './icons.ts';

const VB_W = 1000, VB_H = 1400, CX = 500, CY = 720;
const R0 = 120, RSTEP = 68; // ring radii A1 = 120 … C2 = 460
const ringR = (cefr: CEFR) => R0 + LEVELS.indexOf(cefr) * RSTEP;
const innerR = (cefr: CEFR) => { const i = LEVELS.indexOf(cefr); return i === 0 ? 34 : ringR(LEVELS[i - 1]); };

// One Lektion arc-sector inside its level's annulus. Angles in radians,
// 0 = twelve o'clock, clockwise (SVG y-down).
interface Sector { lektion: Lektion; a0: number; a1: number; inner: number; outer: number; state: LessonState; }
const TAU = Math.PI * 2;
const SECTOR_PAD = (3 * Math.PI) / 180; // keep stars off the separators

function buildSectors(): Sector[] {
  const out: Sector[] = [];
  for (const cefr of ['A1', 'A2', 'B1'] as CEFR[]) {
    const lessons = lessonsFor(cefr);
    const width = TAU / lessons.length;
    lessons.forEach((l, i) => out.push({
      lektion: l, a0: i * width, a1: (i + 1) * width,
      inner: innerR(cefr), outer: ringR(cefr), state: lessonState(l.n)
    }));
  }
  return out;
}
// angle helpers: sector angle a (0 at top, clockwise) → SVG point
const ax = (a: number, r: number) => CX + Math.sin(a) * r;
const ay = (a: number, r: number) => CY - Math.cos(a) * r;

let svg: SVGSVGElement;
let mapEl: HTMLElement;
let captionEl: HTMLElement;
let labelLayer: SVGGElement;
let hlLayer: SVGGElement;
let resultsEl: HTMLElement;
let termsPanel: HTMLElement;
let gs: Galaxy[] = [];
let sectors: Sector[] = [];
let onOpen: (id: string) => void = () => {};
let onStart: () => void = () => {};
let onLesson: (n: number) => void = () => {};
let focusIdx: number | null = null;
let highlightId: string | null = null;
let vb = [0, 0, VB_W, VB_H];
let raf = 0;
const pos = new Map<string, { x: number; y: number }>();

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const labelOf = (s: Star) => (s.term.length > 22 ? s.term.slice(0, 21) + '…' : s.term);

function setVB(v: number[]) { vb = v; svg.setAttribute('viewBox', v.join(' ')); }
function tweenTo(to: number[], dur = 600) {
  cancelAnimationFrame(raf);
  // No animation when reduced-motion is on, or when the tab is hidden (rAF is
  // paused there, so jump straight to the destination).
  if (reduceMotion() || document.hidden) { setVB(to); return; }
  const from = vb.slice(), t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / dur), e = easeInOutCubic(k);
    const cur = from.map((f, i) => f + (to[i] - f) * e);
    svg.setAttribute('viewBox', cur.join(' '));
    if (k < 1) raf = requestAnimationFrame(step); else vb = to.slice();
  };
  raf = requestAnimationFrame(step);
}
const universeVB = () => [0, 0, VB_W, VB_H];
function focusVB(r: number): number[] {
  const w = Math.min(2 * r + 320, VB_W);
  const h = w * (VB_H / VB_W);
  return [CX - w / 2, CY - h / 2, w, h];
}

// Deterministic, area-uniform scatter. Stars tagged with a Lektion are
// constrained to that lesson's arc; untagged stars roam the full circle.
function computePositions() {
  pos.clear();
  const byLesson = new Map(sectors.map((s) => [s.lektion.n, s]));
  for (const g of gs) {
    const lo = innerR(g.cefr) + 11, hi = ringR(g.cefr) - 11;
    for (const s of g.stars) {
      const h = hashStr(s.id);
      const frac = (h % 36000) / 36000;
      const sec = s.lektion ? byLesson.get(s.lektion) : undefined;
      // only constrain when the sector lives in this star's own annulus
      const ang = sec && sec.inner === innerR(g.cefr)
        ? sec.a0 + SECTOR_PAD + frac * (sec.a1 - sec.a0 - 2 * SECTOR_PAD)
        : frac * TAU;
      const t = ((h >> 9) % 1000) / 1000;
      const r = Math.sqrt(lo * lo + t * (hi * hi - lo * lo)); // area-uniform
      pos.set(s.id, { x: ax(ang, r), y: ay(ang, r) });
    }
  }
}

function starClass(id: string): string {
  const st = reviewStateOf(id);
  return st === 'review' ? 'st-review' : st === 'learning' || st === 'relearning' ? 'st-learn' : 'st-new';
}

// Sparse ink speckle — the paper's grain (was: starfield).
function speckle(): string {
  let s = '<g class="speckle">';
  for (let i = 0; i < 42; i++) {
    const h = hashStr('bg' + i);
    const x = (h % 1000), y = ((h >> 10) % 1400), r = ((h >> 5) % 10) / 10 * 0.9 + 0.3;
    s += `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" opacity="${(0.05 + ((h >> 7) % 12) / 100).toFixed(2)}"/>`;
  }
  return s + '</g>';
}

// Contour rings: each level boundary drawn as a solid line plus a dashed
// companion, like elevation contours, with a paper roundel level tag.
function ringsMarkup(): string {
  let out = '';
  gs.forEach((g, idx) => {
    const r = ringR(g.cefr), hue = g.hue;
    out += `<circle class="ring" cx="${CX}" cy="${CY}" r="${r}" stroke="${hue}"/>
      <circle class="ring-companion" cx="${CX}" cy="${CY}" r="${r - 4}"/>
      <g class="ring-tag" data-idx="${idx}">
        <circle class="ring-tag-dot" cx="${CX}" cy="${CY - r}" r="15" stroke="${hue}"/>
        <text class="ring-tag-cefr" x="${CX}" y="${CY - r + 0.5}" fill="${hue}">${g.cefr}</text>
      </g>`;
  });
  return out;
}

// Lektion arc-sectors: hairline radial separators + a curved label along the
// annulus midline, tinted by the lesson's state (unchecked/gap/secure/mastered).
function sectorsMarkup(): string {
  let defs = '';
  let out = '<g class="sectors">';
  for (const sec of sectors) {
    const { lektion: l, a0, a1, inner, outer } = sec;
    out += `<line class="sector-sep" x1="${ax(a0, inner).toFixed(1)}" y1="${ay(a0, inner).toFixed(1)}" x2="${ax(a0, outer).toFixed(1)}" y2="${ay(a0, outer).toFixed(1)}"/>`;
    // label path along the midline, flipped on the lower half so text is upright
    const rm = (inner + outer) / 2;
    const mid = (a0 + a1) / 2;
    const lower = Math.cos(mid) < 0;
    const [pa, pb, sweep] = lower ? [a1 - 0.02, a0 + 0.02, 0] : [a0 + 0.02, a1 - 0.02, 1];
    const pid = `secp-${l.n}`;
    const pr = lower ? rm - 4 : rm + 4; // keep text optically centered in the band
    defs += `<path id="${pid}" d="M ${ax(pa, pr).toFixed(1)} ${ay(pa, pr).toFixed(1)} A ${pr} ${pr} 0 0 ${sweep} ${ax(pb, pr).toFixed(1)} ${ay(pb, pr).toFixed(1)}"/>`;
    const seal = sec.state === 'mastered' ? '◉ ' : '';
    out += `<text class="sector-lbl sec-${sec.state}" data-lesson="${l.n}" style="--sec-hue:var(--level-${l.cefr})"><textPath href="#${pid}" startOffset="50%" text-anchor="middle">${seal}${l.n} · ${esc(l.short)}</textPath></text>`;
  }
  return `<defs>${defs}</defs>` + out + '</g>';
}

function dotsMarkup(): string {
  let out = '<g class="stars">';
  for (const g of gs) {
    const hue = g.hue;
    for (const s of g.stars) {
      const p = pos.get(s.id)!;
      const cls = starClass(s.id);
      // ink dots: new = faint stipple · learning = open circle · review = solid
      if (cls === 'st-new') {
        out += `<circle class="star st-new" data-id="${s.id}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.7"/>`;
      } else if (cls === 'st-learn') {
        out += `<circle class="star st-learn" data-id="${s.id}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.4" stroke="${hue}"/>`;
      } else {
        out += `<circle class="star st-review" data-id="${s.id}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.8" fill="${hue}"/>`;
      }
    }
  }
  return out + '</g>';
}

// A line-drawn compass rose at the center (was: the sun).
function compassMarkup(): string {
  return `<g class="compass">
    <circle class="cp-ring" cx="${CX}" cy="${CY}" r="22"/>
    <circle class="cp-ring cp-ring-in" cx="${CX}" cy="${CY}" r="15"/>
    <path class="cp-needle" d="M ${CX} ${CY - 26} L ${CX + 5} ${CY} L ${CX} ${CY + 26} L ${CX - 5} ${CY} Z"/>
    <path class="cp-needle cp-needle-ew" d="M ${CX - 26} ${CY} L ${CX} ${CY - 5} L ${CX + 26} ${CY} L ${CX} ${CY + 5} Z"/>
    <circle class="cp-dot" cx="${CX}" cy="${CY}" r="2.6"/>
  </g>`;
}

// Word chips for the focused level, collision-culled so they never stack into
// an unreadable mush (a dropped label keeps its dot in the stars layer).
function renderLabels(idx: number | null) {
  if (idx == null) { labelLayer.innerHTML = ''; return; }
  const g = gs[idx], hue = g.hue;
  const cands = g.stars.map((s) => ({ s, p: pos.get(s.id)! })).sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x);
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const hits = (a: typeof placed[0], b: typeof placed[0]) => !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  let out = '';
  for (const { s, p } of cands) {
    const label = labelOf(s);
    const w = label.length * 7.0 + 16, h = 21;
    const rect = { x: p.x - w / 2 - 2, y: p.y - h / 2 - 2, w: w + 4, h: h + 4 };
    if (placed.some((r) => hits(rect, r))) continue; // de-clutter: cull overlap
    placed.push(rect);
    const cls = starClass(s.id);
    const stroke = cls === 'st-new' ? '' : ` stroke="${hue}"`;
    out += `<g class="lbl ${cls}" data-id="${s.id}">
      <rect class="lbl-pill" x="${(p.x - w / 2).toFixed(1)}" y="${(p.y - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="10.5"${stroke}/>
      <text class="lbl-text" x="${p.x.toFixed(1)}" y="${(p.y + 0.5).toFixed(1)}">${esc(label)}</text>
    </g>`;
  }
  labelLayer.innerHTML = out;
}

function renderHighlight() {
  if (!highlightId) { hlLayer.innerHTML = ''; return; }
  const s = starById(highlightId); const p = pos.get(highlightId);
  if (!s || !p) { hlLayer.innerHTML = ''; return; }
  const label = labelOf(s), w = label.length * 7.2 + 18, h = 22;
  hlLayer.innerHTML = `
    <circle class="hl-ring" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="15"/>
    <circle class="hl-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.4"/>
    <g class="hl-lbl"><rect x="${(p.x - w / 2).toFixed(1)}" y="${(p.y + 12).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="11"/><text x="${p.x.toFixed(1)}" y="${(p.y + 12 + h / 2).toFixed(1)}">${esc(label)}</text></g>`;
}

function focusLevel(idx: number) {
  idx = clamp(idx, 0, LEVELS.length - 1);
  focusIdx = idx;
  const g = gs[idx];
  mapEl.setAttribute('data-focus', g.cefr);
  svg.querySelectorAll('.ring-tag').forEach((t) => t.classList.toggle('is-focus', Number((t as SVGElement).dataset.idx) === idx));
  svg.querySelectorAll('.sector-lbl').forEach((t) => {
    const n = Number((t as SVGElement).dataset.lesson);
    const sec = sectors.find((s) => s.lektion.n === n);
    t.classList.toggle('is-focus', !!sec && sec.lektion.cefr === g.cefr);
  });
  renderLabels(idx);
  tweenTo(focusVB(ringR(g.cefr)));
  const hasLessons = lessonsFor(g.cefr).length > 0;
  captionEl.textContent = `${g.cefr} · ${g.title} — ${g.count} Karten · ${hasLessons ? 'Lektion oder Stern antippen' : 'Stern antippen zum Üben'}`;
}
function zoomOut() {
  focusIdx = null;
  mapEl.removeAttribute('data-focus');
  svg.querySelectorAll('.ring-tag').forEach((t) => t.classList.remove('is-focus'));
  svg.querySelectorAll('.sector-lbl').forEach((t) => t.classList.remove('is-focus'));
  renderLabels(null);
  tweenTo(universeVB());
  captionEl.textContent = 'Ring antippen zum Zoomen · Lektion oder Stern antippen';
}
function zoomInStep() { focusLevel(focusIdx == null ? LEVELS.length - 1 : focusIdx - 1); }
function zoomOutStep() { if (focusIdx == null) return; if (focusIdx >= LEVELS.length - 1) zoomOut(); else focusLevel(focusIdx + 1); }

// Fly the camera to a star and highlight it (search selection).
function flyToStar(id: string) {
  const p = pos.get(id);
  if (!p) return;
  highlightId = id;
  focusIdx = null;
  mapEl.removeAttribute('data-focus');
  renderLabels(null);
  renderHighlight();
  const w = 300, h = w * (VB_H / VB_W);
  tweenTo([clamp(p.x - w / 2, -200, VB_W + 200 - w), clamp(p.y - h / 2, -200, VB_H + 200 - h), w, h]);
  const s = starById(id);
  if (s) captionEl.textContent = `${s.term} — ${s.translation}`;
}
function clearHighlight() { highlightId = null; renderHighlight(); }

// Map a pointer event to a Lektion sector (null when outside the A1–B1 annuli).
function sectorAt(e: PointerEvent): Sector | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  const dx = pt.x - CX, dy = pt.y - CY;
  const r = Math.hypot(dx, dy);
  // angle in the sectors' convention: 0 at top, clockwise
  const ang = (Math.atan2(dx, -dy) + TAU) % TAU;
  return sectors.find((s) => r >= s.inner && r <= s.outer && ang >= s.a0 && ang < s.a1) || null;
}

/* ---------- search ---------- */

function renderResults(q: string) {
  const query = q.trim().toLowerCase();
  if (!query) { resultsEl.hidden = true; resultsEl.innerHTML = ''; clearHighlight(); return; }
  const hits = allStars()
    .filter((s) => s.term.toLowerCase().includes(query) || s.translation.toLowerCase().includes(query))
    .slice(0, 8);
  if (!hits.length) { resultsEl.hidden = false; resultsEl.innerHTML = `<div class="sr-empty">Keine Treffer</div>`; return; }
  resultsEl.hidden = false;
  resultsEl.innerHTML = hits.map((s) => `<button class="sr-row" data-id="${s.id}"><span class="sr-term">${esc(s.term)}</span><span class="sr-tr">${esc(s.translation)}</span><span class="sr-lvl">${s.cefr}</span></button>`).join('');
  resultsEl.querySelectorAll('.sr-row').forEach((r) => r.addEventListener('click', () => {
    const id = (r as HTMLElement).dataset.id!;
    const inp = mapEl.parentElement!.querySelector('#gx-search') as HTMLInputElement;
    inp.value = starById(id)?.term || '';
    resultsEl.hidden = true;
    flyToStar(id);
  }));
}

/* ---------- term list panel ---------- */

function buildTermsList() {
  // Tiered ordering per the book: level → Wortart → alphabet, with the
  // Wortart shown on each row so the taxonomy stays legible while scrolling.
  const rows = allStars()
    .slice()
    .sort((a, b) => LEVELS.indexOf(a.cefr) - LEVELS.indexOf(b.cefr) || wortartRank(a.pos) - wortartRank(b.pos) || a.term.localeCompare(b.term, 'de'))
    .map((s) => `<button class="term-row" data-id="${s.id}"><span class="tr-dot ${starClass(s.id)}"></span><span class="tr-term">${esc(s.term)}</span>${s.pos ? `<span class="tr-pos mono">${esc(s.pos)}</span>` : ''}<span class="tr-tr">${esc(s.translation)}</span><span class="tr-lvl">${s.cefr}</span></button>`)
    .join('');
  (termsPanel.querySelector('.terms-list') as HTMLElement).innerHTML = rows;
  termsPanel.querySelectorAll('.term-row').forEach((r) => r.addEventListener('click', () => onOpen((r as HTMLElement).dataset.id!)));
}
function openTerms() { if (!termsPanel.querySelector('.term-row')) buildTermsList(); termsPanel.hidden = false; }
function closeTerms() { termsPanel.hidden = true; }

export function renderMap(root: HTMLElement, onOpenStar: (id: string) => void, onStartReview: () => void, onOpenLesson: (n: number) => void = () => {}) {
  gs = galaxies();
  sectors = buildSectors();
  onOpen = onOpenStar;
  onStart = onStartReview;
  onLesson = onOpenLesson;
  computePositions();
  const total = gs.reduce((n, g) => n + g.count, 0);
  const due = dueCount();
  vb = universeVB();
  root.innerHTML = `
    <div class="gmap" id="gmap">
      <svg viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Atlas aller Wörter und Übungen, A1 bis C2">
        ${speckle()}
        ${sectorsMarkup()}
        ${ringsMarkup()}
        ${dotsMarkup()}
        ${compassMarkup()}
        <g class="label-layer"></g>
        <g class="hl-layer"></g>
      </svg>
    </div>
    <div class="gmap-ui">
      <div class="gmap-top">
        <button class="zoom-out" id="zoom-out">${icon('zoomOut')} Ganzer Atlas</button>
        <div><div class="gmap-title">Atlas</div><div class="gmap-sub">A1 Kern → C2 Rand · ${total} Karten · Tinte = Können</div></div>
      </div>
      <div class="gmap-search">
        <div class="search-field">${icon('search', 'sf-ic')}<input id="gx-search" type="search" placeholder="Wort suchen…" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
        <div class="search-results" id="gx-results" hidden></div>
      </div>
      <div class="gmap-caption" id="gmap-caption">Ring antippen zum Zoomen · Lektion oder Stern antippen</div>
      <div class="gmap-sheet">
        <button class="sheet-row" id="gx-manage"><span>Alle Begriffe</span><span class="sheet-row-n">${total} ›</span></button>
        <button class="sheet-cta" id="gx-practice" ${due ? '' : 'disabled'}>${due ? `Üben: ${due} ${due === 1 ? 'Karte' : 'Karten'} →` : 'Alles gelernt'}</button>
      </div>
    </div>
    <div class="terms-panel" id="gx-terms" hidden>
      <div class="terms-head"><button class="tp-close" id="tp-close">${icon('back')}</button><span class="tp-title">Alle Begriffe</span><span class="tp-n">${total}</span></div>
      <div class="terms-list"></div>
    </div>`;

  mapEl = root.querySelector('#gmap')!;
  svg = mapEl.querySelector('svg')!;
  captionEl = root.querySelector('#gmap-caption')!;
  labelLayer = svg.querySelector('.label-layer')!;
  hlLayer = svg.querySelector('.hl-layer')!;
  resultsEl = root.querySelector('#gx-results')!;
  termsPanel = root.querySelector('#gx-terms')!;
  svg.setAttribute('viewBox', vb.join(' '));

  bindPanAndTap();
  root.querySelector('#zoom-out')!.addEventListener('click', (e) => { e.stopPropagation(); zoomOut(); });
  mapEl.addEventListener('wheel', (e) => { e.preventDefault(); if (e.deltaY < 0) zoomInStep(); else zoomOutStep(); }, { passive: false });

  // search
  const input = root.querySelector('#gx-search') as HTMLInputElement;
  input.addEventListener('input', () => renderResults(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const first = resultsEl.querySelector('.sr-row') as HTMLElement | null; if (first) first.click(); }
    else if (e.key === 'Escape') { input.value = ''; renderResults(''); zoomOut(); }
  });

  // bottom sheet
  root.querySelector('#gx-practice')!.addEventListener('click', () => onStart());
  root.querySelector('#gx-manage')!.addEventListener('click', () => openTerms());
  root.querySelector('#tp-close')!.addEventListener('click', () => closeTerms());

  // pinch
  let pinchStart = 0;
  mapEl.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (!pinchStart) { pinchStart = d; return; }
    if (d - pinchStart > 55) { zoomInStep(); pinchStart = d; }
    else if (pinchStart - d > 55) { zoomOutStep(); pinchStart = d; }
  }, { passive: true });
  mapEl.addEventListener('touchend', () => { pinchStart = 0; });
}

// One pointer pipeline: a small drag pans the canvas; a click (no drag) taps a
// star / ring tag / Lektion sector / empty space.
function bindPanAndTap() {
  let sx0 = 0, sy0 = 0, startVB = vb.slice(), down = false, panned = false;
  svg.addEventListener('pointerdown', (e) => {
    sx0 = e.clientX; sy0 = e.clientY; startVB = vb.slice(); down = true; panned = false;
    cancelAnimationFrame(raf);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!down) return;
    const rect = svg.getBoundingClientRect();
    const scale = vb[2] / rect.width;
    const dx = (e.clientX - sx0) * scale, dy = (e.clientY - sy0) * scale;
    if (!panned && Math.hypot(e.clientX - sx0, e.clientY - sy0) > 6) { panned = true; try { svg.setPointerCapture(e.pointerId); } catch { /* ok */ } }
    if (panned) {
      const nx = clamp(startVB[0] - dx, -260, VB_W + 260 - vb[2]);
      const ny = clamp(startVB[1] - dy, -260, VB_H + 260 - vb[3]);
      setVB([nx, ny, vb[2], vb[3]]);
    }
  });
  svg.addEventListener('pointerup', (e) => {
    down = false;
    if (panned) return;
    const el = e.target as Element;
    const tag = el.closest('.ring-tag');
    if (tag) { focusLevel(Number((tag as SVGElement).dataset.idx)); return; }
    const star = el.closest('[data-id]');
    if (star) { onOpen((star as SVGElement).dataset.id!); return; }
    if (highlightId) { clearHighlight(); zoomOut(); return; }
    // a tap inside an A1–B1 annulus opens that Lektion
    const sec = sectorAt(e);
    if (sec) { onLesson(sec.lektion.n); return; }
    if (focusIdx != null) zoomOut();
  });
  svg.addEventListener('pointercancel', () => { down = false; });
}
