/*
This is mpmap.js - a nodejs based multiplayer map for flightgear
Copyright (C) 2017 - Torsten Dreyer torsten _at_ t3r.de

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

import dotenv from 'dotenv'
import type { Server } from 'http'
import type { AddressInfo } from 'net'
import type { Instance as ExpressWsInstance } from 'express-ws'
import type { WebSocketServer } from 'ws'
import app from './app'

dotenv.config()

const port = process.env.app_port || process.env.PORT || '8080'
app.set('port', port)

const server: Server = app.listen(port, () => {
  const addr = server.address()
  const inUse = addr && typeof addr === 'object' ? (addr as AddressInfo).port : port
  console.log('Running as', process.env.node_env, 'port', inUse)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port', port, 'is already in use')
  } else {
    console.error('HTTP server error:', err.message)
  }
  process.exit(1)
})

const SHUTDOWN_MS = Number(process.env.MPMAP_SHUTDOWN_MS) || 10000
let shuttingDown = false

function shutdown(signal: string): void {
  if (shuttingDown) return
  shuttingDown = true
  console.log('Received', signal + ', closing HTTP server')
  const timer = setTimeout(() => {
    console.error('Shutdown timed out after', SHUTDOWN_MS, 'ms')
    process.exit(1)
  }, SHUTDOWN_MS)

  const expressWsInst = app.get('expressWs') as ExpressWsInstance | undefined
  if (expressWsInst && typeof expressWsInst.getWss === 'function') {
    try {
      const wss = expressWsInst.getWss() as WebSocketServer | undefined
      if (wss?.clients && typeof wss.clients.forEach === 'function') {
        wss.clients.forEach((ws) => {
          try {
            ws.terminate()
          } catch {
            /* ignore */
          }
        })
      }
    } catch {
      /* ignore */
    }
  }

  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections()
  }

  server.close(() => {
    clearTimeout(timer)
    process.exit(0)
  })
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM')
})

process.on('SIGINT', () => {
  shutdown('SIGINT')
})

