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

var router = require('express').Router()
var MpServerCli = require('./mpserver-cli')

var NodeCache = require('node-cache')
var dns = require('dns')

const StatusCache = new NodeCache({
  stdTTL: 5,
  checkperiod: 1,
  useClones: false,
  errorOnMissing: false,
})

function GetCachedStatus( server, port ) {
  port = port || 5001
  return new Promise(function(resolve,reject) {
    StatusCache.get( server, function(err,val) {
      if( err ) return reject(err)
      if( val ) {
        return resolve(val)
      }

      MpServerCli(server,port)
      .then(function(data) {
        StatusCache.set( server, data, function(err,success) {
          if( err ) return reject(err)
          resolve(data)
        })
      })
      .catch(function(err) {
        reject(err)
      })
    });
  })
}


function ResolveDNS( name, type ) {
  return new Promise(function(resolve,reject) {
    dns.resolve(name, type, function(err,data) {
      if( err ) reject(err)
      else resolve({ entries: data, rqname: name, rqtype: type })
    })
  })
}

router.route('/stat/').get(function(req, res) {

  var srvRecords = {}
  var dnsname = "_fgms._udp.flightgear.org";

  ResolveDNS(dnsname, "SRV")
  .then(function(data) {

    var prms = []
    var entries = data.entries || []


    entries.sort( function(a,b) {
      return a.name.localeCompare(b.name)
    })

    entries.forEach( function(entry) {
      if( entry.port <= 0 ) return
      srvRecords[entry.name] = entry
      prms.push( ResolveDNS(entry.name,"TXT") )
    })

    return Promise.all( prms )
  })
  .then( function( data ) {
    var response = {}
    data.forEach(function(e) {
      if( e.rqtype === "TXT" ) {
        var b = new Buffer(e.entries[0][0].split("=")[1],'base64')
        var data = JSON.parse(b.toString())
        response[data.name] = {
          dn: e.rqname,
          'location': data.location,
          port: srvRecords[e.rqname].port
        }
      }
    })
    return res.json(response)
  })
  .catch(function(err) {
    console.log(err)
    return res.status(500).render('error', {
      message : err.message,
      error : err
    })
  })

})

router.route('/stat/:server/:port*?').get(function(req, res) {

  var port = req.params.port || 5001

  GetCachedStatus(req.params.server,port)
  .then(function(data) {
    return res.json(data)
  })
  .catch(function(err) {
    return res.status(500).render('error', {
      message : err.message,
      error : err
    })
  })
})

function ServerObserver() {
  this.observers = {};
  this.loop();
}

ServerObserver.prototype.loop = function() {
  let self = this;
  for( srv in self.observers ) {

    GetCachedStatus(srv,5001)
    .then( data => {
      var toSend = JSON.stringify({
        data: data,
        nrOfClients: self.getNrOfClients(),
      })
      self.observers[srv].forEach( ws => {
        try {
          ws.send( toSend )
        }
        catch( ex ) {
          self.unsubscribe( ws );
        }
      }, self)
    })
    .catch( err => {
      console.log("Can't get cached status for ", srv, err );
      //TODO: check this context
      self.observers[srv].forEach( ws => {
        ws.close()
      })
      delete self.observers[srv];
    })
  }

  setTimeout( function(self) { self.loop() }, 10000, this );

}

ServerObserver.prototype.getNrOfClients = function(server) {
  let reply = 0
  for( var server in this.observers ) {
    reply += this.observers[server].length
  }
  return reply
}

ServerObserver.prototype.subscribe = function(server,ws) {
  //console.log("subscribe",server,ws._socket.remoteAddress);
  let self = this;
  this.unsubscribe(ws);
  (this.observers[server] = (this.observers[server] || [])).push(ws);
  try {
    GetCachedStatus(server,5001)
    .then( data => {
      try {
        ws.send( JSON.stringify({
          data: data,
          nrOfClients: self.getNrOfClients(),
        }))
      }
      catch( ex ) {
        this.unsubscribe( ws );
      }
    })
    .catch( err => {
      console.log("Can't get cached status for ", server, err );
      this.unsubscribe();
    })
  }
  catch( ex ) {
    console.log(ex);
    this.unsubscribe( ws );
  }
}

ServerObserver.prototype.unsubscribe = function(ws) {
  console.log("unsubscribing client");
  for( var s in this.observers ) {
    let idx = this.observers[s].indexOf(ws);
    if( idx == -1 ) continue;
    this.observers[s].splice(idx,1);
    if( this.observers[s].length == 0 ) {
      delete this.observers[s];
    }
  }
}

const serverObserver = new ServerObserver();

router.ws('/stream', function(ws, req) {

  ws.on('message', function(msg) {
    let options = null;
    try {
      options = JSON.parse(msg);
    }
    catch (ex) {
      return;
    }
    if( options.server )
      serverObserver.subscribe( options.server, ws );
  });

  ws.on('error', function(msg) {
    serverObserver.unsubscribe( ws );
  });
  ws.on('close', function(msg) {
    serverObserver.unsubscribe( ws );
  });
});

module.exports = router
