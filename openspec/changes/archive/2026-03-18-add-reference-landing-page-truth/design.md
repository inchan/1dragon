## Context

The reference-first intake contract now captures first-party product truth, but operators still need to paste landing-page copy by hand to get more than a bare URL into the normalized brief. That gap weakens the product's "URL as source of truth" promise and leaves a large portion of briefs under-specified.

The codebase already has product-image analysis as a separate authenticated surface under `/api/v1/products/analyze`. This change does not replace or refactor that path. It only closes the landing-page truth gap inside the media job intake flow.

## Goals / Non-Goals

**Goals**
- Resolve URL-only landing-page inputs into extracted title, description, and readable text.
- Feed that result into `normalizedReferenceBrief` without mutating the raw brief.
- Fail open when the remote page cannot be fetched or parsed.

**Non-Goals**
- Full web crawling, JavaScript rendering, login handling, or multi-page extraction.
- Persisting raw HTML or building a general-purpose scraping subsystem.
- Reworking the existing image-analysis route in this change.

## Decisions

### Decision 1: Keep landing-page fetch best-effort and bounded

The request path must not become a brittle crawler. Fetches therefore use a short timeout and treat any timeout, non-HTML response, or fetch failure as `url_only` fallback instead of request failure.

### Decision 2: Preserve the raw brief and enrich only the normalized form

The original `referenceBrief` remains the operator-provided source. Extracted landing-page truth is attached only to `normalizedReferenceBrief`, where later collection and ranking steps can consume it as derived evidence.

### Decision 3: Store landing-page provenance explicitly

The normalized form records where the landing-page truth came from:
- `provided_text`
- `fetched_url`
- `url_only`

This keeps later ranking and debugging honest about whether the system had real page text or only a URL pointer.

### Decision 4: Reuse existing product-image analysis rather than mixing concerns

Phase 2 `02-02` covers both product/image analysis and landing-page extraction, but the repository already has the product-analysis runtime surface. This change narrows scope to landing-page truth extraction while treating `/api/v1/products/analyze` as the current image-analysis primitive.

## Implementation Notes

- Add `landing-page-truth.ts` under `apps/api/src/application/media/` for HTML fetch and extraction.
- Extend `normalizedReferenceBriefSchema` with `landingPageTitle`, `landingPageDescription`, and `landingPageSource`.
- Call the resolver in `POST /jobs` before `normalizeReferenceBriefInput`.
- Keep fetch logic dependency-free and HTML-only for now.
