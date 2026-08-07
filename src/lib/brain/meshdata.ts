// Load the cortical surface.
//
// `public/data/brain-mesh.bin` is a real anatomical surface, isosurfaced from
// the MNI ICBM152 2009c grey-matter probability map by `scripts/brain/mesh.ts`
// and quantised. The gyri in it are measured, not invented — which is the whole
// reason it exists, and the reason `docs/BRAIN.md` can now say the hull is as
// honest as the coordinates.
//
// No `three` import here on purpose: this is a fetch and some typed arrays, and
// keeping it separate means the download runs *in parallel* with the ~119KB
// scene chunk rather than after it.

/** Format written by `scripts/brain/mesh.ts`. */
const MAGIC = 0x4c584249; // "LXBI"
const VERSION = 3;
/** Positions are stored as int16 tenths of a millimetre. */
const POS_SCALE = 10;

export interface BrainMesh {
  /** xyz triples, MNI millimetres — the same space as the atlas coordinates. */
  position: Float32Array;
  /** Unit normals, derived here rather than shipped: one pass over the
   *  triangles costs a few milliseconds and saved a quarter of the file. */
  normal: Float32Array;
  /** Signed concavity per vertex: positive inside a sulcus, negative on a gyral
   *  crown. Also derived here — it falls out of the same neighbour walk. */
  curvature: Float32Array;
  index: Uint16Array | Uint32Array;
  vertexCount: number;
  triangleCount: number;
}

function computeNormals(position: Float32Array, index: Uint16Array | Uint32Array): Float32Array {
  const normal = new Float32Array(position.length);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const ux = position[b] - position[a], uy = position[b + 1] - position[a + 1], uz = position[b + 2] - position[a + 2];
    const vx = position[c] - position[a], vy = position[c + 1] - position[a + 1], vz = position[c + 2] - position[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    normal[a] += nx; normal[a + 1] += ny; normal[a + 2] += nz;
    normal[b] += nx; normal[b + 1] += ny; normal[b + 2] += nz;
    normal[c] += nx; normal[c + 1] += ny; normal[c + 2] += nz;
  }
  for (let i = 0; i < normal.length; i += 3) {
    const l = Math.hypot(normal[i], normal[i + 1], normal[i + 2]) || 1;
    normal[i] /= l; normal[i + 1] /= l; normal[i + 2] /= l;
  }
  return normal;
}

/**
 * Signed concavity per vertex — what makes the folds read as folds.
 *
 * Lighting from normals alone gives a sulcus and a gyral crown almost the same
 * value, because at the bottom of a groove the surface is still facing roughly
 * outward. Real cortical renders darken the sulci, and they do it from
 * *curvature*, not from light.
 *
 * The measure is the mean neighbour offset resolved along the normal. On a
 * convex crown the neighbours sit below the tangent plane (negative); inside a
 * concave groove they sit above it (positive). It is a discrete mean curvature,
 * and it costs one more walk over the triangles we are already walking.
 */
function computeCurvature(
  position: Float32Array,
  normal: Float32Array,
  index: Uint16Array | Uint32Array,
): Float32Array {
  const n = position.length / 3;
  const sum = new Float32Array(position.length);
  const deg = new Float32Array(n);

  for (let t = 0; t < index.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = index[t + e], b = index[t + ((e + 1) % 3)];
      sum[a * 3] += position[b * 3]; sum[a * 3 + 1] += position[b * 3 + 1]; sum[a * 3 + 2] += position[b * 3 + 2];
      deg[a]++;
      sum[b * 3] += position[a * 3]; sum[b * 3 + 1] += position[a * 3 + 1]; sum[b * 3 + 2] += position[a * 3 + 2];
      deg[b]++;
    }
  }

  const curv = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (!deg[i]) continue;
    const dx = sum[i * 3] / deg[i] - position[i * 3];
    const dy = sum[i * 3 + 1] / deg[i] - position[i * 3 + 1];
    const dz = sum[i * 3 + 2] / deg[i] - position[i * 3 + 2];
    curv[i] = dx * normal[i * 3] + dy * normal[i * 3 + 1] + dz * normal[i * 3 + 2];
  }
  return curv;
}

export function parseBrainMesh(buf: ArrayBuffer): BrainMesh {
  const head = new Int32Array(buf, 0, 5);
  if (head[0] !== MAGIC) throw new Error('brain-mesh.bin: bad magic');
  if (head[1] !== VERSION) throw new Error(`brain-mesh.bin: version ${head[1]}, expected ${VERSION}`);
  const vertexCount = head[2], triangleCount = head[3], indexBytes = head[4];

  let off = 20;
  // `.slice` rather than a view: the header is 20 bytes, so the typed arrays
  // that follow are not aligned to their element size and a view would throw.
  const quant = new Int16Array(buf.slice(off, off + vertexCount * 6));
  off += vertexCount * 6;

  const position = new Float32Array(quant.length);
  for (let i = 0; i < quant.length; i++) position[i] = quant[i] / POS_SCALE;

  const idxLen = triangleCount * 3;
  const index = indexBytes === 2
    ? new Uint16Array(buf.slice(off, off + idxLen * 2))
    : new Uint32Array(buf.slice(off, off + idxLen * 4));

  const normal = computeNormals(position, index);
  const curvature = computeCurvature(position, normal, index);
  return { position, normal, curvature, index, vertexCount, triangleCount };
}

let inflight: Promise<BrainMesh | null> | null = null;

/** Fetch the surface once per session. Resolves to null if it cannot be had —
 *  the caller falls back to the procedural point cloud, which is why nothing
 *  here throws at the call site. */
export function loadBrainMesh(): Promise<BrainMesh | null> {
  if (inflight) return inflight;
  const base = import.meta.env.BASE_URL || '/';
  inflight = fetch(base + 'data/brain-mesh.bin')
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then(parseBrainMesh)
    .catch(() => null);
  return inflight;
}
