// The WebGL scene.
//
// This module is the *only* place `three` is imported, and it is only ever
// reached through `await import()` in `components/Brain/BrainScene.tsx`. That
// keeps ~170KB out of the entry chunk, which matters more here than in most
// apps: Today is the first paint, the boot budget has already been fought for
// once (splitting `cards.json` from `detail.json`), and the brain is decoration
// until the learner has looked at it.
//
// Two `THREE.Points` clouds, one draw call each:
//   substrate — the tissue, dim and cold, ~46k points
//   lexicon   — one point per card, coloured by region, ≤7,394
//
// Glow is a radial falloff in the fragment shader over additive blending, not
// `EffectComposer` + `UnrealBloomPass`. Those live in `three/examples`, would
// pull a render-target chain and several more modules into the chunk, and at
// these point sizes produce something a two-line smoothstep already gives.
import * as THREE from 'three';
import { REGIONS } from './atlas.ts';
import { REGION_COLOR, SUBSTRATE, VOID } from './palette.ts';

export interface SceneHandle {
  setSubstrate(points: Float32Array): void;
  upload(positions: Float32Array, lum: Float32Array, region: Uint8Array): void;
  render(yaw: number, pitch: number, flares: Float32Array, now: number): void;
  setSelected(id: string | null): void;
  resize(w: number, h: number): void;
  dispose(): void;
}

const REGION_RGB = REGIONS.map((r) => REGION_COLOR[r.id] ?? SUBSTRATE);

// Shared by both clouds. `uScale` converts a world-space size into pixels so a
// point keeps its apparent size when the canvas is resized or the dpr changes.
const VERT = /* glsl */ `
  attribute float aLum;
  attribute vec3 aColor;
  uniform float uScale;
  uniform float uSize;
  uniform float uSelected;   // -1 = nothing selected
  uniform float uCamDist;    // camera distance to the brain's centre
  attribute float aRegion;
  varying vec3 vColor;
  varying float vLum;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Depth cue: far points dim, so the far surface reads as behind the near one
    // rather than as noise laid over it.
    //
    // Measured from the brain's centre, not from the camera. Using view-space z
    // directly assumed the object sat near the origin of view space; the camera
    // is ~340 units back, so every point clamped to fully-far and the whole
    // scene rendered black. (No backticks in here: this is a template literal.)
    float rel = -mv.z - uCamDist;          // about -120..120 through the brain
    float depth = clamp((rel + 130.0) / 260.0, 0.0, 1.0);
    float fade = 0.25 + 0.75 * pow(1.0 - depth, 1.5);

    float dim = 1.0;
    if (uSelected >= 0.0) dim = abs(aRegion - uSelected) < 0.5 ? 1.0 : 0.16;

    vLum = aLum * fade * dim;
    vColor = aColor;
    gl_PointSize = uSize * (0.65 + 0.9 * aLum) * (uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vLum;
  void main() {
    // Radial falloff with a hot core: this is the bloom.
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float halo = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.22, 0.0, d);
    float a = halo * halo * 0.55 + core * 0.9;
    gl_FragColor = vec4(vColor * (a * vLum), 1.0);
  }
`;

function makeMaterial(size: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uScale: { value: 600 },
      uSize: { value: size },
      uSelected: { value: -1 },
      uCamDist: { value: 340 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
}

/** Build the scene, or return null if this machine cannot give us a context.
 *  Returning null rather than throwing is deliberate: the caller's `catch` and
 *  its null check should not be two different code paths for one condition. */
export async function createScene(canvas: HTMLCanvasElement, mode: 'hero' | 'room'): Promise<SceneHandle | null> {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setClearColor(new THREE.Color(VOID), 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 1200);
  const rig = new THREE.Group();
  scene.add(rig);

  // MNI is +z superior, +y anterior. three is +y up, -z into the screen. Rotate
  // the rig once here so every coordinate downstream stays in atlas space and
  // nobody has to remember a conversion.
  rig.rotation.x = -Math.PI / 2;

  const subMat = makeMaterial(mode === 'hero' ? 2.4 : 1.9);
  const lexMat = makeMaterial(mode === 'hero' ? 5.0 : 6.5);

  let subPts: THREE.Points | null = null;
  let lexPts: THREE.Points | null = null;
  let lexGeom: THREE.BufferGeometry | null = null;
  let lumAttr: THREE.BufferAttribute | null = null;
  let posAttr: THREE.BufferAttribute | null = null;
  let baseLum: Float32Array = new Float32Array(0);
  let disposed = false;

  const handle: SceneHandle = {
    setSubstrate(points) {
      if (disposed) return;
      subPts?.geometry.dispose();
      if (subPts) rig.remove(subPts);
      const g = new THREE.BufferGeometry();
      const n = points.length / 3;
      g.setAttribute('position', new THREE.BufferAttribute(points, 3));
      const lum = new Float32Array(n).fill(mode === 'hero' ? 0.46 : 0.32);
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        col[i * 3] = SUBSTRATE.r; col[i * 3 + 1] = SUBSTRATE.g; col[i * 3 + 2] = SUBSTRATE.b;
      }
      g.setAttribute('aLum', new THREE.BufferAttribute(lum, 1));
      g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
      g.setAttribute('aRegion', new THREE.BufferAttribute(new Float32Array(n).fill(-1), 1));
      subPts = new THREE.Points(g, subMat);
      subPts.frustumCulled = false;
      rig.add(subPts);
    },

    upload(positions, lum, region) {
      if (disposed) return;
      const n = lum.length;
      if (!lexGeom || lexGeom.getAttribute('aLum').count !== n) {
        if (lexPts) rig.remove(lexPts);
        lexGeom?.dispose();
        lexGeom = new THREE.BufferGeometry();
        posAttr = new THREE.BufferAttribute(new Float32Array(positions), 3);
        lumAttr = new THREE.BufferAttribute(new Float32Array(n), 1);
        const col = new Float32Array(n * 3);
        const reg = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const c = REGION_RGB[region[i]] ?? SUBSTRATE;
          col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
          reg[i] = region[i];
        }
        lexGeom.setAttribute('position', posAttr);
        lexGeom.setAttribute('aLum', lumAttr);
        lexGeom.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
        lexGeom.setAttribute('aRegion', new THREE.BufferAttribute(reg, 1));
        lexPts = new THREE.Points(lexGeom, lexMat);
        lexPts.frustumCulled = false;
        rig.add(lexPts);
      } else {
        (posAttr!.array as Float32Array).set(positions);
        posAttr!.needsUpdate = true;
      }
      baseLum = lum;
      (lumAttr!.array as Float32Array).set(lum);
      lumAttr!.needsUpdate = true;
    },

    setSelected(id) {
      const i = id ? REGIONS.findIndex((r) => r.id === id) : -1;
      subMat.uniforms.uSelected.value = i;
      lexMat.uniforms.uSelected.value = i;
    },

    resize(w, h) {
      if (disposed || w < 2 || h < 2) return;
      renderer.setPixelRatio(1);      // the canvas is already sized in device px
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Frame the brain: pull back further on a narrow box so a phone-width hero
      // still contains the whole silhouette.
      // The hero is a short, wide strip, so it frames tighter — at room distance
      // the brain sat in the middle of it looking like a distant nebula.
      const base = mode === 'hero' ? 258 : 300;
      const dist = Math.max(base, base * (1.35 / camera.aspect));
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      for (const m of [subMat, lexMat]) {
        m.uniforms.uScale.value = h * 0.9;
        m.uniforms.uCamDist.value = dist;
      }
    },

    render(yaw, pitch, flares, now) {
      if (disposed || !lumAttr) { renderer.render(scene, camera); return; }
      rig.rotation.z = yaw;
      rig.rotation.x = -Math.PI / 2 + pitch;

      // Flares are added on top of the stored luminance rather than replacing
      // it, so a card that fires does not first go dark.
      const arr = lumAttr.array as Float32Array;
      let any = false;
      for (let i = 0; i < arr.length; i++) {
        const f = flares[i];
        if (f > 0) { arr[i] = Math.min(2.4, baseLum[i] + f * 1.9); any = true; }
        else if (arr[i] !== baseLum[i]) { arr[i] = baseLum[i]; any = true; }
      }
      if (any) lumAttr.needsUpdate = true;

      // A slow breath, so a brain with no activity is still alive.
      const breathe = 1 + Math.sin(now * 0.00042) * 0.012;
      rig.scale.setScalar(breathe);

      renderer.render(scene, camera);
    },

    dispose() {
      disposed = true;
      subPts?.geometry.dispose();
      lexGeom?.dispose();
      subMat.dispose();
      lexMat.dispose();
      renderer.dispose();
    },
  };

  handle.resize(canvas.width || 2, canvas.height || 2);
  return handle;
}
