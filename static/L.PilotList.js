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

