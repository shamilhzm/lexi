import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages serves from https://<user>.github.io/lexi/ (subpath), but Vercel
  // serves from the domain root. Vercel sets VERCEL=1 at build time, so serve from
  // '/' there and '/lexi/' everywhere else. Everything (index.html asset URLs, the
  // service worker registration via BASE_URL) derives from this.
  base: process.env.VERCEL ? '/' : '/lexi/',
  plugins: [react(), tailwindcss()],
});
