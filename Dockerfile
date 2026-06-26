# ---------- Etapa 1: build ----------
# Compila el frontend React (necesita devDependencies) y deja listo el backend.
FROM node:20-bookworm-slim AS build

# CRA/react-scripts 5 requiere el provider legacy de OpenSSL en Node >=17
ENV NODE_OPTIONS=--openssl-legacy-provider
ENV GENERATE_SOURCEMAP=false
# OJO: no fijar NODE_ENV=production aquí; el build de CRA necesita las devDependencies.

WORKDIR /app

# Copiamos todo el monorepo (el postinstall del backend compila el frontend).
COPY . .

# Instala deps del backend; su "postinstall" instala y compila el frontend.
WORKDIR /app/backend
RUN npm install --no-audit --no-fund

# ---------- Etapa 2: runtime ----------
# Imagen final ligera: solo backend (deps de producción) + la carpeta build/ del frontend.
FROM node:20-bookworm-slim

# curl es necesario para el healthcheck de Coolify (la imagen slim no lo incluye).
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# Backend completo, incluyendo su node_modules (el backend no tiene devDependencies).
COPY --from=build /app/backend /app/backend
# Solo el resultado compilado del frontend (NO su node_modules, que es enorme).
COPY --from=build /app/frontend/gestion-tramites-frontend/build /app/frontend/gestion-tramites-frontend/build

WORKDIR /app/backend

# La app escucha en process.env.PORT (default 5000). Coolify inyecta PORT.
EXPOSE 5000

CMD ["node", "server.js"]
