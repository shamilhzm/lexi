/* Headless balance harness.
 * Extracts the SIM block out of index.html (single source of truth — the sim
 * is never duplicated) and runs it without a browser.
 *
 *   node tools/balance.mjs            # free-burn + scripted-defence runs
 *   node tools/balance.mjs --seeds 12
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const m = html.match(/\/\/ ---8<--- SIM START.*\n([\s\S]*?)\/\/ ---8<--- SIM END/);
if (!m) { console.error('SIM block not found in index.html'); process.exit(1); }

const SIM = new Function(m[1] + `
  return { createWorld, stepWorld, applyDrop, assessThreat, mulberry32,
           W, H, N, TICK, HA_PER_CELL, K, S_GREEN, S_FIRE, S_BURNT, T_WATER };`)();
const { createWorld, stepWorld, applyDrop, mulberry32, W, H, TICK, HA_PER_CELL, K, S_FIRE, S_BURNT } = SIM;

const args = process.argv.slice(2);
const SEEDS = Number((args[args.indexOf('--seeds') + 1]) || 8) || 8;
const MAX_T = 600;                       // hard stop, seconds

const fmt = (n, d = 1) => n.toFixed(d).padStart(6);

/* ---------------- run 1: free burn, nobody intervenes ---------------- */
function freeBurn(seed) {
  const rnd = mulberry32(seed * 7919 + 13);
  const w = createWorld(seed);
  const marks = {};
  let peak = 0;
  while (w.t < MAX_T && w.fire.length > 0) {
    stepWorld(w, rnd);
    peak = Math.max(peak, w.fire.length);
    for (const v of w.villages) if (v.dead && !marks[v.name]) marks[v.name] = w.t;
  }
  return {
    t: w.t, burnt: w.burnt, ha: w.burnt * HA_PER_CELL,
    frac: w.burnt / w.burnable, peak,
    dead: w.villages.filter(v => v.dead).length, marks,
  };
}

/* ---------------- run 2: a competent pilot, scripted -----------------
 * Not a real player — a crude autopilot that flies lake -> line -> lake and
 * lays wet line across the head of the fire, ahead of the nearest live
 * village. If a decent pilot cannot save anything, the game is unfair; if
 * this dumb loop saves everything, the game is too easy.                */
function defended(seed, loadsPerMin) {
  const rnd = mulberry32(seed * 7919 + 13);
  const w = createWorld(seed);
  const period = 60 / loadsPerMin;       // seconds per delivered load
  let next = 8, drops = 0;
  while (w.t < MAX_T && w.fire.length > 0) {
    stepWorld(w, rnd);
    if (w.t >= next) {
      next += period;
      // aim: 4 cells downwind of the most wind-aligned perimeter cell
      const wx = Math.cos(w.wind.dir), wy = Math.sin(w.wind.dir);
      let best = null, bestS = -Infinity;
      const live = w.villages.filter(v => !v.dead);
      if (!live.length) { continue; }
      for (const i of w.perim) {
        const x = i % W, y = (i / W) | 0;
        let s = -Infinity;
        for (const v of live) {
          const dx = v.x - x, dy = v.y - y, d = Math.hypot(dx, dy) || 1;
          s = Math.max(s, ((dx / d) * wx + (dy / d) * wy) * 10 - d * 0.16);
        }
        if (s > bestS) { bestS = s; best = { x, y }; }
      }
      if (best) {
        // lay an 11-cell line across the wind, 10 cells out in front
        const ax = best.x + wx * 10, ay = best.y + wy * 10;
        for (let s = -5; s <= 5; s++) applyDrop(w, ax - wy * s, ay + wx * s, 1.7, 0.30);
        drops++;
      }
    }
  }
  return { t: w.t, ha: w.burnt * HA_PER_CELL, frac: w.burnt / w.burnable,
           dead: w.villages.filter(v => v.dead).length, drops };
}

console.log(`\nFIRELINE balance — ${W}x${H} cells, ${(W*50/1000)}x${(H*50/1000)} km, `
          + `${(SIM.N * HA_PER_CELL).toFixed(0)} ha total\n`);

console.log('FREE BURN (no intervention)');
console.log('  seed     out@s   burned ha    % map   peak fire   villages lost');
const fb = [];
for (let s = 1; s <= SEEDS; s++) {
  const r = freeBurn(s); fb.push(r);
  console.log(`  ${String(s).padStart(4)}  ${fmt(r.t,0)}   ${fmt(r.ha,0)}      ${fmt(r.frac*100,0)}%   ${String(r.peak).padStart(9)}   ${String(r.dead).padStart(13)}`);
}
const avg = (a, f) => a.reduce((s, x) => s + f(x), 0) / a.length;
console.log(`  ---- mean  ${fmt(avg(fb,r=>r.t),0)}   ${fmt(avg(fb,r=>r.ha),0)}      ${fmt(avg(fb,r=>r.frac)*100,0)}%   `
          + `${fmt(avg(fb,r=>r.peak),0)}   ${fmt(avg(fb,r=>r.dead),1)}`);

for (const lpm of [1.6, 2.2, 3.0]) {
  console.log(`\nDEFENDED — scripted autopilot, ${lpm} loads/min`);
  console.log('  seed     out@s   burned ha    % map   villages lost   loads');
  const rs = [];
  for (let s = 1; s <= SEEDS; s++) {
    const r = defended(s, lpm); rs.push(r);
    console.log(`  ${String(s).padStart(4)}  ${fmt(r.t,0)}   ${fmt(r.ha,0)}      ${fmt(r.frac*100,0)}%   ${String(r.dead).padStart(13)}   ${String(r.drops).padStart(5)}`);
  }
  console.log(`  ---- mean  ${fmt(avg(rs,r=>r.t),0)}   ${fmt(avg(rs,r=>r.ha),0)}      ${fmt(avg(rs,r=>r.frac)*100,0)}%   `
            + `${fmt(avg(rs,r=>r.dead),1)}`);
}

/* ---------------- run 3: how long does a wet line hold? -------------- */
const w = createWorld(1);
applyDrop(w, 28, 50, 1.7, 1.0);
const i0 = 50 * W + 28;
let holdFull = 0, holdAny = 0;
const rnd = mulberry32(99);
while (w.moist[i0] > 0 && w.t < 400) {
  stepWorld(w, rnd);
  if (w.moist[i0] * K.moistBlock >= 1) holdFull = w.t;
  holdAny = w.t;
}
console.log(`\nWET LINE (undisturbed): total block ${holdFull.toFixed(0)}s, `
          + `any effect ${holdAny.toFixed(0)}s\n`);

/* ---------------- run 4: containment ceiling -------------------------
 * A perfectly-flown pilot: hold one continuous wet line across the whole
 * map ahead of the fire, refreshing it. If the fire still crosses, the
 * core mechanic is broken and no amount of skill can win.              */
function ceiling(seed, lineY) {
  const rnd = mulberry32(seed * 7919 + 13);
  const w = createWorld(seed);
  let crossed = null;
  while (w.t < MAX_T && w.fire.length > 0) {
    stepWorld(w, rnd);
    if (w.tick % 20 === 0) for (let x = 0; x < W; x++) applyDrop(w, x, lineY, 1.6, 0.30);
    if (crossed === null)
      for (const i of w.fire) if (((i / W) | 0) < lineY - 2) { crossed = w.t; break; }
  }
  return { t: w.t, ha: w.burnt * HA_PER_CELL, crossed,
           dead: w.villages.filter(v => v.dead).length };
}
console.log('CONTAINMENT CEILING (continuous wet line held at y=72)');
console.log('  seed     out@s   burned ha   line crossed at   villages lost');
for (let s = 1; s <= SEEDS; s++) {
  const r = ceiling(s, 72);
  console.log(`  ${String(s).padStart(4)}  ${fmt(r.t,0)}   ${fmt(r.ha,0)}   ${String(r.crossed===null?'never':r.crossed.toFixed(0)+'s').padStart(15)}   ${String(r.dead).padStart(13)}`);
}
console.log();
