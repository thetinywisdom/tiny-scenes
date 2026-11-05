import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const root = import.meta.dirname;

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        desk: resolve(root, 'scenes/desk/index.html'),
        stool: resolve(root, 'scenes/stool/index.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
