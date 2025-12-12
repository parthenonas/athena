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

RUN isolate --version

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx nest build athena-runner

USER root

# Запуск
CMD ["node", "dist/apps/athena-runner/main"]