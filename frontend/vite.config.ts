import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  css: {
    postcss: {
      plugins: [],
    },
  },
  build: {
    cssMinify: 'esbuild', // Use esbuild to preserve webkit properties
    // Ensure Electron-specific CSS properties are preserved
    cssCodeSplit: true,
  },
})
