import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseMpServerClientFromLine } from '../routes/api/mpserver-cli'

describe('mpserver-cli parseMpServerClientFromLine', () => {
  const parse = parseMpServerClientFromLine

  it('parses a well-formed status line', () => {
    const line =
      'P1@LOCAL: 1 2 3 48.5 11.2 1500 0.01 0.02 0.03 Aircraft/777/Models/777.xml'
    const c = parse(line)
    assert.equal(c.callsign, 'P1')
    assert.equal(c.host, 'LOCAL')
    assert.equal(c.geod.lat, 48.5)
    assert.equal(c.geod.lng, 11.2)
    assert.equal(c.geod.alt, 1500)
    assert.equal(c.model, '777')
    assert.ok(Array.isArray(c.pos))
    assert.ok(c.oriA)
  })

  it('sets zero euler angles when orientation magnitude is near zero', () => {
    const line = 'Z@LOCAL: 1 2 3 0 0 0 0 0 0 Models/foo.xml'
    const c = parse(line)
    assert.equal(c.callsign, 'Z')
    assert.deepEqual(c.oriA, { x: 0, y: 0, z: 0 })
  })

  it('ignores malformed lines (no colon)', () => {
    const c = parse('nocolon')
    assert.equal(c.callsign, '')
  })

  it('ignores lines without @', () => {
    const c = parse('foo: 1 2 3 4 5 6 7 8 9 10')
    assert.equal(c.callsign, '')
  })

  it('does not fill geod when colon segment has too few fields', () => {
    const c = parse('A@LOCAL: 1 2 3 4 5')
    assert.equal(c.callsign, 'A')
    assert.equal(c.host, 'LOCAL')
    assert.equal(c.geod.lat, 0)
  })
})
