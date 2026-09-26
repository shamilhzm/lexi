// Word pictograms — the grammar's machine half.
//
// A pictogram is a claim about meaning, so it passes a gate the way a gloss does
// (DESIGN §13, drafted by the panel review, 2026-09-25). This file is that gate's
// deterministic part: an allowlist and a geometry check that every pictogram must
// pass **twice** — when a batch is built (`scripts/corpus/picto-build.ts`) and again
// at runtime, immediately before the markup is set as SVG. The runtime pass is the
// security boundary: `inner` reaches the DOM as markup, and nothing that is not a
// plain `path`/`circle`/`rect`/`line` with integer geometry can survive it.
//
// The grammar in one breath: a 48-unit grid, integers only, a live area of
// [4, 44], absolute M L H V A Z commands, straight segments only at 0°, ≈27°,
// 45°, ≈63° or 90°, quarter and half arcs of a few fixed radii, one stroke weight
// that the asset can never set, and colour that belongs to the page (every stroke
// and fill is `currentColor`). That is what lets ten thousand marks look like one
// hand drew them, and it is also what makes them checkable.

export const PICTO_VIEWBOX = 48;
const LO = 4;
const HI = 44;
const RADII = new Set([2, 3, 4, 6, 8, 12, 16]);
const MAX_ELEMENTS = 10;
const MAX_COMMANDS = 40;
const MAX_BYTES = 600;
const MAX_SOLIDS = 2;

const ALLOWED: Record<string, Set<string>> = {
  path: new Set(['d', 'fill']),
  circle: new Set(['cx', 'cy', 'r', 'fill']),
  rect: new Set(['x', 'y', 'width', 'height', 'fill']),
  line: new Set(['x1', 'y1', 'x2', 'y2']),
};

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** 0°, ≈27°, 45°, ≈63°, 90° — as reduced integer ratios |dx|:|dy|. */
function directionOk(dx: number, dy: number): boolean {
  const ax = Math.abs(dx); const ay = Math.abs(dy);
  if (ax === 0 && ay === 0) return false;
  const g = gcd(ax, ay);
  const key = `${ax / g}:${ay / g}`;
  return key === '1:0' || key === '0:1' || key === '1:1' || key === '2:1' || key === '1:2';
}
const inArea = (n: number) => Number.isInteger(n) && n >= LO && n <= HI;

function checkPath(d: string, errs: string[]): number {
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  if (tokens.join('').length === 0) { errs.push('empty path'); return 0; }
  if (/[^MLHVAZ0-9\s.,-]/.test(d)) { errs.push(`path uses a command outside M L H V A Z: "${d}"`); return 0; }
  let i = 0; let cmds = 0;
  let x = NaN; let y = NaN; let sx = NaN; let sy = NaN;
  const num = () => { const t = tokens[i++]; const n = Number(t); if (!Number.isInteger(n)) errs.push(`non-integer ${t}`); return n; };
  const seg = (nx: number, ny: number) => {
    if (!inArea(nx) || !inArea(ny)) errs.push(`point ${nx},${ny} outside [${LO}, ${HI}]`);
    if (!directionOk(nx - x, ny - y)) errs.push(`segment ${x},${y}→${nx},${ny} is off the direction set`);
    x = nx; y = ny;
  };
  while (i < tokens.length) {
    const c = tokens[i++];
    cmds++;
    if (c === 'M') { x = num(); y = num(); sx = x; sy = y; if (!inArea(x) || !inArea(y)) errs.push(`point ${x},${y} outside [${LO}, ${HI}]`); }
    else if (c === 'L') seg(num(), num());
    else if (c === 'H') seg(num(), y);
    else if (c === 'V') seg(x, num());
    else if (c === 'Z') { if (x !== sx || y !== sy) { const cx = x; const cy = y; seg(sx, sy); x = sx; y = sy; void cx; void cy; } }
    else if (c === 'A') {
      const rx = num(); const ry = num(); const rot = num(); const large = num(); const sweep = num(); const nx = num(); const ny = num();
      if (rx !== ry || !RADII.has(rx)) errs.push(`arc radius ${rx},${ry} not one of ${[...RADII].join(', ')}`);
      if (rot !== 0) errs.push('arc rotation must be 0');
      if ((large !== 0 && large !== 1) || (sweep !== 0 && sweep !== 1)) errs.push('arc flags must be 0 or 1');
      const dx = Math.abs(nx - x); const dy = Math.abs(ny - y);
      const quarter = dx === rx && dy === rx;
      const half = (dx === 0 && dy === 2 * rx) || (dy === 0 && dx === 2 * rx);
      if (!quarter && !half) errs.push(`arc ${x},${y}→${nx},${ny} is not a quarter or half circle of r=${rx}`);
      if (!inArea(nx) || !inArea(ny)) errs.push(`point ${nx},${ny} outside [${LO}, ${HI}]`);
      x = nx; y = ny;
    } else { errs.push(`command "${c}" not allowed`); break; }
  }
  return cmds;
}

/** Every rule the grammar can check without rendering. Empty means valid. */
export function validatePicto(inner: string): string[] {
  const errs: string[] = [];
  if (inner.length > MAX_BYTES) errs.push(`${inner.length} bytes (max ${MAX_BYTES})`);
  // Everything must be a self-closing allowed element; any other text is a reject.
  const rest = inner.replace(/<(path|circle|rect|line)((?:\s+[a-z0-9]+="[^"<>]*")*)\s*\/>/g, '').trim();
  if (rest) errs.push(`unexpected markup: ${rest.slice(0, 40)}`);
  const els = [...inner.matchAll(/<(\w+)((?:\s+[a-zA-Z0-9-]+="[^"<>]*")*)\s*\/?>/g)];
  if (els.length === 0) errs.push('no elements');
  if (els.length > MAX_ELEMENTS) errs.push(`${els.length} elements (max ${MAX_ELEMENTS})`);
  let cmds = 0; let solids = 0;
  for (const [, tag, attrStr] of els) {
    const allowed = ALLOWED[tag];
    if (!allowed) { errs.push(`<${tag}> not allowed`); continue; }
    const attrs: Record<string, string> = {};
    for (const [, k, v] of attrStr.matchAll(/([a-zA-Z0-9-]+)="([^"]*)"/g)) {
      if (!allowed.has(k)) errs.push(`<${tag} ${k}> not allowed`);
      attrs[k] = v;
    }
    if (attrs.fill !== undefined) {
      if (attrs.fill !== 'currentColor') errs.push(`fill="${attrs.fill}" — only currentColor`);
      else solids++;
    }
    const n = (k: string) => Number(attrs[k]);
    if (tag === 'path') cmds += checkPath(attrs.d ?? '', errs);
    else if (tag === 'circle') {
      if (!RADII.has(n('r'))) errs.push(`circle r=${attrs.r} not in the radius set`);
      if (!inArea(n('cx')) || !inArea(n('cy')) || n('cx') - n('r') < LO || n('cx') + n('r') > HI
        || n('cy') - n('r') < LO || n('cy') + n('r') > HI) errs.push(`circle ${attrs.cx},${attrs.cy} r${attrs.r} leaves the live area`);
    } else if (tag === 'rect') {
      for (const k of ['x', 'y', 'width', 'height']) if (!Number.isInteger(n(k))) errs.push(`rect ${k} not an integer`);
      if (!inArea(n('x')) || !inArea(n('y')) || !inArea(n('x') + n('width')) || !inArea(n('y') + n('height'))) errs.push('rect leaves the live area');
    } else if (tag === 'line') {
      for (const k of ['x1', 'y1', 'x2', 'y2']) if (!inArea(n(k))) errs.push(`line ${k}=${attrs[k]} outside the live area`);
      if (!directionOk(n('x2') - n('x1'), n('y2') - n('y1'))) errs.push('line is off the direction set');
    }
  }
  if (cmds > MAX_COMMANDS) errs.push(`${cmds} path commands (max ${MAX_COMMANDS})`);
  if (solids > MAX_SOLIDS) errs.push(`${solids} solid elements (max ${MAX_SOLIDS})`);
  return errs;
}

/** The root the renderer injects around `inner`. Never authored per pictogram. */
export function pictoSvg(inner: string, size = 96): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" `
    + `stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" `
    + `aria-hidden="true" focusable="false">${inner}</svg>`;
}
