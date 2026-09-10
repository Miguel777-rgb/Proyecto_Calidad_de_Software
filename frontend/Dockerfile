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
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# --- Imagen de produccion: Nginx sirve la SPA y hace proxy a /api ---------
FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
