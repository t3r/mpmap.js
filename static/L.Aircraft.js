/*
    var iconUrl = this._modelIcons[options.model] || 'fg_generic_craft'

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

    "mp-nimitz": "fg_carrier",
    "mp-eisenhower": "fg_carrier",
    "mp-foch": "fg_carrier",

    "OV10": "ov10",
    "OV10_USAFE": "ov10",

    "KC135": "kc135",
    "ch53e-model": "ch53e",
    "E3B": "e3b",
    "ufo": "ufo",

    "atc-tower": "atc",
    "atc-tower2": "atc",
    "mibs": "atc",
    "atc": "atc",
    "OpenRadar": "atc",
    "ATC-pie": "atc",
  }
*/


L.AircraftIcon = L.DivIcon.extend({
  options: {
    className: 'fg-aircraft-marker',
    iconSize: [43, 43],
    iconAnchor: [21,21],

  },

  initialize: function(options,vanished) {
    L.DivIcon.prototype.initialize.call(this,options);
    L.Util.setOptions(this, {
      html: L.Util.template(
          '<img src="acicons/heavy.png" style="transform-origin:50% 50%;transform: rotate({heading}deg);" {extra}>' +
          '<div class="fg-aircraft-label {cls}">' +
          '<div><span>{callsign}</span>&nbsp;<span>{model}</span></div>' +
          '<div><span>F{level}</span>&nbsp;<span>{kts}KT</span></div>' +
          '<div style="clear: both"></div></div>', {
          callsign: options.callsign,
          model: options.model,
          level: Math.round(options.position.alt/100),
          kts: Math.round(options.speed*3600/1852),
          heading: options.heading.toFixed(0),
          cls: vanished ? 'fg-expired-ac': '',
          extra: vanished ? 'class="fg-expired-ac"' : '',
      })
    })

  },
});

L.aircraftIcon = function(options,vanished) { return new L.AircraftIcon(options,vanished) }

/* Complete aircraft "icon", including label and trail */
L.Aircraft = L.Marker.extend({
  options: {
    historyLength: 100,
    riseOnHover: true,
  },

  initialize: function(history,vanished) {
    this.history = history;
    var options = history[history.length-1]
    options.title = options.title || options.callsign + ' (' + options.model + ')';
    options.alt = options.alt || 'callsign: ' + options.callsign + ', model: ' + options.model;
    options.icon = L.aircraftIcon(options)

    L.Marker.prototype.initialize.call(this,L.latLng( options.position, options ));
    this.setIcon( L.aircraftIcon( options, vanished ))
  },

  onAdd: function(layer) {
    L.Marker.prototype.onAdd.call(this,layer);
    var ll = [];
    this.history.forEach( function(h) {
      ll.push( h.position )
    });
    this._trail = new L.Polyline.AntPath(ll,{
      color: '#008000',
      weight: 2,
      dashArray: '10,10',
      delay:800,
      pulseColor: '#008080',
      paused: false });
    this._trail.addTo(this._map);
  },

  onRemove: function(layer) {
    this._trail.removeFrom(this._map);
    L.Marker.prototype.onRemove.call(this,layer);
  },

});

L.aircraft = function(options,vanished) { return new L.Aircraft(options,vanished) }

