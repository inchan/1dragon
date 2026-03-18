## MODIFIED Requirements

### Requirement: Authenticated media generation requests SHALL be accepted and enqueued
The system SHALL provide an authenticated API to submit media generation jobs and SHALL return a stable `jobId` for tracking.

If a valid `referenceBrief` is included, the endpoint SHALL persist a durable `referenceIntake` bundle on the job record that contains the raw brief, normalized brief, and any validated product-analysis-derived taxonomy/debug data.

#### Scenario: Valid product analysis is persisted with the intake bundle
- **WHEN** an authenticated user POSTs a valid generation request with `referenceBrief` and a valid `productAnalysisId`
- **THEN** the API SHALL persist a `referenceIntake` bundle on the created job and enqueue the enriched normalized brief

#### Scenario: Invalid product analysis fails before enqueue
- **WHEN** an authenticated user POSTs a generation request with `productAnalysisId` that does not belong to them or does not exist
- **THEN** the API SHALL return HTTP 400 and SHALL NOT enqueue a job

#### Scenario: Job detail exposes persisted intake debug data
- **WHEN** an authenticated user fetches `GET /jobs/:jobId` for a job with persisted reference intake
- **THEN** the response SHALL include that `referenceIntake` payload alongside job status, events, and variants
