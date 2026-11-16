import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Builds the Forage kit page on its own (for publishing it as a private preview):
 *   npx vite build --config vite.kit.config.ts
 * The page lands in dist-kit/kit.html with its script and styles beside it.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    assetsInlineLimit: 65536,
    outDir: 'dist-kit',
    emptyOutDir: true,
    rolldownOptions: { input: 'kit.html' },
  },
});
