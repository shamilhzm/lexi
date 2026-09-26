// "On this device" — whether the browser has promised to keep Lexi's storage, and
// when the learner last took a copy.
//
// `main.tsx` has asked for persistent storage on every boot since the start, and
// thrown the answer away (BACKLOG F6, panel review 2026-09-25). A refusal is
// normal — Safari decides by its own rules, a managed or private profile always
// refuses — and in a local-first app it is the difference between a year of work
// and none. The learner is the only one who can act on it (install, or keep a
// backup), so the answer is shown to them, on the page about what they have built.
//
// `persisted()` only reads; it never prompts. The one button that asks is a
// deliberate press, and on Firefox it is the press that raises the browser's own
// question.
import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { lastBackup } from '../store.ts';
import { useStore } from '../useStore.ts';
import { downloadBackup } from '../lib/backup.ts';
import { Section } from './ui/Band.tsx';
import Button from './ui/Button.tsx';

export type Persisted = boolean | null; // null: the browser does not say

export interface DurabilityState {
  persisted: Persisted;
  installed: boolean;
  lastBackup: string | null;
}

/** What to tell the learner. Pure, so the claims can be tested: the copy must
 *  never say *protected* on a browser that has not said so. */
export function durabilityCopy(s: DurabilityState): { safe: boolean; head: string; body: string } {
  const backup = s.lastBackup
    ? `Last backup: ${s.lastBackup}.`
    : 'No backup yet — a backup is the one copy that survives anything.';
  if (s.persisted === true) {
    return {
      safe: true,
      head: 'Protected on this device',
      body: `This browser has agreed not to clear Lexi’s storage to make space. ${backup}`,
    };
  }
  if (s.persisted === false) {
    return {
      safe: false,
      head: 'Not protected on this device',
      body: (s.installed
        ? 'The browser may still clear Lexi’s storage if the phone runs short of space. '
        : 'The browser may clear Lexi’s storage — Safari does after seven days without a visit. Adding Lexi to your Home Screen avoids that. ')
        + backup,
    };
  }
  return {
    safe: false,
    head: 'This browser doesn’t say whether it keeps Lexi’s storage',
    body: backup,
  };
}

const standalone = () =>
  (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches)
  || (navigator as unknown as { standalone?: boolean }).standalone === true;

async function readPersisted(): Promise<Persisted> {
  try { return (await navigator.storage?.persisted?.()) ?? null; } catch { return null; }
}

export default function DurabilityNote() {
  useStore(); // `lastBackup` changes when a backup is taken anywhere
  const [persisted, setPersisted] = useState<Persisted>(null);
  useEffect(() => { let live = true; void readPersisted().then((p) => { if (live) setPersisted(p); }); return () => { live = false; }; }, []);

  const copy = durabilityCopy({ persisted, installed: standalone(), lastBackup: lastBackup() });
  const canAsk = persisted === false && typeof navigator.storage?.persist === 'function';
  const Icon = copy.safe ? ShieldCheck : ShieldAlert;

  return (
    <Section title="On this device" id="device-heading">
      <div className="flex items-start gap-3">
        <Icon size={20} aria-hidden className={`${copy.safe ? 'text-accent' : 'text-dim'} flex-shrink-0 mt-0.5`} />
        <div className="min-w-0">
          <p className="text-base font-semibold">{copy.head}</p>
          <p className="text-xs text-dim mt-0.5 max-w-[60ch]">{copy.body}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <Button size="sm" onClick={() => { void downloadBackup(); }}>Save a backup</Button>
            {canAsk && (
              <Button size="sm" variant="quiet"
                onClick={async () => {
                  try { await navigator.storage.persist(); } catch { /* the answer is read below either way */ }
                  setPersisted(await readPersisted());
                }}>
                Ask the browser to keep it
              </Button>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
