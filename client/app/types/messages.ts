/**
 * Shapes shared between the WebSocket stream (`/api/stream`) and the Leaflet UI.
 * The server sends `MPServerStatusPayload` inside `data` plus `nrOfClients`.
 */

/** One multiplayer client as parsed from the mpserver status protocol. */
export interface MpServerClient {
  callsign?: string
  model?: string
  geod?: { lat?: number; lng?: number; lon?: number; alt?: number }
  oriA?: { x?: number; y?: number; z?: number }
}

export interface MpServerStatusPayload {
  server: string
  port: number
  clients: MpServerClient[]
}

/** JSON broadcast from `ServerObserver` to browsers. */
export interface MpStreamMessage {
  data?: MpServerStatusPayload
  nrOfClients?: number
}

/** `/api/stat/` directory entry (DNS + TXT decoded on the server). */
export interface MpserverDirectoryEntry {
  dn: string
  location: unknown
  port: number
}

export type MpserverDirectory = Record<string, MpserverDirectoryEntry>
