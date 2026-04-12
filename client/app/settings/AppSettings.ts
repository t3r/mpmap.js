import Cookies from 'js-cookie'

import { getQueryParam } from '../utils/queryString'

const COOKIE_NAME = 'mpmap-settings'

/** Serializable map + UI preferences stored in a cookie when the user opts in. */
export interface MpmapSettingsDto {
  lat: number
  lng: number
  zoom: number
  server: string
  refresh: number
  baseLayer: string
  overlays: Record<string, boolean>
  clusterZoom: number
  saveCookie: true
}

/**
 * Loads defaults from the URL, optional cookie, and syncs a few form controls.
 * Map events call `save()` so pan/zoom/layer changes persist when cookies are enabled.
 */
export class AppSettings {
  lat: number
  lng: number
  zoom: number
  server: string
  refresh: number
  baseLayer: string
  overlays: Record<string, boolean>
  saveCookie?: boolean
  clusterZoom: number

  constructor() {
    let stored: Record<string, unknown> = {}
    const raw = Cookies.get(COOKIE_NAME)
    if (typeof raw === 'string' && raw.length > 0) {
      try {
        stored = JSON.parse(raw) as Record<string, unknown>
      } catch {
        stored = {}
      }
    }

    this.lat = Number(getQueryParam('lat', (stored.lat as number) ?? 53.5))
    this.lng = Number(getQueryParam('lng', (stored.lng as number) ?? 10))
    this.zoom = Number(getQueryParam('zoom', (stored.zoom as number) ?? 3))
    this.server = String(getQueryParam('server', (stored.server as string) ?? 'mpserver01.flightgear.org'))
    this.refresh = Number(getQueryParam('refresh', (stored.refresh as number) ?? 10))
    this.baseLayer = String(stored.baseLayer ?? 'OpenStreetMap')
    this.overlays = (stored.overlays as Record<string, boolean> | undefined) ?? {}
    this.saveCookie = stored.saveCookie as boolean | undefined
    this.clusterZoom = Number(stored.clusterZoom ?? 12)

    const cookieCheck = document.getElementById('cookieCheck') as HTMLInputElement | null
    if (cookieCheck) cookieCheck.checked = Boolean(this.saveCookie)

    const clusterInput = document.getElementById('clusterZoom') as HTMLInputElement | null
    if (clusterInput) clusterInput.value = String(this.clusterZoom)
  }

  save(): void {
    if (this.saveCookie) {
      const dto: MpmapSettingsDto = {
        lat: this.lat,
        lng: this.lng,
        zoom: this.zoom,
        server: this.server,
        refresh: this.refresh,
        baseLayer: this.baseLayer,
        overlays: this.overlays,
        clusterZoom: this.clusterZoom,
        saveCookie: true,
      }
      Cookies.set(COOKIE_NAME, JSON.stringify(dto))
    } else {
      Cookies.remove(COOKIE_NAME)
    }
  }
}
