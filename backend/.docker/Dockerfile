FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY backend/package.json ./
COPY pnpm-lock.yaml ./

RUN PRISMA_SKIP_POSTINSTALL_GENERATE=1 pnpm install --no-frozen-lockfile

COPY backend/ .

RUN npx prisma generate

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/index.ts"]
