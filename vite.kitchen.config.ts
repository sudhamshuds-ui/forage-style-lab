import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Builds the kitchen page on its own (for publishing it as a private preview):
 *   npx vite build --config vite.kitchen.config.ts
 * The page lands in dist-kitchen/kitchen.html with its script and styles beside it.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    assetsInlineLimit: 65536,
    outDir: 'dist-kitchen',
    emptyOutDir: true,
    rolldownOptions: { input: 'kitchen.html' },
  },
});
