# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /src

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
RUN npm ci

COPY index.html ./
COPY vite.config.js ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# Stage 2: Install backend production dependencies (standalone, no workspace)
FROM node:20-alpine AS backend-deps
WORKDIR /deps
COPY backend/package.json ./
RUN npm install --production

# Stage 3: Final runtime image
FROM node:20-alpine
WORKDIR /app

COPY --from=frontend-builder /src/build ./build
COPY backend/ ./backend/
COPY --from=backend-deps /deps/node_modules ./backend/node_modules
COPY assets/ /app/defaults/

# FFmpeg/FFprobe are shipped by the @ffmpeg-installer / @ffprobe-installer npm
# packages as statically linked binaries (musl-compatible), so the system
# ffmpeg package is not installed. Fail the build if they cannot run here.
RUN NODE_PATH=/app/backend/node_modules node -e "const { execFileSync } = require('child_process'); for (const pkg of ['@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe']) { const bin = require(pkg).path; execFileSync(bin, ['-version'], { stdio: 'ignore' }); console.log(pkg + ' -> ' + bin); }"

COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 31415
ENV VIDYA_DATA_PATH=/data
ENV PORT=31415

VOLUME ["/data"]

ENTRYPOINT ["/entrypoint.sh"]
