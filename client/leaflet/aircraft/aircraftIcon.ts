import L from 'leaflet'

import { escapeHtml } from '../../app/utils/escapeHtml'
import { resolveModelIconClass } from './modelIconMap'
import type { AircraftIconState } from './types'

/** Prefer `lng`; some payloads use `lon` only. */
function lngFromPosition(primary: unknown, lon: unknown): number {
  if (primary === undefined || primary === null || primary === '') return Number(lon) || 0
  const n = Number(primary)
  return Number.isNaN(n) ? Number(lon) || 0 : n
}

export { lngFromPosition }

const AircraftDivIconImpl = L.DivIcon.extend({
  options: {
    className: 'fg-aircraft-marker',
    iconSize: [40, 40] as L.PointExpression,
    iconAnchor: [20, 20] as L.PointExpression,
  },

  initialize: function (this: L.DivIcon, options: AircraftIconState, vanished?: boolean) {
    const modelIcon = resolveModelIconClass(options.model)
    const rotating = modelIcon === 'atc2'
    ;(L.DivIcon.prototype as unknown as { initialize(this: L.DivIcon, o?: L.DivIconOptions): void }).initialize.call(
      this,
      options as unknown as L.DivIconOptions
    )
    L.Util.setOptions(this, {
      html: L.Util.template(
        '<div class="fg-aircraft-symbol-wrap">' +
          '<div class="acicon acicon-{icon} {expired} {rotating}" style="--ac-heading: {heading}deg;"></div>' +
          '</div>' +
          '<div class="fg-aircraft-label {expired}">' +
          '<div><span>{callsign}</span>&nbsp;<span>{model}</span></div>' +
          '<div><span>F{level}</span>&nbsp;<span>{kts}KT</span></div>' +
          '<div style="clear: both"></div></div>',
        {
          callsign: escapeHtml(options.callsign),
          model: escapeHtml(options.model),
          level: Math.round(options.position.alt / 100)
            .toString()
            .padStart(3, '0'),
          kts: Math.round((options.speed * 3600) / 1852),
          heading: options.heading.toFixed(0),
          expired: vanished ? 'fg-expired-ac' : '',
          rotating: rotating ? 'rotating' : '',
          icon: modelIcon,
        }
      ),
    })
  },
})

export function createAircraftIcon(options: AircraftIconState, vanished?: boolean): L.DivIcon {
  return new (AircraftDivIconImpl as unknown as new (o: AircraftIconState, v?: boolean) => L.DivIcon)(
    options,
    vanished
  )
}
