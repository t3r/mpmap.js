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

/**
 * Module dependencies.
 */

var app = require('./app');
var debug = require('debug')('mpmap:server');
var http = require('http');

/**
 * Get port from environment and store in Express.
 */

var port = process.env.app_port || process.env.PORT || '8080';
app.set('port', port);
app.listen(port);

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down');
  process.exit(0);
});

console.log("Running as", process.env.node_env, "port", port )


module.exports = app;
