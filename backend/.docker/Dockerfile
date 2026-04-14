FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace root files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
# Dummy frontend package.json so pnpm workspace resolves
COPY frontend/package.json frontend/package.json

ENV PRISMA_ENGINES_MIRROR=https://binaries.prisma.sh
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=1 pnpm install --frozen-lockfile

# Copy backend source and prisma schema
COPY backend/ backend/

# Generate Prisma client and build TypeScript
RUN cd backend && node node_modules/prisma/build/index.js generate && pnpm build

# --- Production stage ---
FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN PRISMA_SKIP_POSTINSTALL_GENERATE=1 pnpm install --frozen-lockfile --prod

COPY --from=base /app/backend/dist backend/dist
COPY --from=base /app/backend/prisma backend/prisma
COPY --from=base /app/node_modules/.pnpm/@prisma+client*/  node_modules/.pnpm/@prisma+client*/

WORKDIR /app/backend
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/index.js"]
