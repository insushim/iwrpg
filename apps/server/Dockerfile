# Runeword Chronicle — Colyseus server
# Multi-stage. Server is bundled into a single .mjs at build time (esbuild),
# so runtime has zero tsx ESM surprises.

FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# ---- deps ----
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/
RUN pnpm install --frozen-lockfile --prod=false

# ---- build: compile shared, then bundle server with esbuild ----
FROM deps AS build
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/client/src/data ./apps/client/src/data
RUN find apps/client/src/data apps/server/src -name "*.js" -type f -delete 2>/dev/null || true
RUN pnpm --filter shared build
RUN pnpm --filter server bundle

# ---- runtime: only ship node_modules + the bundled .mjs ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/pnpm-workspace.yaml /app/package.json ./

WORKDIR /app/apps/server
EXPOSE 8080
CMD ["node", "dist/index.mjs"]
