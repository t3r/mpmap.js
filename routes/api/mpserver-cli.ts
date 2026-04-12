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

import * as math3d from 'math3d'
import net from 'net'

function fromLonLatRad(lon: number, lat: number) {
  const zd2 = 0.5 * lon
  const yd2 = -0.25 * Math.PI - 0.5 * lat
  const Szd2 = Math.sin(zd2)
  const Syd2 = Math.sin(yd2)
  const Czd2 = Math.cos(zd2)
  const Cyd2 = Math.cos(yd2)
  const w = Czd2 * Cyd2
  const x = -Szd2 * Syd2
  const y = Czd2 * Syd2
  const z = Szd2 * Cyd2
  return new math3d.Quaternion(x, y, z, w)
}

export interface MPServerClientGeod {
  lat: number
  lng: number
  alt: number
}

export interface MPServerClientOriA {
  x: number
  y: number
  z: number
}

export class MPServerClient {
  callsign = ''
  host = ''
  geod: MPServerClientGeod = {
    lat: 0,
    lng: 0,
    alt: 0,
  }
  pos: [number, number, number] = [0, 0, 0]
  ori: [number, number, number] = [0, 0, 0]
  oriQ?: [number, number, number]
  oriA: MPServerClientOriA = { x: 0, y: 0, z: 0 }
  modelPath = ''
  model = ''

  constructor(line: string) {
    this.parse(line)
  }

  parse(line: string): void {
    const p = line.split(':')
    if (p.length !== 2) return

    const head = p[0].trim().split('@')
    if (head.length !== 2) return

    this.callsign = head[0]
    this.host = head[1]

    const fields = p[1].trim().split(' ')
    if (fields.length < 10) return

    this.geod.lat = Number(fields[3])
    this.geod.lng = Number(fields[4])
    this.geod.alt = Number(fields[5])
    this.pos = [Number(fields[0]), Number(fields[1]), Number(fields[2])]
    this.oriQ = [Number(fields[6]), Number(fields[7]), Number(fields[8])]
    this.modelPath = fields[9] || ''
    this.model = this.modelPath.split('/').pop()?.split('.')[0] || ''

    const angleAxis = new math3d.Vector3(this.oriQ[0], this.oriQ[1], this.oriQ[2])
    const mag = angleAxis.magnitude
    if (!isFinite(mag) || mag < 1e-12) {
      this.oriA = { x: 0, y: 0, z: 0 }
      return
    }
    const ecOrient = math3d.Quaternion.AngleAxis(angleAxis, (mag * 180) / Math.PI)
    const qEc2Hl = fromLonLatRad((this.geod.lng * Math.PI) / 180, (this.geod.lat * Math.PI) / 180)
    this.oriA = qEc2Hl.conjugate().mul(ecOrient).eulerAngles
  }
}

const CONNECT_TIMEOUT_MS = 15000
const SESSION_TIMEOUT_MS = 120000

export interface MPServerStatusPayload {
  server: string
  port: number
  clients: MPServerClient[]
}

function MPServerStatus(server: string, port: number | string): Promise<MPServerStatusPayload> {
  const p = Number(port) || 5001

  return new Promise((resolve, reject) => {
    const data: MPServerStatusPayload = {
      server,
      port: p,
      clients: [],
    }
    const client = new net.Socket()
    let settled = false
    let sessionTimer: ReturnType<typeof setTimeout> | null = null

    function settle(err: Error | null, val?: MPServerStatusPayload): void {
      if (settled) return
      settled = true
      clearTimeout(connectTimer)
      if (sessionTimer) clearTimeout(sessionTimer)
      client.removeAllListeners()
      if (err) reject(err)
      else resolve(val as MPServerStatusPayload)
    }

    const connectTimer = setTimeout(() => {
      settle(new Error('connect timeout'))
      client.destroy()
    }, CONNECT_TIMEOUT_MS)

    client.connect(p, server, () => {
      clearTimeout(connectTimer)
      sessionTimer = setTimeout(() => {
        settle(new Error('session timeout'))
        client.destroy()
      }, SESSION_TIMEOUT_MS)
    })

    function handleLine(line: string): void {
      if (!line || line.startsWith('#')) return
      const res = new MPServerClient(line)
      if (!res.callsign) return
      data.clients.push(res)
    }

    let linebuffer = ''
    client.on('data', (chunk) => {
      linebuffer += chunk.toString()
      if (linebuffer.indexOf('\n') !== -1) {
        const lines = linebuffer.split('\n')
        linebuffer = lines.pop() ?? ''
        lines.forEach(handleLine)
      }
    })

    client.on('close', () => {
      handleLine(linebuffer)
      if (!settled) settle(null, data)
    })
    client.on('error', (err) => {
      settle(err)
    })
  })
}

export function parseMpServerClientFromLine(line: string): MPServerClient {
  return new MPServerClient(line)
}

const MpServerStatusExport = Object.assign(MPServerStatus, { parseMpServerClientFromLine })
export default MpServerStatusExport
