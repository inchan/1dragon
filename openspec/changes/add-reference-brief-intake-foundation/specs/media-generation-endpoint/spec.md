## MODIFIED Requirements

### Requirement: Authenticated media generation requests SHALL be accepted and enqueued
The system SHALL provide an authenticated API to submit media generation jobs and SHALL return a stable `jobId` for tracking.

If a valid `referenceBrief` is included, the request contract SHALL remain backward-compatible while preserving both the raw brief and its normalized form in the queued media-generation payload.

#### Scenario: Reference brief reaches the queue unchanged and normalized
- **WHEN** an authenticated user POSTs a valid generation request with `referenceBrief`
- **THEN** the API SHALL enqueue a media-generation payload containing both `referenceBrief` and `normalizedReferenceBrief`

#### Scenario: Invalid reference brief fails before enqueue
- **WHEN** an authenticated user POSTs a generation request whose `referenceBrief` omits required first-party product truth
- **THEN** the API SHALL return HTTP 400 and SHALL NOT enqueue a job
