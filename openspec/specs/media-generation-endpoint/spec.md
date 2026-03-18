# media-generation-endpoint Specification

## Purpose
Define how authenticated media job submission validates requests and preserves normalized reference inputs when enqueueing work.

## Requirements

### Requirement: Authenticated media generation requests SHALL be accepted and enqueued
The system SHALL provide an authenticated API to submit media generation jobs and SHALL return a stable `jobId` for tracking.

If a valid `referenceBrief` is included, the request contract SHALL remain backward-compatible while preserving both the raw brief and its normalized form in the queued media-generation payload.

When a request includes `referenceBrief.landingPageUrl`, the endpoint SHALL best-effort resolve landing-page truth before enqueueing the normalized brief, but it SHALL NOT fail the whole request on remote fetch errors alone.

#### Scenario: Reference brief reaches the queue unchanged and normalized
- **WHEN** an authenticated user POSTs a valid generation request with `referenceBrief`
- **THEN** the API SHALL enqueue a media-generation payload containing both `referenceBrief` and `normalizedReferenceBrief`

#### Scenario: Invalid reference brief fails before enqueue
- **WHEN** an authenticated user POSTs a generation request whose `referenceBrief` omits required first-party product truth
- **THEN** the API SHALL return HTTP 400 and SHALL NOT enqueue a job

#### Scenario: URL-only landing page enriches the queue payload
- **WHEN** an authenticated user POSTs a valid generation request with `referenceBrief.landingPageUrl` and no `landingPageText`
- **THEN** the enqueued `normalizedReferenceBrief` SHALL include landing-page provenance plus any extracted title, description, or excerpt

#### Scenario: Landing-page resolution failure does not block job creation
- **WHEN** remote landing-page fetch fails for an otherwise valid request
- **THEN** the API SHALL still create the job and enqueue the normalized brief with `landingPageSource = url_only`
