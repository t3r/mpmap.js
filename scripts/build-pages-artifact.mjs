#!/usr/bin/env node
/**
 * After `vite build`, assemble `pages-dist/` for GitHub Pages: `index.html` + copied static assets.
 * Must use the same `VITE_BASE` as the Vite build so script/link URLs match bundled asset paths.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'pages-dist')

const viteBaseRaw = process.env.VITE_BASE || '/vite/'
const viteBase = viteBaseRaw.endsWith('/') ? viteBaseRaw : `${viteBaseRaw}/`

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function loadViteClientAssets() {
  const candidates = [
    path.join(root, 'static', 'vite', '.vite', 'manifest.json'),
    path.join(root, 'static', 'vite', 'manifest.json'),
  ]
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue
    const manifest = JSON.parse(fs.readFileSync(p, 'utf8'))
    const entryKey = Object.keys(manifest).find((k) => manifest[k]?.isEntry)
    if (!entryKey) continue
    const entry = manifest[entryKey]
    if (!entry?.file) continue
    return {
      js: [viteBase + entry.file],
      css: (entry.css || []).map((c) => viteBase + c),
    }
  }
  throw new Error('Vite manifest not found under static/vite; run vite build first.')
}

function buildMainHtml(assets) {
  const openaip = JSON.stringify(process.env.MPMAP_OPENAIP_API_KEY || process.env.VITE_MPMAP_OPENAIP_API_KEY || '')
  const cssBlock = (assets.css || [])
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}" />`)
    .join('\n    ')
  const jsBlock = (assets.js || [])
    .map((src) => `<script type="module" src="${escapeHtml(src)}"></script>`)
    .join('\n    ')
  const tpl = fs.readFileSync(path.join(root, 'views', 'main.html'), 'utf8')
  return tpl
    .replace('__MPMAP_VITE_CSS__', cssBlock)
    .replace('__MPMAP_VITE_JS__', jsBlock)
    .replace('__MPMAP_OPENAIP_API_KEY__', openaip)
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const assets = loadViteClientAssets()
fs.writeFileSync(path.join(outDir, 'index.html'), buildMainHtml(assets), 'utf8')
fs.writeFileSync(path.join(outDir, '.nojekyll'), '', 'utf8')

const viteOut = path.join(root, 'static', 'vite')
if (!fs.existsSync(viteOut)) throw new Error(`Missing ${viteOut}`)
fs.cpSync(viteOut, path.join(outDir, 'vite'), { recursive: true })

for (const dir of ['acicons', 'images']) {
  const src = path.join(root, 'static', dir)
  if (fs.existsSync(src)) fs.cpSync(src, path.join(outDir, dir), { recursive: true })
}

const fav = path.join(root, 'static', 'favicon.ico')
if (fs.existsSync(fav)) fs.copyFileSync(fav, path.join(outDir, 'favicon.ico'))

console.log('pages-dist ready:', outDir, 'vite base', viteBase)
