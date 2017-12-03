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

      var self = this
      $select.on('change', function (e) {
        var optionSelected = $("option:selected", this);
        map.fire( 'server-selection-change', { server: self._serverList[this.value] } );
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

