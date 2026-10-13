import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Use the port we are given (so several dev servers can run side by side), else 5173.
    port: Number(process.env.PORT) || 5173,
  },
});
