import { defineConfig } from 'vite';

// Relative base so the built app works from any path (GitHub Pages subpath,
// a static file server, etc.). Single-page, no framework — vanilla TS + SVG.
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist', sourcemap: false }
});
