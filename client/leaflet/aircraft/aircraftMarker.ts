import L from 'leaflet'

import { escapeHtml } from '../../app/utils/escapeHtml'
import { createAircraftIcon, lngFromPosition } from './aircraftIcon'
import type { AircraftHistorySample, AircraftIconState, AircraftMarkerInstance } from './types'

const AircraftMarkerImpl = L.Marker.extend({
  options: {
    historyLength: 100,
    riseOnHover: true,
  },

  initialize: function (this: AircraftMarkerInstance, history: AircraftHistorySample[], vanished?: boolean) {
    this.history = history
    const last = history[history.length - 1]
    const options = last as AircraftIconState & L.MarkerOptions
    const cs = escapeHtml(options.callsign)
    const md = escapeHtml(options.model)
    options.title = escapeHtml(options.title) || `${cs} (${md})`
    options.alt = escapeHtml(options.alt) || `callsign: ${cs}, model: ${md}`
    if (!options.position) options.position = { alt: 0 }
    options.position.alt = Number(options.position.alt) || 0
    options.speed = Number(options.speed) || 0
    options.heading = Number(options.heading) || 0
    options.icon = createAircraftIcon(options)

    const pos = options.position
    let lat = Number(pos.lat) || 0
    let lng = lngFromPosition(pos.lng, pos.lon)
    if (Number.isNaN(lng)) lng = 0
    ;(L.Marker.prototype as unknown as {
      initialize(this: L.Marker, latlng: L.LatLngExpression, options?: L.MarkerOptions): void
    }).initialize.call(this, L.latLng(lat, lng), options)
    this.setIcon(createAircraftIcon(options, vanished))
  },

  onAdd: function (this: AircraftMarkerInstance, map: L.Map) {
    L.Marker.prototype.onAdd.call(this, map)
    const ll: L.LatLng[] = []
    this.history.forEach((h) => {
      const p = h.position || {}
      const plat = Number(p.lat) || 0
      let plng = lngFromPosition(p.lng, p.lon)
      if (Number.isNaN(plng)) plng = 0
      ll.push(L.latLng(plat, plng))
    })
    // leaflet-ant-path extends Polyline with animated dash offset (types in vite-env.d.ts).
    this._trail = new L.Polyline(ll, {
      color: '#008000',
      weight: 2,
      dashArray: '10,10',
      delay: 1200,
      pulseColor: '#008080',
      paused: false,
      hardwareAccelerated: true,
    } as L.PolylineOptions & Record<string, unknown>)
    this._trail.addTo(map)
  },

  onRemove: function (this: AircraftMarkerInstance, map: L.Map) {
    this._trail?.removeFrom(map)
    L.Marker.prototype.onRemove.call(this, map)
  },
})

export function createAircraftMarker(history: AircraftHistorySample[], vanished?: boolean): L.Marker {
  return new (AircraftMarkerImpl as unknown as new (h: AircraftHistorySample[], v?: boolean) => L.Marker)(
    history,
    vanished
  )
}
