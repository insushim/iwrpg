import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          colyseus: ['colyseus.js', '@colyseus/schema'],
          audio: ['tone', 'howler'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['phaser', 'colyseus.js'],
  },
});
