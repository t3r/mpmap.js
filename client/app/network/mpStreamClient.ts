import { mpStreamWebSocketUrl } from '../config/mpmapApiBase'
import type { MpStreamMessage } from '../types/messages'

const RECONNECT_MS = 2000

/**
 * WebSocket client for `/api/stream`. Subscribes to one mpserver hostname; reconnects with backoff
 * after close/error. First message after open repeats the subscription (server may drop state).
 */
export class MpStreamClient {
  private socket: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private closedByUser = false

  constructor(
    private readonly getServer: () => string,
    private readonly onMessage: (msg: MpStreamMessage) => void,
    private readonly onConnectionChange: (connected: boolean) => void
  ) {}

  private buildUrl(): string {
    return mpStreamWebSocketUrl()
  }

  connect(): void {
    this.closedByUser = false
    this.openSocket()
  }

  /** Send current server selection (call after user changes `<select>`). */
  sendServerSelection(): void {
    const ws = this.socket
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(
      JSON.stringify({
        server: this.getServer(),
        binary: false,
      })
    )
  }

  dispose(): void {
    this.closedByUser = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.socket) {
      const s = this.socket
      s.onclose = null
      s.close()
      this.socket = null
    }
  }

  private scheduleReconnect(): void {
    if (this.closedByUser) return
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => this.openSocket(), RECONNECT_MS)
  }

  private openSocket(): void {
    let ws: WebSocket
    try {
      ws = new WebSocket(this.buildUrl())
    } catch (e) {
      console.error(e)
      this.onConnectionChange(false)
      this.scheduleReconnect()
      return
    }

    this.socket = ws

    ws.onmessage = (event) => {
      try {
        this.onMessage(JSON.parse(String(event.data)) as MpStreamMessage)
      } catch (err) {
        console.error('WebSocket message error', err)
      }
    }

    ws.onopen = () => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
      this.onConnectionChange(true)
      this.sendServerSelection()
    }

    ws.onerror = () => {
      this.onConnectionChange(false)
    }

    ws.onclose = () => {
      if (this.closedByUser) return
      this.onConnectionChange(false)
      this.socket = null
      this.scheduleReconnect()
    }
  }
}
