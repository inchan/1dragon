## Why

Phase 2 is still open because the runtime can accept a structured `referenceBrief`, but it does not yet connect that brief to the existing product-analysis surface or persist the normalized intake as a durable source of truth. That leaves the system with two gaps: category and usage taxonomy still depends on ad hoc strings, and the normalized brief disappears after enqueue.

Closing those gaps now finishes the intake layer the roadmap already depends on. Later collection and ranking work can then consume one persisted, inspectable intake record instead of reconstructing product facts from request-time inputs.

## What Changes

- Add optional `productAnalysisId` support to media job requests and use the referenced analysis to enrich `normalizedReferenceBrief` with a stable category and usage taxonomy.
- Persist reference-first intake state on the job record so raw brief input, normalized brief output, taxonomy, and product-analysis snapshot survive beyond queue submission.
- Expose the persisted intake/debug payload on job detail responses so operators and later phases can inspect what facts were actually used.

## Capabilities

### New Capabilities
- `reference-intake-persistence`: persist and inspect the normalized reference-first intake bundle tied to a media job.

### Modified Capabilities
- `reference-brief-intake`: enrich normalized briefs with product-analysis-backed taxonomy and stable usage contexts.
- `media-generation-endpoint`: accept `productAnalysisId`, persist the intake bundle, and expose debug intake data in job detail responses.

## Impact

- Affected code: `packages/shared/src/schemas/media.ts`, `apps/api/src/application/media/reference-brief.ts`, new taxonomy helper under `apps/api/src/application/media/`, `apps/api/src/api/media/job-routes.ts`, `apps/api/src/infrastructure/persistence/schema.ts`, `apps/api/src/infrastructure/persistence/repositories/video-job.repository.ts`.
- Affected tests: media route tests, reference-brief normalization tests, new taxonomy tests, repository tests.
- Affected persistence: `video_jobs` gains persisted reference-intake JSON state through a migration.
