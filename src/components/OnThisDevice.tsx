// What this device could run, when open German models are good enough to use
// (2026-11-27). A readout, not a store: nothing here installs, downloads or asks
// for a permission. It says where Lexi is going and what is already true of the
// learner's machine, so the promise is checkable rather than a slogan.
import { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import Card from './ui/Card.tsx';
import { probe, readiness, type Capabilities } from '../lib/engines/index.ts';

const ROWS = [
  { kind: 'voice', label: 'Voice', job: 'say a word aloud' },
  { kind: 'ears', label: 'Listening', job: 'hear you say it' },
  { kind: 'tutor', label: 'Tutor', job: 'explain a sentence' },
] as const;

export default function OnThisDevice() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  useEffect(() => { let live = true; void probe().then((c) => { if (live) setCaps(c); }); return () => { live = false; }; }, []);
  return (
    <Card as="section" className="mt-4">
      <div className="flex items-center gap-2 mb-1"><Cpu size={16} className="text-accent" /><h2 className="text-base font-semibold">Open models on this device</h2></div>
      <p className="text-dim text-xs mb-3 max-w-[60ch]">
        Lexi stays silent until it can speak through an open German voice. When an open voice,
        listener or tutor is good enough, it will run on this device, and what you say will stay
        here. Nothing is installed today.
      </p>
      {!caps ? <p className="text-dim text-xs">Checking this device…</p> : (
        <dl className="text-xs divide-y divide-line border-y border-line">
          {ROWS.map((r) => {
            const { could, blocked } = readiness(r.kind, caps);
            const ok = could.length > 0;
            // Each blocked engine is an alternative route, so its needs join with
            // "and" and the routes with "or", shortest first.
            const routes = [...new Set(blocked.map((b) => b.needs.map((n) => NEED[n] ?? n).join(' and ')))]
              .sort((x, y) => x.length - y.length);
            return (
              // The status is the device's, never a model's: nothing is installed, so
              // "ready" may only mean this machine could run one.
              <div key={r.kind} className="flex items-baseline gap-3 py-2">
                <dt className="flex-1 min-w-0"><span className="font-semibold">{r.label}</span><span className="text-dim"> · {r.job}</span></dt>
                <dd className={`flex-shrink-0 text-right ${ok ? 'text-green' : 'text-dim'}`}>
                  {ok ? 'Device ready' : `Needs ${routes.join(' or ') || 'an open model'}`}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
      {caps && (
        <p className="text-2xs text-dim mt-2 font-mono">
          WebGPU {caps.webgpu ? 'yes' : 'no'} · WebAssembly {caps.wasm ? 'yes' : 'no'}
          {caps.storageMB !== null && <> · {fmtGB(caps.storageMB)} free for Lexi</>}
        </p>
      )}
    </Card>
  );
}

const NEED: Record<string, string> = {
  webgpu: 'WebGPU', wasm: 'WebAssembly', 'wasm-threads': 'WebAssembly threads',
  'storage-1gb': 'a gigabyte of free space', microphone: 'a microphone', 'local-server': 'a model server of your own',
};
const fmtGB = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)} GB` : `${mb} MB`);
