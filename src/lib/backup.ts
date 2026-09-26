// Saving the backup file — one door, used by Settings, the backup nudge and the
// storage line on Fortschritt, so a learner can take a copy from wherever they are
// told they should.
//
// `exportBackup` (store.ts) is async because it reads the review ledger out of
// IndexedDB. The download itself is the same anchor-and-blob that Settings has
// always used; iOS Safari hands it to the Files sheet.
import { exportBackup } from '../store.ts';

export async function downloadBackup(): Promise<void> {
  const blob = new Blob([await exportBackup()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `lexi-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  // Revoked on the next tick, not synchronously: WebKit can still be reading the
  // blob when `click()` returns, and a revoked URL downloads an empty file.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
