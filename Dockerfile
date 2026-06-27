# syntax=docker/dockerfile:1

# Multi-stage build for the NestJS API (apps/api) inside the pnpm monorepo.
# The compiled API does `require("@vota-comigo/shared-types")`, so shared-types
# must be built and present in node_modules at runtime.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN corepack enable

FROM base AS build
WORKDIR /repo

# Manifests first so dependency install is cached across source changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter=api...

# Build api (turbo builds shared-types first via the ^build dependency).
COPY . .
RUN pnpm turbo run build --filter=api

# Produce a self-contained folder with prod deps + injected shared-types build.
RUN pnpm --filter=api deploy --prod /prod/api

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/api ./
USER node
EXPOSE 8080
CMD ["node", "dist/apps/api/src/main.js"]
