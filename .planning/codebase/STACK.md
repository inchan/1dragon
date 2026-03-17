# Technology Stack

**Analysis Date:** 2026-03-18

## Languages

**Primary:**
- TypeScript 5.7.x - application code, shared contracts, and package code live in `apps/api`, `apps/web`, `packages/shared`, `packages/ui`, and `packages/config`; shared compiler defaults are defined in `tooling/typescript/base.json`.

**Secondary:**
- JavaScript / ESM - repository config and automation use `.js` and `.mjs` files such as `apps/web/eslint.config.js`, `tooling/eslint/index.js`, `tooling/media-feedback-loop.mjs`, and `apps/api/scripts/agentic-smoke-test.mjs`.
- Shell - operational and smoke-test flows run from `tooling/gemini-shortform-test-flow.sh`, `tooling/gemini-video-review-loop.sh`, `tooling/gemini-reference-conditioned-shortform.sh`, and related scripts called from the root `package.json`.
- SQL / YAML / JSON - Drizzle migrations live in `apps/api/drizzle/migrations/*.sql`; CI and workspace orchestration live in `.github/workflows/ci.yml`, `pnpm-workspace.yaml`, `turbo.json`, `biome.json`, and `openspec/config.yaml`.

## Runtime

**Environment:**
- Node.js `>=20.0.0` is required by the root `package.json`.
- The backend is a long-running Node ESM process started from `apps/api/src/main.ts`.
- The frontend is a Vite-built browser SPA bootstrapped from `apps/web/src/main.tsx`.

**Package Manager:**
- pnpm `9.15.0` is pinned in the root `package.json`.
- Lockfile: present in `pnpm-lock.yaml`.
- Workspace layout is defined in `pnpm-workspace.yaml` for `apps/*`, `packages/*`, and `tooling/*`.

## Frameworks

**Core:**
- Hono `^4.7.0` with `@hono/node-server` `^1.19.9` - HTTP API and middleware entrypoint in `apps/api/src/main.ts`.
- React `^19.0.0` - web UI in `apps/web/src/main.tsx` and routed layout in `apps/web/src/App.tsx`.
- Vite `^6.1.0` with `@vitejs/plugin-react` `^4.3.0` - frontend dev/build tooling in `apps/web/vite.config.ts`.
- TanStack Router `^1.159.5` - SPA routing in `apps/web/src/App.tsx` and generated routes in `apps/web/src/routeTree.gen.ts`.
- TanStack Query `^5.x` - client-side data fetching and cache management in `apps/web/src/pages/__root.tsx` and `apps/web/src/lib/query-client.ts`.
- Better Auth `^1.4.18` with `@better-auth/drizzle-adapter` `1.5.0-beta.9` - authentication in `apps/api/src/infrastructure/auth/better-auth.ts` and `apps/web/src/features/auth/client.ts`.
- Drizzle ORM `^0.45.1` with `pg` `^8.18.0` - PostgreSQL persistence in `apps/api/src/infrastructure/persistence/db.ts` and schemas in `apps/api/src/infrastructure/persistence/schema.ts`.
- BullMQ `^5.68.0` with `ioredis` `^5.9.2` - async job orchestration in `apps/api/src/infrastructure/queue/bullmq.config.ts` and workers under `apps/api/src/infrastructure/queue/workers/`.

**Testing:**
- Vitest `^3.0.0` - unit/integration tests in `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`, and `packages/shared/vitest.config.ts`.
- Playwright `^1.58.2` - browser E2E tests in `apps/web/playwright.config.ts`.

**Build/Dev:**
- Turbo `^2.4.0` - monorepo orchestration in `turbo.json` and root `package.json`.
- tsup `^8.4.0` - package/app bundling for `apps/api`, `packages/shared`, `packages/ui`, and `packages/config`.
- tsx `^4.19.0` - local script execution and API dev server in `apps/api/package.json`.
- Drizzle Kit `^0.31.9` - migration generation/config in `apps/api/drizzle-kit.config.ts`.
- Biome `^1.9.4` - formatting and import organization via `biome.json` and `tooling/biome/biome.json`.
- ESLint `^9.0.0` - web linting and FSD boundary rules via `apps/web/eslint.config.js` and `tooling/eslint/index.js`.

## Key Dependencies

**Critical:**
- `hono` and `@hono/node-server` - backend request handling in `apps/api/src/main.ts`.
- `better-auth` and `@better-auth/drizzle-adapter` - session, password, and social login flows in `apps/api/src/infrastructure/auth/better-auth.ts`.
- `drizzle-orm` and `pg` - transactional persistence for users, jobs, billing, and webhooks in `apps/api/src/infrastructure/persistence/`.
- `bullmq` and `ioredis` - queueing, retries, DLQ retention, OAuth-state storage, and social token storage in `apps/api/src/infrastructure/queue/bullmq.config.ts`, `apps/api/src/api/media/oauth-state.ts`, and `apps/api/src/infrastructure/social/redis-social-token.repository.ts`.
- `@tanstack/react-router` and `@tanstack/react-query` - primary web navigation/data layer in `apps/web/src/App.tsx`, `apps/web/src/pages/__root.tsx`, and feature hooks under `apps/web/src/features/`.

**Infrastructure:**
- `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` - S3-compatible object storage client in `apps/api/src/infrastructure/storage/s3-client.ts`.
- `@sentry/node` and `@sentry/react` - backend/frontend error monitoring in `apps/api/src/sentry.ts` and `apps/web/src/sentry.ts`.
- `sharp` - server-side image normalization and metadata reads in `apps/api/src/api/products/routes.ts`.
- `pino` and `pino-pretty` - structured logging in `apps/api/src/infrastructure/logging/logger.ts`.
- `zod` - environment validation and shared request/response schema validation in `apps/api/src/shared/config.ts` and `packages/shared/src/schemas/`.
- `class-variance-authority`, `clsx`, and `tailwind-merge` - shared UI styling primitives in `packages/ui/src/components/button.tsx` and `packages/ui/src/lib/utils.ts`.

## Configuration

**Environment:**
- Treat `apps/api/src/shared/config.ts` as the authoritative API runtime schema. It requires `DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `S3_BUCKET`, and it optionally enables auth/payment/social/AI providers and Sentry.
- `apps/api/src/infrastructure/persistence/db.ts` adds operational DB knobs on top of the schema: `DB_MAX_CONNECTIONS`, `DB_IDLE_TIMEOUT`, and `DB_CONNECTION_TIMEOUT`.
- `apps/api/src/infrastructure/auth/better-auth.ts` reads `API_URL` directly for Better Auth base URL; this variable is used but not validated by `apps/api/src/shared/config.ts`.
- The web app reads `VITE_API_URL` in `apps/web/src/lib/api.ts` and `apps/web/src/features/auth/client.ts`, and reads `VITE_SENTRY_DSN` in `apps/web/src/sentry.ts`.
- Repository env files exist at `.env.example` and `.env.test`, but code-level validation comes from `apps/api/src/shared/config.ts` and `apps/web/src/vite-env.d.ts`.

**Build:**
- Monorepo task graph and cache behavior are defined in `turbo.json`.
- TypeScript baselines are centralized in `tooling/typescript/base.json`, `tooling/typescript/node.json`, and `tooling/typescript/react.json`.
- Frontend bundling and aliases are defined in `apps/web/vite.config.ts`; TypeScript path aliases are mirrored in `apps/web/tsconfig.json` and `apps/api/tsconfig.json`.
- Formatting and linting rules are centralized in `biome.json`, `tooling/biome/biome.json`, and `tooling/eslint/index.js`.
- Database migration generation is configured in `apps/api/drizzle-kit.config.ts`.
- CI uses `.github/workflows/ci.yml` and injects `TURBO_TOKEN` and `TURBO_TEAM` for remote Turbo caching.

## Platform Requirements

**Development:**
- Install Node.js 20+ and pnpm 9.15+ to satisfy the root `package.json`.
- Run local PostgreSQL and Redis; the repository ships `docker-compose.yml` for those two services.
- Provide an S3-compatible object store separately. `apps/api/src/shared/config.ts` requires S3 credentials, but `docker-compose.yml` does not provision MinIO or another object store.
- Install `ffmpeg` and `ffprobe` if you use media tooling or validation scripts. The repo depends on them in `tooling/validate-media.mjs`, `tooling/media-feedback-loop.mjs`, `tooling/gemini-video-review-loop.sh`, and `apps/api/scripts/research-driven-loop.ts`.
- Web and API development entrypoints are `apps/web/package.json` (`vite`) and `apps/api/package.json` (`tsx watch --env-file=.env src/main.ts`).

**Production:**
- No hosting/deployment manifest is detected. Build artifacts are produced by `turbo run build`, with the API bundled from `apps/api/src/main.ts` and the web app bundled by Vite from `apps/web`.
- The runtime contract assumes a Node service for `apps/api`, a static web deployment for `apps/web`, PostgreSQL, Redis, and an S3-compatible object store.
- The only repository-native automation detected is GitHub Actions CI in `.github/workflows/ci.yml`; production deployment target is not specified in code.

---

*Stack analysis: 2026-03-18*
