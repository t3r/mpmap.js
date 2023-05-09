$(function() {

  function Settings() {

    var props = Cookies.get('mpmap-settings' ) || {};
    if( typeof(props) === 'string' )
      props = JSON.parse(props);

    this.lat = Number(getUrlParameter('lat',props.lat ||53.5));
    this.lng = Number(getUrlParameter('lng',props.lng ||10));
    this.zoom = Number(getUrlParameter('zoom',props.zoom||3));
    this.server = getUrlParameter('server',props.server||'mpserver01.flightgear.org');
    this.refresh = Number(getUrlParameter('refresh',props.refresh||10));
    this.baseLayer = props.baseLayer || 'OpenStreetMap';
    this.overlays = props.overlays || {};
    this.saveCookie = props.saveCookie;
    this.clusterZoom = props.clusterZoom || 12;

    $('#cookieCheck:checkbox').prop('checked', this.saveCookie ? true : false );
    $('#clusterZoom').val( this.clusterZoom );

    function getUrlParameter(sParam,dflt) {
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
      return dflt;
    };
  }

  Settings.prototype.save = function() {
    if( this.saveCookie )
      Cookies.set('mpmap-settings', JSON.stringify(this) )
    else
      Cookies.remove('mpmap-settings');
  }

  var settings = new Settings()

  map = new L.Map('map', {
    fadeAnimation: true,
    zoomAnimation: true,
    zoomControl: false,
  });


  map.on('moveend', function(evt) {
    var c = map.getCenter();
    settings.lat = c.lat;
    settings.lng = c.lng;
    settings.save();
  })

  map.on('zoomend', function(evt) {
    settings.zoom = map.getZoom();
    settings.save();
  })

  map.on('baselayerchange', function(evt) {
    settings.baseLayer = evt.name;
    settings.save();
  })
  map.on('overlayadd', function(evt) {
    settings.overlays[evt.name] = true;
    settings.save();
  })
  map.on('overlayremove', function(evt) {
    delete settings.overlays[evt.name];
    settings.save();
  })

  var baselayer = {
    "OpenStreetMap": new L.TileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 18,
        attribution: 'Map data &copy; <a target="_blank" href="//openstreetmap.org">OpenStreetMap</a> contributors'
      }),
    "Carto Light": new L.TileLayer('//a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 18,
        attribution: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
      }),
    "Carto Dark": new L.TileLayer('//a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 18,
        attribution: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
      }),
    "Bing Aerial": L.tileLayer.bing({
      bingMapsKey: 'AuHndJivZLbhhwqhbn03ulPuBBhVH1OTIAio6buoJ8v8pO1IuxZTr_tydkITmv2T',
      imagerySet: 'Aerial',
    }),
    "Bing Hybrid": L.tileLayer.bing({
      bingMapsKey: 'AuHndJivZLbhhwqhbn03ulPuBBhVH1OTIAio6buoJ8v8pO1IuxZTr_tydkITmv2T',
      imagerySet: 'AerialWithLabelsOnDemand',
    }),
    "Bing Roads": L.tileLayer.bing({
      bingMapsKey: 'AuHndJivZLbhhwqhbn03ulPuBBhVH1OTIAio6buoJ8v8pO1IuxZTr_tydkITmv2T',
      imagerySet: 'RoadOnDemand',
    }),
  }

  var overlays = {
    "Terrain": new L.TileLayer('http://c.tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 18,
        attribution: 'Map data &copy; <a target="_blank" href="//openstreetmap.org">OpenStreetMap</a> contributors'
      }),

    "OpenAIP":  new L.TileLayer("http://{s}.tile.maps.openaip.net/geowebcache/service/tms/1.0.0/openaip_basemap@EPSG%3A900913@png/{z}/{x}/{y}.png", {
                maxZoom: 14,
                minZoom: 5,
                tms: true,
                detectRetina: true,
                subdomains: '12',
                format: 'image/png',
                transparent: true
            }),

    "VFRMap.com Sectionals (US)" : new L.TileLayer('http://vfrmap.com/20210909/tiles/vfrc/{z}/{y}/{x}.jpg', {
                maxZoom : 12,
                minZoom : 3,
                attribution : '&copy; <a target="_blank" href="http://vfrmap.com">VFRMap.com</a>',
                tms : true,
                opacity : 0.5,
                bounds : L.latLngBounds(L.latLng(16.0, -179.0), L.latLng(72.0, -60.0)),
            }),

    "VFRMap.com - Low IFR (US)" : new L.TileLayer('http://vfrmap.com/20210909/tiles/ifrlc/{z}/{y}/{x}.jpg', {
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
    .setView(new L.LatLng(settings.lat,settings.lng),settings.zoom)
    .addLayer(baselayer[settings.baseLayer]);

  L.control.zoom({
    position: 'topright',
  }).addTo(map);
  L.control.layers(baselayer, overlays).addTo(map);

  for( var l in settings.overlays ) {
    if( overlays.hasOwnProperty(l) )
      overlays[l].addTo(map);
  }


  var aircraftLayer = L.mpAircraftLayer(null,{
    disableClusteringAtZoom: settings.clusterZoom,
  }).addTo(map);

  $("#mpserverSelect").on('change', function (e) {
    settings.server = this.value;
    ws.send(JSON.stringify({
        server: settings.server,
        binary: false,
    }));
    settings.save();
  });

//  var pilotList = L.pilotList({ position: 'topleft' }).addTo(map)
//  var serverList = L.serverList({ position: 'bottomleft', selected: settings.server }).addTo(map)
  function setConnected( flag ) {
    if( flag ) {
      $("#aircraftCount").css('visibility','visible');
      $("#disconnected").css('visibility','hidden');
    } else {
      $("#aircraftCount").css('visibility','hidden');
      $("#disconnected").css('visibility','visible');
    }
  }

  setConnected(false);

  function setPilotsList(data) {
      data = data || [];
      var $list = $('#pilotsList');
      $("#aircraftCount").html(data.length);

      $list.children("li").each( function() {
        var d = $(this).data("pilot");
        var $li = $(this);
        if( ! data.some( function(p) { return p.callsign === d.callsign; } ) ) {
          $li.remove();
        }
      });

      data.forEach( function(pilot) {
/*
        if( filter && filter.length &&
            pilot.callsign.toLowerCase().indexOf(filter) === -1  &&
            pilot.model.toLowerCase().indexOf(filter) === -1 )
          return;
*/

        var title = Number(pilot.oriA.z).toFixed(0) + '° ' + Number(pilot.geod.alt).toFixed(0) + 'ft';
        var $li = $('<li class="list-group-item" data-toggle="tooltip" data-placement="right" title="' + title + '"><span>' + pilot.callsign + '</span><span>' + pilot.model + '</span>' + '</li>')
            .data("pilot", pilot )
            .on('click', function (foo) {
              map.flyTo( L.latLng( pilot.geod.lat, pilot.geod.lng), 12, { animate: true } );
            })

        var $found = $list.children("li").filter( function(idx,ele) {
            return $(ele).data("pilot").callsign === pilot.callsign;
        })

        if( $found.length ) {
          $found.replaceWith( $li );
        } else {
          $list.append( $li );
        }
      }); 
  }

  function haveData( data ) {
    setConnected(true);
    data.data.clients.sort(function(a,b) {
      return a.callsign.localeCompare(b.callsign)
    })
    aircraftLayer.fire('mpdata',{ data: data.data },aircraftLayer)
    setPilotsList( data.data.clients )
    $("#nrOfClients").html(data.nrOfClients);
  }

  var ws = null;
  function createWebsocket() {
    var wsUrl = (window.location.protocol === 'https:' ? 'wss' : 'ws') +
                '://' + window.location.host + window.location.pathname + 'api/stream';

    var wsPing = null;

    try {
      ws = new WebSocket(wsUrl);
    }
    catch( ex ) {
      setConnected(false);
      console.log(ex);
      setTimeout( createWebsocket, 2000 );
    }

    ws.onmessage = function (e) {
      haveData( JSON.parse(e.data) );
    };

    ws.onopen = function () {
      ws.send(JSON.stringify({
        server: settings.server,
        binary: false,
      }));

/*
      wsPing = setInterval( function() {
        try {
          ws.send(JSON.stringify({
          }));
        }
        catch( ex ) {
          console.log(ex);
        }
      }, 5000 );
*/
    };

    ws.onclose = function () {
      setConnected(false);
      if( wsPing != null ) {
        clearInterval( wsPing )
        wsPing = null;
      }
      setTimeout( createWebsocket, 2000 );
    };
  }

  window.onbeforeunload = function() {
    if( ws ) {
      ws.onclose = function() {}
      ws.close();
    }
  };

  createWebsocket();

  $.ajax( "api/stat/", {
    context: this,
    success: function(data) {
      $select = $("#mpserverSelect").empty();
      for( var name in data ) {
        $select.append($('<option>', {
          value: data[name].dn,
          text: name + ' (' + data[name].location + ')',
          selected: data[name].dn === settings.server,
        }));
      }
    },  
    error: function(a,b,c) {
      console.log("AJAX error", a,b,c)
    },
    timeout: 30000,
  })  

  $('#sidebarCollapse.btn.btn').on('click', function () {
    $('.sidebarActivation').toggleClass('active');
    setTimeout( function() { map.invalidateSize(true); }, 600 );
  });

  $('#cookieCheck:checkbox').change(function() {
    if( $(this).prop('checked') )  {
      settings.saveCookie = true;
    } else {
      delete settings.saveCookie;
    }
    settings.save();
  });

  $('#clusterZoom').change(function() {
    var n = Number($(this).val());
    if( !Number.isNaN(n) ) {
      settings.clusterZoom = n;
      aircraftLayer.options.disableClusteringAtZoom = settings.clusterZoom;
      settings.save();
    }
  });

})
