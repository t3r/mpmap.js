/**
 * Vite entry: vendor CSS, Font Awesome, Bootstrap bundle, then the map application.
 */
import './leaflet/leafletGlobalShim'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@fortawesome/fontawesome-free/css/all.min.css'

import '../static/acicons/icons.css'
import './styles/app-layout.css'
import './styles/grid-labels.css'

import 'leaflet.markercluster'
import 'leaflet-ant-path'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import { mountMapApp } from './app/mountMapApp'

function ready(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => fn(), { once: true })
  } else {
    fn()
  }
}

ready(() => {
  try {
    mountMapApp()
  } catch (e) {
    console.error('mpmap failed to start', e)
  }
})
