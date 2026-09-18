import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Deployed to GitHub Pages at https://meyhem.github.io/moodcraft/, so every asset
// and route is prefixed with the repo name. Applied in dev and preview too, so the
// three modes agree — the dev server redirects / to /moodcraft/.
export default defineConfig({
  base: '/moodcraft/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
