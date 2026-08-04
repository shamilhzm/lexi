import { defineConfig } from 'vitest/config';

// Tests cover the pure, high-risk logic (conjugate, treemap, corpus matcher) plus
// the store/session math. The store reads localStorage at module-init and writes
// progress through IndexedDB; the setup file shims localStorage and each store
// test mocks lib/idb, so a Node environment is enough — no jsdom dependency.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    // The git worktrees under `.claude/worktrees/` are full checkouts of the
    // in-flight branches. Without that second exclusion `npm test` runs those
    // trees alongside this one and reports *their* failures as ours, which makes
    // the suite unreadable as a signal. (The `to_be_deleted_or_archived/` legacy
    // apps were the other offender; that tree is now deleted, so the pattern is
    // gone with it.)
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
  },
});
