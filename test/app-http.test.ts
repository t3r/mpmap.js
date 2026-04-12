import assert from 'node:assert/strict'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createRequire } from 'node:module'

import type { Application } from 'express'
import request from 'supertest'

/** Tests run with cwd = repo root (`npm test`). */
const require = createRequire(join(process.cwd(), 'package.json'))

function resolveDist(rel: string): string {
  return require.resolve(join(process.cwd(), rel))
}

describe('HTTP app', () => {
  let app: Application
  let prevObs: string | undefined

  before(() => {
    prevObs = process.env.MPMAP_EXPOSE_OBS
    delete process.env.MPMAP_EXPOSE_OBS
    delete require.cache[resolveDist('dist/app')]
    delete require.cache[resolveDist('dist/routes/api/index')]
    delete require.cache[resolveDist('dist/routes/api/mpserver-policy')]
    app = require(join(process.cwd(), 'dist/app')).default as Application
  })

  after(() => {
    if (prevObs === undefined) delete process.env.MPMAP_EXPOSE_OBS
    else process.env.MPMAP_EXPOSE_OBS = prevObs
  })

  it('GET / returns 200 HTML', async () => {
    const res = await request(app).get('/').expect(200)
    assert.ok(/html/i.test(res.headers['content-type'] || ''))
    assert.match(res.text, /mpmap|flightgear|leaflet/i)
    assert.ok(
      /\/vite\/assets\/main-[^"']+\.js/.test(res.text),
      'home page should reference the Vite bundle (run npm run build if missing)'
    )
  })

  it('GET /api/obs returns 404 when not enabled', async () => {
    await request(app).get('/api/obs').expect(404)
  })

  it('GET /api/stat/:server rejects forbidden host', async () => {
    const res = await request(app).get('/api/stat/evil.com/5001').expect(403)
    assert.ok(res.body && res.body.error)
  })

  it('GET /api/stat/:server rejects forbidden port', async () => {
    const res = await request(app).get('/api/stat/mpserver01.flightgear.org/80').expect(403)
    assert.ok(res.body && res.body.error)
  })

  it('GET /api/stat/:server rejects IP literal host', async () => {
    await request(app).get('/api/stat/127.0.0.1/5001').expect(403)
  })

  it('GET unknown path returns 404', async () => {
    await request(app).get('/no-such-route-xyz').expect(404)
  })
})

describe('HTTP app MPMAP_EXPOSE_OBS', () => {
  it('GET /api/obs returns JSON when MPMAP_EXPOSE_OBS=1', async () => {
    process.env.MPMAP_EXPOSE_OBS = '1'
    delete require.cache[resolveDist('dist/app')]
    delete require.cache[resolveDist('dist/routes/api/index')]
    const appObs = require(join(process.cwd(), 'dist/app')).default as Application
    const res = await request(appObs).get('/api/obs').expect(200)
    assert.equal(typeof res.body, 'object')
    delete process.env.MPMAP_EXPOSE_OBS
    delete require.cache[resolveDist('dist/app')]
    delete require.cache[resolveDist('dist/routes/api/index')]
  })
})
