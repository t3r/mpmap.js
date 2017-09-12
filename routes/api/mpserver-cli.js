/*
This is mpmap.js - a nodejs based multiplayer map for flightgear
Copyright (C) 2017 - Torsten Dreyer torsten _at_ t3r.de

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

const math3d = require('math3d')
var net = require('net');
/*
var res = new _MPServerClient("LATAM-8@LOCAL: -3015177.740109 4077182.227664 3855932.316763 37.434717 126.483847 641.779961 -3.507438 0.594748 -1.230743 Aircraft/777/Models/777-300ER.xml")
console.log(res)
*/

function _fromLonLatRad(lon,lat)
{
    var zd2 = 0.5*lon;
    var yd2 = -0.25*Math.PI - 0.5*lat;
    var Szd2 = Math.sin(zd2);
    var Syd2 = Math.sin(yd2);
    var Czd2 = Math.cos(zd2);
    var Cyd2 = Math.cos(yd2);
    var w = Czd2*Cyd2;
    var x = -Szd2*Syd2;
    var y = Czd2*Syd2;
    var z = Szd2*Cyd2;
    return new math3d.Quaternion(x,y,z,w);
}

function _MPServerClient( line ) {
  this.callsign = ''
  this.host = ''
  this.geod = {
    lat: 0,
    lng: 0,
    alt: 0
  }
  this.pos = [ 0, 0, 0 ]
  this.ori = [ 0, 0, 0 ]
  this.modelPath = ''
  this.model = ''

  this.Parse( line )
}

_MPServerClient.prototype.Parse = function( line ) {

  var p = line.split(":")
  if( p.length != 2 ) return

  var p1 = p[0].trim().split("@")
  if( p1.length != 2 ) return

  this.callsign = p1[0]
  this.host = p1[1]

  p1 = p[1].trim().split(" ")
  this.geod.lat = Number(p1[3])
  this.geod.lng = Number(p1[4])
  this.geod.alt = Number(p1[5])
  this.pos = [ Number(p1[0]),Number(p1[1]),Number(p1[2]) ]
  this.oriQ = [ Number(p1[6]),Number(p1[7]),Number(p1[8]) ]
  this.modelPath = p1[9]
  this.model = this.modelPath.split('/').pop().split('.')[0]

  angleAxis = new math3d.Vector3( this.oriQ[0], this.oriQ[1], this.oriQ[2] )
  ecOrient = math3d.Quaternion.AngleAxis( angleAxis, angleAxis.magnitude * 180 / Math.PI )
  qEc2Hl = _fromLonLatRad(this.geod.lng * Math.PI / 180, this.geod.lat * Math.PI / 180);
  this.oriA = qEc2Hl.conjugate().mul(ecOrient).eulerAngles
}

function MPServerStatus(server,port) {
  port = port || 5001

  return new Promise(function(resolve,reject){
    var data = {
      server: server,
      port: port,
      clients: []
    }
    var client = new net.Socket();
    client.connect(port, server, function() {});

    function handleLine( line )
    {
      if( !line || line.startsWith( "#" ) )
        return
      var res = new _MPServerClient( line )
      data.clients.push( res )
    }

    var linebuffer = ''
    client.on('data', function(data) {
      linebuffer += data.toString()
      if(linebuffer.indexOf('\n') !=-1 ) {
        var lines = linebuffer.split('\n');
        // either '' or the unfinished portion of the next line
        linebuffer = lines.pop();
        lines.forEach(handleLine)
      }
    });

    client.on('close', function() {
      handleLine( linebuffer )
      resolve(data)
    });
    client.on('error', function(err) {
      reject(err)
    })

  })
}

module.exports = MPServerStatus

