# --- Imagen de desarrollo: servidor Vite con recarga automatica -----------
FROM node:24-slim AS development
ENV PNPM_HOME=/usr/local/bin
RUN corepack enable && corepack prepare pnpm@9.15.2 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev"]

# --- Compilacion del paquete estatico -------------------------------------
FROM node:24-slim AS build
RUN corepack enable && corepack prepare pnpm@9.15.2 --activate
WORKDIR /app

# Vite fija las variables VITE_* en TIEMPO DE COMPILACION: quedan escritas
# dentro del JavaScript. Por eso la direccion de la API se pasa como
# argumento de construccion y no como variable del contenedor: definirla al
# arrancar no tendria ningun efecto.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# --- Imagen de produccion: Nginx sirve la SPA -----------------------------
FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD wget --spider -q http://localhost/ || exit 1
