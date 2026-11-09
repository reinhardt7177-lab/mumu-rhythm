import { defineConfig } from 'vite';

export default defineConfig({
  build: { rollupOptions: { input: { quest: 'index.html', studio: 'studio.html' } } },
});
