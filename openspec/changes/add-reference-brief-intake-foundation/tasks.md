## 1. Shared Contract

- [x] 1.1 Add `referenceBrief` schemas and exported types in `packages/shared/src/schemas/media.ts`
- [x] 1.2 Extend `createVideoJobRequestSchema` to accept an optional `referenceBrief`

## 2. API Normalization

- [x] 2.1 Add a deterministic reference-brief normalizer in `apps/api/src/application/media/reference-brief.ts`
- [x] 2.2 Add unit tests covering trimming, dedupe, missing-signal detection, and query-hint generation

## 3. Queue Propagation

- [x] 3.1 Extend `MediaGenerateJobData` to carry raw and normalized reference-brief data
- [x] 3.2 Update `apps/api/src/api/media/job-routes.ts` to normalize and enqueue the new fields when present
- [x] 3.3 Add or update route tests to prove the new fields reach the queue payload
