FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace root files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
# Dummy frontend package.json so pnpm workspace resolves
COPY frontend/package.json frontend/package.json

RUN pnpm install --frozen-lockfile

# Copy backend source and prisma schema
COPY backend/ backend/

# Generate Prisma client and build TypeScript
RUN cd backend && npx prisma generate && pnpm build

# --- Production stage ---
FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/backend/dist backend/dist
COPY --from=base /app/backend/prisma backend/prisma
COPY --from=base /app/node_modules/.pnpm/@prisma+client*/  node_modules/.pnpm/@prisma+client*/

WORKDIR /app/backend
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
