## Context

The project already has two adjacent primitives:
- `/api/v1/products/analyze` persists product analysis records with category, keywords, mood, target audience, and confidence.
- `/api/v1/media/jobs` accepts an optional `referenceBrief` and computes a normalized form before queueing.

Today those primitives are disconnected. Media job intake ignores `productAnalysisId`, so the normalized brief cannot rely on the strongest first-party category signal the system already has. The normalized brief is also queue-only, so job detail cannot show the intake that later phases are supposed to trust.

## Goals / Non-Goals

**Goals**
- Accept `productAnalysisId` on media job creation and validate that it belongs to the authenticated user.
- Enrich `normalizedReferenceBrief` with a stable product taxonomy object built from the brief plus product-analysis signals.
- Persist the reference intake bundle on the job record and surface it on job detail responses.

**Non-Goals**
- Reworking the product-analysis pipeline itself.
- Building Phase 3 collection adapters or ranking logic.
- Creating a separate standalone intake table unless job-record persistence proves insufficient.

## Decisions

### Decision 1: Persist intake on `video_jobs` as one JSONB bundle

The smallest durable source-of-truth record in this repo is the job itself. Instead of introducing a new table and repository graph in Phase 2, `video_jobs` stores a `reference_intake` JSONB payload containing:
- `referenceBrief`
- `normalizedReferenceBrief`
- `productAnalysisId`
- `productAnalysis`
- `taxonomy`

This is enough for Phase 2 goals and keeps retrieval trivial in `GET /jobs/:jobId`.

### Decision 2: Taxonomy uses stable enums and bounded usage contexts

The enriched normalized brief records:
- `productAnalysisId`
- `taxonomy.category`
- `taxonomy.usageContexts`
- `taxonomy.source`

`category` uses the existing shared `ProductCategory` enum. `usageContexts` uses a bounded enum list so later phases do not have to normalize freeform strings again.

### Decision 3: Product analysis is additive and validated

`productAnalysisId` remains optional. If present, the API validates ownership by loading the analysis record for the authenticated user. Missing or foreign records fail validation before enqueue because they would produce misleading source-of-truth data.

### Decision 4: Debug exposure mirrors the persisted intake bundle

Job detail responses expose the same persisted `referenceIntake` payload stored on the job record. This keeps operator inspection and downstream reuse aligned with the durable record rather than rebuilding debug data from queue-time assumptions.

## Implementation Notes

- Add a taxonomy helper in `apps/api/src/application/media/` to map brief + product-analysis signals into stable category and usage contexts.
- Extend shared media schemas with `productAnalysisId`, taxonomy, and `referenceIntake` response structures.
- Update `VideoJobRepositoryImpl` and the `video_jobs` schema to read/write the JSONB intake payload.
- Keep queue payload backward-compatible; later workers can read enriched `normalizedReferenceBrief` without additional request changes.
