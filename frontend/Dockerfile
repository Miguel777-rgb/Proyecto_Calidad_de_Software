# El contexto de construccion es la RAIZ del repositorio (ver compose.yml):
# la web depende de packages/compartido, que vive fuera de frontend/. Lo que
# entra en el contexto se limita en Dockerfile.dockerignore.

# --- Imagen de desarrollo: servidor Vite con recarga automatica -----------
FROM node:24-slim AS development
ENV PNPM_HOME=/usr/local/bin
RUN corepack enable && corepack prepare pnpm@9.15.2 --activate
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json frontend/
COPY packages/compartido/package.json packages/compartido/
# Solo la web y lo que necesita: el workspace incluye tambien la app movil,
# que no se instala dentro de este contenedor.
RUN pnpm install --frozen-lockfile --filter ola-frontend...
COPY frontend frontend
COPY packages/compartido packages/compartido
WORKDIR /repo/frontend
EXPOSE 5173
CMD ["pnpm", "dev"]

# --- Compilacion del paquete estatico -------------------------------------
FROM node:24-slim AS build
RUN corepack enable && corepack prepare pnpm@9.15.2 --activate
WORKDIR /repo

# Vite fija las variables VITE_* en TIEMPO DE COMPILACION: quedan escritas
# dentro del JavaScript. Por eso la direccion de la API se pasa como
# argumento de construccion y no como variable del contenedor: definirla al
# arrancar no tendria ningun efecto.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json frontend/
COPY packages/compartido/package.json packages/compartido/
RUN pnpm install --frozen-lockfile --filter ola-frontend...
COPY frontend frontend
COPY packages/compartido packages/compartido
RUN pnpm --filter ola-frontend build

# --- Imagen de produccion: Nginx sirve la SPA -----------------------------
FROM nginx:alpine AS production
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD wget --spider -q http://localhost/ || exit 1
