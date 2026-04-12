/**
 * MarkerClusterGroup that listens for `mpdata` events and maintains one marker + trail per callsign.
 * A 1s GC removes stale aircraft and flags "vanished" (no update ~15s) for blink styling.
 *
 * Uses Leaflet's `extend` pattern; `this` is `any` inside the implementation object (see grid layer).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import L from 'leaflet'
import 'leaflet.markercluster'

import { createAircraftMarker } from './aircraft/aircraftMarker'
import type { AircraftHistorySample } from './aircraft/types'

interface MpServerClientLike {
  callsign?: string
  model?: string
  geod?: { lat?: number; lng?: number; lon?: number; alt?: number }
  oriA?: { z?: number }
}

type TrackedAircraft = {
  history: AircraftHistorySample[]
  layer: null
}

function latLngFromSample(pos: { lat?: number; lng?: number; lon?: number } | undefined): L.LatLng {
  const lat = Number(pos?.lat) || 0
  const lng = Number(pos?.lng ?? pos?.lon) || 0
  return L.latLng(lat, lng)
}

const MpAircraftClusterImpl = L.MarkerClusterGroup.extend({
  options: {
    spiderfyOnMaxZoom: false,
    iconCreateFunction(cluster) {
      const childCount = cluster.getChildCount()
      let c = ' marker-cluster-'
      if (childCount < 5) c += 'small'
      else if (childCount < 10) c += 'medium'
      else c += 'large'
      return new L.DivIcon({
        html: `<div><span>${childCount}</span></div>`,
        className: `marker-cluster${c}`,
        iconSize: new L.Point(40, 40),
      })
    },
  } as L.MarkerClusterGroupOptions,

  initialize: function (this: any, layers: L.Layer[] | null, options?: L.MarkerClusterGroupOptions) {
    ;(
      L.MarkerClusterGroup.prototype as unknown as {
        initialize(this: L.MarkerClusterGroup, layers?: L.Layer[] | null, options?: L.MarkerClusterGroupOptions): void
      }
    ).initialize.call(this, layers, options)
    L.setOptions(this, options)
  },

  onAdd: function (this: any, map: L.Map) {
    L.MarkerClusterGroup.prototype.onAdd.call(this, map)
    this._aircraft = {}
    this._map = map
    this.on('mpdata', this._onData)
    this._gc()
  },

  onRemove: function (this: any) {
    if (this.gcTimeout) clearTimeout(this.gcTimeout)
    this.off('mpdata', this._onData)
    ;(L.MarkerClusterGroup.prototype as unknown as { onRemove(this: L.MarkerClusterGroup, map: L.Map): void }).onRemove.call(
      this,
      this._map
    )
  },

  /** Drop 30s-stale tracks, then redraw all markers (cluster + trail). */
  _gc: function (this: any) {
    const now = Date.now()
    const expired: string[] = []
    for (const callsign of Object.keys(this._aircraft)) {
      const ac = this._aircraft[callsign]
      const lastSeen = ac.history[ac.history.length - 1]?.time ?? now
      if (now - lastSeen > 30000) expired.push(callsign)
    }
    expired.forEach((callsign: string) => {
      delete this._aircraft[callsign]
    })
    this._rebuildMarkers()
    this.gcTimeout = setTimeout(() => this._gc(), 1000)
  },

  /** Re-create markers from `_aircraft` (used after GC and after each server snapshot). */
  _rebuildMarkers: function (this: any) {
    const now = Date.now()
    this.clearLayers()
    for (const callsign of Object.keys(this._aircraft)) {
      const ac = this._aircraft[callsign]
      const lastSeen = ac.history[ac.history.length - 1]?.time ?? now
      const vanished = now - lastSeen > 15000
      this.addLayer(createAircraftMarker(ac.history, vanished))
    }
  },

  _onData: function (this: any, evt: { data?: { clients?: MpServerClientLike[] } }) {
    const clients = evt?.data?.clients
    if (!clients) return
    const now = Date.now()

    // Server snapshot replaces the live set: drop anyone not in this message immediately.
    const present = new Set<string>()
    for (const c of clients) {
      present.add(c.callsign || 'UNKNOWN')
    }
    for (const key of Object.keys(this._aircraft)) {
      if (!present.has(key)) delete this._aircraft[key]
    }

    clients.forEach(function (this: any, client: MpServerClientLike) {
      if (!client.geod) client.geod = {}
      if (!client.oriA) client.oriA = {}
      const key = client.callsign || 'UNKNOWN'
      let ac = this._aircraft[key]
      if (!ac) {
        ac = this._aircraft[key] = { history: [], layer: null }
      }
      ac.history.push({
        position: {
          lat: client.geod.lat || 0,
          lon: client.geod.lng || 0,
          alt: client.geod.alt || 0,
        },
        heading: client.oriA.z || 0,
        callsign: client.callsign || 'UNKNOWN',
        model: client.model || 'UNKNOWN',
        time: now,
        speed: 0,
      })
      if (ac.history.length > 1) {
        const last = ac.history[ac.history.length - 1]
        const prev = ac.history[ac.history.length - 2]
        const dist = latLngFromSample(last.position).distanceTo(latLngFromSample(prev.position))
        const dt = (last.time ?? now) - (prev.time ?? now)
        if (dt > 0) last.speed = (dist / dt) * 1000
      }
      while (ac.history.length > 1000) ac.history.shift()
    }, this)

    this._rebuildMarkers()
  },
})

/* eslint-enable @typescript-eslint/no-explicit-any */

export function createMpAircraftClusterLayer(
  layers: L.Layer[] | null,
  options?: L.MarkerClusterGroupOptions
): L.MarkerClusterGroup {
  return new (MpAircraftClusterImpl as unknown as new (
    l: L.Layer[] | null,
    o?: L.MarkerClusterGroupOptions
  ) => L.MarkerClusterGroup)(layers, options)
}
