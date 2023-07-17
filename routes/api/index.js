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

const router = require('express').Router()
const MpServerCli = require('./mpserver-cli')
const util = require('util');

const NodeCache = require('node-cache');
const dnsResolve = util.promisify(require('dns').resolve);

const StatusCache = new NodeCache({
  stdTTL: 5,
  checkperiod: 1,
  useClones: false,
  errorOnMissing: false,
})

GetCachedStatus = async( server, port ) => {
  port = port || 5001
  let mpserver = StatusCache.get( server );
  if( mpserver == undefined ) {
    mpserver = await MpServerCli(server,port);
    StatusCache.set( server, mpserver );
  }

  return mpserver;
}


ResolveDNS = async ( name, type ) => {
  const response = await dnsResolve(name, type );
  return { entries: response||[], rqname: name, rqtype: type }
}

router.route('/stat/').get(async(req, res) => {

  const dnsname = "_fgms._udp.flightgear.org";
  let srvData;
  try {
    srvData = await ResolveDNS(dnsname,"SRV");
  }
  catch( err ) {
    console.error( "DNS lookup error, using only mpserver01", err );
    srvData = {
      entries: [
      {
        port: 5000,
        name:  'mpserver01.flightgear.org.',
      }
    ]};
  }
  var prms = []
  var srvRecords = {}
  srvData.entries.forEach( e => {
    if( e.port <= 0 ) return;
    srvRecords[e.name] = e;
    prms.push( ResolveDNS(e.name,"TXT") );
  })

  const txtData =  await Promise.all( prms );

  var response = {}
  txtData.forEach(e => {
    if( e.rqtype === "TXT" ) {
      let entry = e.entries[0][0]
      if( !entry.startsWith( 'flightgear-mpserver=' ) )
         return

      let b = new Buffer.from(entry.substring(20),'base64')
      let data
      try {
        data = JSON.parse(b.toString())
      }
      catch( ex ) {
        console.error("invalid json",e)
        return
      }
      response[data.name] = {
        dn: e.rqname,
        'location': data.location,
        port: srvRecords[e.rqname].port
      }
    }
  })
  return res.json(response)
})

router.route('/stat/:server/:port*?').get(async (req, res) => {

  var port = req.params.port || 5001

  try {
    const data = await GetCachedStatus(req.params.server,port);
    return res.json(data)
  }
  catch(err) {
    return res.status(500).render('error', {
      message : err.message,
      error : err
    })
  }
})

function ServerObserver() {
  this.observers = {};
  this.loop();
}

ServerObserver.prototype.loop = async function() {
  let self = this;
  for( srv in self.observers ) {

    let data
    try {
      data = await GetCachedStatus(srv,5001)
    }
    catch( err ) {
      console.error("Can't get cached status for ", srv, err );
      self.observers[srv].forEach( ws => {
        ws.close()
      })
      delete self.observers[srv];
      continue;
    }


    let toSend = JSON.stringify({
        data: data,
        nrOfClients: self.getNrOfClients(),
      });

    (self.observers[srv] ||[]).forEach( ws => {
      try {
        console.log(srv, "sending to", ws._socket._peername )
        ws.send( toSend )
      }
      catch( ex ) {
        console.error("error sending",ex)
        self.unsubscribe( ws );
      }
    }, self);
  }

  setTimeout( function(self) { self.loop() }, 10000, self );

}

ServerObserver.prototype.getNrOfClients = function() {
  let reply = 0
  for( var server in this.observers ) {
    reply += this.observers[server].length
  }
  return reply
}

ServerObserver.prototype.subscribe = async function(server,ws) {
  let self = this;
  self.unsubscribe(ws);

  if( !ws ) return

  (self.observers[server] = (self.observers[server] || [])).push(ws);
  console.log("subscribed to",server,ws._socket.remoteAddress)
  try {
    const data = await GetCachedStatus(server,5001)
    try {
      ws.send( JSON.stringify({
        data: data,
        nrOfClients: self.getNrOfClients(),
      }))
    }
    catch( ex ) {
      console.error("error sending",ex)
      self.unsubscribe( ws );
    }
  }
  catch( ex ) {
    console.error(ex);
    self.unsubscribe( ws );
  }
}

ServerObserver.prototype.unsubscribe = function(ws) {
  if( !(ws && ws._socket) ) return
  console.log("unsubscribe",ws._socket.remoteAddress);
  for( var s in this.observers ) {
    let idx = this.observers[s].indexOf(ws);
    console.log("found at",s,"with index",idx);
    if( idx == -1 ) continue;
    this.observers[s].splice(idx,1);
    if( this.observers[s].length == 0 ) {
      delete this.observers[s];
    }
  }
}

ServerObserver.prototype.json = function() {
  var r = {};
  for( var s in this.observers ) {
    let a = []
    r[s] = a;
    this.observers[s].forEach( ws => {
      a.push({
        host: ws._socket._peername
      })
    })
  }
  return r
}

const serverObserver = new ServerObserver();

router.ws('/stream', function(ws, req) {

  ws.on('message', function(msg) {
    console.log("ws msg from",ws._socket._peername, msg );
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
    console.error("error receiving",msg)
    serverObserver.unsubscribe( ws );
  });
  ws.on('close', function(msg) {
    console.log("ws closed",msg,ws._socket._peername);
    serverObserver.unsubscribe( ws );
  });
});

router.route('/obs').get(function(req, res) {
  return res.json(serverObserver.json());
});

module.exports = router
