// The storage line on Fortschritt. The one thing it must never do is say
// "protected" on a browser that has not said so — a local-first app that flatters
// its own durability is the app that loses a year of somebody's work.
import { describe, it, expect } from 'vitest';
import { durabilityCopy } from './DurabilityNote.tsx';

describe('durabilityCopy', () => {
  it('says protected only when the browser has granted it', () => {
    for (const persisted of [false, null] as const) {
      for (const installed of [true, false]) {
        const c = durabilityCopy({ persisted, installed, lastBackup: null });
        expect(c.safe).toBe(false);
        expect(c.head).not.toMatch(/^Protected/);
      }
    }
    expect(durabilityCopy({ persisted: true, installed: false, lastBackup: null }).safe).toBe(true);
  });

  it('points a browser tab at the Home Screen, and an installed app only at backups', () => {
    expect(durabilityCopy({ persisted: false, installed: false, lastBackup: null }).body).toMatch(/Home Screen/);
    expect(durabilityCopy({ persisted: false, installed: true, lastBackup: null }).body).not.toMatch(/Home Screen/);
  });

  it('always says when the last backup was, or that there is none', () => {
    expect(durabilityCopy({ persisted: true, installed: true, lastBackup: '2026-09-20' }).body).toContain('2026-09-20');
    expect(durabilityCopy({ persisted: null, installed: false, lastBackup: null }).body).toMatch(/No backup yet/);
  });
});
