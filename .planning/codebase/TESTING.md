# Testing Patterns

**Analysis Date:** 2026-03-18

## Test Framework

**Runner:**
- Vitest `^3.0.0` is the standard test runner in `apps/api/package.json`, `apps/web/package.json`, and `packages/shared/package.json`.
- Config files:
  - `apps/api/vitest.config.ts`
  - `apps/web/vitest.config.ts`
  - `packages/shared/vitest.config.ts`
- Playwright `^1.58.2` is used for browser E2E in `apps/web/package.json` with config in `apps/web/playwright.config.ts`.

**Assertion Library:**
- Use Vitest's built-in `expect`, `describe`, `it`, `beforeEach`, `afterEach`, and `vi`.
- There is no React Testing Library dependency. React/hook tests use `react-dom/client`, `act`, and direct QueryClient wiring in `apps/web/src/features/notification/use-job-stream.test.tsx`.

**Run Commands:**
```bash
pnpm test                                                   # Run all Vitest suites through Turbo
pnpm --filter @1dragon/api test:watch                       # Watch API tests
pnpm --filter @1dragon/web test:watch                       # Watch web tests
pnpm --filter @1dragon/shared test:watch                    # Watch shared tests
pnpm --filter @1dragon/api exec vitest run --coverage       # API coverage
pnpm --filter @1dragon/web exec vitest run --coverage       # Web coverage
pnpm --filter @1dragon/shared exec vitest run --coverage    # Shared coverage
pnpm e2e                                                    # Run Playwright suites through Turbo
pnpm test:editorial-verification                            # Targeted editorial verification suite
```

## Test File Organization

**Location:**
- Keep Vitest files colocated with source under `src`, for example `apps/api/src/domain/media/entities.test.ts`, `apps/api/src/infrastructure/media/prompt-builder.test.ts`, `apps/web/src/features/video-output/model.test.ts`, and `packages/shared/src/agentic.test.ts`.
- Keep Playwright specs separate under `apps/web/e2e`, currently `apps/web/e2e/example.spec.ts`.
- Keep editorial fixtures and snapshots adjacent to the code they validate:
  - `apps/api/src/application/media/__fixtures__/editorial-verification/*.json`
  - `apps/api/src/application/media/__snapshots__/editorial-verification-fixtures.test.ts.snap`
  - `apps/api/src/infrastructure/media/__snapshots__/prompt-builder.test.ts.snap`

**Naming:**
- Use `*.test.ts` for API and shared TypeScript tests.
- Use `*.test.tsx` for React hook/component-adjacent web tests like `apps/web/src/features/notification/use-job-stream.test.tsx`.
- Use `*.spec.ts` for Playwright specs in `apps/web/e2e/example.spec.ts`.

**Structure:**
```text
apps/api/src/<layer>/<module>.ts
apps/api/src/<layer>/<module>.test.ts
apps/web/src/<feature-or-lib>/<module>.ts
apps/web/src/<feature-or-lib>/<module>.test.ts[x]
apps/web/e2e/<flow>.spec.ts
packages/shared/src/<module>.ts
packages/shared/src/<module>.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('wizardReducer', () => {
	describe('createInitialState', () => {
		it('initializes with correct default values', () => {
			const state = createInitialState(variants)
			expect(state.step).toBe('UPLOAD')
		})
	})
})
```
- This nested `describe -> describe -> it` pattern appears in `apps/web/src/widgets/video-creator/wizard-reducer.test.ts`, `apps/api/src/infrastructure/logging/request-logger.test.ts`, and `apps/api/src/application/media/editorial-calibration.test.ts`.

**Patterns:**
- Use `beforeEach(() => vi.clearAllMocks())` when a suite relies on shared spies, as in `apps/api/src/api/users/controller.test.ts`, `apps/api/src/api/media/job-routes.test.ts`, and `apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts`.
- Use `afterEach(() => vi.unstubAllGlobals())` or `vi.useRealTimers()` when stubbing globals or fake timers, as in `apps/web/src/features/notification/use-job-stream.test.tsx` and multiple provider adapter tests under `apps/api/src/infrastructure/providers/*/*.test.ts`.
- Assert result types explicitly when using `Result<T, E>`. `apps/api/src/api/users/controller.test.ts` uses `isOk(result)` and `isErr(result)` before narrowing into `result.value` or `result.error`.
- Prefer end-state assertions over snapshotting unless the output is long-form generated content. Most unit tests use direct `.toBe`, `.toEqual`, `.toContain`, or `.toMatchObject`.

## Mocking

**Framework:** `vi` from Vitest

**Patterns:**
```typescript
const { mockAddJob, mockAppendJobStatusEvent } = vi.hoisted(() => ({
	mockAddJob: vi.fn(),
	mockAppendJobStatusEvent: vi.fn(),
}))

vi.mock('@/infrastructure/queue/bullmq.config.js', () => ({
	addJob: mockAddJob,
}))
```
- Use `vi.hoisted(...)` for shared mock handles referenced inside `vi.mock(...)` factories. This pattern is required in `apps/api/src/main.health.test.ts`, `apps/api/src/api/media/job-routes.test.ts`, and `apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts`.

```typescript
beforeEach(() => {
	vi.useFakeTimers()
	vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource)
})
```
- Stub globals with `vi.stubGlobal(...)` for `fetch`, `EventSource`, and similar browser/runtime APIs. See `apps/web/src/features/notification/use-job-stream.test.tsx` and provider adapter tests such as `apps/api/src/infrastructure/providers/social/meta-graph.adapter.test.ts`.

**What to Mock:**
- Mock infrastructure and external boundaries:
  - database access in `apps/api/src/api/users/controller.test.ts`
  - Drizzle query builders in `apps/api/src/api/media/job-routes.test.ts`
  - BullMQ queues and workers in `apps/api/src/main.health.test.ts` and `apps/api/src/infrastructure/queue/workers/*.test.ts`
  - `fetch`-based provider clients in `apps/api/src/infrastructure/providers/*/*.test.ts`
  - browser transport like `EventSource` in `apps/web/src/features/notification/use-job-stream.test.tsx`
- Mock logging when the side effect is not the subject, as in `apps/api/src/infrastructure/providers/social/meta-graph.adapter.test.ts` and `apps/api/src/main.health.test.ts`.

**What NOT to Mock:**
- Test pure domain/value logic directly without mocks. Examples: `apps/api/src/domain/media/value-objects.test.ts`, `apps/api/src/domain/content/entities.test.ts`, `apps/web/src/features/video-output/model.test.ts`, `apps/web/src/features/model-persona/recommendations.test.ts`, and `packages/shared/src/agentic.test.ts`.
- Keep reducer/helper tests state-based rather than DOM-based. `apps/web/src/widgets/video-creator/wizard-reducer.test.ts` and `apps/web/src/lib/studio-workspace.test.ts` pass plain objects and inspect returned state.

## Fixtures and Factories

**Test Data:**
```typescript
function makeCopyVariants(productName: string): MarketingCopyVariant[] {
	return [
		{ id: 'copy-1', hookCopy: `${productName} hook`, bodyCopy: `${productName} body`, ctaCopy: `${productName} cta`, hashtags: ['#test'], label: '변형 1' },
	]
}
```
- Small inline factories are the default style for unit tests. See `makeCopyVariants` and `makeAnalysisResult` in `apps/web/src/widgets/video-creator/wizard-reducer.test.ts`, `createIteration` in `apps/api/src/application/media/editorial-calibration.test.ts`, and inline job builders in `apps/api/src/api/media/job-routes.test.ts`.
- JSON fixture sets are used when the validated data is richer or reviewer-facing. `apps/api/src/application/media/editorial-verification-fixtures.test.ts` loads files from `apps/api/src/application/media/__fixtures__/editorial-verification`.
- Snapshots are reserved for deterministic long-form outputs from prompt/calibration generators:
  - `apps/api/src/infrastructure/media/prompt-builder.test.ts`
  - `apps/api/src/application/media/editorial-verification-fixtures.test.ts`

**Location:**
- Keep local factories inside the test file unless reused broadly.
- Store heavier reusable data in:
  - `apps/api/src/application/media/__fixtures__/editorial-verification`
  - `apps/api/src/application/media/__snapshots__`
  - `apps/api/src/infrastructure/media/__snapshots__`

## Coverage

**Requirements:** 100% thresholds are configured in all Vitest configs, with package-specific include/exclude rules.
- `apps/api/vitest.config.ts`: include `src/domain/**`, `src/application/**`, `src/infrastructure/**`; exclude tests and `src/api/**`.
- `apps/web/vitest.config.ts`: include `src/**/model/**`, `src/**/lib/**`, `src/**/api/**`; exclude `src/**/ui/**` and tests.
- `packages/shared/vitest.config.ts`: include `src/**`; exclude tests and `src/index.ts`.

**View Coverage:**
```bash
pnpm --filter @1dragon/api exec vitest run --coverage
pnpm --filter @1dragon/web exec vitest run --coverage
pnpm --filter @1dragon/shared exec vitest run --coverage
```
- There is no dedicated `coverage` script in `package.json`; use direct Vitest CLI invocation.

## Test Types

**Unit Tests:**
- Pure domain and helper behavior:
  - `apps/api/src/domain/media/entities.test.ts`
  - `apps/api/src/domain/media/value-objects.test.ts`
  - `apps/web/src/features/video-output/model.test.ts`
  - `apps/web/src/features/model-persona/recommendations.test.ts`
  - `packages/shared/src/agentic.test.ts`

**Integration Tests:**
- Route/runtime integration via in-memory Hono apps:
  - `apps/api/src/main.health.test.ts`
  - `apps/api/src/api/media/job-routes.test.ts`
  - `apps/api/src/infrastructure/logging/request-logger.test.ts`
- Use case and pipeline composition tests with recording stubs:
  - `apps/api/src/application/media/generate-video.usecase.test.ts`
  - `apps/api/src/application/media/pipeline-integration.test.ts`
  - `apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts`
- Provider contract tests that mock network boundaries but exercise real adapter code:
  - `apps/api/src/infrastructure/providers/social/meta-graph.adapter.test.ts`
  - `apps/api/src/infrastructure/providers/i2v/adapters.test.ts`
  - `apps/api/src/infrastructure/providers/tts/*.test.ts`

**E2E Tests:**
- Playwright is used in `apps/web/e2e/example.spec.ts`.
- E2E tests mock backend API responses with `page.route(...)`, upload fake files with `page.setInputFiles(...)`, and validate user-visible flows like video generation and upgrade prompts.
- CI runs Playwright only on pull requests in `.github/workflows/ci.yml`.

**Performance / Benchmark Tests:**
- Performance assertions are implemented inside Vitest, not in a separate benchmark harness. `apps/api/src/application/media/performance-benchmark.test.ts` enforces a P95 runtime ceiling for the video-generation use case.

## Validation Flows

**Editorial verification:**
- Use the targeted suite from `apps/api/package.json` for the editorial/media-review path:
  - `apps/api/src/application/media/editorial-calibration.test.ts`
  - `apps/api/src/application/media/editorial-verification-fixtures.test.ts`
  - `apps/api/src/application/media/photo-conditioned-matching.test.ts`
  - `apps/api/src/application/media/photo-conditioned-storyline.test.ts`
  - `apps/api/src/application/media/reference-shelf.test.ts`
  - `apps/api/src/application/media/review-gates.test.ts`
  - `apps/api/src/infrastructure/media/prompt-builder.test.ts`

**Smoke and artifact validation:**
- API smoke scripts live under `apps/api/scripts` and are exposed by `apps/api/package.json`:
  - `smoke:gemini:image` -> `apps/api/scripts/test-imagen-smoke.ts`
  - `smoke:gemini:composite` -> `apps/api/scripts/test-gemini-composite-smoke.ts`
  - `smoke:gemini:video` -> `apps/api/scripts/test-veo-pipeline.ts`
- Artifact validation is handled by `tooling/validate-media.mjs`, exposed as `pnpm media:validate` and `pnpm media:validate:latest` from the root `package.json`.
- Agentic end-to-end request validation is scripted in `apps/api/scripts/validate-agentic-job.sh` and `apps/api/scripts/agentic-smoke-test.mjs`.

**CI pipeline:**
- `.github/workflows/ci.yml` runs `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, and `pnpm build` on pushes and PRs.
- Pull requests additionally install Playwright browsers and run `pnpm --filter @1dragon/web run e2e`.

## Common Patterns

**Async Testing:**
```typescript
const response = await app.fetch(new Request('http://localhost/jobs', { method: 'POST', body }))
const body = await response.json()
expect(response.status).toBe(201)
```
- In API tests, prefer `app.fetch(...)` against a real Hono app with injected mocks, as in `apps/api/src/api/media/job-routes.test.ts` and `apps/api/src/infrastructure/logging/request-logger.test.ts`.
- In use case tests, await the real method and inspect structured outputs like `events`, `status`, and `qualityScore`, as in `apps/api/src/application/media/pipeline-integration.test.ts`.

**Error Testing:**
```typescript
await expect(adapter.exchangeCodeForToken('bad-code')).rejects.toThrow(
	'Instagram 토큰 교환에 실패했습니다. (status: 400)',
)
```
- Use `rejects.toThrow(...)` for exception-based adapter/infrastructure failures, as in `apps/api/src/infrastructure/providers/social/meta-graph.adapter.test.ts`, `apps/api/src/infrastructure/providers/payment/toss-payments.client.test.ts`, and other provider tests.
- Use result narrowing for `Result<T, E>` flows instead of thrown-error assertions, as in `apps/api/src/api/users/controller.test.ts`.
- Use `it.skipIf(...)` for environment-dependent tests that should stay in the suite without forcing local fixtures, as in `apps/api/src/application/media/pipeline-integration.test.ts`.

---

*Testing analysis: 2026-03-18*
