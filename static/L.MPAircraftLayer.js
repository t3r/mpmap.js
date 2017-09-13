L.MPAircraftLayer = L.LayerGroup.extend({
  initialize: function(layer, options) {
    L.LayerGroup.prototype.initialize.call(this,layer);
    L.Util.setOptions(this, options);
    this._aircraft = {}
  },

  onAdd: function(map) {
    this._map = map
    this.on('mpdata', this._onData );
  },

  onRemove: function() {
    this.off('mpdata', this._onData );
  },

  _onData: function(evt) {
    if( !(evt && evt.data && evt.data.clients) )
      return;

    evt.data.clients.forEach(function(client) {
      var ac = this._aircraft[client.callsign]
      if( !ac ) {
        ac = new L.Aircraft({ callsign: client.callsign, model: client.model })
        this._aircraft[client.callsign] = ac
      }
      this.addLayer( ac )
      ac.setPosAltHeading( L.latLng( client.geod.lat, client.geod.lng ), client.geod.alt, client.oriA.z )

    },this)
  },

})

L.mpAircraftLayer = function(layers,options) { return new L.MPAircraftLayer(layers,options) }
