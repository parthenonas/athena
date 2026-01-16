FROM node:20-bookworm AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY apps/athena-runner/package.json ./apps/athena-runner/
COPY apps/athena-api/package.json ./apps/athena-api/
COPY libs/common/package.json ./libs/common/
COPY libs/types/package.json ./libs/types/

RUN npm ci

COPY . .

RUN npm run build:types
RUN npm run build:common
RUN npm run build:runner

RUN npm prune --production

FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    libcap-dev \
    libsystemd-dev \
    python3 \
    python3-pip \
    python3-psycopg2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp
RUN git clone https://github.com/ioi/isolate.git && \
    cd isolate && \
    make isolate && \
    make install && \
    rm -rf /tmp/isolate

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/apps/athena-runner/dist ./dist
COPY --from=builder /usr/src/app/libs/common/dist ./libs/common/dist
COPY --from=builder /usr/src/app/libs/common/package.json ./libs/common/
COPY --from=builder /usr/src/app/libs/types/dist ./libs/types/dist
COPY --from=builder /usr/src/app/libs/types/package.json ./libs/types/

USER root
CMD ["node", "dist/main.js"]
