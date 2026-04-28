# Runeword Chronicle — Colyseus server
# Multi-stage to keep the runtime image small. Workspace-aware (pnpm + monorepo).

FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# ---- deps ----
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
# server tsconfig pulls in client/src/data/** for type-checking; keep it minimal
COPY apps/client/package.json ./apps/client/
RUN pnpm install --frozen-lockfile --prod=false

# ---- build (just compile shared; server runs via tsx at runtime) ----
FROM deps AS build
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/client/src/data ./apps/client/src/data
# Force-remove any stale .js files (Docker cache may keep old shadows that break tsx ESM resolution)
RUN find apps/client/src/data apps/server/src -name "*.js" -type f -delete 2>/dev/null || true
RUN pnpm --filter shared build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
# Allow more heap for tsx's runtime ESM transform on Render's 512MB free tier
ENV NODE_OPTIONS="--max-old-space-size=448"
# PORT is injected by the host (Render/Fly). Default to 8080 only if missing.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/client/src/data ./apps/client/src/data
COPY --from=build /app/pnpm-workspace.yaml /app/package.json /app/tsconfig.base.json ./

WORKDIR /app/apps/server
EXPOSE 8080
# Render runs its own healthCheckPath probe; Docker HEALTHCHECK is redundant and slim has no wget.
CMD ["pnpm", "start"]
