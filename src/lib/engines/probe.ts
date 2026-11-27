// What this device could run. Feature detection only: nothing here asks for a
// permission, opens the microphone, downloads a model or contacts a server.
// `navigator.mediaDevices` existing says a microphone *could* be asked for; asking
// is a drill's job, at the moment the learner chooses to speak.
import type { EngineSpec, Need } from './types.ts';

export interface Capabilities {
  /** A WebGPU adapter was granted. On by default in Safari 26 and current Chrome. */
  webgpu: boolean;
  wasm: boolean;
  /** Threads need a cross-origin-isolated page, which Lexi is not today. */
  wasmThreads: boolean;
  /** Free space Lexi's origin may still use, in MB. `null` where the browser will not say. */
  storageMB: number | null;
  microphone: boolean;
}

/** The parts of `navigator` and the global scope the probe reads, so tests can pass a fake. */
export interface ProbeHost {
  gpu?: { requestAdapter(): Promise<unknown> };
  storage?: { estimate?(): Promise<{ quota?: number; usage?: number }> };
  mediaDevices?: { getUserMedia?: unknown };
  hasWasm: boolean;
  isolated: boolean;
}

export function hostOf(): ProbeHost {
  const n = (typeof navigator !== 'undefined' ? navigator : {}) as Navigator & { gpu?: ProbeHost['gpu'] };
  return {
    gpu: n.gpu, storage: n.storage, mediaDevices: n.mediaDevices,
    hasWasm: typeof WebAssembly === 'object',
    isolated: typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated,
  };
}

/** A promise that gives up: an adapter request that hangs must not hang Settings. */
const within = <T,>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

export async function probe(h: ProbeHost = hostOf()): Promise<Capabilities> {
  const adapter = h.gpu ? await within(h.gpu.requestAdapter(), 1500, null) : null;
  const est = h.storage?.estimate ? await within(h.storage.estimate(), 1500, null) : null;
  const free = est && typeof est.quota === 'number' ? (est.quota - (est.usage ?? 0)) / 1_048_576 : null;
  return {
    webgpu: !!adapter,
    wasm: h.hasWasm,
    wasmThreads: h.hasWasm && h.isolated,
    storageMB: free === null ? null : Math.max(0, Math.round(free)),
    microphone: typeof h.mediaDevices?.getUserMedia === 'function',
  };
}

/** The needs this device does not meet. A local server cannot be detected without
 *  contacting it, so it stays missing until the learner has set one up. */
export function missing(spec: EngineSpec, c: Capabilities, o: { localServer?: boolean } = {}): Need[] {
  const met: Record<Need, boolean> = {
    webgpu: c.webgpu,
    wasm: c.wasm,
    'wasm-threads': c.wasmThreads,
    // Unknown free space is not a "no": Safari reports none and has room.
    'storage-1gb': c.storageMB === null || c.storageMB >= 1024,
    microphone: c.microphone,
    'local-server': !!o.localServer,
  };
  return spec.needs.filter((n) => !met[n]);
}
