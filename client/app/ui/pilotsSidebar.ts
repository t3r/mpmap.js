import type { Map as LeafletMap } from 'leaflet'

import type { MpServerClient } from '../types/messages'

/**
 * Keeps the Bootstrap list-group in sync with MP clients: stable DOM updates, click-to-fly.
 * Uses incremental replace so list items do not flicker when only position/title changes.
 */
export class PilotsSidebar {
  constructor(
    private readonly map: LeafletMap,
    private readonly listEl: HTMLUListElement,
    private readonly countBadge: HTMLElement,
    private readonly aboutCountEl: HTMLElement
  ) {}

  setObserverCount(n: number): void {
    this.aboutCountEl.textContent = String(n)
  }

  /** Empty the list and counts (e.g. WebSocket disconnected). */
  clear(): void {
    this.listEl.replaceChildren()
    this.countBadge.textContent = '0'
    this.aboutCountEl.textContent = '0'
  }

  updateFromClients(clients: MpServerClient[] | undefined): void {
    const data = (clients ?? []).slice().sort((a, b) => (a.callsign || '').localeCompare(b.callsign || ''))
    this.countBadge.textContent = String(data.length)

    this.listEl.querySelectorAll<HTMLLIElement>('li[data-callsign]').forEach((li) => {
      const cs = li.dataset.callsign
      if (!cs || !data.some((p) => p.callsign === cs)) li.remove()
    })

    for (const pilot of data) {
      const title = this.buildTitle(pilot)
      const li = this.buildListItem(pilot, title)
      const cs = pilot.callsign || ''
      const existing =
        cs === ''
          ? null
          : this.listEl.querySelector<HTMLLIElement>(`li[data-callsign="${CSS.escape(cs)}"]`)
      if (existing) existing.replaceWith(li)
      else this.listEl.appendChild(li)
    }

    const sorted = Array.from(this.listEl.querySelectorAll<HTMLLIElement>('li[data-callsign]')).sort((a, b) =>
      (a.dataset.callsign || '').localeCompare(b.dataset.callsign || '')
    )
    sorted.forEach((el) => this.listEl.appendChild(el))
  }

  private buildTitle(pilot: MpServerClient): string {
    const oriZ = pilot.oriA?.z != null ? Number(pilot.oriA.z) : 0
    const altFt = pilot.geod?.alt != null ? Number(pilot.geod.alt) : 0
    const h = Number.isNaN(oriZ) ? 0 : oriZ
    const a = Number.isNaN(altFt) ? 0 : altFt
    return `${h.toFixed(0)}° ${a.toFixed(0)}ft`
  }

  private buildListItem(pilot: MpServerClient, title: string): HTMLLIElement {
    const li = document.createElement('li')
    li.className = 'list-group-item'
    if (pilot.callsign) li.dataset.callsign = pilot.callsign
    li.title = title

    const cs = document.createElement('span')
    cs.textContent = pilot.callsign || ''
    const model = document.createElement('span')
    model.textContent = pilot.model || ''
    li.append(cs, model)

    li.addEventListener('click', () => {
      const lat = Number(pilot.geod?.lat) || 0
      const lng = Number(pilot.geod?.lng ?? pilot.geod?.lon) || 0
      this.map.flyTo([lat, lng], 12, { animate: true })
    })

    return li
  }
}
