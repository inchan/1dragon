# Codebase Concerns

**Analysis Date:** 2026-03-18

## Tech Debt

**Media Pipeline Orchestration:**
- Issue: Core video generation behavior is spread across several 400-800 line files that mix orchestration, persistence, provider selection, event emission, and response shaping.
- Files: `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts`, `apps/api/src/api/media/job-routes.ts`, `apps/api/src/application/media/generate-video.usecase.ts`, `apps/web/src/widgets/video-creator/wizard.tsx`, `apps/web/src/widgets/video-creator/wizard-reducer.ts`
- Impact: Small changes cross many responsibilities, and current baseline failures in `apps/api` show the pipeline is brittle under evolving review rules.
- Fix approach: Extract status persistence, provider routing, job history projection, and wizard step logic into smaller services/modules with narrower tests.

**Payment Rules Bypass Domain Layer:**
- Issue: Route handlers mutate subscriptions directly while the payment domain/use-case layer exists but is not the source of truth.
- Files: `apps/api/src/api/payments/routes.ts`, `apps/api/src/application/payment/manage-subscription.usecase.ts`, `apps/api/src/application/payment/handle-toss-webhook.usecase.ts`, `apps/api/src/infrastructure/scheduler/subscription-retry.ts`, `apps/web/src/pages/pricing/index.tsx`
- Impact: Billing state can diverge between HTTP handlers, webhook processing, and retry scheduling; business rules are hard to audit.
- Fix approach: Move subscription activation, cancellation, retry, and refund side effects behind a single application service and have routes/webhooks call that service.

**UI State And Network Logic Are Coupled In One Wizard:**
- Issue: The creation flow keeps reducer state, upload flow, quota handling, SSE consumption, model persona logic, and preview transitions in one component.
- Files: `apps/web/src/widgets/video-creator/wizard.tsx`, `apps/web/src/widgets/video-creator/wizard-reducer.ts`, `apps/web/src/lib/api.ts`
- Impact: Product changes in the creation flow are high-risk and difficult to cover with focused component tests.
- Fix approach: Split the wizard into step containers, async hooks, and smaller presentation components; keep the reducer focused on pure state transitions.

## Known Bugs

**Social OAuth Connect Flow Is Broken In The Web App:**
- Symptoms: Clicking SNS connect does not perform an OAuth redirect and posts a placeholder auth code.
- Files: `apps/web/src/features/video-output/social-share-panel.tsx`, `apps/web/src/lib/api.ts`, `apps/api/src/api/media/social-routes.ts`
- Trigger: Use the TikTok or Instagram connect buttons in the result page.
- Workaround: None in the UI. The API expects a real `{ code, state }` payload after a provider redirect.

**Workspace Typecheck Fails In `apps/api`:**
- Symptoms: `pnpm -r typecheck` fails on an implicit `any` in Gemini response parsing.
- Files: `apps/api/src/application/media/photo-conditioned-storyline-result.ts`
- Trigger: Run `pnpm -r typecheck`.
- Workaround: None; the workspace is not type-clean until the parser is typed.

**API Test Suite Has A Current Media-Pipeline Regression:**
- Symptoms: `pnpm -r test` fails 4 `apps/api` tests because story brief review rejects benchmark/integration fixtures with `Story brief review failed`.
- Files: `apps/api/src/application/media/performance-benchmark.test.ts`, `apps/api/src/application/media/pipeline-integration.test.ts`, `apps/api/src/application/media/generate-video.usecase.ts`
- Trigger: Run `pnpm -r test`.
- Workaround: Update the fixtures or relax the new review gates before using the suite as a release signal.

**Health Check Never Returns A Failing HTTP Status:**
- Symptoms: `/health` reports `"status": "degraded"` in the body but still returns HTTP 200 when Redis or Postgres is down.
- Files: `apps/api/src/main.ts`, `apps/api/src/main.health.test.ts`
- Trigger: Dependency outage on `DATABASE_URL` or `REDIS_URL`.
- Workaround: External monitors must parse the JSON body instead of relying on HTTP status.

## Security Considerations

**Session Signing Secret Reuses The Database URL:**
- Risk: If database credentials leak, the auth signing secret leaks too; rotating the DB URL also invalidates auth state unexpectedly.
- Files: `apps/api/src/infrastructure/auth/better-auth.ts`, `apps/api/src/shared/config.ts`
- Current mitigation: Not detected. There is no dedicated auth secret in config.
- Recommendations: Introduce a separate required env var for auth signing and fail startup when it is missing.

**Subscription Upgrade Can Be Self-Granted Without Payment Confirmation:**
- Risk: Any authenticated client can POST a higher tier and receive `ACTIVE` status plus fresh quota before `checkout` succeeds.
- Files: `apps/api/src/api/payments/routes.ts`, `apps/web/src/pages/pricing/index.tsx`, `apps/web/src/features/payment/hooks.ts`
- Current mitigation: Not detected. `/api/v1/payments/subscription` trusts the client payload.
- Recommendations: Treat checkout/webhook confirmation as the only activation path; make `/subscription` create an intent or pending state instead of granting entitlements.

**Social Access Tokens Are Stored In Plaintext And Demo Mode Can Masquerade As Success:**
- Risk: Redis access reveals reusable social tokens, and missing provider credentials can still produce simulated token/share success paths.
- Files: `apps/api/src/infrastructure/social/redis-social-token.repository.ts`, `apps/api/src/api/media/routes.ts`, `apps/api/src/infrastructure/providers/social/tiktok-business.adapter.ts`, `apps/api/src/infrastructure/providers/social/meta-graph.adapter.ts`
- Current mitigation: Short TTL in Redis and auth-gated routes.
- Recommendations: Encrypt tokens at rest, gate routes when provider creds are absent, and surface configuration errors instead of returning demo artifacts.

## Performance Bottlenecks

**Job History Endpoint Uses N+1 Queries:**
- Problem: `/api/v1/media/jobs` fetches job rows, then per job fetches variants and recent events separately.
- Files: `apps/api/src/api/media/job-routes.ts`, `apps/api/src/infrastructure/persistence/repositories/video-job.repository.ts`
- Cause: History projection is built in application code rather than a batched query or materialized view.
- Improvement path: Batch variants/events for all returned job IDs or precompute a summary table/view for history cards.

**SSE Delivery Keeps Per-User Replay Buffers In Process Memory:**
- Problem: Replay scans the in-memory buffer per user and only retains the last 1000 events in one process.
- Files: `apps/api/src/infrastructure/notification/sse-broker.ts`, `apps/api/src/api/media/helpers.ts`
- Cause: The broker is process-local and replays by filtering an array rather than using Redis pub/sub or durable offsets.
- Improvement path: Move live fan-out and replay state to Redis or another shared event backend; keep per-job replay bounded and query-backed.

**Job Event Payloads Are Large And Queried Frequently:**
- Problem: The worker stores rich agentic metadata on every status event and the API re-reads those JSON payloads for history and detail screens.
- Files: `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts`, `apps/api/src/infrastructure/persistence/job-event.helper.ts`, `apps/api/src/api/media/job-routes.ts`
- Cause: Status events double as an audit log, debug log, and view model.
- Improvement path: Split debug metadata from user-facing event data and keep event payloads small enough for routine history queries.

## Fragile Areas

**SSE Status Changes Are Published Through Two Independent Paths:**
- Files: `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts`, `apps/api/src/infrastructure/notification/outbox-dispatcher.ts`, `apps/api/src/infrastructure/persistence/job-event.helper.ts`
- Why fragile: Each transition is inserted into `job_events`, published immediately via `sseBroker.publish`, then published again later by the outbox dispatcher before the row is marked processed.
- Safe modification: Consolidate around either direct publish or outbox publish, not both, and add assertions for exactly-once client delivery.
- Test coverage: No dedicated tests detected for `apps/api/src/infrastructure/notification/outbox-dispatcher.ts` or `apps/api/src/api/media/stream-routes.ts`.

**Database Idle-Client Errors Crash The Entire API Process:**
- Files: `apps/api/src/infrastructure/persistence/db.ts`, `apps/api/src/main.ts`
- Why fragile: A transient pool error triggers `process.exit(-1)`, converting a dependency blip into full process loss.
- Safe modification: Prefer circuit-breaking health degradation and connection recycling over unconditional process exit.
- Test coverage: No targeted tests detected for pool error behavior in `apps/api/src/infrastructure/persistence/db.ts`.

**Media Quality Gates And Fixtures Drift Easily:**
- Files: `apps/api/src/application/media/generate-video.usecase.ts`, `apps/api/src/application/media/performance-benchmark.test.ts`, `apps/api/src/application/media/pipeline-integration.test.ts`
- Why fragile: Review rules are embedded in the main use case, so tightening narrative validation immediately breaks benchmark/integration fixtures.
- Safe modification: Version fixtures with the review heuristics or inject review policies so benchmark tests can stay stable.
- Test coverage: Coverage exists, but the current suite already fails on this boundary.

## Scaling Limits

**SSE And Circuit Breaker State Do Not Scale Horizontally:**
- Current capacity: One API process with local `SseBroker` clients/buffer and one worker process with local provider circuit state.
- Limit: Multiple API replicas lose replay consistency, and multiple worker replicas do not share provider failure state.
- Scaling path: Move SSE fan-out/replay and provider health state to Redis or another shared coordination layer before adding replicas.
- Files: `apps/api/src/infrastructure/notification/sse-broker.ts`, `apps/api/src/infrastructure/providers/i2v/provider-router.ts`

**Job/Event Tables Have No Retention Strategy:**
- Current capacity: `job_events` and `webhook_events` grow indefinitely except for in-memory SSE trimming.
- Limit: History/detail queries will keep reading from ever-growing tables, and background scans will get more expensive.
- Scaling path: Add retention/archival jobs and narrower projection tables for user-facing queries.
- Files: `apps/api/src/infrastructure/persistence/schema.ts`, `apps/api/src/api/media/job-routes.ts`, `apps/api/src/infrastructure/notification/outbox-dispatcher.ts`

**Payment Retry Scheduler Does Not Perform Real Retries:**
- Current capacity: Hourly DB updates that increment counters on `PAST_DUE` subscriptions.
- Limit: Billing recovery cannot scale beyond manual/operator intervention because no provider call is attempted.
- Scaling path: Convert `processDuePaymentRetries` into a real retry job that talks to the payment provider and records outcomes transactionally.
- Files: `apps/api/src/infrastructure/scheduler/subscription-retry.ts`, `apps/api/src/infrastructure/providers/payment/toss-payments.client.ts`

## Dependencies at Risk

**`@better-auth/drizzle-adapter` Beta Dependency:**
- Risk: The API depends on `@better-auth/drizzle-adapter@1.5.0-beta.9`, while auth configuration already emits a base URL warning in tests.
- Impact: Auth upgrades may break session/database behavior unexpectedly.
- Migration plan: Pin upgrade windows carefully, add contract tests around login/session callbacks, and isolate auth configuration behind a local module.
- Files: `apps/api/package.json`, `apps/api/src/infrastructure/auth/better-auth.ts`, `apps/api/src/infrastructure/auth/better-auth.test.ts`

## Missing Critical Features

**No Real Social OAuth Callback Handling In The Web App:**
- Problem: The backend issues redirect URLs that target `/oauth/{platform}/callback`, but no matching pages or callback handlers exist in `apps/web`.
- Blocks: End-to-end TikTok/Instagram account connection and any real social publishing flow.
- Files: `apps/api/src/api/media/social-routes.ts`, `apps/web/src/features/video-output/social-share-panel.tsx`, `apps/web/src/pages/studio/result/$jobId.tsx`

**Webhook And Retry Paths Do Not Apply Billing State Changes:**
- Problem: Toss webhook handling records duplicate/stale/processed events, but it does not update subscriptions, quotas, or payment transactions; the retry scheduler also does not call Toss.
- Blocks: Reliable recovery for failed payments, provider-driven reconciliation, and auditable entitlement updates.
- Files: `apps/api/src/application/payment/handle-toss-webhook.usecase.ts`, `apps/api/src/infrastructure/persistence/repositories/webhook-event.repository.ts`, `apps/api/src/infrastructure/scheduler/subscription-retry.ts`, `apps/api/src/api/payments/routes.ts`

**No Provider-Configuration Gating For Social Sharing:**
- Problem: Social routes remain enabled even when TikTok/Meta credentials are absent, and adapters fall back to demo tokens/URLs.
- Blocks: Trustworthy production readiness checks for the sharing feature.
- Files: `apps/api/src/api/media/routes.ts`, `apps/api/src/infrastructure/providers/social/tiktok-business.adapter.ts`, `apps/api/src/infrastructure/providers/social/meta-graph.adapter.ts`

## Test Coverage Gaps

**Critical HTTP Flows Lack Direct Route/UI Tests:**
- What's not tested: `payments/routes.ts`, `products/routes.ts`, `social-routes.ts`, `stream-routes.ts`, `outbox-dispatcher.ts`, and `social-share-panel.tsx`.
- Files: `apps/api/src/api/payments/routes.ts`, `apps/api/src/api/products/routes.ts`, `apps/api/src/api/media/social-routes.ts`, `apps/api/src/api/media/stream-routes.ts`, `apps/api/src/infrastructure/notification/outbox-dispatcher.ts`, `apps/web/src/features/video-output/social-share-panel.tsx`
- Risk: Billing, OAuth, SSE delivery, and share flows can regress without unit or integration coverage.
- Priority: High

**Browser E2E Coverage Does Not Exercise Real Integrations:**
- What's not tested: Authentication, real payment approval, OAuth redirects, and live SSE behavior.
- Files: `apps/web/e2e/example.spec.ts`
- Risk: The only Playwright spec mocks backend calls, so cross-app failures are invisible until manual testing.
- Priority: High

**Operational Failure Paths Are Lightly Covered:**
- What's not tested: DB pool crash behavior, degraded health HTTP semantics, duplicated SSE delivery, and multi-instance deployment behavior.
- Files: `apps/api/src/infrastructure/persistence/db.ts`, `apps/api/src/main.ts`, `apps/api/src/infrastructure/notification/sse-broker.ts`, `apps/api/src/infrastructure/notification/outbox-dispatcher.ts`
- Risk: Production-only outages and noisy client behavior can slip past CI.
- Priority: Medium

---

*Concerns audit: 2026-03-18*
