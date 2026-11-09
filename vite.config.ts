import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      // The world lab is a separate QA page, never an entrypoint to Hearthmere.
      input: {
        game: 'index.html',
        worldV2Lab: 'world-v2-lab.html',
        worldV2Geography: 'world-v2-geography.html',
        worldV2Story: 'world-v2-story.html',
        worldV2ArtTarget: 'world-v2-art-target.html',
      },
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
