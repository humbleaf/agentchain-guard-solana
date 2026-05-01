# Multi-stage Dockerfile for AgentChain Guard Dashboard
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app

# Next.js build-time env vars (must be set during build for client-side injection)
# We use placeholders that can be replaced or overridden if needed.
ARG NEXT_PUBLIC_POLICY_ENGINE_URL
ENV NEXT_PUBLIC_POLICY_ENGINE_URL=$NEXT_PUBLIC_POLICY_ENGINE_URL

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @agentguard/dashboard build
RUN pnpm deploy --filter=@agentguard/dashboard --prod --legacy /prod/dashboard


FROM base AS runner
WORKDIR /app
COPY --from=build /prod/dashboard .

# Env defaults
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["pnpm", "start"]
