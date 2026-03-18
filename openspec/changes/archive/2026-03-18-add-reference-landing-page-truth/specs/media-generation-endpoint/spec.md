## MODIFIED Requirements

### Requirement: Authenticated media generation requests SHALL be accepted and enqueued
The system SHALL provide an authenticated API to submit media generation jobs and SHALL return a stable `jobId` for tracking.

When a request includes `referenceBrief.landingPageUrl`, the endpoint SHALL best-effort resolve landing-page truth before enqueueing the normalized brief, but it SHALL NOT fail the whole request on remote fetch errors alone.

#### Scenario: URL-only landing page enriches the queue payload
- **WHEN** an authenticated user POSTs a valid generation request with `referenceBrief.landingPageUrl` and no `landingPageText`
- **THEN** the enqueued `normalizedReferenceBrief` SHALL include landing-page provenance plus any extracted title, description, or excerpt

#### Scenario: Landing-page resolution failure does not block job creation
- **WHEN** remote landing-page fetch fails for an otherwise valid request
- **THEN** the API SHALL still create the job and enqueue the normalized brief with `landingPageSource = url_only`
