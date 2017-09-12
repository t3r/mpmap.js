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

  L.ServerList = L.Control.extend({
    initialize: function(pos, options) {
      L.Control.prototype.initialize.call(this,pos);
      L.Util.setOptions(this, options);
    },

    onAdd: function(map) {
      var div = L.DomUtil.create( 'div', 'fg-server-list leaflet-bar' );
      div.innerHTML =
                '<select></select>'
                ;
      this.div = div;
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      $select = $(div).find('select')
      this._fill($select)

      $select.on('change', function (e) {
        var optionSelected = $("option:selected", this);
        map.fire( 'server-selection-change', { data: this.value } );
      });

      return div;
    },

    onRemove: function(map) {
        // TODO: Implement me!
    },

    _fill: function($select) {
      $.ajax( "api/stat/", {
        context: this,
        success: function(data) {
          this._serverList = data
          for( var name in data ) {
            $select.append($('<option>', {
              value: name,
              text: name + ' (' + data[name].location + ')',
              selected: data[name].dn === this.options.selected,
             }));
          }
        },
        error: function(a,b,c) {
          console.log("AJAX error", a,b,c)
        },
        timeout: 30000,
      })
    },

  })

  L.serverList = function(options) { return new L.ServerList(options) }

  L.PilotList = L.Control.extend({
    initialize: function(pos, options) {
      L.Control.prototype.initialize.call(this,pos);
      L.Util.setOptions(this, options);
    },

    onAdd: function(map) {
      var div = L.DomUtil.create( 'div', 'fg-pilot-list leaflet-bar' );
      div.innerHTML =
                '<input type="text" placeholder="filter" size="10">'+
                '<select size="10"></select>'
                ;
      this.div = div;
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      $(div).find('select').on('change', function (e) {
        var optionSelected = $("option:selected", this);
        map.fire( 'pilot-selection-change', { data: this.value } );
      });

      return div;
    },

    onRemove: function(map) {
        // TODO: Implement me!
    },

    setPilots: function(data) {
      if( !(data && Array.isArray(data)) ) return;
      this.data = data;
      var $select = $(this.div).find('select')
      filter = $(this.div).find('input').val().trim().toLowerCase()
      selected = $select.val()
      $select.find('option').remove()
      data.forEach( function(pilot) {
        if( filter && filter.length &&
            pilot.callsign.toLowerCase().indexOf(filter) === -1  &&
            pilot.model.toLowerCase().indexOf(filter) === -1 )
          return;
        $select.append($('<option>', {
          value: pilot.callsign,
          text: pilot.callsign + '(' + pilot.model + ')',
        }));
      });
      selected = $select.val(selected)
    },

    getPilotByCallsign: function(callsign) {
      if( !this.data ) return;
      return this.data.find( function(element) {
        return element.callsign === callsign;
      })
    },

  })
  L.pilotList = function(options) { return new L.PilotList(options) }

  var GenericACIcon = L.icon({
    iconUrl: 'acicons/fg_generic_craft.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
//    shadowUrl: 'my-icon-shadow.png',
//    shadowSize: [68, 95],
//    shadowAnchor: [22, 94]
  })

  L.AircraftMarker = L.Marker.extend({
    initialize: function(pos, options) {
      options.icon = options.icon || GenericACIcon;
      L.Marker.prototype.initialize.call(this,pos);
      L.Util.setOptions(this, options);
    },

    _setPos : function(pos) {
      L.Marker.prototype._setPos.call(this, pos);
      if (L.DomUtil.TRANSFORM) {
        this._icon.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.data.oriA.z + 'deg)'
        this._icon.style["transform-origin"] = "50% 50%"
      }
    },
  })

  L.AircraftLabel = L.Marker.extend({
    initialize: function(pos, options) {
      options.icon = L.divIcon({
        className: 'fg-aircraft-label',
        html:
           '<div><span>' + options.data.callsign + '</span>&nbsp;<span>' + options.data.model + '</span></div>' +
           '<div><span>' + Math.round(options.data.geod.alt/100) + '</span>&nbsp;<span>' + '---' + '</span></div>' +
           '<div style="clear: both"></div>',
        iconAnchor: [ -5, -5 ],
      })
      L.Marker.prototype.initialize.call(this,pos);
      L.Util.setOptions(this, options);
    },
  })

  L.MPAircraftLayer = L.LayerGroup.extend({
    initialize: function(_, options) {
      L.LayerGroup.prototype.initialize.call(this);
      L.Util.setOptions(this, options);
    },

    onAdd: function(map) {
      this._timer = null
      this._map = map
      this._loadData()
      this.on('mpdata', this._onData );
    },

    onRemove: function() {
      this.off('mpdata', this._onData );
      if( this._timer )
        clearTimeout( this._timer )
      this._timer = null
    },

    _loadData: function() {
      $.ajax( "api/stat/" + this.options.mpServer, {
        context: this,
        success: function(data) {
          data.clients.sort(function(a,b) {
            return a.callsign.localeCompare(b.callsign)
          })
          this.fire('mpdata',{ data: data },this)
          if( this.options.refresh > 0 ) {
            var self = this
            this._timer = setTimeout( function() {
              self._loadData()
            },this.options.refresh*1000)
          }
        },
        error: function(a,b,c) {
          console.log("AJAX error", a,b,c)
        },
        timeout: 30000,
      })
    },

    _onData: function(evt) {
      if( !(evt && evt.data && evt.data.clients) )
        return;

      this.clearLayers()
      evt.data.clients.forEach(function(client) {
        this.addLayer( new L.AircraftMarker(L.latLng( client.geod.lat, client.geod.lng ), {
          data: client
        }))
        this.addLayer( new L.AircraftLabel(L.latLng( client.geod.lat, client.geod.lng ), {
          data: client
        }))
      },this)

    }

  })

  L.mpAircraftLayer = function(layers,options) { return new L.MPAircraftLayer(layers,options) }

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


  var lat = Number(getUrlParameter('lat')) || 53.5,
      lng = Number(getUrlParameter('lng')) || 10,
      zoom = Number(getUrlParameter('zoom')) || 3,
      server = getUrlParameter('server') || 'mpserver51.flightgear.org',
      refresh = Number(getUrlParameter('refresh')) || 2;

  map
    .setView(new L.LatLng(lat,lng),zoom)
    .addLayer(baselayer["OpenStreetMap"]);

  L.control.layers(baselayer, overlays).addTo(map);

  var pilotList = L.pilotList({ position: 'topleft' }).addTo(map)

  L.mpAircraftLayer(null,{
    mpServer: server,
    refresh: refresh
  })
  .on('mpdata',function(evt) {
    pilotList.setPilots(evt.data.clients)
  })
  .addTo(map)

  map.on('pilot-selection-change', function(evt) {
    var pilot = pilotList.getPilotByCallsign( evt.data )
    map.panTo( L.latLng( pilot.geod.lat, pilot.geod.lng, { animate: true } ) )
  });

  L.serverList({ position: 'bottomleft', selected: server }).addTo(map)

})
