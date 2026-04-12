import type { Map as LeafletMap } from 'leaflet'

/** Sidebar uses CSS transforms; Leaflet must be told after the transition so tiles stay sharp. */
const INVALIDATE_DELAY_MS = 600

/**
 * Toggle `.active` on sidebar + collapse control (matches existing `static` CSS).
 * Invalidates map size after the CSS transition completes.
 */
export function wireSidebarToggle(map: LeafletMap): void {
  const btn = document.getElementById('sidebarCollapse')
  if (!btn) return
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sidebarActivation').forEach((el) => el.classList.toggle('active'))
    window.setTimeout(() => {
      map.invalidateSize(true)
    }, INVALIDATE_DELAY_MS)
  })
}
