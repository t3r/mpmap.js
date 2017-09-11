var router = require('express').Router()
var MpServerCli = require('./mpserver-cli')

var NodeCache = require('node-cache')

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
