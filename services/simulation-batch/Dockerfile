# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Runtime ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

ENTRYPOINT ["node", "dist/index.js"]
