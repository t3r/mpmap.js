'use strict;'

L.MPAircraftLayer = L.MarkerClusterGroup.extend({

  options: {
    spiderfyOnMaxZoom: false,
    iconCreateFunction: function (cluster) {
      var childCount = cluster.getChildCount();
      var c = ' marker-cluster-';
      if (childCount < 5) {
        c += 'small';
      } else if (childCount < 10) {
        c += 'medium';
      } else {
        c += 'large';
      }

      return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });
    },
  },

  initialize : function(layers, options) {
    L.MarkerClusterGroup.prototype.initialize.call(this, layers, options )
    L.setOptions(this, options);
  },

  onAdd: function(map) {
    L.MarkerClusterGroup.prototype.onAdd.call(this,map);

    this._aircraft = {}
    this._map = map
    this.on('mpdata', this._onData );
    this._gc()
  },

  onRemove: function() {
    if( this.gcTimeout ) clearTimeout( this.expTimeout )
    this.off('mpdata', this._onData );
    L.MarkerClusterGroup.prototype.onRemove.call(this);
  },

  // garbage collector
  _gc: function() {
    var now = Date.now()
    var expired = []
    for( var callsign in this._aircraft ) {
      var ac = this._aircraft[callsign]
      var lastSeen = ac.history[ac.history.length-1].time
      if( now - lastSeen > 30000 )
        expired.push(callsign)
      ac.vanished = ( now - lastSeen > 15000 );
    }
    expired.forEach(function(callsign) {
      // console.log("Goodbye",callsign)
      delete (this._aircraft[callsign])
    },this)

    this.clearLayers();
    for( var callsign in this._aircraft ) {
      var ac = this._aircraft[callsign];
      this.addLayer( L.aircraft(ac.history, ac.vanished ))
    }
    this.gcTimeout = setTimeout( function(self) { self._gc() }, 1000, this )
  },

  _onData: function(evt) {
    if( !(evt && evt.data && evt.data.clients) )
      return;

    var now = Date.now()

    evt.data.clients.forEach(function(client) {
      if( !client.geod ) client.geod = {}
      if( !client.oriA ) client.oriA = {}
      var ac = this._aircraft[client.callsign];
      if( !ac ) {
        ac = this._aircraft[client.callsign] = {
          history: [],
          layer: null,
        };
        // console.log("Hello",client.callsign)
      }
      ac.history.push({
          position: {
            lat: client.geod.lat||0,
            lon: client.geod.lng||0,
            alt: client.geod.alt||0,
          },
          heading: client.oriA.z||0,
          callsign: client.callsign||'UNKNOWN',
          model: client.model||'UNKNOWN',
          time: now,
          speed: 0,
      });
      if( ac.history.length > 1 ) {
        var last = ac.history[ac.history.length-1];
        var dist = L.latLng(last.position).distanceTo(L.latLng(ac.history[ac.history.length-2].position));
        var dt = last.time - ac.history[ac.history.length-2].time;
        if( dt > 0 ) last.speed = dist / dt * 1000;
      }
      while( ac.history.length > 1000 )
        ac.history.shift()

    },this);
  },

})

L.mpAircraftLayer = function(layers,options) { return new L.MPAircraftLayer(layers,options) }
