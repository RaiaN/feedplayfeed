import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths: the same build must work from a subfolder, a Devvit webview or an FB Instant zip.
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
