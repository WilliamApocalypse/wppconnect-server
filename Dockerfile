# ============================================================================
# WPPConnect Server — Dockerfile MULTI-STAGE OTIMIZADO para Railway
# ============================================================================
# Substitua o Dockerfile do fork por este arquivo e faça redeploy.
#
# Correções principais (v3):
#   1. Multi-stage: builder com tudo + runtime enxuto
#   2. @babel/runtime instalado EXPLICITAMENTE no runtime
#      (o build do wppconnect-server compila com Babel e o output em dist/
#       faz `require("@babel/runtime/helpers/...")` em tempo de execução —
#       como o pacote vive em devDependencies, ele some no `--omit=dev`
#       e o servidor crasha com "Cannot find module '@babel/runtime/...'".)
#   3. Limpeza de tokens/userDataDir no boot (evita sessões zumbis)
#   4. Chromium do sistema (mais estável que o baixado pelo Puppeteer)
#   5. --max-old-space-size=1536 para caber no plano Railway
# ============================================================================

# ----------------------------------------------------------------------------
# STAGE 1 — Builder (compila TypeScript -> dist/)
# ----------------------------------------------------------------------------
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./

# Instala TUDO (dev + prod) para conseguir rodar `npm run build`
# --ignore-scripts pula husky (dev-only)
# --legacy-peer-deps resolve conflito do @typescript-eslint
RUN npm install --legacy-peer-deps --ignore-scripts

COPY . .

# Build real — sem `|| true`. Se falhar, queremos ver o erro no Railway.
RUN npm run build

# ----------------------------------------------------------------------------
# STAGE 2 — Runtime (imagem enxuta com Chromium do sistema)
# ----------------------------------------------------------------------------
FROM node:22-slim

# Dependências de sistema do Chromium
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

# Puppeteer usa o Chromium do sistema (não baixa o dele)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

# Instala apenas dependências de produção...
RUN npm install --omit=dev --legacy-peer-deps --ignore-scripts \
    # ...mas força a instalação do @babel/runtime, que o dist/ compilado
    # precisa em runtime mesmo estando listado como devDependency.
    && npm install --legacy-peer-deps --ignore-scripts --no-save \
       @babel/runtime

# Copia o build pronto do estágio anterior
COPY --from=builder /app/dist ./dist

# Copia arquivos auxiliares que o servidor possa ler em runtime
# (config compilado já está dentro de dist/, então basta dist/)

# Script de boot: limpa sessões zumbis ANTES de subir o servidor
RUN printf '#!/bin/sh\n\
echo "[boot] Cleaning orphan tokens..."\n\
rm -rf /app/tokens/*.data.json 2>/dev/null || true\n\
rm -rf /app/tokens/*.json 2>/dev/null || true\n\
echo "[boot] Cleaning userDataDir..."\n\
rm -rf /tmp/userDataDir/* 2>/dev/null || true\n\
mkdir -p /tmp/userDataDir\n\
mkdir -p /app/tokens\n\
echo "[boot] Starting WPPConnect server (Node max-old-space=1536MB)..."\n\
exec node --max-old-space-size=1536 dist/server.js\n' > /app/boot.sh \
    && chmod +x /app/boot.sh

EXPOSE 21465

CMD ["/app/boot.sh"]
