FROM ghcr.io/bitnoize/node:20-bookworm

LABEL org.opencontainers.image.source=https://github.com/bitnoize/fotozzz

ARG DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
    # User home
    usermod -d /home/fotozzz node; \
    mkdir -m 0750 /home/fotozzz; \
    chown node:node /home/fotozzz

WORKDIR /usr/src/fotozzz

COPY package.json package-lock.json tsconfig.json .

RUN npm install

COPY . .

RUN npm run build

COPY docker-entrypoint/ /lib/entrypoint/

CMD ["npm", "run", "start"]

