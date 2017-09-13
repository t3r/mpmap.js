# This is FlightGear μ (mju) aka mpmap.js
A Multiplayer Map for FlightGear based on node.js

## Requirements
* nodejs >= 6.0
* permission to perform DNS lookup
* permission to do outbound connects (telnet to mpserverXX on port 5001) 

## Installation
get software

	git clone https://git.code.sf.net/p/flightgear/mpmap.js flightgear-mpmap.js

enter into the directory

	cd flightgear-mpmap.js

install dependencies

	npm install

run

	npm start

This will start the server on localhost, port 8080 and you should see the multiplayer map at http://localhost:8080/

don't like 8080? Use another port like this

	app_port=4711 npm start

## Need help?
contact the author(s) at the [flightgear-devel mailing list](https://sourceforge.net/projects/flightgear/lists/flightgear-devel "flightgear-devel")

## Legal stuff
mpmap.js is licensed under the GPL 2.0 or later. See [LICENSE](LICENSE)

Thanks to 
* the fantastic authors of [Leaflet.js](http://leafletjs.com) and it's plugins
* the authors of jQuery. 
* [pigeon](http://pigeond.net) for the original fgmap software that inspired this version
* the incredible [FlightGear](http://flightgear.org) community, especially the creators and maintainers of fgms
