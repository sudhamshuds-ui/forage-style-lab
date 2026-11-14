import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Builds one prototype page on its own (for publishing it as a private preview):
 *   PAGE=review npx vite build --config vite.proto.config.ts
 * The page lands in dist-proto/prototypes/{PAGE}.html with its script and styles beside it.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    assetsInlineLimit: 65536,
    outDir: 'dist-proto',
    emptyOutDir: true,
    rolldownOptions: { input: `prototypes/${process.env.PAGE || 'review'}.html` },
  },
});
