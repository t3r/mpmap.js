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
        console.log("cache hit for ", server )
        return resolve(val)
      }

      console.log("cache miss for ", server )
      MpServerCli(server,port)
      .then(function(data) {
        StatusCache.set( server, data, function(err,success) {
          if( err ) return reject(err)
          console.log("cache set for ", server )
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

  var response = {
  }
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
      prms.push( ResolveDNS(entry.name,"A") )
      prms.push( ResolveDNS(entry.name,"TXT") )
      response[entry.name] = { port: entry.port }
    })

    return Promise.all( prms )
  })
  .then( function( data ) {
    data.forEach(function(e) {
      if( e.rqtype === "A" ) {
        response[e.rqname].addresses = e.entries
      }
      if( e.rqtype === "TXT" ) {
        var b = new Buffer(e.entries[0][0].split("=")[1],'base64')
        response[e.rqname].data = JSON.parse(b.toString())
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

module.exports = router
