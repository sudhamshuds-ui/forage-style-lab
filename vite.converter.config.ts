import { defineConfig } from 'vite';

/**
 * Builds the dish converter page on its own (for publishing it as a private preview):
 *   npx vite build --config vite.converter.config.ts
 * The page lands in dist-converter/converter.html with its script, styles and painting beside it.
 */
export default defineConfig({
  // Relative paths, so the page works wherever it is published.
  base: './',
  build: {
    assetsInlineLimit: 0,
    outDir: 'dist-converter',
    emptyOutDir: true,
    rolldownOptions: { input: 'converter.html' },
  },
});
