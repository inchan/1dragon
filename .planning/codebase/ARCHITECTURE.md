# Architecture

**Analysis Date:** 2026-03-18

## Pattern Overview

**Overall:** Workspace monorepo with a modular-monolith backend and a route-driven React frontend.

**Key Characteristics:**
- Runtime code is split into two deployable apps, `apps/api` and `apps/web`, with shared contracts in `packages/shared` and shared UI primitives in `packages/ui`.
- Backend source is organized as `api -> application -> domain -> infrastructure`, most clearly under `apps/api/src/api`, `apps/api/src/application`, `apps/api/src/domain`, and `apps/api/src/infrastructure`.
- Runtime composition is manual. Route factories such as `apps/api/src/api/media/routes.ts` and workers such as `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts` instantiate repositories, adapters, and use cases directly instead of resolving them from a central container.
- One API process started from `apps/api/src/main.ts` owns HTTP routing, BullMQ workers, schedulers, and the SSE outbox dispatcher.
- Frontend structure is route/widget/feature oriented under `apps/web/src/pages`, `apps/web/src/widgets`, `apps/web/src/features`, and `apps/web/src/lib`, with TanStack Router generating `apps/web/src/routeTree.gen.ts`.

## Layers

**Web Presentation:**
- Purpose: Render browser routes, page shells, and user interactions for the studio, dashboard, billing, onboarding, and auth flows.
- Location: `apps/web/src/pages`, `apps/web/src/widgets`, `apps/web/src/features`, `apps/web/src/lib`
- Contains: TanStack Router file routes such as `apps/web/src/pages/studio/create/index.tsx` and `apps/web/src/pages/studio/result/$jobId.tsx`, screen widgets such as `apps/web/src/widgets/video-creator/wizard.tsx`, feature hooks/components such as `apps/web/src/features/notification/use-job-stream.ts`, and browser-side API glue in `apps/web/src/lib/api.ts`.
- Depends on: `@1dragon/ui`, `@1dragon/shared`, `@tanstack/react-query`, `@tanstack/react-router`, browser `fetch`, and `better-auth`.
- Used by: `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, and generated route metadata in `apps/web/src/routeTree.gen.ts`.

**API Interface:**
- Purpose: Accept HTTP requests, validate payloads, attach auth context, shape JSON responses, and mount sub-routers.
- Location: `apps/api/src/api`
- Contains: Hono router factories such as `apps/api/src/api/media/routes.ts`, `apps/api/src/api/media/job-routes.ts`, `apps/api/src/api/products/routes.ts`, `apps/api/src/api/payments/routes.ts`, and `apps/api/src/api/users/routes.ts`.
- Depends on: `apps/api/src/infrastructure/auth/hono-handler.ts`, application use cases from `apps/api/src/application`, repositories/adapters from `apps/api/src/infrastructure`, and shared schemas from `packages/shared/src/schemas`.
- Used by: `apps/api/src/main.ts`.

**Application Orchestration:**
- Purpose: Coordinate business workflows that span multiple domain objects and infrastructure ports.
- Location: `apps/api/src/application`
- Contains: Use cases such as `apps/api/src/application/media/generate-video.usecase.ts`, `apps/api/src/application/product/analyze-image.usecase.ts`, `apps/api/src/application/model-persona/generate-model-image.usecase.ts`, and payment flows in `apps/api/src/application/payment/*.usecase.ts`.
- Depends on: Domain entities, value objects, services, and ports from `apps/api/src/domain/**`; infrastructure implementations are injected at call sites.
- Used by: Route modules in `apps/api/src/api/**` and workers in `apps/api/src/infrastructure/queue/workers/**`.

**Domain Model:**
- Purpose: Hold core business types, policies, status transitions, and port contracts that are independent of transport or vendor choice.
- Location: `apps/api/src/domain`
- Contains: Media entities and ports in `apps/api/src/domain/media/entities.ts`, `apps/api/src/domain/media/ports.ts`, `apps/api/src/domain/media/services.ts`, planning types in `apps/api/src/domain/media/planning.ts`, payment policies in `apps/api/src/domain/payment/policies.ts`, and model-persona/product contracts in `apps/api/src/domain/model-persona` and `apps/api/src/domain/product`.
- Depends on: Shared enums and schemas from `@1dragon/shared`; domain code does not depend on Hono, Drizzle, or provider SDKs.
- Used by: `apps/api/src/application/**` and infrastructure implementations such as `apps/api/src/infrastructure/media/prompt-builder.ts` and `apps/api/src/infrastructure/providers/i2v/provider-router.ts`.

**Infrastructure And Runtime:**
- Purpose: Implement persistence, auth, queueing, streaming, logging, schedulers, storage, and third-party media/payment/social adapters.
- Location: `apps/api/src/infrastructure`, plus API-only helpers in `apps/api/src/shared`
- Contains: Drizzle setup in `apps/api/src/infrastructure/persistence/db.ts` and `apps/api/src/infrastructure/persistence/schema.ts`, BullMQ setup in `apps/api/src/infrastructure/queue/bullmq.config.ts`, workers in `apps/api/src/infrastructure/queue/workers`, auth in `apps/api/src/infrastructure/auth`, logging in `apps/api/src/infrastructure/logging`, SSE/outbox in `apps/api/src/infrastructure/notification`, provider adapters in `apps/api/src/infrastructure/providers`, media composition in `apps/api/src/infrastructure/media`, and config parsing in `apps/api/src/shared/config.ts`.
- Depends on: External SDKs, PostgreSQL, Redis, S3-compatible storage, and the port contracts defined under `apps/api/src/domain/**`.
- Used by: `apps/api/src/main.ts`, route modules, and application use cases.

**Shared Workspace Packages:**
- Purpose: Keep cross-app contracts, enums, utilities, and UI primitives in one place.
- Location: `packages/shared`, `packages/ui`, `packages/config`
- Contains: Zod schemas and cross-app types in `packages/shared/src/schemas/*.ts`, agentic planning helpers in `packages/shared/src/agentic.ts`, UI primitives in `packages/ui/src/components/*.tsx`, and a placeholder package scaffold in `packages/config/src/index.ts`.
- Depends on: `zod` in `packages/shared` and React utility dependencies in `packages/ui`.
- Used by: Both `apps/api` and `apps/web`.

## Data Flow

**Studio Job Generation And Tracking:**

1. `apps/web/src/widgets/video-creator/wizard.tsx` collects upload, analysis, persona, copy, and platform inputs, stores local interaction state in `apps/web/src/widgets/video-creator/wizard-reducer.ts`, and calls `api.createVideoJob` in `apps/web/src/lib/api.ts`.
2. `apps/api/src/api/media/job-routes.ts` validates the request against `createVideoJobRequestSchema` from `packages/shared/src/schemas/media.ts`, creates a `video_jobs` row through `apps/api/src/infrastructure/persistence/repositories/video-job.repository.ts`, and enqueues `QueueName.MEDIA_GENERATE` through `apps/api/src/infrastructure/queue/bullmq.config.ts`.
3. `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts` loads the persisted job, resolves agentic/shortform configuration, optionally runs `GenerateModelImageUseCase` from `apps/api/src/application/model-persona/generate-model-image.usecase.ts`, and then executes `GenerateVideoUseCase` from `apps/api/src/application/media/generate-video.usecase.ts`.
4. `apps/api/src/application/media/generate-video.usecase.ts` plans the story with `apps/api/src/application/media/story-planner.ts`, reviews artifacts with `apps/api/src/application/media/review-gates.ts`, compiles prompts with `apps/api/src/infrastructure/media/prompt-builder.ts`, routes provider execution through adapters under `apps/api/src/infrastructure/providers/i2v`, and composes/renders outputs through `apps/api/src/infrastructure/media/ffmpeg-composer.ts`.
5. The worker persists transitions and outputs with `apps/api/src/infrastructure/persistence/repositories/video-job.repository.ts`, `apps/api/src/infrastructure/persistence/job-event.helper.ts`, and the tables defined in `apps/api/src/infrastructure/persistence/schema.ts`.
6. Real-time updates are emitted in two ways: direct broker publish in `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts` and periodic DB-backed dispatch from `apps/api/src/infrastructure/notification/outbox-dispatcher.ts` to `apps/api/src/infrastructure/notification/sse-broker.ts`.
7. `apps/web/src/features/notification/use-job-stream.ts` consumes `/api/v1/media/jobs/:jobId/stream`, updates the React Query cache, and falls back to polling `GET /api/v1/media/jobs/:jobId` if SSE drops; `apps/web/src/pages/studio/result/$jobId.tsx` and `apps/web/src/pages/dashboard/index.tsx` render the persisted state.

**Product Analysis And Composite Preparation:**

1. `apps/web/src/pages/products/analyze/index.tsx` uploads the selected image through `api.analyzeProduct` in `apps/web/src/lib/api.ts`.
2. `apps/api/src/api/products/routes.ts` validates multipart input, normalizes the image with `sharp`, uploads it through `apps/api/src/infrastructure/storage/s3-client.ts`, and calls `AnalyzeImageUseCase` from `apps/api/src/application/product/analyze-image.usecase.ts`.
3. `apps/api/src/application/product/analyze-image.usecase.ts` coordinates vision analysis, noise removal, background removal, and enhanced-image generation through ports implemented under `apps/api/src/infrastructure/providers/vision`, `apps/api/src/infrastructure/providers/remove-bg`, and `apps/api/src/infrastructure/providers/image-gen`.
4. Persisted analysis records are written through `apps/api/src/infrastructure/persistence/repositories/product-analysis.repository.ts` and returned to the web app using contracts from `packages/shared/src/schemas/product.ts`.
5. If the user requests a wearable composite, `apps/web/src/pages/products/analyze/index.tsx` or `apps/web/src/widgets/video-creator/wizard.tsx` calls `/api/v1/media/model-composite`, which is handled in `apps/api/src/api/media/composite-routes.ts` via `GenerateModelImageUseCase`.

**State Management:**
- Browser server state lives in React Query via `apps/web/src/lib/query-client.ts` and feature hooks such as `apps/web/src/features/payment/hooks.ts`.
- Browser wizard state is reducer-driven local state in `apps/web/src/widgets/video-creator/wizard-reducer.ts`.
- API system-of-record state lives in PostgreSQL tables from `apps/api/src/infrastructure/persistence/schema.ts`, queue execution state lives in Redis/BullMQ from `apps/api/src/infrastructure/queue/bullmq.config.ts`, and stream replay state lives in memory inside `apps/api/src/infrastructure/notification/sse-broker.ts`.

## Key Abstractions

**Shared Contract Package:**
- Purpose: Define the request/response boundary that both apps compile against.
- Examples: `packages/shared/src/schemas/media.ts`, `packages/shared/src/schemas/product.ts`, `packages/shared/src/enums.ts`
- Pattern: Put transport schemas, enums, and portable helper types in `packages/shared/src/**` and import them from both runtimes instead of duplicating DTOs.

**Media Domain Model:**
- Purpose: Represent jobs, variants, assets, queue policies, and state transitions without coupling to BullMQ or Hono.
- Examples: `apps/api/src/domain/media/entities.ts`, `apps/api/src/domain/media/events.ts`, `apps/api/src/domain/media/services.ts`, `apps/api/src/domain/media/ports.ts`
- Pattern: Use classes/value objects for invariants and plain TypeScript interfaces for port contracts and persistence records.

**Story Planning And Review Artifacts:**
- Purpose: Capture shortform-specific planning data that drives prompt building and gate checks.
- Examples: `apps/api/src/domain/media/planning.ts`, `apps/api/src/application/media/story-planner.ts`, `apps/api/src/application/media/storyline-elements.ts`, `apps/api/src/application/media/review-gates.ts`
- Pattern: Generate planning artifacts first, then build prompts and enforce review gates before provider execution.

**Worker-Orchestrated Media Pipeline:**
- Purpose: Turn one queued job into persisted media output, variant records, and streamable status updates.
- Examples: `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts`, `apps/api/src/application/media/generate-video.usecase.ts`, `apps/api/src/application/media/render-variants.usecase.ts`
- Pattern: Keep BullMQ and persistence concerns in the worker; keep media-specific orchestration in application use cases.

**Notification Outbox And SSE Stream:**
- Purpose: Convert persisted job events into client-visible real-time updates.
- Examples: `apps/api/src/infrastructure/persistence/job-event.helper.ts`, `apps/api/src/infrastructure/notification/outbox-dispatcher.ts`, `apps/api/src/infrastructure/notification/sse-broker.ts`, `apps/web/src/features/notification/use-job-stream.ts`
- Pattern: Persist status events first, then broadcast them; the client treats the persisted job endpoint as the fallback source of truth.

## Entry Points

**API Runtime:**
- Location: `apps/api/src/main.ts`
- Triggers: `pnpm --filter @1dragon/api dev`, `pnpm --filter @1dragon/api build`, or the root `pnpm dev` workspace command from `package.json`
- Responsibilities: Initialize Sentry, configure the Hono server, mount auth and API routers, start BullMQ workers, start schedulers, and start the notification outbox dispatcher.

**Web Runtime:**
- Location: `apps/web/src/main.tsx`
- Triggers: `pnpm --filter @1dragon/web dev`, `pnpm --filter @1dragon/web build`, or the root `pnpm dev` workspace command from `package.json`
- Responsibilities: Initialize Sentry, mount `apps/web/src/App.tsx`, and hand control to the generated TanStack Router tree.

**Web Route Shell:**
- Location: `apps/web/src/pages/__root.tsx`
- Triggers: TanStack Router route resolution via `apps/web/src/routeTree.gen.ts`
- Responsibilities: Provide the shared query client, global navigation, and the persistent app shell around all route pages.

**Media Generation Worker:**
- Location: `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts`
- Triggers: BullMQ jobs enqueued from `apps/api/src/api/media/job-routes.ts`
- Responsibilities: Resolve workflow configuration, run the generation pipeline, persist transitions and variants, retry or dead-letter failures, and publish status updates.

**Operational Scripts:**
- Location: `apps/api/scripts/*.ts`, `apps/api/scripts/*.mjs`, `tooling/*.mjs`, `tooling/*.sh`
- Triggers: Direct CLI execution such as `pnpm --filter @1dragon/api smoke:gemini:video` or root scripts such as `pnpm media:smoke:shortform`
- Responsibilities: Run smoke tests, research loops, calibration passes, and validation utilities outside the request path.

## Error Handling

**Strategy:** Validate at the edge, persist explicit job state transitions, and return structured JSON envelopes rather than throwing raw infrastructure errors to clients.

**Patterns:**
- Route modules such as `apps/api/src/api/media/job-routes.ts`, `apps/api/src/api/products/routes.ts`, and `apps/api/src/api/payments/routes.ts` validate input with Zod schemas from `packages/shared/src/schemas/*.ts` and return `{ success, error }` responses.
- `apps/api/src/main.ts` provides a global Hono `onError` handler and a `notFound` handler for uncaught route failures.
- `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts` translates runtime failures into `DEGRADED_FAILED` or `FAILED`, persists the result, and optionally rethrows for BullMQ retry or routes the terminal failure to `QueueName.MEDIA_GENERATE_DLQ`.
- `apps/web/src/lib/api.ts` normalizes non-2xx responses into thrown `Error` instances, and `apps/web/src/features/notification/use-job-stream.ts` falls back from SSE to polling when the stream connection fails.

## Cross-Cutting Concerns

**Logging:** Structured logging lives in `apps/api/src/infrastructure/logging/logger.ts`, `apps/api/src/infrastructure/logging/request-logger.ts`, and child loggers created inside workers and adapters such as `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts`.
**Validation:** Environment validation happens in `apps/api/src/shared/config.ts`; transport validation lives in `packages/shared/src/schemas/*.ts`; route-specific helpers live in `apps/api/src/api/media/helpers.ts`.
**Authentication:** Server auth is mounted through `apps/api/src/infrastructure/auth/hono-handler.ts` and configured in `apps/api/src/infrastructure/auth/better-auth.ts`; client auth accessors live in `apps/web/src/features/auth/client.ts` and `apps/web/src/features/auth/use-auth.ts`.
**Monitoring:** Runtime monitoring is initialized in `apps/api/src/sentry.ts` and `apps/web/src/sentry.ts`.

---

*Architecture analysis: 2026-03-18*
