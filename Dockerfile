# ==============================================================================
# VUELTO - Multi-stage Production Dockerfile
# Combina Web SPA (React/Vite) + Backend API REST (Express/TypeScript)
# ==============================================================================

# --- Etapa 1: Build Frontend Web ---
FROM node:22-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# --- Etapa 2: Build Backend API ---
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# --- Etapa 3: Production Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Dependencias del sistema mínimas
RUN apk add --no-cache curl

# Copiar package.json y dependencias de producción del backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copiar compilado del backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copiar frontend compilado dentro del directorio público del backend
COPY --from=web-builder /app/web/dist ./public

# Copiar logos oficiales y favicons en public
COPY web/public/*.jpg ./public/

# Usuario no privilegiado para seguridad
RUN addgroup -S vuelto && adduser -S vuelto -G vuelto
RUN chown -R vuelto:vuelto /app
USER vuelto

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
