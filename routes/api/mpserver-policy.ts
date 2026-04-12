/*
This is mpmap.js - a nodejs based multiplayer map for flightgear
Copyright (C) 2017 - Torsten Dreyer torsten _at_ t3r.de

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.
*/

import net from 'net'

export function normalizeMpserverHost(host: unknown): string | null {
  if (host == null || typeof host !== 'string') return null
  const t = host.trim().replace(/\.$/, '').toLowerCase()
  return t.length ? t : null
}

export function isAllowedMpserverHost(host: unknown, env?: NodeJS.ProcessEnv): boolean {
  const e = env || process.env
  const h = normalizeMpserverHost(host)
  if (!h) return false
  if (e.MPMAP_ALLOW_ANY_MPSERVER === '1') return true
  if (h.length > 253 || /[\s\u0000-\u001f]/.test(h)) return false
  if (h.includes('..') || h.startsWith('.')) return false
  if (net.isIP(h)) return false
  const suffixes = (e.MPMAP_MPSERVER_HOST_SUFFIXES || 'flightgear.org')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return suffixes.some((suf) => h === suf || h.endsWith('.' + suf))
}

export function mpserverPortBounds(env?: NodeJS.ProcessEnv): { min: number; max: number } {
  const e = env || process.env
  return {
    min: Number(e.MPMAP_MPSERVER_MIN_PORT) || 5000,
    max: Number(e.MPMAP_MPSERVER_MAX_PORT) || 5999,
  }
}

export function isAllowedMpserverPort(port: unknown, env?: NodeJS.ProcessEnv): boolean {
  const e = env || process.env
  const p = Number(port)
  if (!Number.isFinite(p) || p < 1 || p > 65535 || p !== Math.floor(p)) return false
  if (e.MPMAP_ALLOW_ANY_MPSERVER === '1') return true
  const b = mpserverPortBounds(e)
  return p >= b.min && p <= b.max
}

export class ForbiddenMpserverError extends Error {
  statusCode = 403 as const
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenMpserverError'
  }
}

export function assertAllowedMpserverTarget(
  server: unknown,
  port: unknown,
  env?: NodeJS.ProcessEnv
): void {
  if (!isAllowedMpserverHost(server, env)) {
    throw new ForbiddenMpserverError('forbidden mpserver host')
  }
  if (!isAllowedMpserverPort(port, env)) {
    throw new ForbiddenMpserverError('forbidden mpserver port')
  }
}

export function statusCacheKey(server: string, port: number | string): string {
  return server + '\0' + String(port)
}
