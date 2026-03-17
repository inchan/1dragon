# Coding Conventions

**Analysis Date:** 2026-03-18

## Naming Patterns

**Files:**
- Use kebab-case file names for most source files in `apps/api/src`, such as `apps/api/src/api/media/job-routes.ts`, `apps/api/src/application/media/generate-video.usecase.ts`, and `apps/api/src/infrastructure/providers/social/meta-graph.adapter.ts`.
- Use kebab-case test names colocated with implementation, such as `apps/api/src/domain/media/entities.test.ts` and `apps/web/src/features/video-output/model.test.ts`.
- Use `index.ts` barrels to expose feature or package surfaces from `apps/web/src/features/*/index.ts`, `apps/web/src/widgets/video-creator/index.ts`, `apps/api/src/domain/media/index.ts`, `packages/shared/src/index.ts`, and `packages/ui/src/index.ts`.
- Use TanStack Router file naming in `apps/web/src/pages`, including dynamic routes like `apps/web/src/pages/studio/result/$jobId.tsx` and root layout files like `apps/web/src/pages/__root.tsx`.
- Expect a small formatting/style exception set in UI/auth files such as `packages/ui/src/components/button.tsx`, `apps/web/src/features/auth/use-auth.ts`, and `apps/web/src/pages/login/page.tsx`, which still use semicolons and 2-space indentation.

**Functions:**
- Use camelCase for functions and helpers: `buildDeterministicJobId` in `apps/api/src/api/media/helpers.ts`, `safeErrorMessage` in `apps/api/src/shared/error-utils.ts`, `formatVideoFileName` in `apps/web/src/features/video-output/model.ts`, and `recommendPersonaOptions` in `apps/web/src/features/model-persona/recommendations.ts`.
- Prefix React hooks with `use`, as in `useJobStream` in `apps/web/src/features/notification/use-job-stream.ts`, `useProfile` in `apps/web/src/pages/settings/profile/hooks.ts`, and `useQuota` in `apps/web/src/features/payment/hooks.ts`.
- Prefix route factories with `create`, such as `createUsersRouter` in `apps/api/src/api/users/routes.ts` and `createJobSubRouter` in `apps/api/src/api/media/job-routes.ts`.

**Variables:**
- Use camelCase for locals and parameters, with uppercase constants for module-level invariants like `MAX_RETRY_COUNT` in `apps/api/src/api/media/helpers.ts`, `QUERY_KEYS` in `apps/web/src/features/payment/hooks.ts`, and `DELETION_GRACE_PERIOD_MS` in `apps/api/src/api/users/controller.ts`.
- Use descriptive `mock*` names for test doubles, especially when paired with `vi.hoisted`, as in `apps/api/src/main.health.test.ts`, `apps/api/src/api/media/job-routes.test.ts`, and `apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts`.

**Types:**
- Use PascalCase for interfaces, type aliases, classes, and enums. This is enforced as a Biome naming rule in `tooling/biome/biome.json`.
- Suffix domain value objects with `VO`, such as `QualityScoreVO` and `JobStatusVO` in `apps/api/src/domain/media/value-objects.ts`.
- Use `*Port` and `*UseCase` naming for boundaries and application services, such as `PromptBuilderPort` in `apps/api/src/domain/media/ports.ts` and `GenerateVideoUseCase` in `apps/api/src/application/media/generate-video.usecase.ts`.

## Code Style

**Formatting:**
- Use Biome as the default formatter via `biome.json` and `tooling/biome/biome.json`.
- Match the dominant project style: tabs for indentation, 100-character line width, single quotes, and no required semicolons. Representative files are `apps/api/src/main.ts`, `apps/api/src/domain/media/services.ts`, `apps/web/src/features/payment/hooks.ts`, and `packages/shared/src/result.ts`.
- Keep section dividers as lightweight ASCII comments when a file is long, for example the `// ── ... ─────────────────` separators in `apps/api/src/api/media/helpers.ts`, `apps/web/src/widgets/video-creator/wizard-reducer.ts`, and `packages/shared/src/index.ts`.
- Preserve existing local style in exception files instead of reformatting them opportunistically. `packages/ui/src/components/button.tsx` and `apps/web/src/features/auth/use-auth.ts` currently follow semicolon-heavy shadcn/auth-style formatting.

**Linting:**
- Rely on Biome recommended lint rules at the repo level through `tooling/biome/biome.json`.
- Treat excessive cognitive complexity as a warning, not an error, per `tooling/biome/biome.json`.
- Apply web-specific ESLint flat config from `apps/web/eslint.config.js` on top of Biome. That config brings in FSD-style boundary checks from `tooling/eslint/index.js`.
- Respect the intended web import boundaries from `tooling/eslint/index.js`: `app -> widgets -> features -> shared`, with cross-feature imports blocked unless they stay inside the same feature.

## Import Organization

**Order:**
1. Standard library or platform imports first, such as `node:crypto` in `apps/api/src/api/media/helpers.ts` and `react` in `apps/web/src/App.tsx`.
2. Third-party packages next, such as `hono`, `zod`, `@tanstack/react-query`, and `vitest` in `apps/api/src/main.ts`, `apps/web/src/features/payment/hooks.ts`, and test files across the repo.
3. Workspace packages and aliases next, such as `@1dragon/shared` and `@/infrastructure/logging/index.js` in `apps/api/src/domain/media/services.ts` and `apps/web/src/lib/api.ts`.
4. Relative same-package imports last, such as `./wizard-reducer` in `apps/web/src/widgets/video-creator/index.ts` and `./entities.js` in `apps/api/src/domain/media/index.ts`.

**Path Aliases:**
- Use `@/*` inside both `apps/api` and `apps/web` according to `apps/api/tsconfig.json` and `apps/web/tsconfig.json`.
- Use workspace package imports for shared contracts and UI primitives: `@1dragon/shared` from `apps/api/src/domain/media/services.ts` and `apps/web/src/lib/api.ts`, plus `@1dragon/ui` from `apps/web/src/pages/login/page.tsx`.
- Prefer barrels when a folder exposes a public surface, such as `apps/web/src/features/model-persona/index.ts`, `apps/web/src/features/video-output/index.ts`, and `apps/api/src/infrastructure/logging/index.ts`.

## Error Handling

**Patterns:**
- Validate environment and request payloads with Zod. Examples: `apps/api/src/shared/config.ts`, `apps/api/src/api/media/helpers.ts`, `apps/api/src/api/users/routes.ts`, and shared request/response schemas in `packages/shared/src/schemas/*.ts`.
- Use `.safeParse(...)` in Hono routes and return structured `c.json(...)` validation errors instead of throwing. Representative files are `apps/api/src/api/media/job-routes.ts`, `apps/api/src/api/payments/routes.ts`, `apps/api/src/api/products/routes.ts`, and `apps/api/src/api/users/routes.ts`.
- Use `Result<T, E>` from `packages/shared/src/result.ts` when a service/controller wants typed success-or-failure values instead of exceptions. `apps/api/src/api/users/controller.ts` uses `ok(...)` and `err(...)` with `AppError`.
- Throw plain `Error` inside value objects and infrastructure adapters when invalid input or provider failures should fail fast. Examples: `apps/api/src/domain/media/value-objects.ts`, `apps/api/src/domain/content/entities.ts`, `apps/api/src/infrastructure/providers/social/meta-graph.adapter.ts`, and `apps/web/src/lib/api.ts`.
- Keep API-level masking centralized. `apps/api/src/main.ts` logs unexpected failures and hides internal details in production; `apps/api/src/shared/error-utils.ts` exposes the same masking rule for helper-level use.
- Frontend hooks normalize unknown failures into `Error` instances before surfacing them to React Query consumers, as shown in `apps/web/src/pages/settings/profile/hooks.ts`.

## Logging

**Framework:** `pino` in `apps/api/src/infrastructure/logging/logger.ts`

**Patterns:**
- Use structured logs with context objects first and a message string second, such as `logger.error({ error, userId }, 'Failed to schedule account deletion')` in `apps/api/src/api/users/controller.ts`.
- Keep runtime context in snake_case fields like `request_id`, `user_id`, and `job_id`, matching `LogContext` in `apps/api/src/infrastructure/logging/logger.ts`.
- Attach per-request context in middleware with `requestLoggerMiddleware()` from `apps/api/src/infrastructure/logging/request-logger.ts`.
- Create child loggers instead of manually repeating fields when context should persist, using `createChildLogger(...)` from `apps/api/src/infrastructure/logging/logger.ts`.
- Treat logging as an API/backend concern. The web app uses Sentry initialization in `apps/web/src/sentry.ts` and `apps/web/src/main.tsx`, but application logging is concentrated in `apps/api`.

## Comments

**When to Comment:**
- Use comments to label sections, summarize intent, or explain operational constraints. Good examples are the section headers in `apps/api/src/api/media/helpers.ts`, `apps/web/src/widgets/video-creator/wizard-reducer.test.ts`, and `packages/shared/src/index.ts`.
- Use inline comments sparingly to explain non-obvious operational behavior, such as SSE broker handling in `apps/web/src/features/notification/use-job-stream.ts` and provider-specific expectations in `apps/api/src/infrastructure/providers/social/meta-graph.adapter.test.ts`.
- Korean comments are common in API routes, controller code, scripts, Playwright tests, and Playwright config. Preserve the current language used by the surrounding file instead of translating arbitrarily.

**JSDoc/TSDoc:**
- Use docblocks selectively for exported types and functions when the code is not obvious. `apps/api/src/api/users/controller.ts` documents result types and controller operations with JSDoc-style comments.
- Do not add blanket TSDoc to every helper. Most pure helpers and domain classes in `apps/api/src/domain/*` and `apps/web/src/features/*` rely on strong naming instead.

## Function Design

**Size:**
- Keep pure helpers small and focused. Representative helper files are `apps/api/src/api/media/helpers.ts`, `apps/api/src/shared/error-utils.ts`, `apps/web/src/features/video-output/model.ts`, and `apps/web/src/lib/studio-workspace.ts`.
- Allow larger orchestration functions only where state coordination is the core job, such as `wizardReducer` in `apps/web/src/widgets/video-creator/wizard-reducer.ts`, `useJobStream` in `apps/web/src/features/notification/use-job-stream.ts`, and the Hono bootstrap in `apps/api/src/main.ts`.

**Parameters:**
- Prefer object parameters when the input is complex or likely to grow. This pattern appears in `apps/api/src/application/media/generate-video.usecase.ts`, `apps/api/src/infrastructure/media/prompt-builder.ts`, and `apps/web/src/features/notification/use-job-stream.ts`.
- Use primitive positional parameters for tight utility functions, such as `safeErrorMessage(error, nodeEnv)` in `apps/api/src/shared/error-utils.ts` and `resolvePlatformLabel(platform)` in `apps/web/src/features/video-output/model.ts`.

**Return Values:**
- Declare explicit return types on exported functions and hooks, especially in API and shared code. Examples include `Promise<Result<...>>` in `apps/api/src/api/users/controller.ts`, `ReturnType<typeof useQuery<...>>` in `apps/web/src/features/payment/hooks.ts`, and `Promise<T>` in `apps/web/src/lib/api.ts`.
- Return immutable-looking data structures with `readonly` properties in DTO-style types and domain inputs, as seen in `apps/api/src/domain/media/services.ts`, `apps/api/src/api/media/helpers.ts`, and `packages/shared/src/result.ts`.

## Module Design

**Exports:**
- Expose stable surfaces through barrels or explicit named exports instead of default exports for most modules. Examples: `packages/shared/src/index.ts`, `packages/ui/src/index.ts`, `apps/web/src/features/video-output/index.ts`, and `apps/api/src/infrastructure/providers/i2v/index.ts`.
- Keep default exports mostly for framework entry points. `apps/api/src/main.ts` exports the Hono app as default after constructing it.
- Separate layers clearly in `apps/api/src`: `api` for Hono handlers, `application` for use cases, `domain` for entities/value objects/policies, and `infrastructure` for adapters, persistence, and queues.
- Keep web stateful logic near features/widgets. `apps/web/src/features/*` holds reusable domain/UI logic, while `apps/web/src/pages/*` composes screens and `apps/web/src/widgets/video-creator/*` owns the multi-step wizard orchestration.

**Barrel Files:**
- Use barrels when a folder is intended to be imported externally. Current public barrels include `apps/web/src/features/auth/index.ts`, `apps/web/src/features/content-generation/index.ts`, `apps/web/src/features/model-persona/index.ts`, `apps/web/src/features/video-output/index.ts`, `apps/web/src/widgets/video-creator/index.ts`, `apps/api/src/domain/media/index.ts`, `apps/api/src/infrastructure/logging/index.ts`, `packages/shared/src/index.ts`, and `packages/ui/src/index.ts`.
- Avoid creating barrels for every internal folder. Many API folders import implementation files directly, especially under `apps/api/src/application/*` and `apps/api/src/infrastructure/providers/*`.

---

*Convention analysis: 2026-03-18*
