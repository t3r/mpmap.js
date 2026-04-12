import type { Marker, Polyline } from 'leaflet'

/** Snapshot used for icon HTML / marker options (aligned with server `MPServerClient`). */
export interface AircraftIconState {
  callsign: string
  model: string
  position: { alt: number; lat?: number; lng?: number; lon?: number }
  speed: number
  heading: number
  title?: string
  alt?: string
}

/** One row of history used for trail + latest icon (fields optional while building). */
export interface AircraftHistorySample {
  position?: { lat?: number; lng?: number; lon?: number; alt?: number }
  heading?: number
  callsign?: string
  model?: string
  time?: number
  speed?: number
  title?: string
  alt?: string
}

export type AircraftMarkerInstance = Marker & {
  history: AircraftHistorySample[]
  _trail?: Polyline
}
