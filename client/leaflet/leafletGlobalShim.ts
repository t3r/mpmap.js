/**
 * `leaflet.markercluster`, `leaflet-ant-path`, and similar packages ship as UMD/IIFE and expect
 * `window.L`. Under Vite’s ESM bundling, Leaflet is not attached to `window` automatically.
 *
 * Import this module **before** any of those plugins so evaluation order is: Leaflet → `L` on `window` → plugin.
 */
import L from 'leaflet'

window.L = L
