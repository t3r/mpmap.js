# This is FlightGear μ (mju) aka mpmap.js
A Multiplayer Map for FlightGear based on node.js

## Requirements
* nodejs >= 18 (Express 5)
* permission to perform DNS lookup
* permission to do outbound connects (telnet to mpserverXX on port 5001)

## Installation
get software

	git clone https://git.code.sf.net/p/flightgear/mpmap.js flightgear-mpmap.js

enter into the directory

	cd flightgear-mpmap.js

install dependencies (uses committed `package-lock.json`; run `npm install` locally after changing dependencies to refresh the lockfile)

	npm ci

optional local configuration (environment variables; loaded automatically via [dotenv](https://github.com/motdotla/dotenv) when you run `npm start`)

	cp .env.example .env

run

	npm start

This will start the server on localhost, port 8080 and you should see the multiplayer map at http://localhost:8080/

don't like 8080? Use another port like this

	app_port=4711 npm start

Optional environment variables:

* `MPMAP_DEBUG_WS=1` — verbose WebSocket logs (otherwise only when `node_env=development`).
* `MPMAP_SHUTDOWN_MS` — milliseconds before force-exit if graceful shutdown stalls (default 10000).
* `MPMAP_EXPOSE_OBS=1` — enable `GET /api/obs` (WebSocket observer dump); disabled by default.
* `MPMAP_ALLOW_ANY_MPSERVER=1` — allow any hostname and port range for MP status (disables SSRF-style host/port checks; not for public deployments).
* `MPMAP_MPSERVER_HOST_SUFFIXES` — comma-separated hostname suffixes allowed for `/api/stat/:server` and WebSocket subscribe (default `flightgear.org`).
* `MPMAP_MPSERVER_MIN_PORT` / `MPMAP_MPSERVER_MAX_PORT` — allowed TCP port range for MP status (defaults `5000`–`5999`).
* `MPMAP_OPENAIP_API_KEY` — if set, enables the OpenAIP map overlay (key is not stored in the client bundle).

## Running within docker
If you have docker and docker-compose installed, simply type

	docker-compose up --build

and you are ready. Note: this exposes the app at port http://localhost:8086/
There are also ready to use docker images at [https://hub.docker.com/r/flightgear/mpmap.js/](https://hub.docker.com/r/flightgear/mpmap.js/).
Run

	docker run -p 8080:8080 flightgear/mpmap.js

to have your own private multiplayer map at localhost:8080


## Live Demo?
This software runs at [http://mpmap03.flightgear.org/](http://mpmap03.flightgear.org/)

## Need help?
Contact the author(s) at the [flightgear-devel mailing list](https://sourceforge.net/projects/flightgear/lists/flightgear-devel "flightgear-devel")

## Contributing
Contributions are welcome through the [gitlab project](https://gitlab.com/t3r/mpmap/)
or the [github project](https://github.com/t3r/mpmap.js/).

## Legal stuff
mpmap.js is licensed under the GPL 2.0 or later. See [LICENSE](LICENSE)

Thanks to
* the fantastic authors of [Leaflet.js](http://leafletjs.com) and it's plugins
* the authors of [Bootstrap](https://getbootstrap.com/) and [js-cookie](https://github.com/js-cookie/js-cookie)
* [pigeon](http://pigeond.net) for the original fgmap software that inspired this version
* the incredible [FlightGear](http://flightgear.org) community, especially the creators and maintainers of fgms
