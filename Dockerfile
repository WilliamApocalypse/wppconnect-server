# ============================
# Stage 1: Builder
# ============================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install all deps (including dev) for build
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

# ============================
# Stage 2: Runtime
# ============================
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_BIN=/usr/bin/chromium \
    PORT=21465

WORKDIR /app

# Chromium + libs needed by Puppeteer
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

# Production dependencies only
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps \
    && npm install --no-save --legacy-peer-deps \
       @babel/runtime@^7.29.2 \
       prom-client@^14.2.0

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Create runtime folders
RUN mkdir -p /app/tokens /tmp/userDataDir

EXPOSE 21465

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
  CMD curl -fsS http://localhost:21465/healthz || exit 1

# Inline boot logic (no boot.sh needed): clean stale tokens/profiles, then start
CMD ["sh", "-c", "rm -rf /app/tokens/*.json /tmp/userDataDir/* 2>/dev/null; node dist/server.js"]
