import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps the built assets relative, so the dist/ folder can be
// deployed to any static host, sub-path, or even opened locally.
export default defineConfig({
  base: './',
  plugins: [react()],
});
