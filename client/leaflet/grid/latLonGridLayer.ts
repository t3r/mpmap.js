/**
 * Lat/lon grid overlay as a Leaflet layer group.
 * Redraws on `viewreset` plus an extra event name from options (`move` or `moveend` by default).
 *
 * Leaflet's `Class.extend` prototype pattern is not modeled well by TypeScript; `this` is treated
 * as `any` inside the literal to avoid fighting the type checker while keeping the public API typed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Leaflet.Class.extend legacy pattern */

import L from 'leaflet'

const LatLonGridLayer = L.LayerGroup.extend({
  options: {
    xticks: 8,
    yticks: 5,
    coordStyle: 'MinDec',
    coordTemplates: {
      MinDec: '{degAbs}&deg;&nbsp;{minDec}\'{dir}',
      DMS: '{degAbs}{dir}{min}\'{sec}"',
    },
    lineStyle: {
      stroke: true,
      color: '#111',
      opacity: 0.6,
      weight: 1,
    },
    redraw: 'move',
  },

  initialize: function (this: any, options?: Partial<any>) {
    ;(L.LayerGroup.prototype as unknown as { initialize(this: L.LayerGroup, options?: L.LayerOptions): void }).initialize.call(this)
    L.Util.setOptions(this, options)
  },

  onAdd: function (this: any, map: L.Map) {
    this._map = map
    this.redraw()
    this._boundRedraw = () => {
      this.redraw()
    }
    this._map.on(`viewreset ${this.options.redraw}`, this._boundRedraw)
    this.eachLayer(map.addLayer, map)
  },

  onRemove: function (this: any, map: L.Map) {
    if (this._boundRedraw) {
      map.off(`viewreset ${this.options.redraw}`, this._boundRedraw)
    }
    this.eachLayer(this.removeLayer, this)
  },

  redraw: function (this: any) {
    this._bounds = this._map.getBounds().pad(0.5)
    const pieces: L.Layer[] = []

    const latLines = this._latLines()
    for (const i in latLines) {
      if (Math.abs(latLines[i]) > 90) continue
      pieces.push(this._horizontalLine(latLines[i]))
      pieces.push(this._label('lat', latLines[i]))
    }

    const lngLines = this._lngLines()
    for (const i in lngLines) {
      pieces.push(this._verticalLine(lngLines[i]))
      pieces.push(this._label('lng', lngLines[i]))
    }

    this.eachLayer(this.removeLayer, this)
    for (const i in pieces) {
      this.addLayer(pieces[i])
    }
    return this
  },

  _latLines: function (this: any) {
    return this._lines(
      this._bounds.getSouth(),
      this._bounds.getNorth(),
      this.options.yticks * 2,
      this._containsEquator()
    )
  },

  _lngLines: function (this: any) {
    return this._lines(
      this._bounds.getWest(),
      this._bounds.getEast(),
      this.options.xticks * 2,
      this._containsIRM()
    )
  },

  _lines: function (this: any, low: number, high: number, ticks: number, containsZero: boolean) {
    const delta = low - high
    const tick = this._round(delta / ticks, delta)
    if (containsZero) {
      low = Math.floor(low / tick) * tick
    } else {
      low = this._snap(low, tick)
    }
    const lines: number[] = []
    for (let i = -1; i <= ticks; i++) {
      lines.push(low - i * tick)
    }
    return lines
  },

  _containsEquator: function (this: any) {
    const bounds = this._map.getBounds()
    return bounds.getSouth() < 0 && bounds.getNorth() > 0
  },

  _containsIRM: function (this: any) {
    const bounds = this._map.getBounds()
    return bounds.getWest() < 0 && bounds.getEast() > 0
  },

  _verticalLine: function (this: any, lng: number) {
    return new L.Polyline(
      [
        [this._bounds.getNorth(), lng],
        [this._bounds.getSouth(), lng],
      ],
      this.options.lineStyle
    )
  },

  _horizontalLine: function (this: any, lat: number) {
    return new L.Polyline(
      [
        [lat, this._bounds.getWest()],
        [lat, this._bounds.getEast()],
      ],
      this.options.lineStyle
    )
  },

  _snap: function (this: any, num: number, gridSize: number) {
    return Math.floor(num / gridSize) * gridSize
  },

  _round: function (this: any, num: number, delta: number) {
    delta = Math.abs(delta)
    let ret: number
    if (delta >= 1) {
      if (Math.abs(num) > 1) {
        ret = Math.round(num)
      } else {
        ret = num < 0 ? Math.floor(num) : Math.ceil(num)
      }
    } else {
      const dms = this._dec2dms(delta)
      if (dms.min >= 1) {
        ret = Math.ceil(dms.min) * 60
      } else {
        ret = Math.ceil(dms.minDec * 60)
      }
    }
    return ret
  },

  _label: function (this: any, axis: 'lat' | 'lng', num: number) {
    const bounds = this._map.getBounds().pad(-0.005)
    const latlng = axis === 'lng' ? L.latLng(bounds.getNorth(), num) : L.latLng(num, bounds.getWest())
    return L.marker(latlng, {
      icon: L.divIcon({
        iconSize: [0, 0],
        className: 'leaflet-grid-label',
        html: `<div class="${axis}">${this.formatCoord(num, axis)}</div>`,
      }),
    })
  },

  _dec2dms: function (this: any, num: number) {
    const deg = Math.floor(num)
    const min = (num - deg) * 60
    const sec = Math.floor((min - Math.floor(min)) * 60)
    return {
      deg,
      degAbs: Math.abs(deg),
      min: Math.floor(min),
      minDec: min,
      sec,
    }
  },

  formatCoord: function (this: any, num: number, axis: 'lat' | 'lng', style?: string) {
    if (!style) style = this.options.coordStyle
    if (style === 'decimal') {
      let digits: number
      if (num >= 10) digits = 2
      else if (num >= 1) digits = 3
      else digits = 4
      return num.toFixed(digits)
    }
    const dms = this._dec2dms(num)
    let dir: string
    if (dms.deg === 0) {
      dir = '&nbsp;'
    } else if (axis === 'lat') {
      dir = dms.deg > 0 ? 'N' : 'S'
    } else {
      dir = dms.deg > 0 ? 'E' : 'W'
    }
    const tpl =
      this.options.coordTemplates[style] ?? this.options.coordTemplates[this.options.coordStyle]
    if (!tpl) return String(num)
    return L.Util.template(
      tpl,
      L.Util.extend(dms, {
        dir,
        minDec: Math.round(Number(dms.minDec) * 100) / 100,
      })
    )
  },
})

/* eslint-enable @typescript-eslint/no-explicit-any */

export type GridLayerOptions = L.LayerOptions & {
  xticks?: number
  yticks?: number
  coordStyle?: string
  coordTemplates?: Record<string, string>
  lineStyle?: L.PolylineOptions
  redraw?: string
}

export function createLatLonGridLayer(options?: GridLayerOptions): L.LayerGroup {
  return new (LatLonGridLayer as unknown as new (o?: GridLayerOptions) => L.LayerGroup)(options)
}
