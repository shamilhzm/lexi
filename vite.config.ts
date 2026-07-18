import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/lexi/', // GitHub Pages serves from https://<user>.github.io/lexi/
  plugins: [react(), tailwindcss()],
});
