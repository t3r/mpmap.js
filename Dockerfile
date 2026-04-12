FROM node:20-alpine AS builder
WORKDIR /usr/local/app
COPY package.json package-lock.json /usr/local/app/
RUN npm ci
COPY . /usr/local/app/
RUN npm run build:server && npm run build

FROM node:20-alpine
LABEL description="FlightGear multiplayer map (the nodejs way)"

RUN apk add --no-cache curl

EXPOSE 8080
ENV node_env=production

WORKDIR /usr/local/app
COPY package.json package-lock.json /usr/local/app/
RUN npm ci --omit=dev
COPY . /usr/local/app/
COPY --from=builder /usr/local/app/dist /usr/local/app/dist
COPY --from=builder /usr/local/app/static/vite /usr/local/app/static/vite

USER nobody
CMD ["node", "dist/server.js"]
