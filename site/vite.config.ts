import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A relative base keeps the build correct whether the site is served from
// https://<user>.github.io/<repo>/ or from a domain root, so the deployment
// does not have to be re-configured if the repository is renamed.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 900,
  },
})
