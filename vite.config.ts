import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // React is used by the UI prototypes (prototypes/dock.html); the Style Lab itself is plain TypeScript.
  plugins: [react()],
  server: {
    // Use the port we are given (so several dev servers can run side by side), else 5173.
    port: Number(process.env.PORT) || 5173,
  },
});
