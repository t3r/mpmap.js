import L from 'leaflet'
import type { LayersControlEvent, Map as LeafletMap, MarkerClusterGroup } from 'leaflet'

import { createMpAircraftClusterLayer } from '../leaflet/mpAircraftClusterLayer'
import { createBaseLayers, createOverlayLayers } from './map/mapLayers'
import { MpStreamClient } from './network/mpStreamClient'
import { fetchMpserverDirectory } from './network/mpserverApi'
import { AppSettings } from './settings/AppSettings'
import type { MpStreamMessage } from './types/messages'
import { PilotsSidebar } from './ui/pilotsSidebar'
import { wireSidebarToggle } from './ui/sidebarToggle'

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Missing required element #${id}`)
  return el as T
}

/**
 * Boots the multiplayer map: Leaflet map, layer control, MP aircraft cluster, WebSocket stream,
 * server directory `<select>`, and sidebar UI. Intended to run once after DOM ready.
 */
export function mountMapApp(): void {
  const settings = new AppSettings()

  const map = new L.Map('map', {
    fadeAnimation: true,
    zoomAnimation: true,
    zoomControl: false,
  }) as LeafletMap

  const baselayers = createBaseLayers()
  if (!baselayers[settings.baseLayer]) settings.baseLayer = 'OpenStreetMap'

  const overlays = createOverlayLayers()

  if (settings.overlays.OpenAIP && !overlays.OpenAIP) {
    delete settings.overlays.OpenAIP
    settings.save()
  }

  map.setView(new L.LatLng(settings.lat, settings.lng), settings.zoom)
  map.addLayer(baselayers[settings.baseLayer])

  /** Aircraft sprite scales at low zoom; class drives CSS on `.fg-aircraft-symbol-wrap`. */
  const AIRCRAFT_SMALL_ZOOM_MAX = 7
  function syncAircraftIconScale(): void {
    map.getContainer().classList.toggle('mpmap-aircraft-small', map.getZoom() <= AIRCRAFT_SMALL_ZOOM_MAX)
  }
  map.on('zoom zoomend', syncAircraftIconScale)
  syncAircraftIconScale()

  L.control.zoom({ position: 'topright' }).addTo(map)
  L.control.layers(baselayers, overlays).addTo(map)

  for (const name of Object.keys(settings.overlays)) {
    const layer = overlays[name]
    if (layer) layer.addTo(map)
  }

  const aircraftLayer = createMpAircraftClusterLayer(null, {
    disableClusteringAtZoom: settings.clusterZoom,
  }).addTo(map) as MarkerClusterGroup

  const pilots = new PilotsSidebar(
    map,
    requireEl<HTMLUListElement>('pilotsList'),
    requireEl('aircraftCount'),
    requireEl('nrOfClients')
  )

  const disconnected = requireEl('disconnected')
  const aircraftCount = requireEl('aircraftCount')

  function setConnected(connected: boolean): void {
    aircraftCount.style.visibility = connected ? 'visible' : 'hidden'
    disconnected.style.visibility = connected ? 'hidden' : 'visible'
    if (!connected) {
      pilots.clear()
      aircraftLayer.fire('mpdata', {
        data: { server: settings.server, port: 5001, clients: [] },
      })
    }
  }

  setConnected(false)

  const stream = new MpStreamClient(
    () => settings.server,
    (msg: MpStreamMessage) => {
      const payload = msg.data
      if (!payload?.clients || !Array.isArray(payload.clients)) return
      setConnected(true)
      payload.clients.sort((a, b) => (a.callsign || '').localeCompare(b.callsign || ''))
      aircraftLayer.fire('mpdata', { data: payload })
      pilots.updateFromClients(payload.clients)
      if (typeof msg.nrOfClients === 'number') pilots.setObserverCount(msg.nrOfClients)
    },
    (connected) => setConnected(connected)
  )

  stream.connect()

  const mpserverSelect = requireEl<HTMLSelectElement>('mpserverSelect')
  mpserverSelect.addEventListener('change', () => {
    settings.server = mpserverSelect.value
    stream.sendServerSelection()
    settings.save()
  })

  void fetchMpserverDirectory()
    .then((directory) => {
      mpserverSelect.replaceChildren()
      const entries = Object.entries(directory).sort((a, b) => a[0].localeCompare(b[0]))
      for (const [label, meta] of entries) {
        const opt = document.createElement('option')
        opt.value = meta.dn
        opt.textContent = `${label} (${String(meta.location)})`
        opt.selected = meta.dn === settings.server
        mpserverSelect.appendChild(opt)
      }
    })
    .catch((err) => console.error('Server directory load failed', err))

  map.on('moveend', () => {
    const c = map.getCenter()
    settings.lat = c.lat
    settings.lng = c.lng
    settings.save()
  })
  map.on('zoomend', () => {
    settings.zoom = map.getZoom()
    settings.save()
  })
  map.on('baselayerchange', (e: LayersControlEvent) => {
    settings.baseLayer = e.name
    settings.save()
  })
  map.on('overlayadd', (e: LayersControlEvent) => {
    settings.overlays[e.name] = true
    settings.save()
  })
  map.on('overlayremove', (e: LayersControlEvent) => {
    delete settings.overlays[e.name]
    settings.save()
  })

  const cookieCheck = requireEl<HTMLInputElement>('cookieCheck')
  cookieCheck.addEventListener('change', () => {
    if (cookieCheck.checked) settings.saveCookie = true
    else delete settings.saveCookie
    settings.save()
  })

  const clusterZoom = requireEl<HTMLInputElement>('clusterZoom')
  clusterZoom.addEventListener('change', () => {
    const n = Number(clusterZoom.value)
    if (!Number.isNaN(n)) {
      settings.clusterZoom = n
      ;(aircraftLayer.options as L.MarkerClusterGroupOptions).disableClusteringAtZoom = n
      settings.save()
    }
  })

  wireSidebarToggle(map)

  window.addEventListener('beforeunload', () => {
    stream.dispose()
  })
}
