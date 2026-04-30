# ============================================================================
# WPPConnect Server — Dockerfile OTIMIZADO para Railway
# ============================================================================
# Aplicar no fork do wppconnect-server, substituindo o Dockerfile existente.
#
# Mudanças críticas:
# 1. Limpa /app/tokens/*.data.json no boot (evita sessões zumbis)
# 2. Limpa /tmp/userDataDir/ no boot (garante estado limpo)
# 3. Define CHROMIUM_PATH explícito (evita download em runtime)
# ============================================================================

FROM node:20-slim

# Chromium do sistema (mais estável em Docker que o baixado pelo Puppeteer)
RUN apt-get update && apt-get install -y \
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
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Pula download do Chromium pelo Puppeteer — usamos o do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY . .
RUN npm run build || true

# Script de boot: limpa lixo de execuções anteriores ANTES de subir o servidor
# Isso é o que mata o problema de "sessões zumbis acumulando".
RUN echo '#!/bin/sh\n\
echo "[boot] Cleaning orphan tokens..."\n\
rm -rf /app/tokens/*.data.json 2>/dev/null || true\n\
rm -rf /app/tokens/*.json 2>/dev/null || true\n\
echo "[boot] Cleaning userDataDir..."\n\
rm -rf /tmp/userDataDir/* 2>/dev/null || true\n\
mkdir -p /tmp/userDataDir\n\
mkdir -p /app/tokens\n\
echo "[boot] Starting WPPConnect server..."\n\
exec node dist/server.js\n' > /app/boot.sh && chmod +x /app/boot.sh

EXPOSE 21465

CMD ["/app/boot.sh"]
