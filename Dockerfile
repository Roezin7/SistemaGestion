# Imagen única: el backend Express compila y sirve el frontend React.
# Replica el flujo de Render (postinstall -> install-client -> build-client).
FROM node:20-bookworm-slim

ENV NODE_ENV=production
# CRA/react-scripts 5 requiere el provider legacy de OpenSSL en Node >=17
ENV NODE_OPTIONS=--openssl-legacy-provider
# Margen de memoria para el build de CRA
ENV GENERATE_SOURCEMAP=false

WORKDIR /app

# Copiamos todo el monorepo (el postinstall del backend necesita el código del frontend para compilarlo)
COPY . .

# Instala dependencias del backend; su "postinstall" instala y compila el frontend.
# Usamos npm install (no ci) para que se ejecuten los postinstall scripts y se incluyan
# las devDependencies del frontend necesarias para el build.
WORKDIR /app/backend
RUN npm install --no-audit --no-fund

# La app escucha en process.env.PORT (default 5000). Coolify inyecta PORT.
EXPOSE 5000

CMD ["node", "server.js"]
