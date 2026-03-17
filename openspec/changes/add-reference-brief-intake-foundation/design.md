## Context

The reference-first pivot established a durable product direction in docs, but the runtime contract is still optimized for "generate a video now." The current request schema supports image URL, style, copy, keywords, and workflow toggles, which is enough for the legacy shortform path but not enough for upstream brief decomposition.

The smallest useful implementation slice is not full collection or ranking. It is a typed intake contract plus a deterministic normalizer that future collection and ranking steps can trust.

## Goals / Non-Goals

**Goals**
- Define one additive request contract for reference-first brief input.
- Normalize noisy input into stable arrays and query-hint buckets.
- Preserve the normalized result in queue payloads so later phases can consume it without changing the external request again.

**Non-Goals**
- Fetching landing pages, scraping references, or ranking storylines.
- Persisting the normalized brief to the database in this change.
- Reworking the web UI or forcing every existing request to provide a reference brief.

## Decisions

### Decision 1: Make `referenceBrief` optional and additive

Existing clients should continue working unchanged. The new brief contract must therefore be optional, and the current video-job request should remain valid without it.

To avoid duplicate sources of truth in this slice:
- `imageUrl` stays the canonical hero/source image input
- top-level `platforms` remains the request-level target list and only acts as a fallback for `referenceBrief.platformTargets`
- legacy generation fields such as `copy` or `creativeContext` are preserved as-is and are not merged into the normalized brief

### Decision 2: Require first-party product truth when `referenceBrief` is present

When callers opt into the new contract, the system should require:
- `productName`
- `coreBenefits`
- `targetAudience`
- at least one of `landingPageUrl` or `landingPageText`

This preserves the "facts before creative" rule without breaking legacy callers.

To keep BullMQ payloads bounded before database persistence exists, the brief contract uses hard caps:
- `landingPageText` max 8,000 characters
- repeated list fields max 5 entries
- `platformTargets` max 3 entries

### Decision 3: Normalize on ingress, not later

The route should normalize the brief before queueing the job. That keeps later worker/planner steps deterministic and avoids multiple layers inventing their own dedupe or hint-generation rules.

The normalized payload shape is intentionally fixed in this change:
- facts: `productName`, `productCategoryHint`, `priceBand`, `coreBenefits`, `differentiators`, `proofPoints`
- audience: `targetAudienceSummary`, `useCases`, `painPoints`
- landing truth: `landingPageUrl`, `landingPageExcerpt`
- examples: `competitorExamples`, `categoryExamples`
- targets: `successMetrics`, `platformTargets`
- query hints: `productFacts`, `marketLanguage`, `proofQueries`, `competitorQueries`
- health feedback: `missingSignals`, `completenessScore`

### Decision 4: Queue payload stores both raw and normalized forms

The raw brief is still useful for audit/debug. The normalized form is what later collection or ranking logic should consume. Storing both in the queue payload keeps the change self-contained and forward-compatible.

## Implementation Notes

- Shared schema lives in `packages/shared/src/schemas/media.ts`.
- API normalization helper lives in `apps/api/src/application/media/reference-brief.ts`.
- Queue payload adds two optional fields:
  - `referenceBrief`
  - `normalizedReferenceBrief`
- Route only computes and forwards these fields; worker behavior is unchanged in this slice.
