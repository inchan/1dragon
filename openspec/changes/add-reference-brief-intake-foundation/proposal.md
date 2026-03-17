## Why

The repository now treats `reference-first` planning as the active product wedge, but the current media job contract still speaks almost entirely in video-generation terms: image URL, style preset, copy, and generation toggles. There is no durable request shape for product facts, landing-page truth, audience, success metrics, or example references before downstream creative work begins.

Without a typed intake contract, each future planner or collector step would need to guess what the brief means. That would recreate the same ambiguity the pivot is trying to remove.

## What Changes

- Add an optional `referenceBrief` contract to media job requests so callers can provide product facts, audience, landing-page truth, category or competitor examples, success metrics, and platform targets.
- Add a normalization helper that deduplicates noisy brief input and derives query hints plus completeness feedback for later reference collection.
- Thread the raw and normalized brief into the media-generate queue payload so future workers can consume the input without another breaking request change.

## Capabilities

### New Capabilities
- `reference-brief-intake`: capture and normalize reference-first brief data before planning, collection, or downstream creative validation.

### Modified Capabilities
- `media-generation-endpoint`: accept an optional `referenceBrief` and preserve its normalized form in queued job payloads.

## Impact

- Affected code: [packages/shared/src/schemas/media.ts](/Users/inchan/workspace/.worktrees/1dragon-reference-phase2/packages/shared/src/schemas/media.ts), [apps/api/src/application/media/reference-brief.ts](/Users/inchan/workspace/.worktrees/1dragon-reference-phase2/apps/api/src/application/media/reference-brief.ts), [apps/api/src/api/media/job-routes.ts](/Users/inchan/workspace/.worktrees/1dragon-reference-phase2/apps/api/src/api/media/job-routes.ts), [apps/api/src/infrastructure/queue/bullmq.config.ts](/Users/inchan/workspace/.worktrees/1dragon-reference-phase2/apps/api/src/infrastructure/queue/bullmq.config.ts).
- Affected tests: [apps/api/src/application/media/reference-brief.test.ts](/Users/inchan/workspace/.worktrees/1dragon-reference-phase2/apps/api/src/application/media/reference-brief.test.ts), [apps/api/src/api/media/job-routes.test.ts](/Users/inchan/workspace/.worktrees/1dragon-reference-phase2/apps/api/src/api/media/job-routes.test.ts).
- Guardrails: keep the change additive and backward-compatible; do not require UI changes or landing-page crawling in this slice.
