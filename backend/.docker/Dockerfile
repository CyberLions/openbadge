FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json

RUN PRISMA_SKIP_POSTINSTALL_GENERATE=1 pnpm install --frozen-lockfile --filter backend...

COPY backend/ backend/
WORKDIR /app/backend

RUN node node_modules/prisma/build/index.js generate

EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && npx tsx src/index.ts"]
