'use strict;'

L.MPAircraftLayer = L.MarkerClusterGroup.extend({

  onAdd: function(map) {
    L.MarkerClusterGroup.prototype.onAdd.call(this,map);

    this._aircraft = {}
    this._map = map
    this.on('mpdata', this._onData );
//    this._gc()
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
      ac = ac[ac.length-1]
      if( now - ac.time > 30000 )
        expired.push(callsign)
      ac.vanished = ( now - ac.time > 15000 );
      if(ac.vanished){
        // find marker, set class
      }
    }
    expired.forEach(function(callsign) {
      console.log("Goodbye",callsign)
      delete (this._aircraft[callsign])
    },this)
    this.gcTimeout = setTimeout( function(self) { self._gc() }, 1000, this )
  },

  _onData: function(evt) {
    if( !(evt && evt.data && evt.data.clients) )
      return;

    var now = Date.now()

    evt.data.clients.forEach(function(client) {
      var ac = this._aircraft[client.callsign];
      if( !ac ) {
        ac = this._aircraft[client.callsign] = {
          history: [],
          layer: null,
        };
        console.log("Hello",client.callsign)
      }
      ac.history.push({
          position: {
            lat: client.geod.lat,
            lon: client.geod.lng,
            alt: client.geod.alt,
          },
          heading: client.oriA.z,
          callsign: client.callsign,
          model: client.model,
          time: now,
          speed: 0,
      });
      if( ac.history.length > 1 ) {
        var last = ac.history[ac.history.length-1];
        var dist = L.latLng(last.position).distanceTo(L.latLng(ac.history[ac.history.length-2].position));
        var dt = last.time - ac.history[ac.history.length-2].time;
        if( dt > 0 ) last.speed = dist / dt * 1000;
      }
      while( ac.history.length > 100 )
        ac.history.shift()

    },this);

    this.clearLayers();
    for( var callsign in this._aircraft ) {
      var ac = this._aircraft[callsign];
      this.addLayer( L.aircraft(ac.history) )
    }
  },

})

L.mpAircraftLayer = function(layers,options) { return new L.MPAircraftLayer(layers,options) }
