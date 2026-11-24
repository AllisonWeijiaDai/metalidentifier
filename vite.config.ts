import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No API keys are defined here: anything in `define` is copied into the browser bundle.
// The Gemini key lives only in the server function (api/identify.ts).
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
