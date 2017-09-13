$(function() {

  var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
  };

  var lat = Number(getUrlParameter('lat')) || 53.5,
      lng = Number(getUrlParameter('lng')) || 10,
      zoom = Number(getUrlParameter('zoom')) || 3,
      server = getUrlParameter('server') || 'mpserver51.flightgear.org',
      refresh = Number(getUrlParameter('refresh')) || 2;

  map = new L.Map('map', {
    fadeAnimation: true,
    zoomAnimation: true,
  });

  var baselayer = {
    "OpenStreetMap": new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 18,
        attribution: 'Map data &copy; <a target="_blank" href="http://openstreetmap.org">OpenStreetMap</a> contributors'
      }),
    "Carto Light": new L.TileLayer('http://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 18,
        attribution: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
      }),
    "Carto Dark": new L.TileLayer('http://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 18,
        attribution: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
      }),
    "Terrain": new L.TileLayer('http://c.tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 18,
        attribution: 'Map data &copy; <a target="_blank" href="http://openstreetmap.org">OpenStreetMap</a> contributors'
      }),
  }

  var overlays = {
    "OpenAIP":  new L.TileLayer("http://{s}.tile.maps.openaip.net/geowebcache/service/tms/1.0.0/openaip_basemap@EPSG%3A900913@png/{z}/{x}/{y}.png", {
                maxZoom: 14,
                minZoom: 5,
                tms: true,
                detectRetina: true,
                subdomains: '12',
                format: 'image/png',
                transparent: true
            }),

    "VFRMap.com Sectionals (US)" : new L.TileLayer('http://vfrmap.com/20140918/tiles/vfrc/{z}/{y}/{x}.jpg', {
                maxZoom : 12,
                minZoom : 3,
                attribution : '&copy; <a target="_blank" href="http://vfrmap.com">VFRMap.com</a>',
                tms : true,
                opacity : 0.5,
                bounds : L.latLngBounds(L.latLng(16.0, -179.0), L.latLng(72.0, -60.0)),
            }),

    "VFRMap.com - Low IFR (US)" : new L.TileLayer('http://vfrmap.com/20140918/tiles/ifrlc/{z}/{y}/{x}.jpg', {
                maxZoom : 12,
                minZoom : 5,
                attribution : '&copy; <a target="_blank" href="http://vfrmap.com">VFRMap.com</a>',
                tms : true,
                opacity : 0.5,
                bounds : L.latLngBounds(L.latLng(16.0, -179.0), L.latLng(72.0, -60.0)),
            }),

    "Grid" : L.grid({
	        redraw: 'moveend',
                coordStyle: 'DMS',
             }),
  }

  map
    .setView(new L.LatLng(lat,lng),zoom)
    .addLayer(baselayer["OpenStreetMap"]);

  L.control.layers(baselayer, overlays).addTo(map);

  var pilotList = L.pilotList({ position: 'topleft' }).addTo(map)

  var aircraftLayer = L.mpAircraftLayer().addTo(map)

  map.on('pilot-selection-change', function(evt) {
    var pilot = pilotList.getPilotByCallsign( evt.data )
    map.panTo( L.latLng( pilot.geod.lat, pilot.geod.lng, { animate: true } ) )
  });

  L.serverList({ position: 'bottomleft', selected: server }).addTo(map)

  function loadData() {
    $.ajax( "api/stat/" + server, {
      success: function(data) {
        data.clients.sort(function(a,b) {
          return a.callsign.localeCompare(b.callsign)
        })
        aircraftLayer.fire('mpdata',{ data: data },aircraftLayer)
        pilotList.setPilots( data.clients )
        if( refresh > 0 ) {
          setTimeout( function() {
            loadData()
          },refresh*1000)
        }
      },
      error: function(a,b,c) {
        console.log("AJAX error", a,b,c)
        alert("Can't load multiplayer data, please reload page")
      },
      timeout: 30000,
    })
  }

  loadData()

})
