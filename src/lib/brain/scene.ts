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
//   substrate — the tissue, lit and curvature-shaded, up to 130k points
//   lexicon   — one point per card, coloured by region, unlit, ≤7,394
//
// Glow is a radial falloff in the fragment shader over additive blending, not
// `EffectComposer` + `UnrealBloomPass`. Those live in `three/examples`, would
// pull a render-target chain and several more modules into the chunk, and at
// these point sizes produce something a two-line smoothstep already gives.
import * as THREE from 'three';
import { REGIONS } from './atlas.ts';
import type { Substrate } from './geometry.ts';
import type { BrainMesh } from './meshdata.ts';
import { REGION_COLOR, SUBSTRATE, VOID } from './palette.ts';

export interface SceneHandle {
  setSubstrate(sub: Substrate): void;
  /** Swap the procedural point cloud for the real cortical surface. */
  setMesh(mesh: BrainMesh): void;
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
  attribute vec3 aNormal;    // zero-length for lexicon points, which are not a surface
  attribute float aCurv;     // negative = sulcus
  attribute float aRegion;
  uniform float uScale;
  uniform float uSize;
  uniform float uSelected;   // -1 = nothing selected
  uniform float uCamDist;    // camera distance to the brain centre
  uniform float uGain;       // global dimmer: the shell adds light of its own
  varying vec3 vColor;
  varying float vLum;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);

    // Depth cue, measured from the brain centre rather than the camera. Using
    // view-space z directly assumed the object sat at the origin of view space;
    // the camera is a few hundred units back, so every point clamped to
    // fully-far and the scene rendered black.
    float rel = -mv.z - uCamDist;
    float depth = clamp((rel + 130.0) / 260.0, 0.0, 1.0);
    float fade = 0.25 + 0.75 * pow(1.0 - depth, 1.5);

    float shade = 1.0;
    if (dot(aNormal, aNormal) > 0.25) {
      vec3 nrm = normalize(normalMatrix * aNormal);
      vec3 viewDir = normalize(-mv.xyz);
      float facing = dot(nrm, viewDir);

      // Foreshortening, which is also the occlusion.
      //
      // Sampling a surface uniformly by *direction* piles unbounded point
      // density onto the silhouette, where the surface runs edge-on to the
      // camera: many more points land in far fewer pixels. Under additive
      // blending that drew a hard bright outline around every part, so the
      // lobes read as separate bodies no matter how the lighting was balanced —
      // it looked like a rim-light problem and was not one.
      //
      // Scaling by the cosine is the exact compensation (it is the projected
      // area a patch of surface covers), and it disposes of back-facing points
      // for free, since their cosine is negative.
      float area = max(0.0, facing);

      // A key light up and to the left, so gyri catch it and sulci fall away.
      // This is the difference between a cloud of dots and a surface.
      vec3 key = normalize(vec3(-0.45, 0.75, 0.5));
      float lambert = 0.42 + 0.58 * max(0.0, dot(nrm, key));

      // Sulci go dark. Cortical surfaces are conventionally rendered with
      // curvature shading for exactly this reason: the fold pattern is the thing
      // that makes a brain recognisable as one. The window spans the real range:
      // a named sulcus reaches about -3.8, an fbm trough about -0.6, a gyral
      // crown about +0.8.
      float sulcus = smoothstep(-1.2, 0.20, aCurv) * 0.90 + 0.10;

      // A whisper of rim so the edge does not vanish into the void entirely.
      float rim = area * pow(1.0 - area, 4.0) * 0.55;

      shade = area * lambert * sulcus + rim;
    }

    float dim = 1.0;
    if (uSelected >= 0.0) dim = abs(aRegion - uSelected) < 0.5 ? 1.0 : 0.16;

    vLum = aLum * fade * dim * shade * uGain;
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


// The cortical shell.
//
// Additive *with* depth writing, which is the combination that makes this read
// as an object rather than a fog: the nearest fragment writes depth, so the far
// half of the cortex is rejected instead of shining through the near half —
// while the surface still adds light rather than occluding it, which is what
// gives the glass. The word-neurons then draw with `depthTest: false` and glow
// straight through it, exactly as they should: they are *inside* the brain.
const SHELL_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    vHeight = position.z;           // MNI z, for a subtle vertical gradient
    gl_Position = projectionMatrix * mv;
  }
`;

const SHELL_FRAG = /* glsl */ `
  uniform vec3 uTint;
  uniform vec3 uRim;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));

    // Fresnel: a real surface goes bright where it turns away from you, and it
    // is most of why glass looks like glass.
    float fres = pow(1.0 - facing, 2.6);

    vec3 key = normalize(vec3(-0.45, 0.75, 0.5));
    float lambert = max(0.0, dot(normalize(vNormal), key));

    // Gyral relief. The surface is dense enough at 2.4mm that the shading
    // gradient across a fold is what draws it; nothing extra is needed.
    float body = 0.16 + 0.52 * lambert;
    vec3 col = uTint * body + uRim * fres * 0.85;

    // The underside sits in shadow, so the brain has a top and a bottom.
    col *= 0.72 + 0.28 * smoothstep(-70.0, 40.0, vHeight);

    gl_FragColor = vec4(col * uOpacity, 1.0);
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
      uGain: { value: 1.0 },
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
  // The shell writes depth, so the buffer has to be cleared between frames or the
  // brain freezes on whatever the first frame happened to rasterise.
  renderer.autoClear = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 1200);
  const rig = new THREE.Group();
  scene.add(rig);

  // MNI is +z superior, +y anterior. three is +y up, -z into the screen. Rotate
  // the rig once here so every coordinate downstream stays in atlas space and
  // nobody has to remember a conversion.
  rig.rotation.x = -Math.PI / 2;

  const subMat = makeMaterial(mode === 'hero' ? 2.4 : 2.1);
  const lexMat = makeMaterial(mode === 'hero' ? 5.0 : 6.5);

  let subPts: THREE.Points | null = null;
  let lexPts: THREE.Points | null = null;
  let lexGeom: THREE.BufferGeometry | null = null;
  let lumAttr: THREE.BufferAttribute | null = null;
  let posAttr: THREE.BufferAttribute | null = null;
  let baseLum: Float32Array = new Float32Array(0);
  let disposed = false;

  let shell: THREE.Mesh | null = null;
  const shellMat = new THREE.ShaderMaterial({
    vertexShader: SHELL_VERT,
    fragmentShader: SHELL_FRAG,
    uniforms: {
      uTint: { value: new THREE.Vector3(0.085, 0.225, 0.35) },
      uRim: { value: new THREE.Vector3(0.30, 0.62, 0.86) },
      uOpacity: { value: 1.0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    // The pair that matters. Writing depth from an additive surface means the
    // nearest fragment wins and the far half of the cortex never draws, so the
    // shell reads as one solid object; not writing it produced a fog with two
    // superimposed hemispheres.
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
  });

  const handle: SceneHandle = {
    setMesh(mesh) {
      if (disposed) return;
      if (shell) { rig.remove(shell); shell.geometry.dispose(); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(mesh.position, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(mesh.normal, 3));
      g.setIndex(new THREE.BufferAttribute(mesh.index, 1));
      lexMat.uniforms.uGain.value = 0.42;
      lexMat.uniforms.uSize.value = mode === 'hero' ? 4.0 : 4.6;
      shell = new THREE.Mesh(g, shellMat);
      shell.frustumCulled = false;
      // Drawn before the points so its depth is already in the buffer.
      shell.renderOrder = -1;
      rig.add(shell);

      // The real surface replaces the procedural cloud rather than sitting
      // inside it — two hulls at once is just noise.
      if (subPts) { rig.remove(subPts); subPts.geometry.dispose(); subPts = null; }
    },

    setSubstrate(sub) {
      // Once the measured surface is in, the approximation is not wanted back.
      if (shell) return;
      if (disposed) return;
      subPts?.geometry.dispose();
      if (subPts) rig.remove(subPts);
      const g = new THREE.BufferGeometry();
      const n = sub.count;
      g.setAttribute('position', new THREE.BufferAttribute(sub.position, 3));
      g.setAttribute('aNormal', new THREE.BufferAttribute(sub.normal, 3));
      g.setAttribute('aCurv', new THREE.BufferAttribute(sub.curv, 1));

      // Tissue brightness varies a little per point. A perfectly uniform value
      // makes 46,000 identical dots read as a printed halftone; the jitter is
      // below the threshold of being seen as jitter and above the threshold of
      // killing the pattern.
      const base = mode === 'hero' ? 1.05 : 0.86;
      const lum = new Float32Array(n);
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        lum[i] = base * (0.78 + 0.44 * (((i * 2654435761) >>> 8) & 255) / 255);
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
        // A word is a light source, not a piece of surface: a zero normal is the
        // shader's signal to skip shading entirely and glow in every direction.
        lexGeom.setAttribute('aNormal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
        lexGeom.setAttribute('aCurv', new THREE.BufferAttribute(new Float32Array(n), 1));
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

      renderer.clear();
      renderer.render(scene, camera);
    },

    dispose() {
      disposed = true;
      subPts?.geometry.dispose();
      lexGeom?.dispose();
      shell?.geometry.dispose();
      shellMat.dispose();
      subMat.dispose();
      lexMat.dispose();
      renderer.dispose();
    },
  };

  handle.resize(canvas.width || 2, canvas.height || 2);
  return handle;
}
