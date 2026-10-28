ARG NODE_VERSION=22.14.0

# Stage 1: Build frontend
FROM node:${NODE_VERSION}-alpine AS frontend-builder
WORKDIR /src

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci

COPY index.html vite.config.js ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# Stage 2: Install backend production dependencies from the workspace lockfile
FROM node:${NODE_VERSION}-alpine AS backend-deps
WORKDIR /deps
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false

# Stage 3: Final runtime image
FROM node:${NODE_VERSION}-alpine
WORKDIR /app

ENV VIDYA_DATA_PATH=/data \
    PORT=31415

COPY --from=frontend-builder /src/build ./build
COPY backend/ ./backend/
COPY --from=backend-deps /deps/node_modules ./node_modules
COPY assets/ /app/defaults/
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 31415
VOLUME ["/data"]

ENTRYPOINT ["/entrypoint.sh"]
