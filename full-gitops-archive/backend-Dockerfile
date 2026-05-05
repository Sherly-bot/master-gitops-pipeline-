# ─────────────────────────────────────────────
#  STAGE 1 — Dependencies
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first (layer cache optimisation)
COPY package*.json ./

# Install ALL deps (including devDeps needed for build)
RUN npm ci --include=dev

# ─────────────────────────────────────────────
#  STAGE 2 — Build / Prune
# ─────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# If you have a build step (e.g. TypeScript compile), run it here:
# RUN npm run build

# Prune to production-only deps
RUN npm prune --production

# ─────────────────────────────────────────────
#  STAGE 3 — Production image
# ─────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy pruned node_modules and app source
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app .

# Ownership
RUN chown -R appuser:appgroup /app

USER appuser

# App listens on PORT env var, default 5000
EXPOSE ${PORT:-5000}

# Graceful shutdown support
STOPSIGNAL SIGTERM

# Health check — expects an /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-5000}/health || exit 1

CMD ["node", "src/server.js"]
