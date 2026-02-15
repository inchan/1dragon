## ADDED Requirements

### Requirement: Authenticated media generation requests SHALL be accepted and enqueued
The system SHALL provide an authenticated API to submit media generation jobs and SHALL return a stable `jobId` for tracking.

#### Scenario: Successful job submit
- **WHEN** an authenticated user POSTs valid payload to the generation endpoint
- **THEN** the API SHALL create a job record, enqueue it, and return HTTP 201 with `jobId`.

### Requirement: Generation status endpoints SHALL provide event-consistent state
The system SHALL expose status retrieval for a job ID and SHALL support streaming or fallback polling semantics for progress and completion updates.

#### Scenario: User polls job state
- **WHEN** the client queries `/jobs/:jobId`
- **THEN** the response SHALL include canonical fields such as status, progress snapshot, timestamps, and error information when failed.

### Requirement: Idempotent request handling SHALL prevent accidental duplicate job creation
The system SHALL handle repeated submission requests with a suitable idempotency key strategy to prevent duplicate generation jobs from the same user action.

#### Scenario: Duplicate submission handling
- **WHEN** the same client request is retried due to client/network timeout
- **THEN** the API SHALL return the existing `jobId` or a clearly mapped duplicate response without creating redundant jobs.

## MODIFIED Requirements

### Requirement: Media generation request flow SHALL replace previous demo-only frontend simulation paths
Existing placeholder or demo-based generation invocation paths SHALL transition to the real job-submission and tracking contract.

#### Scenario: Real job path is used end-to-end
- **WHEN** the frontend starts a generation flow
- **THEN** it SHALL call the generation endpoint and the returned `jobId` SHALL drive UI progress until completion or failure.
