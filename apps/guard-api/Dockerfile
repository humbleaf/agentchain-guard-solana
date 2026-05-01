# Multi-stage Dockerfile for AgentChain Guard API
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Add openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN pnpm install --frozen-lockfile

ENV DATABASE_URL="file:./guard.db"
RUN pnpm --filter @agentguard/api exec prisma generate --schema=prisma/schema.prisma

RUN pnpm --filter @agentguard/api build

RUN pnpm deploy --filter=@agentguard/api --prod --legacy /prod/api


FROM base AS runner
# Install openssl in runner as well
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /prod/api .

# Default SQLite path
ENV DATABASE_URL="file:./guard.db"

# Initialize database (Pin Prisma version to match build stage)
RUN npx prisma@5.22.0 generate --schema=prisma/schema.prisma

EXPOSE 8080

CMD ["sh", "-c", "npx prisma@5.22.0 db push --schema=prisma/schema.prisma && node dist/main.js"]
