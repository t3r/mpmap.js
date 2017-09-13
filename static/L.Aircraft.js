
/* Rotating aircraft with automatic icon selection */
L.AircraftMarker = L.Marker.extend({

  initialize: function(options) {
    var iconUrl = this._modelIcons[options.model] || 'fg_generic_craft'
    options.icon = options.icon || L.icon({
      iconUrl: 'acicons/' + iconUrl + '.png',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    })
    options.title = options.title || options.callsign + ' (' + options.model + ')'
    options.alt = options.alt || 'callsign: ' + options.callsign + ', model: ' + options.model 
    L.Marker.prototype.initialize.call(this,L.latLng(0,0))
    L.Util.setOptions(this, options)
    this.heading = 0
  },

  _setPos : function(pos) {
    L.Marker.prototype._setPos.call(this, pos);
    if (L.DomUtil.TRANSFORM) {
      this._icon.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.heading + 'deg)';
      this._icon.style["transform-origin"] = "50% 50%";
    }
  },

  setProperties: function(properties,callsign,model) {
    this.heading = properties.heading;
    this.setLatLng(properties.latLng)
  },

  _modelIcons: {
    "bo105": "heli",
    "sikorsky76c": "heli",
    "ec135": "heli",
    "r22": "heli",
    "s76c": "heli",
    "Lynx-WG13": "heli",
    "S51-sikorsky": "heli",
    "CH47": "heli",
    "R22": "heli",
    "apache-model": "heli",
    "uh-1": "heli",
    "uh60": "heli",
    "OH-1": "heli",
    "ec130b4": "heli",
    "ec130t2": "heli",

    "c150": "singleprop",
    "c172p": "singleprop",
    "c172-dpm": "singleprop",
    "c182-dpm": "singleprop",
    "dhc2floats": "singleprop",
    "pa28-161": "singleprop",
    "pc7": "singleprop",
    "j3cub": "singleprop",

    "c310-dpm": "twinprop",
    "c310u3a": "twinprop",
    "Boeing314Clipper": "twinprop",
    "Lockheed1049_twa": "twinprop",
    "TU-114-model": "twinprop",
    "b1900d-anim": "twinprop",
    "b29-model": "twinprop",
    "beech99-model": "twinprop",
    "dc3-dpm": "twinprop",
    "fokker50": "twinprop",
    "SenecaII": "twinprop",

    "Citation-II": "smalljet",
    "Bravo": "smalljet",
    "fokker100": "smalljet",
    "tu154B": "smalljet",

    "boeing733": "heavyjet",
    "boeing747-400-jw": "heavyjet",
    "a320-fb": "heavyjet",
    "A380": "heavyjet",
    "AN-225-model": "heavyjet",
    "B-52F-model": "heavyjet",
    "Concorde-ba": "heavyjet",
    "FINNAIRmd11": "heavyjet",
    "MD11": "heavyjet",
    "KLMmd11": "heavyjet",
    "737-300": "heavyjet",
    "787": "heavyjet",
    "777-200": "heavyjet",
    "747-400": "heavyjet",
    "737-100": "heavyjet",
    "737-400": "heavyjet",

    "hgldr-cs-model": "glider",
    "paraglider_model": "glider",
    "colditz-model": "glider",
    "sgs233": "glider",

    "ZLT-NT": "blimp",
    "ZF-balloon": "blimp",
    "Submarine_Scout": "blimp",
    "LZ-129": "blimp",
    "Excelsior-model": "blimp",

    "mp-nimitz": "carrier",
    "mp-eisenhower": "carrier",
    "mp-foch": "carrier",

    "OV10": "ov10",
    "OV10_USAFE": "ov10",

    "KC135": "kc135",
    "ch53e-model": "ch53e",
    "E3B": "e3b",

    "atc-tower": "atc",
    "atc-tower2": "atc", 
    "mibs": "atc",
    "atc": "atc", 
    "OpenRadar": "atc", 
    "ATC-pie": "atc",
  }
})

L.aircraftMarker = function(options) { return new L.AircraftMarker(options) }

L.AircraftLabel = L.Marker.extend({

  initialize: function(options) {
    options.icon = L.divIcon({
      className: 'fg-aircraft-label',
      html: '',
      iconSize: null,
      iconAnchor: [ -10, -10 ],
    })
    L.Marker.prototype.initialize.call(this,L.latLng(0,0));
    L.Util.setOptions(this, options);
  },

  setProperties: function(properties,callsign,model) {
    this.setLatLng(properties.latLng)
    this._icon.innerHTML = this._makeHtml(properties,callsign,model)
  },

  _mps2kts: 3600/1852,

  _makeHtml: function(properties,callsign,model) {
    return L.Util.template(
         '<div><span>' + callsign + '</span>&nbsp;<span>' + model + '</span></div>' +
         '<div><span>' + Math.round(properties.altitude/100) + '</span>&nbsp;<span>' + Math.round(properties.speed*this._mps2kts) + '</span></div>' +
         '<div style="clear: both"></div>', properties )
  },
})

L.aircraftLabel = function(options) { return new L.AircraftLabel(options) }

/* Complete aircraft "icon", including label and trail */
L.Aircraft = L.LayerGroup.extend({
  options: {
    historyLength: 100,
  },

  initialize: function(options) {
    L.LayerGroup.prototype.initialize.call(this);
    L.Util.setOptions(this, options)
    this._history = []
    this._marker = L.aircraftMarker(options)
    this._trail = L.polyline([],{color: '#008000', weight: 1, dashArray: '5,5,1,5'})
    this._label = L.aircraftLabel(options)
    this.addLayer( this._marker )
    this.addLayer( this._trail )
    this.addLayer( this._label )
  },

  setPosAltHeading: function( latLng, altitude, heading ) {

    var now = Date.now()
    var speed = 0
    if( this._history.length > 0 ) {
      var last = this._history[this._history.length-1]
      var dist = last.latLng.distanceTo(latLng)
      if( dist < 1 ) return; // slow moving target, track at least 1m steps
      var dt = now - last.time
      if( dt > 0 ) speed = dist / dt * 1000
    }

    var properties = {
      latLng: latLng,
      heading: heading,
      altitude: altitude,
      speed: speed,
      time: now,
    }
    this._marker.setProperties( properties, this.options.callsign, this.options.model )
    this._label.setProperties( properties, this.options.callsign, this.options.model )


    this._history.push(properties)
    while( this._history.length > this.options.historyLength )
      this._history.shift()

    var trail =  []
    this._history.forEach(function(h) {
      trail.push(h.latLng)
    })
    this._trail.setLatLngs(trail)
  },

});

L.aircraft = function(options) { return new L.Aircraft(options) }

