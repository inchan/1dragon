## Why

The `referenceBrief` foundation can already accept a landing-page URL, but it only becomes useful if the caller also copies landing-page text manually. That still leaves the system blind when the operator provides the canonical product URL but not the page copy.

Phase 2 plan `02-02` calls for landing-page truth extraction before downstream collection and ranking. The next smallest useful slice is therefore a best-effort URL fetch that enriches the normalized brief without turning job submission into a fragile crawler.

## What Changes

- Add a landing-page truth resolver that fetches HTML from `referenceBrief.landingPageUrl`, extracts title, description, and readable text, and degrades safely on timeout or fetch failure.
- Enrich `normalizedReferenceBrief` with landing-page source metadata plus extracted title/description/excerpt when available.
- Update route and unit tests to prove URL-only briefs become more useful without breaking successful submits when fetches fail.

## Capabilities

### Modified Capabilities
- `reference-brief-intake`: resolve URL-only landing-page inputs into extraction-ready truth signals.
- `media-generation-endpoint`: attach fetched landing-page truth to the normalized queue payload when available.

## Impact

- Affected code: [apps/api/src/application/media/landing-page-truth.ts](/Users/inchan/workspace/1dragon-reference-brief/apps/api/src/application/media/landing-page-truth.ts), [apps/api/src/application/media/reference-brief.ts](/Users/inchan/workspace/1dragon-reference-brief/apps/api/src/application/media/reference-brief.ts), [apps/api/src/api/media/job-routes.ts](/Users/inchan/workspace/1dragon-reference-brief/apps/api/src/api/media/job-routes.ts), [packages/shared/src/schemas/media.ts](/Users/inchan/workspace/1dragon-reference-brief/packages/shared/src/schemas/media.ts).
- Affected tests: [apps/api/src/application/media/landing-page-truth.test.ts](/Users/inchan/workspace/1dragon-reference-brief/apps/api/src/application/media/landing-page-truth.test.ts), [apps/api/src/application/media/reference-brief.test.ts](/Users/inchan/workspace/1dragon-reference-brief/apps/api/src/application/media/reference-brief.test.ts), [apps/api/src/api/media/job-routes.test.ts](/Users/inchan/workspace/1dragon-reference-brief/apps/api/src/api/media/job-routes.test.ts).
- Guardrails: keep extraction best-effort, bounded by timeout, and non-blocking for job creation when the remote page is unavailable.
