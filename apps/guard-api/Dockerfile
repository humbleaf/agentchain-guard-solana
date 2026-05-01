# Multi-stage Dockerfile for AgentChain Guard API
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
ENV DATABASE_URL="file:./guard.db"
RUN pnpm --filter @agentguard/api exec prisma generate --schema=prisma/schema.prisma




RUN pnpm --filter @agentguard/api build

RUN pnpm deploy --filter=@agentguard/api --prod --legacy /prod/api


FROM base AS runner
WORKDIR /app
COPY --from=build /prod/api .

# Initialize database
RUN npx prisma generate --schema=apps/guard-api/prisma/schema.prisma

EXPOSE 8080

CMD ["sh", "-c", "pnpm --filter @agentguard/api exec prisma db push --schema=prisma/schema.prisma && node dist/main.js"]




