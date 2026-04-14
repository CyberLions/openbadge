# ── Stage 1: Install all dependencies ──
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /build

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build frontend ──
FROM deps AS frontend-build
COPY frontend/ frontend/
RUN cd frontend && pnpm build

# ── Stage 3: Production image ──
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY backend/package.json ./
COPY pnpm-lock.yaml ./
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=1 pnpm install --prod --no-frozen-lockfile

COPY backend/ .
RUN npx prisma generate

# Bake built frontend into the image
COPY --from=frontend-build /build/frontend/dist /app/static

ENV FRONTEND_DIST=/app/static
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/index.ts"]
