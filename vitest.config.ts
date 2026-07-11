import { defineConfig } from 'vitest/config';

// Tests cover the pure, high-risk logic (conjugate, treemap, corpus matcher) plus
// the store/session math. The store reads localStorage at module-init and writes
// progress through IndexedDB; the setup file shims localStorage and each store
// test mocks lib/idb, so a Node environment is enough — no jsdom dependency.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
  },
});
