import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** GitHub Pages uses `/repo/vite/`; self-hosted Express keeps `/vite/` (see app.ts `loadViteClientAssets`). */
const viteBaseRaw = process.env.VITE_BASE || '/vite/'
const viteBase = viteBaseRaw.endsWith('/') ? viteBaseRaw : `${viteBaseRaw}/`

export default defineConfig({
  root: __dirname,
  base: viteBase,
  publicDir: false,
  build: {
    outDir: path.join(__dirname, 'static/vite'),
    emptyOutDir: true,
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: path.join(__dirname, 'client/main.ts'),
    },
  },
})
