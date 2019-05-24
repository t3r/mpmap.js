
const ModelIcons = {
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
  "ec130": "heli",

  "c150": "singleprop",
  "c172": "singleprop",
  "c182": "singleprop",
  "dhc2": "singleprop",
  "pa28": "singleprop",
  "pc7": "singleprop",
  "j3cub": "singleprop",

  "c310": "twinprop",
  "c310": "twinprop",
  "Boeing314": "twinprop",
  "Lockheed1049": "twinprop",
  "TU-114": "twinprop",
  "b1900d": "twinprop",
  "b29": "twinprop",
  "beech99": "twinprop",
  "dc3": "twinprop",
  "fokker50": "twinprop",
  "SenecaII": "twinprop",

  "Citation": "smalljet",
  "Bravo": "smalljet",
  "fokker100": "smalljet",
  "tu154B": "smalljet",

  "boeing733": "heavyjet",
  "boeing747": "heavyjet",
  "a320": "heavyjet",
  "A380": "heavyjet",
  "AN-225": "heavyjet",
  "B-52F": "heavyjet",
  "Concorde": "heavyjet",
  "FINNAIRmd11": "heavyjet",
  "MD11": "heavyjet",
  "KLMmd11": "heavyjet",
  "737": "heavyjet",
  "787": "heavyjet",
  "777": "heavyjet",
  "747": "heavyjet",

  "hgldr-cs": "glider",
  "paraglider": "glider",
  "colditz": "glider",
  "sgs233": "glider",

  "ZLT-NT": "blimp",
  "ZF-balloon": "blimp",
  "Submarine_Scout": "blimp",
  "LZ-129": "blimp",
  "Excelsior": "blimp",

  "mp-nimitz": "fg_carrier",
  "mp-eisenhower": "fg_carrier",
  "mp-foch": "fg_carrier",

  "OV10": "ov10",

  "KC135": "kc135",
  "ch53e-model": "ch53e",
  "E3B": "e3b",
  "ufo": "ufo",

  "mibs": "atc2",
  "atc": "atc2",
  "OpenRadar": "atc2",
}

function getModelIcon( model ) {
  var mlc = model.toLowerCase();
  for( var m in ModelIcons ) {
    if( mlc.startsWith(m.toLowerCase()) )
      return ModelIcons[m];
  }
  return 'fg_generic_craft';
}

L.AircraftIcon = L.DivIcon.extend({
  options: {
    className: 'fg-aircraft-marker',
    iconSize: [40, 40],
    iconAnchor: [20,20],

  },

  initialize: function(options,vanished) {
    var modelIcon = getModelIcon(options.model);
    var rotating = modelIcon === "atc2";
    L.DivIcon.prototype.initialize.call(this,options);
    L.Util.setOptions(this, {
      html: L.Util.template(
          '<div class="acicon acicon-{icon} {expired} {rotating}" style="transform: rotate({heading}deg);"></div>' +
          '<div class="fg-aircraft-label {expired}">' +
          '<div><span>{callsign}</span>&nbsp;<span>{model}</span></div>' +
          '<div><span>F{level}</span>&nbsp;<span>{kts}KT</span></div>' +
          '<div style="clear: both"></div></div>', {
          callsign: options.callsign,
          model: options.model,
          level: Math.round(options.position.alt/100),
          kts: Math.round(options.speed*3600/1852),
          heading: options.heading.toFixed(0),
          expired: vanished ? 'fg-expired-ac': '',
          rotating: vanished ? 'rotating': '',
          icon: modelIcon,
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
    this._trail = new L.Polyline/*.AntPath*/(ll,{
      color: '#008000',
      weight: 2,
      dashArray: '10,10',
      delay:1200,
      pulseColor: '#008080',
      paused: false,
      hardwareAccelerated: true,
    });
    this._trail.addTo(this._map);
  },

  onRemove: function(layer) {
    this._trail.removeFrom(this._map);
    L.Marker.prototype.onRemove.call(this,layer);
  },

});

L.aircraft = function(options,vanished) { return new L.Aircraft(options,vanished) }

