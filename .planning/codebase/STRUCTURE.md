# Codebase Structure

**Analysis Date:** 2026-03-18

## Directory Layout

```text
[project-root]/
├── apps/
│   ├── api/                 # Hono API, BullMQ workers, Drizzle schema/migrations, provider adapters, scripts
│   └── web/                 # Vite + React studio UI with TanStack Router and React Query
├── packages/
│   ├── shared/              # Shared enums, Zod schemas, agentic helpers, and portable utils
│   ├── ui/                  # Reusable UI primitives consumed by the web app
│   └── config/              # Workspace package scaffold for shared config exports
├── tooling/                 # Shared TypeScript/ESLint/Biome config packages and repo-level scripts
├── docs/                    # Strategy, product, research, architecture, and operations documents
├── openspec/                # Active and archived change artifacts plus current specs
├── .planning/codebase/      # Generated codebase mapping reference docs
└── artifacts/               # Ignored local media, smoke, and experiment outputs
```

## Directory Purposes

**`apps/api`:**
- Purpose: Backend runtime for HTTP APIs, async workers, schedulers, auth, persistence, streaming, and media/provider orchestration.
- Contains: Layered source in `apps/api/src/api`, `apps/api/src/application`, `apps/api/src/domain`, `apps/api/src/infrastructure`, API-only helpers in `apps/api/src/shared`, database config in `apps/api/drizzle-kit.config.ts`, migrations in `apps/api/drizzle/migrations`, and operational scripts in `apps/api/scripts`.
- Key files: `apps/api/src/main.ts`, `apps/api/src/api/media/routes.ts`, `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts`, `apps/api/src/infrastructure/persistence/schema.ts`, `apps/api/drizzle-kit.config.ts`

**`apps/web`:**
- Purpose: Browser UI for product analysis, studio creation, result review, dashboard, billing, onboarding, and auth flows.
- Contains: Route files in `apps/web/src/pages`, screen composition in `apps/web/src/widgets`, feature-local UI/hooks/models in `apps/web/src/features`, browser utilities in `apps/web/src/lib`, i18n resources in `apps/web/src/locales`, and generated route metadata in `apps/web/src/routeTree.gen.ts`.
- Key files: `apps/web/src/main.tsx`, `apps/web/src/pages/__root.tsx`, `apps/web/src/widgets/video-creator/wizard.tsx`, `apps/web/src/lib/api.ts`, `apps/web/src/routeTree.gen.ts`

**`packages/shared`:**
- Purpose: Hold cross-app contracts so the API and web build against the same schemas and enums.
- Contains: Re-export barrel in `packages/shared/src/index.ts`, enums in `packages/shared/src/enums.ts`, Zod schemas in `packages/shared/src/schemas/*.ts`, shared utilities in `packages/shared/src/utils.ts`, and agentic planning helpers in `packages/shared/src/agentic.ts`.
- Key files: `packages/shared/src/index.ts`, `packages/shared/src/schemas/media.ts`, `packages/shared/src/schemas/product.ts`, `packages/shared/src/agentic.ts`

**`packages/ui`:**
- Purpose: Provide reusable UI primitives for the web app.
- Contains: Component files in `packages/ui/src/components/*.tsx`, shared class helpers in `packages/ui/src/lib/utils.ts`, and the package barrel in `packages/ui/src/index.ts`.
- Key files: `packages/ui/src/index.ts`, `packages/ui/src/components/button.tsx`, `packages/ui/src/components/card.tsx`

**`packages/config`:**
- Purpose: Reserve a workspace package for shared config exports.
- Contains: A placeholder module only.
- Key files: `packages/config/src/index.ts`

**`tooling`:**
- Purpose: Centralize shared configuration packages and repo-level validation/smoke scripts.
- Contains: TypeScript base configs in `tooling/typescript/*.json`, the flat ESLint config package in `tooling/eslint/index.js`, Biome defaults in `tooling/biome/biome.json`, and shell/node scripts such as `tooling/gemini-shortform-test-flow.sh` and `tooling/validate-media.mjs`.
- Key files: `tooling/typescript/base.json`, `tooling/typescript/react.json`, `tooling/typescript/node.json`, `tooling/eslint/index.js`, `tooling/biome/biome.json`

**`docs`:**
- Purpose: Store long-form product, strategy, research, architecture, and operational guidance outside the runtime code.
- Contains: Topic folders such as `docs/01-research`, `docs/03-product`, `docs/05-architecture`, and `docs/06-operations`.
- Key files: `docs/PROJECT_SUMMARY.md`, `docs/03-product/PRD.md`, `docs/05-architecture/INITIAL_DESIGN.md`

**`openspec`:**
- Purpose: Track active and archived change proposals, designs, tasks, and canonical specs.
- Contains: Current specs in `openspec/specs` and change folders in `openspec/changes`.
- Key files: `openspec/config.yaml`, `openspec/specs/studio-workspace/spec.md`, `openspec/changes/add-live-media-validation-workflow/design.md`

**`artifacts`:**
- Purpose: Hold local experiment, smoke, and comparison outputs.
- Contains: Runtime output trees such as `artifacts/live-media-smoke`, `artifacts/comparisons`, and `artifacts/shortform-calibration-batch`.
- Key files: Not applicable for source placement; treat this directory as output-only.

## Key File Locations

**Entry Points:**
- `package.json`: Root workspace scripts for `build`, `dev`, `test`, `typecheck`, and media smoke/review loops.
- `pnpm-workspace.yaml`: Workspace package boundaries for `apps/*`, `packages/*`, and `tooling/*`.
- `apps/api/src/main.ts`: API bootstrap for Hono, workers, schedulers, auth, logging, and outbox dispatch.
- `apps/web/src/main.tsx`: Web bootstrap that mounts `apps/web/src/App.tsx`.
- `apps/web/src/pages/__root.tsx`: Shared route shell and query-client provider for all web routes.

**Configuration:**
- `turbo.json`: Task graph and cache behavior for the monorepo.
- `biome.json`: Root formatter/linter extension of `tooling/biome/biome.json`.
- `apps/api/tsconfig.json`: API path alias setup with `@/* -> ./src/*`.
- `apps/web/tsconfig.json`: Web path alias setup and direct source mapping to `packages/ui` and `packages/shared`.
- `apps/web/vite.config.ts`: Web bundler config and `@` alias.
- `apps/web/eslint.config.js`: Web lint entrypoint that extends `tooling/eslint/index.js`.
- `apps/api/drizzle-kit.config.ts`: Drizzle schema and migration output configuration.

**Core Logic:**
- `apps/api/src/api/media/job-routes.ts`: Job creation, history, detail, and daily health endpoints.
- `apps/api/src/application/media/generate-video.usecase.ts`: Main media generation orchestrator.
- `apps/api/src/application/media/story-planner.ts`: Story brief, concept, and shot-card generation.
- `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts`: BullMQ worker that runs the persisted media pipeline.
- `apps/web/src/widgets/video-creator/wizard.tsx`: Main end-user studio workflow on the web side.
- `apps/web/src/pages/studio/result/$jobId.tsx`: Persisted job review page.
- `packages/shared/src/schemas/media.ts`: Shared media job request/response contract.

**Testing:**
- `apps/api/vitest.config.ts`: API unit/integration test configuration.
- `apps/web/vitest.config.ts`: Web unit test configuration.
- `apps/web/playwright.config.ts`: Web E2E configuration.
- `packages/shared/vitest.config.ts`: Shared package test configuration.
- Co-located tests: `apps/api/src/**/*.test.ts`, `apps/web/src/**/*.test.tsx`, `packages/shared/src/*.test.ts`

## Naming Conventions

**Files:**
- Route files use `index.tsx` for leaf routes and `$param.tsx` for dynamic segments under `apps/web/src/pages`, for example `apps/web/src/pages/studio/create/index.tsx` and `apps/web/src/pages/studio/result/$jobId.tsx`.
- Backend orchestration files use `*.usecase.ts` under `apps/api/src/application`, for example `apps/api/src/application/media/generate-video.usecase.ts`.
- Domain modules use concern-based filenames such as `entities.ts`, `ports.ts`, `services.ts`, `value-objects.ts`, `events.ts`, and `planning.ts` under `apps/api/src/domain/**`.
- Infrastructure implementations use suffixes that reflect the integration boundary: `*.adapter.ts`, `*.repository.ts`, `*.worker.ts`, `*.seed.ts`, and `*.client.ts`.
- Barrels are explicit `index.ts` files at package or feature boundaries, for example `packages/shared/src/index.ts`, `packages/ui/src/index.ts`, `apps/web/src/features/video-output/index.ts`, and `apps/api/src/domain/media/index.ts`.

**Directories:**
- Top-level runtime directories are workspace-based: `apps`, `packages`, and `tooling`.
- API source uses layer directories named exactly `api`, `application`, `domain`, `infrastructure`, and `shared` under `apps/api/src`.
- Web source uses `pages`, `widgets`, `features`, and `lib` under `apps/web/src`; feature folders are kebab-case, for example `apps/web/src/features/content-generation` and `apps/web/src/features/model-persona`.
- Provider and integration directories stay grouped by external capability under `apps/api/src/infrastructure/providers`, for example `i2v`, `vision`, `payment`, `social`, `tts`, and `stt`.

## Where to Add New Code

**New Feature:**
- Web route/page: add a route file under `apps/web/src/pages/<route>/index.tsx` or `apps/web/src/pages/<route>/$param.tsx`.
- Cross-feature screen composition: add a widget under `apps/web/src/widgets/<feature>/`.
- Feature-local web UI/state: add components, hooks, and local models under `apps/web/src/features/<feature>/`.
- API endpoint: add or extend a router under `apps/api/src/api/<domain>/`.
- Backend workflow orchestration: add a new use case or service under `apps/api/src/application/<domain>/`.
- Backend business concepts and ports: add types, policies, or interfaces under `apps/api/src/domain/<domain>/`.
- Backend adapters, repositories, queue workers, or schedulers: add them under `apps/api/src/infrastructure/<concern>/`.
- Tests: colocate `*.test.ts` or `*.test.tsx` beside the implementation file.

**New Component/Module:**
- Reusable UI primitive for multiple pages/features: add it to `packages/ui/src/components/` and export it from `packages/ui/src/index.ts`.
- Web business-specific component or hook: place it in the owning feature folder under `apps/web/src/features/`.
- Shared contract, enum, or portable utility: place it in `packages/shared/src/` and re-export it from `packages/shared/src/index.ts` if it is part of the cross-app public surface.

**Utilities:**
- Browser-side API/query/formatting helpers: place them in `apps/web/src/lib/`.
- API-only glue helpers and config parsing: place them in `apps/api/src/shared/`.
- Provider-specific or media-specific helpers tied to infrastructure: place them next to the adapter in `apps/api/src/infrastructure/**`.
- Repo-level scripts or reusable config packages: place them in `apps/api/scripts/` for API-specific operations or `tooling/` for shared workspace utilities.

## Special Directories

**`apps/web/src/routeTree.gen.ts`:**
- Purpose: Generated TanStack Router manifest built from `apps/web/src/pages/**`.
- Generated: Yes
- Committed: Yes

**`apps/api/drizzle/migrations/`:**
- Purpose: Drizzle SQL migrations and snapshot metadata generated from `apps/api/src/infrastructure/persistence/schema.ts`.
- Generated: Yes
- Committed: Yes

**`artifacts/`:**
- Purpose: Local smoke, validation, and comparison output such as `artifacts/live-media-smoke/**`.
- Generated: Yes
- Committed: No

**`apps/api/artifacts/`:**
- Purpose: API-side research and calibration run outputs such as `apps/api/artifacts/reference-conditioned-shortform-plan/**`.
- Generated: Yes
- Committed: Not detected

**`openspec/changes/` and `openspec/specs/`:**
- Purpose: Change-management artifacts and the canonical behavior specs used for planning and execution.
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-18*
