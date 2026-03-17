# External Integrations

**Analysis Date:** 2026-03-18

## APIs & External Services

**Core Runtime Providers:**
- S3-compatible object storage - media files and derived assets are uploaded and read through `apps/api/src/infrastructure/storage/s3-client.ts`.
  - SDK/Client: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - Auth: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
- Toss Payments - billing API calls and webhook validation are implemented in `apps/api/src/infrastructure/providers/payment/toss-payments.client.ts`, `apps/api/src/api/payments/routes.ts`, and `apps/api/src/application/payment/handle-toss-webhook.usecase.ts`.
  - SDK/Client: raw `fetch`
  - Auth: `TOSSPAYMENTS_SECRET`, `TOSSPAYMENTS_WEBHOOK_SECRET`
- TikTok Business API - social OAuth and video upload flows are implemented in `apps/api/src/infrastructure/providers/social/tiktok-business.adapter.ts` and exposed via `apps/api/src/api/media/social-routes.ts`.
  - SDK/Client: raw `fetch`
  - Auth: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`
- Meta Graph / Instagram publishing - Instagram OAuth and upload flows are implemented in `apps/api/src/infrastructure/providers/social/meta-graph.adapter.ts` and exposed via `apps/api/src/api/media/social-routes.ts`.
  - SDK/Client: raw `fetch`
  - Auth: `META_APP_ID`, `META_APP_SECRET`
- Better Auth social providers - Google, Kakao, and Apple login providers are configured in `apps/api/src/infrastructure/auth/better-auth.ts`; the web client uses `better-auth/react` in `apps/web/src/features/auth/client.ts`.
  - SDK/Client: `better-auth`, `better-auth/react`, `@better-auth/drizzle-adapter`
  - Auth: `GOOGLE_CLIENT_ID`, `KAKAO_CLIENT_ID`, `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`
- Google Generative Language API - the live image-to-video path uses Gemini Veo in `apps/api/src/infrastructure/providers/i2v/gemini-veo.adapter.ts`, and composite image generation uses Imagen in `apps/api/src/infrastructure/providers/image-gen/gemini-model-composite.adapter.ts`.
  - SDK/Client: raw `fetch`
  - Auth: `GEMINI_VEO_API_KEY`, `GEMINI_IMAGEN_API_KEY`
- Runway, Hailuo, and MiniMax video generation - additional I2V providers are routed in `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts` through adapters in `apps/api/src/infrastructure/providers/i2v/runway.adapter.ts`, `apps/api/src/infrastructure/providers/i2v/hailuo.adapter.ts`, and `apps/api/src/infrastructure/providers/i2v/minimax.adapter.ts`.
  - SDK/Client: raw `fetch`
  - Auth: `RUNWAY_API_KEY`, `HAILUO_API_KEY`, `MINIMAX_API_KEY`

**Observability:**
- Sentry - backend initialization is in `apps/api/src/sentry.ts` and frontend initialization is in `apps/web/src/sentry.ts`.
  - SDK/Client: `@sentry/node`, `@sentry/react`
  - Auth: `SENTRY_DSN`, `VITE_SENTRY_DSN`

**Script-Only / Dormant Adapters:**
- OpenAI Responses API - used only by the research loop in `apps/api/scripts/research-driven-loop.ts`.
  - SDK/Client: raw `fetch`
  - Auth: `OPENAI_API_KEY`
- Google Generative Language smoke scripts - direct provider checks live in `apps/api/scripts/test-veo-pipeline.ts`, `apps/api/scripts/test-imagen-smoke.ts`, and `apps/api/scripts/test-gemini-composite-smoke.ts`.
  - SDK/Client: raw `fetch`
  - Auth: `GEMINI_VEO_API_KEY`, `GEMINI_IMAGEN_API_KEY`, and script fallback support for `GEMINI_API_KEY`
- Anthropic, OpenAI copywriter, Deepgram, Google Cloud TTS, ElevenLabs, and Udio adapters exist under `apps/api/src/infrastructure/providers/`, but no construction path from `apps/api/src/main.ts` or the active worker graph was detected.
  - SDK/Client: raw `fetch`
  - Auth: adapter-local options only; no central env schema entries exist for most of these services in `apps/api/src/shared/config.ts`

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL`
  - Client: `drizzle-orm/node-postgres` + `pg` in `apps/api/src/infrastructure/persistence/db.ts`
  - Schema owners:
    - Product/app tables: `apps/api/src/infrastructure/persistence/schema.ts`
    - Auth/session tables: `apps/api/src/infrastructure/auth/schema.ts`
  - Key persisted integration data:
    - Billing state and transaction history in `subscriptions` and `payment_transactions`
    - Webhook idempotency and payload history in `webhook_events`
    - Job outbox/SSE state in `job_events`

**File Storage:**
- S3-compatible object storage
  - Implementation: `apps/api/src/infrastructure/storage/s3-client.ts`
  - Used by: product image uploads in `apps/api/src/api/products/routes.ts`, composite image generation in `apps/api/src/infrastructure/providers/image-gen/gemini-model-composite.adapter.ts`, and TTS adapters that upload audio artifacts under `apps/api/src/infrastructure/providers/tts/`

**Caching:**
- Redis
  - Connection: `REDIS_URL`
  - Client: `ioredis` in `apps/api/src/infrastructure/queue/bullmq.config.ts`
  - Used for:
    - BullMQ queues and workers in `apps/api/src/infrastructure/queue/`
    - OAuth CSRF state in `apps/api/src/api/media/oauth-state.ts`
    - Social access token storage in `apps/api/src/infrastructure/social/redis-social-token.repository.ts`

## Authentication & Identity

**Auth Provider:**
- Better Auth
  - Implementation: `apps/api/src/infrastructure/auth/better-auth.ts` with Drizzle-backed session/account tables from `apps/api/src/infrastructure/auth/schema.ts`
  - Modes enabled:
    - Email/password login
    - Social login for Google, Kakao, and Apple when provider env vars are present
  - Frontend client: `apps/web/src/features/auth/client.ts`
  - Session endpoints are mounted at `/api/auth/*` in `apps/api/src/infrastructure/auth/hono-handler.ts`

## Monitoring & Observability

**Error Tracking:**
- Sentry
  - Backend: `apps/api/src/sentry.ts`
  - Frontend: `apps/web/src/sentry.ts`

**Logs:**
- Pino structured logging in `apps/api/src/infrastructure/logging/logger.ts`
- Request logging middleware is mounted from `apps/api/src/main.ts`

## CI/CD & Deployment

**Hosting:**
- Not detected
- Local infrastructure is provided only for development via `docker-compose.yml` (PostgreSQL and Redis only)

**CI Pipeline:**
- GitHub Actions in `.github/workflows/ci.yml`
- CI installs dependencies, runs typecheck/lint/format/test/build, and runs Playwright E2E on pull requests

## Environment Configuration

**Required env vars:**
- Core runtime:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `S3_ENDPOINT`
  - `S3_ACCESS_KEY`
  - `S3_SECRET_KEY`
  - `S3_BUCKET`
- Auth and app URL surface:
  - `API_URL`
  - `WEB_URL`
  - `GOOGLE_CLIENT_ID`
  - `KAKAO_CLIENT_ID`
  - `APPLE_CLIENT_ID`
  - `APPLE_TEAM_ID`
  - `APPLE_KEY_ID`
  - `APPLE_PRIVATE_KEY`
- Billing and monitoring:
  - `TOSSPAYMENTS_SECRET`
  - `TOSSPAYMENTS_WEBHOOK_SECRET`
  - `SENTRY_DSN`
  - `VITE_SENTRY_DSN`
- Social:
  - `TIKTOK_CLIENT_KEY`
  - `TIKTOK_CLIENT_SECRET`
  - `META_APP_ID`
  - `META_APP_SECRET`
- AI/media:
  - `GEMINI_VEO_API_KEY`
  - `GEMINI_IMAGEN_API_KEY`
  - `RUNWAY_API_KEY`
  - `HAILUO_API_KEY`
  - `MINIMAX_API_KEY`
  - `ELEVENLABS_API_KEY`
  - `OPENAI_API_KEY` for `apps/api/scripts/research-driven-loop.ts`
  - `VITE_API_URL` for the web client

**Secrets location:**
- Root `.env*` files are present, but the audited source of truth is the code-level schema in `apps/api/src/shared/config.ts` plus direct reads in `apps/api/src/infrastructure/auth/better-auth.ts`, `apps/web/src/lib/api.ts`, and `apps/web/src/sentry.ts`.
- CI-only secrets are referenced in `.github/workflows/ci.yml` as `TURBO_TOKEN` and `TURBO_TEAM`.

## Webhooks & Callbacks

**Incoming:**
- Toss Payments webhook endpoint: `POST /api/v1/payments/webhooks/toss` in `apps/api/src/api/payments/routes.ts`
  - Signature validation: `apps/api/src/application/payment/handle-toss-webhook.usecase.ts`
  - Persistence/idempotency store: `apps/api/src/infrastructure/persistence/repositories/webhook-event.repository.ts` backed by `webhook_events` in `apps/api/src/infrastructure/persistence/schema.ts`

**Outgoing:**
- Toss Payments API calls for payment create/confirm/cancel originate from `apps/api/src/infrastructure/providers/payment/toss-payments.client.ts`
- TikTok and Instagram OAuth authorization URLs are generated in `apps/api/src/api/media/social-routes.ts`
  - Redirect base: `WEB_URL`
  - Browser callback targets: `/oauth/tiktok/callback` and `/oauth/instagram/callback`
- Social publish calls to TikTok and Meta originate from `apps/api/src/infrastructure/providers/social/tiktok-business.adapter.ts` and `apps/api/src/infrastructure/providers/social/meta-graph.adapter.ts`

---

*Integration audit: 2026-03-18*
