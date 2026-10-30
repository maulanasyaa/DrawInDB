import { defineConfig } from 'vitest/config';

// Config terpisah dari vite.config.mjs: test jalan di environment node
// (store + util murni, tanpa DOM / plugin React-Tailwind).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
