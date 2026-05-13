# =============================================================================
# Kova Worker — Dockerfile
# Build context: repo root (required for pnpm workspace dependencies)
# =============================================================================

FROM node:22-alpine

RUN npm install -g pnpm@11.1.0

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY worker/package.json worker/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
# apps/web is not needed at runtime but pnpm workspace requires its manifest
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source
COPY packages/ packages/
COPY worker/ worker/
COPY tsconfig.base.json ./

WORKDIR /app/worker

CMD ["node", "--import=tsx/esm", "src/index.ts"]
