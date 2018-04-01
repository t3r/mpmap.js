FROM node:9-alpine
LABEL maintainer="Torsten Dreyer <torsten@t3r.de>"
LABEL version="1.0"
LABEL description="FlightGear multiplayer map (the nodejs way)"

EXPOSE 8080

WORKDIR /usr/local/app
COPY package.json /usr/local/app
RUN npm install
COPY . /usr/local/app/

USER nobody

ENV node_env=production
# Command
CMD ["node", "server.js" ]

