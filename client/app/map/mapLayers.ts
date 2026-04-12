import L from 'leaflet'

import { createLatLonGridLayer } from '../../leaflet/grid/latLonGridLayer'

/** Built-in raster basemaps (names must stay stable — they are persisted in cookies). */
export function createBaseLayers(): Record<string, L.TileLayer> {
  return {
    OpenStreetMap: new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 0,
      maxZoom: 18,
      attribution:
        'Map data &copy; <a target="_blank" href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    }),
    'Carto Light': new L.TileLayer('https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      minZoom: 0,
      maxZoom: 18,
      attribution: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
    }),
    'Carto Dark': new L.TileLayer('https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
      minZoom: 0,
      maxZoom: 18,
      attribution: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
    }),
  }
}

/**
 * Optional overlays (weather, sectionals, lat/lon grid). Names are persisted when toggled.
 * OpenAIP is only present when the server injects `window.MPMAP_OPENAIP_API_KEY`.
 */
export function createOverlayLayers(): Record<string, L.Layer> {
  const overlays: Record<string, L.Layer> = {}

  const key = typeof window.MPMAP_OPENAIP_API_KEY === 'string' ? window.MPMAP_OPENAIP_API_KEY.trim() : ''
  if (key.length > 0) {
    overlays.OpenAIP = new L.TileLayer(
      `https://{s}.api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(key)}`,
      {
        attribution: '&copy; <a target="_blank" href="https://www.openaip.net">openaip.net</a>',
        maxZoom: 14,
        minZoom: 7,
        detectRetina: true,
        subdomains: 'abc',
        format: 'image/png',
        transparent: true,
      } as L.TileLayerOptions
    )
  }

  const usBounds = L.latLngBounds(L.latLng(16.0, -179.0), L.latLng(72.0, -60.0))
  overlays['VFRMap.com Sectionals (US)'] = new L.TileLayer(
    'https://vfrmap.com/20210909/tiles/vfrc/{z}/{y}/{x}.jpg',
    {
      maxZoom: 12,
      minZoom: 3,
      attribution: '&copy; <a target="_blank" href="https://vfrmap.com">VFRMap.com</a>',
      tms: true,
      opacity: 0.5,
      bounds: usBounds,
    }
  )

  overlays['VFRMap.com - Low IFR (US)'] = new L.TileLayer(
    'https://vfrmap.com/20210909/tiles/ifrlc/{z}/{y}/{x}.jpg',
    {
      maxZoom: 12,
      minZoom: 5,
      attribution: '&copy; <a target="_blank" href="https://vfrmap.com">VFRMap.com</a>',
      tms: true,
      opacity: 0.5,
      bounds: usBounds,
    }
  )

  overlays.Grid = createLatLonGridLayer({
    redraw: 'moveend',
    coordStyle: 'DMS',
  })

  return overlays
}
