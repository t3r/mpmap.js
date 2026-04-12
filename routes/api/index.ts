/*
This is mpmap.js - a nodejs based multiplayer map for flightgear
Copyright (C) 2017 - Torsten Dreyer torsten _at_ t3r.de

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

import dns from 'dns'
import { Router, type Request, type Response } from 'express'
import type { Instance as ExpressWsInstance } from 'express-ws'
import NodeCache from 'node-cache'
import util from 'util'
import type { RawData, WebSocket } from 'ws'
import MpServerCli from './mpserver-cli'
import type { MPServerStatusPayload } from './mpserver-cli'
import {
  assertAllowedMpserverTarget,
  ForbiddenMpserverError,
  isAllowedMpserverHost,
  statusCacheKey,
} from './mpserver-policy'

const dnsResolve = util.promisify(dns.resolve) as (
  hostname: string,
  rrtype: 'A' | 'AAAA' | 'SRV' | 'TXT'
) => Promise<string[] | dns.SrvRecord[] | string[][]>

const StatusCache = new NodeCache({
  stdTTL: 5,
  checkperiod: 1,
  useClones: false,
  errorOnMissing: false,
})

const wsVerboseLog =
  process.env.node_env === 'development' || process.env.MPMAP_DEBUG_WS === '1'

function wsDebug(...args: unknown[]): void {
  if (wsVerboseLog) console.log(...args)
}

type DnsTxtResolve = { entries: string[][]; rqname: string; rqtype: 'TXT' }
type DnsSrvResolve = { entries: dns.SrvRecord[]; rqname: string; rqtype: 'SRV' }

async function getCachedStatus(server: string, port: number | string): Promise<MPServerStatusPayload> {
  const p = Number(port) || 5001
  assertAllowedMpserverTarget(server, p)
  const key = statusCacheKey(server, p)
  let mpserver = StatusCache.get<MPServerStatusPayload>(key)
  if (mpserver === undefined) {
    mpserver = await MpServerCli(server, p)
    StatusCache.set(key, mpserver)
  }
  return mpserver
}

async function resolveDns(name: string, type: 'SRV'): Promise<DnsSrvResolve>
async function resolveDns(name: string, type: 'TXT'): Promise<DnsTxtResolve>
async function resolveDns(name: string, type: 'SRV' | 'TXT'): Promise<DnsSrvResolve | DnsTxtResolve> {
  const response = await dnsResolve(name, type)
  return { entries: (response || []) as never, rqname: name, rqtype: type }
}

const router = Router()

router.route('/stat/').get(async (_req, res) => {
  const dnsname = '_fgms._udp.flightgear.org'
  let srvData: DnsSrvResolve
  try {
    srvData = await resolveDns(dnsname, 'SRV')
  } catch (err) {
    console.error('DNS lookup error, using only mpserver01', err)
    srvData = {
      entries: [
        {
          port: 5000,
          name: 'mpserver01.flightgear.org.',
        } as dns.SrvRecord,
      ],
      rqname: dnsname,
      rqtype: 'SRV',
    }
  }
  const prms: Promise<DnsTxtResolve>[] = []
  const srvRecords: Record<string, dns.SrvRecord> = {}
  srvData.entries.forEach((e) => {
    if (e.port <= 0) return
    srvRecords[e.name] = e
    prms.push(resolveDns(e.name, 'TXT'))
  })

  const txtData = await Promise.all(prms)

  const response: Record<
    string,
    {
      dn: string
      location: unknown
      port: number
    }
  > = {}
  txtData.forEach((e) => {
    if (e.rqtype !== 'TXT' || !Array.isArray(e.entries) || e.entries.length === 0) return
    const first = e.entries[0]
    const entry = Array.isArray(first) ? first[0] : first
    if (entry == null || typeof entry !== 'string') return
    if (!entry.startsWith('flightgear-mpserver=')) return

    const b = Buffer.from(entry.substring(20), 'base64')
    let data: { name?: string; location?: unknown }
    try {
      data = JSON.parse(b.toString()) as { name?: string; location?: unknown }
    } catch {
      console.error('invalid json', e)
      return
    }
    if (!data || typeof data.name !== 'string' || !srvRecords[e.rqname]) return
    response[data.name] = {
      dn: e.rqname,
      location: data.location,
      port: srvRecords[e.rqname].port,
    }
  })
  return res.json(response)
})

async function statServerGet(req: Request, res: Response): Promise<void> {
  const port = Number(req.params.port) || 5001

  try {
    const data = await getCachedStatus(req.params.server as string, port)
    res.json(data)
    return
  } catch (err: unknown) {
    if (err instanceof ForbiddenMpserverError) {
      res.status(403).json({ error: err.message })
      return
    }
    const sc =
      err && typeof err === 'object' && 'statusCode' in err
        ? Number((err as { statusCode?: unknown }).statusCode)
        : NaN
    const code = Number.isFinite(sc) && sc >= 400 && sc < 600 ? sc : 500
    const message = err instanceof Error ? err.message : 'error'
    res.status(code).json({ error: message })
  }
}

router.get('/stat/:server/:port', statServerGet)
router.get('/stat/:server', statServerGet)

type PeerSocket = {
  remoteAddress?: string
  _peername?: unknown
}

function wsPeer(ws: WebSocket): PeerSocket | undefined {
  const s = ws as WebSocket & { _socket?: PeerSocket }
  return s._socket
}

class ServerObserver {
  observers: Record<string, WebSocket[]> = {}

  constructor() {
    this.loop()
  }

  loop = async (): Promise<void> => {
    for (const srv of Object.keys(this.observers)) {
      let data: MPServerStatusPayload
      try {
        data = await getCachedStatus(srv, 5001)
      } catch (err) {
        console.error("Can't get cached status for ", srv, err)
        this.observers[srv]?.forEach((ws) => {
          ws.close()
        })
        delete this.observers[srv]
        continue
      }

      const toSend = JSON.stringify({
        data,
        nrOfClients: this.getNrOfClients(),
      })

      ;(this.observers[srv] || []).forEach((ws) => {
        try {
          wsDebug(srv, 'sending to', wsPeer(ws)?._peername)
          ws.send(toSend)
        } catch (ex) {
          console.error('error sending', ex)
          this.unsubscribe(ws)
        }
      })
    }

    const next = setTimeout((self: ServerObserver) => {
      void self.loop()
    }, 10000, this)
    if (typeof next.unref === 'function') next.unref()
  }

  getNrOfClients(): number {
    let reply = 0
    for (const server of Object.keys(this.observers)) {
      reply += this.observers[server].length
    }
    return reply
  }

  subscribe = async (server: string, ws: WebSocket | null): Promise<void> => {
    this.unsubscribe(ws)

    if (!ws) return
    if (typeof server !== 'string' || server.length > 253 || !isAllowedMpserverHost(server)) return

    ;(this.observers[server] = this.observers[server] || []).push(ws)
    wsDebug('subscribed to', server, wsPeer(ws)?.remoteAddress)
    try {
      const data = await getCachedStatus(server, 5001)
      try {
        ws.send(
          JSON.stringify({
            data,
            nrOfClients: this.getNrOfClients(),
          })
        )
      } catch (ex) {
        console.error('error sending', ex)
        this.unsubscribe(ws)
      }
    } catch (ex) {
      console.error(ex)
      this.unsubscribe(ws)
    }
  }

  unsubscribe(ws: WebSocket | null): void {
    if (!(ws && wsPeer(ws))) return
    wsDebug('unsubscribe', wsPeer(ws)?.remoteAddress)
    for (const s of Object.keys(this.observers)) {
      const idx = this.observers[s].indexOf(ws)
      wsDebug('found at', s, 'with index', idx)
      if (idx === -1) continue
      this.observers[s].splice(idx, 1)
      if (this.observers[s].length === 0) {
        delete this.observers[s]
      }
    }
  }

  json(): Record<string, { host: unknown }[]> {
    const r: Record<string, { host: unknown }[]> = {}
    for (const s of Object.keys(this.observers)) {
      const a: { host: unknown }[] = []
      r[s] = a
      this.observers[s].forEach((ws) => {
        a.push({
          host: (ws as WebSocket & { _socket?: { _peername?: unknown } })._socket?._peername,
        })
      })
    }
    return r
  }
}

const serverObserver = new ServerObserver()

function attachApiWebSockets(expressWs: ExpressWsInstance): void {
  expressWs.applyTo(router)
  router.ws('/stream', (ws, _req) => {
    ws.on('message', (msg: RawData) => {
      wsDebug('ws msg from', wsPeer(ws)?._peername, String(msg))
      let options: { server?: string } | null = null
      try {
        options = JSON.parse(String(msg)) as { server?: string }
      } catch {
        return
      }
      if (options && typeof options.server === 'string' && options.server.length <= 253) {
        void serverObserver.subscribe(options.server, ws)
      }
    })

    ws.on('error', (msg) => {
      console.error('error receiving', msg)
      serverObserver.unsubscribe(ws)
    })
    ws.on('close', (code: number) => {
      wsDebug('ws closed', code, wsPeer(ws)?._peername)
      serverObserver.unsubscribe(ws)
    })
  })
}

router.route('/obs').get((_req, res) => {
  if (process.env.MPMAP_EXPOSE_OBS !== '1') {
    return res.status(404).json({ error: 'Not found' })
  }
  return res.json(serverObserver.json())
})

const apiRouter = router as typeof router & { registerWebSocket: typeof attachApiWebSockets }
apiRouter.registerWebSocket = attachApiWebSockets

export default apiRouter
