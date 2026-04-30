# syntax=docker/dockerfile:1.6

# =========================================
# Stage 1: Builder — compila TypeScript
# =========================================
FROM node:22-slim AS builder

WORKDIR /app

# Instala deps de build (necessário para compilar nativos como sharp/puppeteer helpers)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* yarn.lock* ./

# Instala TODAS as dependências (inclui dev) para conseguir buildar
RUN npm install --legacy-peer-deps --ignore-scripts

COPY . .

# Compila TypeScript -> dist/
RUN npm run build

# =========================================
# Stage 2: Runtime — imagem final enxuta
# =========================================
FROM node:22-slim

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_OPTIONS="--max-old-space-size=1536"

WORKDIR /app

# Chromium + libs necessárias pro Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libgbm1 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libxcomposite1 \
      libxdamage1 \
      libxfixes3 \
      libxrandr2 \
      libxkbcommon0 \
      xdg-utils \
      curl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* yarn.lock* ./

# Instala apenas dependências de produção
RUN npm install --omit=dev --legacy-peer-deps --ignore-scripts \
    # Pacotes que estão em devDependencies no upstream mas são exigidos em runtime
    # pelo código compilado em dist/. Instalamos com --no-save para não precisar
    # mexer no package.json a cada novo pacote órfão que aparecer.
    && npm install --legacy-peer-deps --ignore-scripts --no-save \
       @babel/runtime@^7.29.2 \
       prom-client@^14.2.0

# Copia artefatos compilados do builder
COPY --from=builder /app/dist ./dist
# Copia outras pastas que o servidor lê em runtime (se existirem no repo)
COPY --from=builder /app/public ./public
# config.ts/json é carregado em runtime pelo servidor
COPY --from=builder /app/src/config.ts ./src/config.ts

# Diretórios de tokens/userData (limpos a cada boot pelo CMD)
RUN mkdir -p /app/tokens /tmp/userDataDir

EXPOSE 21465

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:21465/healthz || exit 1

# Boot inline: limpa sessões fantasmas e sobe o servidor
CMD sh -c "rm -f /app/tokens/*.json 2>/dev/null; rm -rf /tmp/userDataDir/* 2>/dev/null; node dist/server.js"
