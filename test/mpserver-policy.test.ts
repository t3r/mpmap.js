import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  assertAllowedMpserverTarget,
  ForbiddenMpserverError,
  isAllowedMpserverHost,
  isAllowedMpserverPort,
  mpserverPortBounds,
  normalizeMpserverHost,
  statusCacheKey,
} from '../routes/api/mpserver-policy'

describe('mpserver-policy', () => {
  describe('normalizeMpserverHost', () => {
    it('trims, lowercases, strips trailing dot', () => {
      assert.equal(normalizeMpserverHost('  MPSERVER01.FlightGear.ORG. '), 'mpserver01.flightgear.org')
    })
    it('returns null for empty or non-string', () => {
      assert.equal(normalizeMpserverHost(''), null)
      assert.equal(normalizeMpserverHost('   '), null)
      assert.equal(normalizeMpserverHost(null), null)
      assert.equal(normalizeMpserverHost(undefined), null)
      assert.equal(normalizeMpserverHost(123), null)
    })
  })

  describe('isAllowedMpserverHost', () => {
    const base = {} as NodeJS.ProcessEnv

    it('allows flightgear.org and subdomains by default', () => {
      assert.equal(isAllowedMpserverHost('flightgear.org', base), true)
      assert.equal(isAllowedMpserverHost('mpserver01.flightgear.org', base), true)
    })

    it('rejects IPs', () => {
      assert.equal(isAllowedMpserverHost('127.0.0.1', base), false)
      assert.equal(isAllowedMpserverHost('::1', base), false)
    })

    it('rejects other domains', () => {
      assert.equal(isAllowedMpserverHost('evil.com', base), false)
    })

    it('respects MPMAP_MPSERVER_HOST_SUFFIXES', () => {
      const env = { MPMAP_MPSERVER_HOST_SUFFIXES: 'example.net,other.org' } as NodeJS.ProcessEnv
      assert.equal(isAllowedMpserverHost('a.example.net', env), true)
      assert.equal(isAllowedMpserverHost('example.net', env), true)
      assert.equal(isAllowedMpserverHost('mpserver01.flightgear.org', env), false)
    })

    it('allows any host when MPMAP_ALLOW_ANY_MPSERVER=1', () => {
      const env = { MPMAP_ALLOW_ANY_MPSERVER: '1' } as NodeJS.ProcessEnv
      assert.equal(isAllowedMpserverHost('evil.com', env), true)
      assert.equal(isAllowedMpserverHost('10.0.0.1', env), true)
    })

    it('rejects control chars and double dots', () => {
      assert.equal(isAllowedMpserverHost('a\nb.flightgear.org', base), false)
      assert.equal(isAllowedMpserverHost('a..b.flightgear.org', base), false)
      assert.equal(isAllowedMpserverHost('.flightgear.org', base), false)
    })
  })

  describe('isAllowedMpserverPort', () => {
    it('allows default MP port range', () => {
      assert.equal(isAllowedMpserverPort(5001, {}), true)
      assert.equal(isAllowedMpserverPort(5999, {}), true)
      assert.equal(isAllowedMpserverPort(5000, {}), true)
    })
    it('rejects outside default range', () => {
      assert.equal(isAllowedMpserverPort(4999, {}), false)
      assert.equal(isAllowedMpserverPort(6000, {}), false)
    })
    it('respects MPMAP_MPSERVER_MIN_PORT / MAX_PORT', () => {
      const env = { MPMAP_MPSERVER_MIN_PORT: '4000', MPMAP_MPSERVER_MAX_PORT: '4100' } as NodeJS.ProcessEnv
      assert.equal(isAllowedMpserverPort(4050, env), true)
      assert.equal(isAllowedMpserverPort(3999, env), false)
    })
    it('rejects non-integers and out of TCP range', () => {
      assert.equal(isAllowedMpserverPort(NaN, {}), false)
      assert.equal(isAllowedMpserverPort(5001.5, {}), false)
      assert.equal(isAllowedMpserverPort(0, {}), false)
      assert.equal(isAllowedMpserverPort(70000, {}), false)
    })
    it('allows any port when MPMAP_ALLOW_ANY_MPSERVER=1', () => {
      const env = { MPMAP_ALLOW_ANY_MPSERVER: '1' } as NodeJS.ProcessEnv
      assert.equal(isAllowedMpserverPort(80, env), true)
    })
  })

  describe('mpserverPortBounds', () => {
    it('returns defaults', () => {
      assert.deepEqual(mpserverPortBounds({}), { min: 5000, max: 5999 })
    })
  })

  describe('assertAllowedMpserverTarget', () => {
    it('throws 403 for bad host', () => {
      assert.throws(
        () => assertAllowedMpserverTarget('bad.example', 5001, {}),
        (e: unknown) =>
          e instanceof ForbiddenMpserverError && e.statusCode === 403 && /host/.test(e.message)
      )
    })
    it('throws 403 for bad port', () => {
      assert.throws(
        () => assertAllowedMpserverTarget('mpserver01.flightgear.org', 80, {}),
        (e: unknown) =>
          e instanceof ForbiddenMpserverError && e.statusCode === 403 && /port/.test(e.message)
      )
    })
    it('does not throw for allowed target', () => {
      assert.doesNotThrow(() => {
        assertAllowedMpserverTarget('mpserver01.flightgear.org', 5001, {})
      })
    })
  })

  describe('statusCacheKey', () => {
    it('separates server and port', () => {
      assert.equal(statusCacheKey('a', 5001), 'a\0' + '5001')
      assert.notEqual(statusCacheKey('ab', 5001), statusCacheKey('a', 5001))
    })
  })
})
