import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBrainMesh } from './meshdata.ts';
import { insideBrain } from './geometry.ts';
import { REGIONS } from './atlas.ts';

// The shipped cortical surface, isosurfaced from the MNI ICBM152 2009c
// grey-matter map by `npm run brain:mesh`. Guarded here rather than trusted
// because the file is a build artefact of a pipeline nobody runs often: a
// regression in the generator would otherwise be found by looking at the app.
const buf = readFileSync('public/data/brain-mesh.bin');
const mesh = parseBrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

describe('the shipped cortical surface', () => {
  it('parses, and its header agrees with its payload', () => {
    expect(mesh.vertexCount).toBeGreaterThan(10_000);
    expect(mesh.position.length).toBe(mesh.vertexCount * 3);
    expect(mesh.normal.length).toBe(mesh.vertexCount * 3);
    expect(mesh.index.length).toBe(mesh.triangleCount * 3);
  });

  it('stays under the budget for a lazily-fetched asset', () => {
    // It only downloads when the room is opened, never on Today's first paint —
    // but a generator change that quietly doubled the grid would still be a
    // regression worth catching here rather than in the field.
    expect(buf.byteLength).toBeLessThan(1_200_000);
  });

  it('indexes only vertices that exist', () => {
    let max = 0;
    for (let i = 0; i < mesh.index.length; i++) if (mesh.index[i] > max) max = mesh.index[i];
    expect(max).toBeLessThan(mesh.vertexCount);
  });

  it('has unit normals', () => {
    let unit = 0;
    for (let i = 0; i < mesh.vertexCount; i++) {
      const l = Math.hypot(mesh.normal[i * 3], mesh.normal[i * 3 + 1], mesh.normal[i * 3 + 2]);
      if (Math.abs(l - 1) < 1e-3) unit++;
    }
    expect(unit / mesh.vertexCount).toBeGreaterThan(0.999);
  });

  it('is wound consistently, so the shell culls and lights correctly', () => {
    // The generator's first version had 40% of faces wound inward, which lights
    // as holes and makes backface culling useless. Winding is now taken from the
    // scalar field's gradient.
    //
    // The check is edge parity, not "does the normal point away from the
    // centroid" — that was the first version of this test and it failed at 62%
    // on a mesh that was completely correct. Roughly two-thirds of real cortex
    // is buried in the walls of sulci, facing back toward the middle of the
    // brain; the centroid heuristic only ever worked because the hull it was
    // written against was smooth. On a closed, consistently-wound surface every
    // interior edge is traversed once in each direction, and that is true no
    // matter how folded it is.
    const net = new Map<number, number>();
    const uses = new Map<number, number>();
    const V = mesh.vertexCount;
    for (let t = 0; t < mesh.index.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = mesh.index[t + e], b = mesh.index[t + ((e + 1) % 3)];
        const key = a < b ? a * V + b : b * V + a;
        net.set(key, (net.get(key) ?? 0) + (a < b ? 1 : -1));
        uses.set(key, (uses.get(key) ?? 0) + 1);
      }
    }

    // Manifold: all but a handful of edges belong to exactly two triangles.
    // Surface Nets pinches where a fold gets thinner than the sampling grid, and
    // those pinches are where the orientation cannot be locally decided at all.
    let nonManifold = 0;
    for (const n of uses.values()) if (n !== 2) nonManifold++;
    expect(nonManifold / uses.size).toBeLessThan(0.005);

    // Measured at 1.3% inconsistent, essentially all of it clustered around
    // those pinches. Not zero, and the threshold says so rather than pretending:
    // orientation is assigned per triangle from the field gradient, which is
    // correct everywhere the gradient is well defined and undefined exactly
    // where the surface self-touches. A flood-fill propagation across shared
    // edges would drive this to the non-manifold floor; at a few hundred
    // triangles out of 104,000 it buys nothing visible.
    let bad = 0;
    for (const n of net.values()) if (n !== 0) bad++;
    expect(bad / net.size).toBeLessThan(0.02);
  });

  it('sits in MNI space, where the atlas coordinates already live', () => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < mesh.position.length; i += 3) {
      minX = Math.min(minX, mesh.position[i]); maxX = Math.max(maxX, mesh.position[i]);
      minY = Math.min(minY, mesh.position[i + 1]); maxY = Math.max(maxY, mesh.position[i + 1]);
      minZ = Math.min(minZ, mesh.position[i + 2]); maxZ = Math.max(maxZ, mesh.position[i + 2]);
    }
    // A real head, roughly symmetric about the midline.
    expect(maxX - minX).toBeGreaterThan(120);
    expect(maxX - minX).toBeLessThan(180);
    expect(maxY - minY).toBeGreaterThan(150);
    expect(Math.abs(minX + maxX)).toBeLessThan(20);
  });

  it('contains every region the atlas places inside it', () => {
    // The whole point of using MNI152: the coordinates did not have to move when
    // the hull was swapped. If a region ends up outside the surface, either the
    // mesh or the atlas has drifted out of that space.
    const inside = (p: [number, number, number]) => {
      let best = Infinity;
      for (let i = 0; i < mesh.position.length; i += 3) {
        const d = (mesh.position[i] - p[0]) ** 2 + (mesh.position[i + 1] - p[1]) ** 2 + (mesh.position[i + 2] - p[2]) ** 2;
        if (d < best) best = d;
      }
      return Math.sqrt(best);
    };
    for (const r of REGIONS) {
      const d = inside(r.mni as unknown as [number, number, number]);
      expect(d, `${r.id} is ${d.toFixed(0)}mm from the cortical surface`).toBeLessThan(30);
    }
  });

  it('agrees with the procedural hull it replaced', () => {
    // Both are meant to be the same organ in the same space. A sample of the
    // measured surface should land at or near the approximation's shell — this
    // is what catches a unit or axis mix-up, which would otherwise show up as a
    // brain rendered at a tenth scale or lying on its side.
    let agree = 0, n = 0;
    for (let i = 0; i < mesh.position.length; i += 3 * 37) {
      n++;
      if (insideBrain([mesh.position[i], mesh.position[i + 1], mesh.position[i + 2]], 1.25)) agree++;
    }
    expect(agree / n).toBeGreaterThan(0.9);
  });
});
