import { defineConfig } from 'vitest/config';

// Tests cover the pure, high-risk logic (conjugate, treemap, corpus matcher) plus
// the store/session math. The store reads localStorage at module-init and writes
// progress through IndexedDB; the setup file shims localStorage and each store
// test mocks lib/idb, so a Node environment is enough — no jsdom dependency.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    // The parked legacy apps carry their own (stale) test files — and so do the
    // git worktrees under `.claude/worktrees/`, which are full checkouts of the
    // in-flight branches. Without that second exclusion `npm test` runs four
    // other trees alongside this one (889 tests instead of 121) and reports
    // *their* failures as ours, which makes the suite unreadable as a signal.
    exclude: [
      '**/node_modules/**', '**/dist/**',
      'to_be_deleted_or_archived/**', '**/.claude/**',
    ],
  },
});
