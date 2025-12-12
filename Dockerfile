# ==========================================
# STAGE 1: BUILDER
# Собираем TypeScript код в JavaScript
# ==========================================
FROM node:20-bookworm AS builder

WORKDIR /usr/src/app

# 1. Копируем конфиги пакетов для установки зависимостей
# Нам нужны package.json из корня и из всех воркспейсов, чтобы npm ci связал ссылки
COPY package*.json ./
COPY apps/athena-runner/package.json ./apps/athena-runner/
COPY apps/athena-api/package.json ./apps/athena-api/
# COPY apps/athena-control/package.json ./apps/athena-control/
# COPY apps/athena-learn/package.json ./apps/athena-learn/
# COPY apps/athena-studio/package.json ./apps/athena-studio/
COPY libs/common/package.json ./libs/common/
COPY libs/types/package.json ./libs/types/

# 2. Устанавливаем ВСЕ зависимости (включая devDependencies для сборки)
# npm ci работает быстро и надежно по лок-файлу
RUN npm ci

# 3. Копируем весь исходный код
COPY . .

# 4. Билдим зависимости (в строгом порядке!)
# Сначала типы и общие либы
RUN npm run build:types
RUN npm run build:common
RUN npm run build:runner

RUN npm prune --production

# 6. Убираем devDependencies, чтобы подготовить node_modules для продакшена
# (Это лайфхак: мы удаляем лишнее прямо в билдере перед копированием, или делаем это во втором стейдже)
# Здесь мы просто оставим dist, а node_modules переустановим начисто во втором стейдже.

# ==========================================
# STAGE 2: PRODUCTION RUNNER
# Финальный образ с Isolate, Python и готовым кодом
# ==========================================
FROM node:20-bookworm

# 1. Системные зависимости (Isolate, Python...)
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

# 2. 🔥 КОПИРУЕМ ВСЁ ИЗ БИЛДЕРА
# Мы копируем уже готовые node_modules (с пролинкованными либами) и собранные dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/apps/athena-runner/dist ./dist
# Копируем собранные либы, так как симлинки в node_modules ведут именно сюда!
COPY --from=builder /usr/src/app/libs/common/dist ./libs/common/dist
COPY --from=builder /usr/src/app/libs/common/package.json ./libs/common/
COPY --from=builder /usr/src/app/libs/types/dist ./libs/types/dist
COPY --from=builder /usr/src/app/libs/types/package.json ./libs/types/

# 3. Запуск
USER root
CMD ["node", "dist/main.js"]
