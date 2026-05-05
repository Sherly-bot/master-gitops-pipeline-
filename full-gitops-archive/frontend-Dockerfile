# ─────────────────────────────────────────────
#  STAGE 1 — Dependencies
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ─────────────────────────────────────────────
#  STAGE 2 — Build React app
# ─────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args become env vars at build time (not secret — public VITE/REACT_APP vars only)
ARG VITE_API_URL
ARG REACT_APP_API_URL

ENV VITE_API_URL=$VITE_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# ─────────────────────────────────────────────
#  STAGE 3 — Serve with Nginx
# ─────────────────────────────────────────────
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Custom nginx config for React SPA routing
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
# For CRA: COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
