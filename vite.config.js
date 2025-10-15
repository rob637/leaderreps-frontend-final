import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite will now automatically discover and use the postcss.config.cjs file
  // in the project root, bypassing the manual configuration that was causing the build error.
});