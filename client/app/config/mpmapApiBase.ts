/**
 * GitHub Pages (or any static host) serves only the browser bundle; API + WebSocket stay on the
 * Node server. Set `VITE_MPMAP_API_ORIGIN` at build time (e.g. `https://mpmap03.flightgear.org`)
 * so `fetch` / `WebSocket` target that origin. Empty / unset → same-origin relative URLs.
 */
function mpmapApiOrigin(): string {
  const v = import.meta.env.VITE_MPMAP_API_ORIGIN
  if (typeof v !== 'string') return ''
  const t = v.trim()
  if (!t) return ''
  try {
    const u = new URL(t)
    return u.origin
  } catch {
    return ''
  }
}

/** `api/stat/` or absolute URL when a remote API origin is configured. */
export function apiFetchUrl(apiPath: string): string {
  const origin = mpmapApiOrigin()
  const rel = apiPath.replace(/^\/+/, '')
  if (origin) return `${origin}/${rel}`
  return rel
}

/** WebSocket URL for `/api/stream` (same-origin or remote host). */
export function mpStreamWebSocketUrl(): string {
  const origin = mpmapApiOrigin()
  if (origin) {
    const u = new URL(origin)
    const wsProto = u.protocol === 'https:' ? 'wss' : 'ws'
    return `${wsProto}://${u.host}/api/stream`
  }
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const prefix = path === '/' ? '' : path
  const wsPath = `${prefix ? `${prefix}/` : '/'}api/stream`
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}${wsPath}`
}
