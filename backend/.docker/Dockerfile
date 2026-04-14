FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN PRISMA_SKIP_POSTINSTALL_GENERATE=1 pnpm install --frozen-lockfile

COPY backend/ backend/

RUN cd backend && node node_modules/prisma/build/index.js generate

WORKDIR /app/backend
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && npx tsx src/index.ts"]
