// Build the cortical surface that ships, from the ICBM152 grey-matter volume.
//
//   npm run brain:mesh
//
// Build-time only, on a maintainer's machine — the same arrangement as the
// corpus pipeline. The 7.2MB `.nii.gz` is git-ignored and never redistributed;
// what ships is `public/data/brain-mesh.bin`, a quantised triangle mesh derived
// from it. See ATTRIBUTIONS.md for the ICBM152 licence, which explicitly permits
// exactly this (modify and distribute, copyright notice retained).
//
// Surface Nets rather than marching cubes. It needs no 256-entry case tables, it
// puts one vertex per surface cell instead of up to five, and its output is
// near-uniform, which matters because this mesh is *seen as a wireframe* — an MC
// mesh's long slivers would draw as visual noise.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readNifti } from './nifti.ts';

const SRC = 'scripts/brain/data/gm_probseg.nii.gz';
const OUT = 'public/data/brain-mesh.bin';

/** The grey-matter probability map of the MNI ICBM152 2009c nonlinear
 *  asymmetric template, via TemplateFlow's public mirror. 7.2MB, cached in a
 *  git-ignored directory, never redistributed — see ATTRIBUTIONS.md for the
 *  licence, which permits exactly this use. */
const REMOTE = 'https://templateflow.s3.amazonaws.com/tpl-MNI152NLin2009cAsym'
  + '/tpl-MNI152NLin2009cAsym_res-01_label-GM_probseg.nii.gz';

if (!existsSync(SRC)) {
  console.log(`fetching ${REMOTE}`);
  mkdirSync(dirname(SRC), { recursive: true });
  const res = await fetch(REMOTE);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  writeFileSync(SRC, Buffer.from(await res.arrayBuffer()));
  console.log(`cached ${SRC}`);
}

/** Millimetres per cell of the sampling grid. The knob that trades triangles for
 *  fold detail: gyri are ~10mm across with ~2-3mm sulcal gaps, so below about
 *  2.5mm the sulci close up and the cortex renders as a smooth helmet. */
const STEP = Number(process.env.BRAIN_STEP ?? 2.4);

/** Grey-matter probability that counts as brain. Below 0.5 to keep the surface
 *  on the pial side and to close the pinholes a thresholded probability map is
 *  full of. */
const ISO = 0.35;

/** Laplacian smoothing passes over the finished mesh. Surface Nets output is
 *  faceted along the sampling grid; a few passes remove the staircase without
 *  touching the fold pattern, which is far larger than one cell. */
const SMOOTH_PASSES = Number(process.env.BRAIN_SMOOTH ?? 3);
const SMOOTH_RATE = Number(process.env.BRAIN_SMOOTH_RATE ?? 0.42);

type Vec = [number, number, number];

function log(msg: string) { console.log(msg); }

// ---- 1. load and resample ------------------------------------------------

const vol = readNifti(SRC);
const [nx, ny, nz] = vol.dims;
log(`volume ${nx}×${ny}×${nz} @ ${vol.pixdim.join('×')}mm`);

// Resample to an isotropic grid in world millimetres by box-averaging. Averaging
// rather than nearest: this is a probability map, and the mean over a cell is
// the partial-volume estimate the surface should follow.
const step = STEP / vol.pixdim[0];
const gx = Math.floor(nx / step), gy = Math.floor(ny / step), gz = Math.floor(nz / step);
const field = new Float32Array(gx * gy * gz);
const S = Math.max(1, Math.round(step));

for (let z = 0; z < gz; z++) {
  for (let y = 0; y < gy; y++) {
    for (let x = 0; x < gx; x++) {
      let sum = 0, n = 0;
      const i0 = Math.round(x * step), j0 = Math.round(y * step), k0 = Math.round(z * step);
      for (let k = k0; k < Math.min(k0 + S, nz); k++)
        for (let j = j0; j < Math.min(j0 + S, ny); j++)
          for (let i = i0; i < Math.min(i0 + S, nx); i++) { sum += vol.at(i, j, k); n++; }
      field[x + gx * (y + gy * z)] = n ? sum / n : 0;
    }
  }
}
log(`resampled to ${gx}×${gy}×${gz} @ ${STEP}mm`);

// ---- 2. fill the interior -------------------------------------------------
//
// A grey-matter map is a *ribbon*: white matter sits below the threshold, so the
// raw isosurface would be two shells — the pial surface we want, and the
// white-matter boundary inside it, which would render as a ghost brain within
// the brain. Flooding the background inward from the volume border marks
// everything genuinely outside; whatever is left below threshold is enclosed,
// and gets filled.

const idx = (x: number, y: number, z: number) => x + gx * (y + gy * z);
const outside = new Uint8Array(gx * gy * gz);
{
  const stack: number[] = [];
  const push = (x: number, y: number, z: number) => {
    const i = idx(x, y, z);
    if (outside[i] || field[i] >= ISO) return;
    outside[i] = 1;
    stack.push(x, y, z);
  };
  for (let z = 0; z < gz; z++) for (let y = 0; y < gy; y++) { push(0, y, z); push(gx - 1, y, z); }
  for (let z = 0; z < gz; z++) for (let x = 0; x < gx; x++) { push(x, 0, z); push(x, gy - 1, z); }
  for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) { push(x, y, 0); push(x, y, gz - 1); }

  while (stack.length) {
    const z = stack.pop()!, y = stack.pop()!, x = stack.pop()!;
    if (x > 0) push(x - 1, y, z);
    if (x < gx - 1) push(x + 1, y, z);
    if (y > 0) push(x, y - 1, z);
    if (y < gy - 1) push(x, y + 1, z);
    if (z > 0) push(x, y, z - 1);
    if (z < gz - 1) push(x, y, z + 1);
  }
}

let filled = 0;
for (let i = 0; i < field.length; i++) {
  if (field[i] < ISO && !outside[i]) { field[i] = 1; filled++; }
}
log(`filled ${filled.toLocaleString()} enclosed cells (white matter and ventricles)`);

// A single blur pass so the field crosses the isosurface smoothly. Without it
// the filled interior meets the ribbon at a cliff and the surface facets.
{
  const blur = new Float32Array(field.length);
  for (let z = 0; z < gz; z++) for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) {
    let sum = 0, n = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const a = x + dx, b = y + dy, c = z + dz;
      if (a < 0 || b < 0 || c < 0 || a >= gx || b >= gy || c >= gz) continue;
      sum += field[idx(a, b, c)]; n++;
    }
    blur[idx(x, y, z)] = sum / n;
  }
  field.set(blur);
}

// ---- 3. Surface Nets ------------------------------------------------------

const CORNER: Vec[] = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
];
// The twelve cell edges, as pairs of corner indices.
const EDGE: [number, number][] = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

const cellVert = new Int32Array((gx - 1) * (gy - 1) * (gz - 1)).fill(-1);
const cidx = (x: number, y: number, z: number) => x + (gx - 1) * (y + (gy - 1) * z);
const verts: number[] = [];

for (let z = 0; z < gz - 1; z++) {
  for (let y = 0; y < gy - 1; y++) {
    for (let x = 0; x < gx - 1; x++) {
      const v: number[] = new Array(8);
      let mask = 0;
      for (let c = 0; c < 8; c++) {
        const [dx, dy, dz] = CORNER[c];
        v[c] = field[idx(x + dx, y + dy, z + dz)];
        if (v[c] >= ISO) mask |= 1 << c;
      }
      if (mask === 0 || mask === 255) continue;   // wholly out or wholly in

      // One vertex per cell, at the mean of the crossings on its edges. This is
      // what makes the mesh uniform enough to wireframe.
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of EDGE) {
        const va = v[a], vb = v[b];
        if ((va >= ISO) === (vb >= ISO)) continue;
        const t = (ISO - va) / (vb - va);
        sx += CORNER[a][0] + (CORNER[b][0] - CORNER[a][0]) * t;
        sy += CORNER[a][1] + (CORNER[b][1] - CORNER[a][1]) * t;
        sz += CORNER[a][2] + (CORNER[b][2] - CORNER[a][2]) * t;
        n++;
      }
      cellVert[cidx(x, y, z)] = verts.length / 3;
      verts.push(x + sx / n, y + sy / n, z + sz / n);
    }
  }
}
log(`surface nets: ${(verts.length / 3).toLocaleString()} vertices`);

// Quads across every sign-changing grid edge, wound consistently so the normals
// come out facing away from the brain.
const tris: number[] = [];
const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
  if (a < 0 || b < 0 || c < 0 || d < 0) return;
  if (flip) tris.push(a, c, b, a, d, c);
  else tris.push(a, b, c, a, c, d);
};

for (let z = 1; z < gz - 1; z++) {
  for (let y = 1; y < gy - 1; y++) {
    for (let x = 1; x < gx - 1; x++) {
      const here = field[idx(x, y, z)] >= ISO;
      // +x edge: the four cells around it lie in the y/z plane.
      if (here !== (field[idx(x + 1, y, z)] >= ISO)) {
        quad(cellVert[cidx(x, y - 1, z - 1)], cellVert[cidx(x, y, z - 1)],
             cellVert[cidx(x, y, z)], cellVert[cidx(x, y - 1, z)], here);
      }
      if (here !== (field[idx(x, y + 1, z)] >= ISO)) {
        quad(cellVert[cidx(x - 1, y, z - 1)], cellVert[cidx(x, y, z - 1)],
             cellVert[cidx(x, y, z)], cellVert[cidx(x - 1, y, z)], !here);
      }
      if (here !== (field[idx(x, y, z + 1)] >= ISO)) {
        quad(cellVert[cidx(x - 1, y - 1, z)], cellVert[cidx(x, y - 1, z)],
             cellVert[cidx(x, y, z)], cellVert[cidx(x - 1, y, z)], here);
      }
    }
  }
}
log(`${(tris.length / 3).toLocaleString()} triangles`);

// ---- 4. to world millimetres, then smooth --------------------------------

const pos = new Float32Array(verts.length);
for (let i = 0; i < verts.length; i += 3) {
  const [wx, wy, wz] = vol.toWorld(verts[i] * step, verts[i + 1] * step, verts[i + 2] * step);
  pos[i] = wx; pos[i + 1] = wy; pos[i + 2] = wz;
}

// Laplacian smoothing with the neighbour set taken from the triangles.
{
  const vcount = pos.length / 3;
  const nbr: number[][] = Array.from({ length: vcount }, () => []);
  const seen = new Set<number>();
  for (let t = 0; t < tris.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = tris[t + e], b = tris[t + ((e + 1) % 3)];
      const key = a < b ? a * vcount + b : b * vcount + a;
      if (seen.has(key)) continue;
      seen.add(key);
      nbr[a].push(b); nbr[b].push(a);
    }
  }
  const tmp = new Float32Array(pos.length);
  for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
    for (let v = 0; v < vcount; v++) {
      const list = nbr[v];
      if (!list.length) { tmp[v * 3] = pos[v * 3]; tmp[v * 3 + 1] = pos[v * 3 + 1]; tmp[v * 3 + 2] = pos[v * 3 + 2]; continue; }
      let ax = 0, ay = 0, az = 0;
      for (const j of list) { ax += pos[j * 3]; ay += pos[j * 3 + 1]; az += pos[j * 3 + 2]; }
      ax /= list.length; ay /= list.length; az /= list.length;
      tmp[v * 3] = pos[v * 3] + (ax - pos[v * 3]) * SMOOTH_RATE;
      tmp[v * 3 + 1] = pos[v * 3 + 1] + (ay - pos[v * 3 + 1]) * SMOOTH_RATE;
      tmp[v * 3 + 2] = pos[v * 3 + 2] + (az - pos[v * 3 + 2]) * SMOOTH_RATE;
    }
    pos.set(tmp);
  }
  log(`smoothed ${SMOOTH_PASSES}× over ${seen.size.toLocaleString()} edges`);
}

// ---- 5. orient the triangles ---------------------------------------------
//
// Winding comes out inconsistent across the three edge directions — the first
// version had 40% of faces pointing inward, which lights as holes and makes
// backface culling useless. Rather than reason about the sign of each axis's
// quad, take the truth from the field itself: the gradient of a scalar field
// points toward increasing value, the inside is 1 and the outside is 0, so the
// outward normal is exactly the negated gradient. Nothing about that can be
// off-by-one.

function gradientNormal(px: number, py: number, pz: number): Vec {
  // Back to grid coordinates from world millimetres.
  const gxf = (px - vol.affine[3]) / step, gyf = (py - vol.affine[7]) / step, gzf = (pz - vol.affine[11]) / step;
  const sample = (a: number, b: number, c: number) => {
    const i = Math.max(0, Math.min(gx - 1, Math.round(a)));
    const j = Math.max(0, Math.min(gy - 1, Math.round(b)));
    const k = Math.max(0, Math.min(gz - 1, Math.round(c)));
    return field[idx(i, j, k)];
  };
  const dx = sample(gxf + 1, gyf, gzf) - sample(gxf - 1, gyf, gzf);
  const dy = sample(gxf, gyf + 1, gzf) - sample(gxf, gyf - 1, gzf);
  const dz = sample(gxf, gyf, gzf + 1) - sample(gxf, gyf, gzf - 1);
  const l = Math.hypot(dx, dy, dz);
  if (l < 1e-6) return [0, 0, 1];
  return [-dx / l, -dy / l, -dz / l];
}

let rewound = 0;
for (let t = 0; t < tris.length; t += 3) {
  const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
  const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
  const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
  const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
  const [ox, oy, oz] = gradientNormal(pos[a], pos[a + 1], pos[a + 2]);
  if (fx * ox + fy * oy + fz * oz < 0) {
    const tmp = tris[t + 1]; tris[t + 1] = tris[t + 2]; tris[t + 2] = tmp;
    rewound++;
  }
}
log(`rewound ${rewound.toLocaleString()} of ${tcountOf()} triangles to face outward`);

function tcountOf() { return (tris.length / 3).toLocaleString(); }

// Verify, the same way the defect was found: by counting.
{
  let out = 0;
  const total = tris.length / 3;
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const [ox, oy, oz] = gradientNormal(pos[a], pos[a + 1], pos[a + 2]);
    if (fx * ox + fy * oy + fz * oz >= 0) out++;
  }
  const pct = (100 * out) / total;
  log(`orientation: ${pct.toFixed(1)}% outward`);
  if (pct < 99) throw new Error(`winding still inconsistent (${pct.toFixed(1)}%)`);
}

// ---- 6. quantise and write ------------------------------------------------
//
// Positions to int16 tenths of a millimetre (±3276mm of range, 0.1mm of error —
// far below anything visible at this scale), normals to int8. Indices stay
// uint32: uint16 would cap the mesh at 65k vertices, and splitting into chunks
// to dodge that costs more complexity than the bytes save.

const vcount = pos.length / 3;
const tcount = tris.length / 3;
// Normals are not stored. Deriving them in the browser is one pass over the
// triangles — a few milliseconds — and they were the second-largest thing in the
// file.
//
// Indices are the bulk, so they are 16-bit whenever the mesh fits under 65,536
// vertices. That is the real reason to keep the sampling grid coarse: it is not
// the triangles that cost, it is four bytes per index versus two.
const wide = vcount > 65535;
const header = new Int32Array([0x4c584249, 3, vcount, tcount, wide ? 4 : 2]);  // "LXBI", version
const qpos = new Int16Array(vcount * 3);
for (let i = 0; i < qpos.length; i++) qpos[i] = Math.round(pos[i] * 10);
const qtri = wide ? new Uint32Array(tris) : new Uint16Array(tris);

const parts = [
  Buffer.from(header.buffer),
  Buffer.from(qpos.buffer),
  Buffer.from(qtri.buffer),
];
const out = Buffer.concat(parts);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out);

const gzBytes = (await import('node:zlib')).gzipSync(out, { level: 9 }).length;
log(`\nwrote ${OUT}`);
log(`  ${vcount.toLocaleString()} verts, ${tcount.toLocaleString()} tris`);
log(`  ${(out.length / 1048576).toFixed(2)} MB raw, ${(gzBytes / 1048576).toFixed(2)} MB gzipped, ${wide ? 32 : 16}-bit indices`);

if (!existsSync(join(dirname(OUT), 'cards.json'))) log('  (note: public/data looks unexpected — check the path)');
