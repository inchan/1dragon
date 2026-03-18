# reference-brief-intake Specification

## Purpose
Define the typed intake layer that captures product facts and upstream planning signals before reference collection, ranking, or downstream generation begins.

## Requirements

### Requirement: The system SHALL accept an optional structured reference brief on media job requests
The system SHALL allow callers to attach a `referenceBrief` object to media job requests without breaking existing requests that omit it.

The `referenceBrief` contract SHALL supplement the existing request and SHALL NOT duplicate top-level media request fields that already exist for transport or generation control:
- `imageUrl` remains the canonical hero/source image for this slice
- top-level `platforms` remains the fallback platform target when `referenceBrief.platformTargets` is omitted
- existing generation-oriented fields such as `copy`, `creativeContext`, and `requestedConceptFamily` remain optional legacy inputs and are not normalized into the brief in this slice

#### Scenario: Legacy request remains valid
- **WHEN** a media job request is submitted without `referenceBrief`
- **THEN** the request SHALL remain valid under the existing job contract

#### Scenario: Reference-first request is accepted
- **WHEN** a media job request includes a valid `referenceBrief`
- **THEN** the request SHALL be accepted and the brief SHALL be available for downstream processing

#### Scenario: Reference brief supplements legacy fields instead of overriding them
- **WHEN** a request includes both top-level media fields and `referenceBrief`
- **THEN** the API SHALL preserve the top-level fields unchanged and SHALL normalize only the `referenceBrief` payload plus its documented fallbacks

### Requirement: Reference briefs SHALL require first-party product truth
When `referenceBrief` is provided, it SHALL include `productName`, `coreBenefits`, `targetAudience`, and at least one landing-page source (`landingPageUrl` or `landingPageText`).

The supported `referenceBrief` shape for this slice SHALL be:
- required: `productName`, `coreBenefits`, `targetAudience`
- required at least one: `landingPageUrl` or `landingPageText`
- optional: `productCategoryHint`, `priceBand`, `differentiators`, `proofPoints`, `competitorExamples`, `categoryExamples`, `successMetrics`, `platformTargets`

The contract SHALL bound queue payload size with these caps:
- `landingPageText`: at most 8,000 characters
- array fields: at most 5 entries each
- `platformTargets`: at most 3 entries

#### Scenario: Missing landing-page source is rejected
- **WHEN** a request includes `referenceBrief` but omits both `landingPageUrl` and `landingPageText`
- **THEN** validation SHALL fail

#### Scenario: Minimal valid brief passes
- **WHEN** a request includes `productName`, at least one `coreBenefits` entry, `targetAudience`, and either `landingPageUrl` or `landingPageText`
- **THEN** validation SHALL succeed

### Requirement: The system SHALL normalize reference briefs into collection-ready hints
The system SHALL trim, deduplicate, and bucket the brief into stable query-hint groups that later collection and ranking steps can reuse.

The normalized output SHALL use these stable field groups:
- top-level facts: `productName`, `productCategoryHint`, `priceBand`, `coreBenefits`, `differentiators`, `proofPoints`
- audience summary: `targetAudienceSummary`, `useCases`, `painPoints`
- landing-page truth: `landingPageUrl`, `landingPageSource`, `landingPageTitle`, `landingPageDescription`, `landingPageExcerpt`
- reference examples: `competitorExamples`, `categoryExamples`
- performance and targeting: `successMetrics`, `platformTargets`
- collection hints: `queryHints.productFacts`, `queryHints.marketLanguage`, `queryHints.proofQueries`, `queryHints.competitorQueries`
- completeness feedback: `missingSignals`, `completenessScore`

#### Scenario: Duplicate and noisy input is normalized
- **WHEN** a brief contains duplicate benefits, examples, or audience phrases with inconsistent spacing or casing
- **THEN** the normalized result SHALL remove duplicates and preserve only clean values

#### Scenario: Normalized brief exposes query hints and missing signals
- **WHEN** a valid brief is normalized
- **THEN** the result SHALL expose grouped query hints and an explicit list of missing signals or weak spots

#### Scenario: Platform targets fall back to the request when omitted from the brief
- **WHEN** `referenceBrief.platformTargets` is omitted and the top-level request already includes `platforms`
- **THEN** the normalized result SHALL use the request `platforms` as `platformTargets`

#### Scenario: URL-only brief is enriched from fetched html
- **WHEN** a valid `referenceBrief` includes `landingPageUrl` but omits `landingPageText`
- **THEN** the system SHALL best-effort fetch the page, extract title, description, and readable text, and include any extracted signals in the normalized brief

#### Scenario: Landing-page fetch fails open
- **WHEN** a valid `referenceBrief` includes `landingPageUrl` but the remote page times out, fails, or is not HTML
- **THEN** the request SHALL still succeed and the normalized brief SHALL record `landingPageSource = url_only`

### Requirement: The queue SHALL preserve both raw and normalized brief data
If a request includes `referenceBrief`, the queued media-generate payload SHALL include both the original brief and its normalized form.

#### Scenario: Queue payload carries the normalized brief
- **WHEN** a request with `referenceBrief` is accepted
- **THEN** the enqueued media-generate payload SHALL contain `referenceBrief` and `normalizedReferenceBrief`
