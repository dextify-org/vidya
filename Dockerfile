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
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    VIDYA_DATA_PATH=/data \
    HOST=0.0.0.0 \
    PORT=31415

COPY --from=frontend-builder --chown=node:node /src/build ./build
COPY --chown=node:node backend/ ./backend/
COPY --from=backend-deps --chown=node:node /deps/node_modules ./node_modules
COPY --chown=node:node assets/ ./defaults/
COPY --chown=node:node entrypoint.sh /entrypoint.sh

RUN chmod 0555 /entrypoint.sh \
    && mkdir -p /data/assets \
    && chown -R node:node /data

EXPOSE 31415
VOLUME ["/data"]

USER node
ENTRYPOINT ["/entrypoint.sh"]
