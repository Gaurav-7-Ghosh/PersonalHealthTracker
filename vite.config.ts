import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Two builds:
//  - default: one self-contained index.html (+ manifest, service worker) for GitHub Pages; works offline.
//  - artifact: React loaded from cdnjs as globals, for the claude.ai preview page.
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact'
  const shim = fileURLToPath(new URL('./shims/jsx-runtime.js', import.meta.url))
  return {
    base: './',
    plugins: [viteSingleFile()],
    publicDir: artifact ? false : 'public',
    resolve: artifact ? { alias: { 'react/jsx-runtime': shim, 'react/jsx-dev-runtime': shim } } : {},
    build: {
      outDir: artifact ? 'dist-artifact' : 'dist',
      rollupOptions: artifact
        ? {
            external: ['react', 'react-dom', 'react-dom/client'],
            output: {
              format: 'iife',
              globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM' },
            },
          }
        : {},
    },
  }
})
