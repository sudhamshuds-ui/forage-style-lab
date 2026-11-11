import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // React is used by the UI prototypes (prototypes/dock.html); the Style Lab itself is plain TypeScript.
  plugins: [react()],
  // Small files (the Geist Serif font, 47 KB) are built into the page itself, so the
  // single-file previews work too.
  build: { assetsInlineLimit: 65536 },
  server: {
    // Use the port we are given (so several dev servers can run side by side), else 5173.
    port: Number(process.env.PORT) || 5173,
  },
});
