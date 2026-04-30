# ===== Builder stage =====
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Ignora scripts (husky/prepare) na instalação
RUN npm install --legacy-peer-deps --ignore-scripts

COPY . .

RUN npm run build

# ===== Runtime stage =====
FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

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
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Produção + dependências de runtime que faltam no fork
# --ignore-scripts evita rodar husky/prepare (devDependency ausente)
RUN npm install --omit=dev --legacy-peer-deps --ignore-scripts \
    && npm install --no-save --legacy-peer-deps --ignore-scripts \
       @babel/runtime@^7.29.2 prom-client@^14.2.0

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/tokens /tmp/userDataDir

EXPOSE 21465

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:21465/healthz || exit 1

CMD ["sh", "-c", "rm -rf /app/tokens/*.json /tmp/userDataDir/* 2>/dev/null; node dist/server.js"]
