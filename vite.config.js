JavaScript

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Explicitly tell Vite where the PostCSS configuration is located.
  // This resolves the persistent "PostCSS plugin" error on Netlify.
  css: {
    postcss: './postcss.config.cjs',
  }
});