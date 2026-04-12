/*
This is mpmap.js - a nodejs based multiplayer map for flightgear
Copyright (C) 2017 - Torsten Dreyer torsten _at_ t3r.de

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

import compression from 'compression'
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import expressWs from 'express-ws'
import fs from 'fs'
import helmet from 'helmet'
import logger from 'morgan'
import path from 'path'
import favicon from 'serve-favicon'
import apiRouter from './routes/api'

function getProjectRoot(): string {
  return path.basename(__dirname) === 'dist' ? path.join(__dirname, '..') : path.resolve(__dirname)
}

const projectRoot = getProjectRoot()
global.appRoot = projectRoot

const isDev =
  process.env.NODE_ENV === 'development' || process.env.node_env === 'development'

const mainHtmlPath = path.join(projectRoot, 'views', 'main.html')
const errorHtmlPath = path.join(projectRoot, 'views', 'error.html')

let mainHtmlTemplate: string | null = null
function readMainHtmlTemplate(): string {
  if (isDev) {
    return fs.readFileSync(mainHtmlPath, 'utf8')
  }
  if (mainHtmlTemplate === null) {
    mainHtmlTemplate = fs.readFileSync(mainHtmlPath, 'utf8')
  }
  return mainHtmlTemplate
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const app = express()

const ws = expressWs(app)
app.set('expressWs', ws)

app.set('trust proxy', 1)
app.use(
  helmet({
    contentSecurityPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
)
app.use(compression())

app.use(favicon(path.join(projectRoot, 'static', 'favicon.ico')))
app.use(logger(process.env.node_env === 'development' ? 'dev' : 'combined'))

interface ViteManifestEntry {
  isEntry?: boolean
  file?: string
  css?: string[]
}

interface ViteManifest {
  [key: string]: ViteManifestEntry | undefined
}

function loadViteClientAssets(): { js: string[]; css: string[] } | null {
  const candidates = [
    path.join(projectRoot, 'static', 'vite', '.vite', 'manifest.json'),
    path.join(projectRoot, 'static', 'vite', 'manifest.json'),
  ]
  for (let i = 0; i < candidates.length; i++) {
    try {
      const raw = fs.readFileSync(candidates[i], 'utf8')
      const manifest = JSON.parse(raw) as ViteManifest
      const entryKey = Object.keys(manifest).find((k) => {
        const e = manifest[k]
        return e && e.isEntry
      })
      if (!entryKey) continue
      const entry = manifest[entryKey]
      if (!entry || !entry.file) continue
      const base = '/vite/'
      return {
        js: [base + entry.file],
        css: (entry.css || []).map((c) => base + c),
      }
    } catch {
      /* try next path */
    }
  }
  return null
}

let viteClientAssets = loadViteClientAssets()

function buildMainHtml(assets: { js: string[]; css: string[] } | null): string {
  const openaip = JSON.stringify(process.env.MPMAP_OPENAIP_API_KEY || '')
  const cssBlock = (assets?.css || [])
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}" />`)
    .join('\n    ')
  const jsBlock = (assets?.js || [])
    .map((src) => `<script type="module" src="${escapeHtml(src)}"></script>`)
    .join('\n    ')
  return readMainHtmlTemplate()
    .replace('__MPMAP_VITE_CSS__', cssBlock)
    .replace('__MPMAP_VITE_JS__', jsBlock)
    .replace('__MPMAP_OPENAIP_API_KEY__', openaip)
}

app.use(express.static(path.join(projectRoot, 'static')))

apiRouter.registerWebSocket(ws)
app.use('/api', apiRouter)

app.get('/', (_req: Request, res: Response, _next: NextFunction) => {
  const assets = isDev ? loadViteClientAssets() : viteClientAssets
  res.type('html').send(buildMainHtml(assets))
})

app.use((_req: Request, _res: Response, next: NextFunction) => {
  const err = new Error('Not Found') as Error & { status?: number }
  err.status = 404
  next(err)
})

function errStatus(err: unknown): number {
  if (err && typeof err === 'object') {
    if ('status' in err) {
      const s = Number((err as { status?: unknown }).status)
      if (Number.isFinite(s) && s >= 400 && s < 600) return s
    }
    if ('statusCode' in err) {
      const s = Number((err as { statusCode?: unknown }).statusCode)
      if (Number.isFinite(s) && s >= 400 && s < 600) return s
    }
  }
  return 500
}

function buildErrorHtml(status: number, message: string, stackHtml: string): string {
  const title = `${message} (${status})`
  return fs
    .readFileSync(errorHtmlPath, 'utf8')
    .replace('__MPMAP_ERR_TITLE__', escapeHtml(title))
    .replace('__MPMAP_ERR_MESSAGE__', escapeHtml(message))
    .replace('__MPMAP_ERR_STATUS__', escapeHtml(String(status)))
    .replace('__MPMAP_ERR_STACK__', stackHtml)
}

const devErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = errStatus(err)
  const message = err instanceof Error ? err.message : String(err)
  const stack =
    err instanceof Error && err.stack
      ? `<pre>${escapeHtml(err.stack)}</pre>`
      : ''
  res.status(status).type('html').send(buildErrorHtml(status, message, stack))
}

const prodErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = errStatus(err)
  const message = err instanceof Error ? err.message : String(err)
  res.status(status).type('html').send(buildErrorHtml(status, message, ''))
}

if (app.get('env') === 'development') {
  app.use(devErrorHandler)
}

app.use(prodErrorHandler)

export default app
