# ============================================
# Stage 1: Builder - compila TypeScript
# ============================================
FROM node:22-slim AS builder

WORKDIR /app

# Instala dependências do sistema necessárias para build
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copia package.json e instala TODAS as dependências (inclui dev para build)
COPY package*.json ./
RUN npm install --legacy-peer-deps --ignore-scripts

# Copia o código-fonte e compila
COPY . .
RUN npm run build

# ============================================
# Stage 2: Runtime - imagem final enxuta
# ============================================
FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Instala Chromium e libs necessárias para Puppeteer
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

# Copia package.json e instala APENAS dependências de produção
# (agora @babel/runtime já está em "dependencies", então virá junto)
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps --ignore-scripts

# Copia o build compilado e arquivos necessários
COPY --from=builder /app/dist ./dist
COPY boot.sh ./
RUN chmod +x boot.sh

# Cria diretórios persistentes
RUN mkdir -p /app/tokens /app/userDataDir /tmp/userDataDir

EXPOSE 21465

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:21465/healthz || exit 1

CMD ["./boot.sh"]
