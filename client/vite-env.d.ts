/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Public origin of the mpmap Node app when the UI is hosted elsewhere (e.g. GitHub Pages).
   * Example: `https://mpmap03.flightgear.org` — no trailing path.
   */
  readonly VITE_MPMAP_API_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    /** Injected by the server from `MPMAP_OPENAIP_API_KEY` when the overlay is available. */
    MPMAP_OPENAIP_API_KEY?: string
    /**
     * Set in `main.ts` before loading UMD-style plugins (`leaflet.markercluster`, `leaflet-ant-path`).
     * Those packages expect `L` on `window`, which Vite’s ESM bundle does not provide by default.
     */
    L: typeof import('leaflet').default
  }
}

export {}

declare module 'leaflet-ant-path' {
  import type { PolylineOptions } from 'leaflet'

  export interface AntPathOptions extends PolylineOptions {
    delay?: number
    pulseColor?: string
    paused?: boolean
    hardwareAccelerated?: boolean
  }
}
