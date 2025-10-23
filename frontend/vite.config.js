import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ✅ Fix absolute paths to work with Flask static serving
export default defineConfig({
  plugins: [react()],
  base: './', // crucial for Flask static serving
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    historyApiFallback: true, // ensures /admin and /login reload correctly
    hmr: {
      clientPort: 5173,
    },
  }, // <-- ✅ this was missing
}); // <-- ✅ closes defineConfig
