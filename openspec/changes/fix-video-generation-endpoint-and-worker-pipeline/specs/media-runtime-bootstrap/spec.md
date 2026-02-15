## ADDED Requirements

### Requirement: API runtime must expose and confirm HTTP listen lifecycle
The system SHALL start the API with an HTTP server by calling a listen-capable entrypoint (e.g., `app.listen(...)`) and SHALL provide a `/health` endpoint that returns operational status.

#### Scenario: Server starts and serves HTTP
- **WHEN** the API process boots
- **THEN** the runtime SHALL bind to a configured listen address/port and respond to at least `/health` without requiring external platform adapter glue.

### Requirement: Health endpoint SHALL report run-time readiness
The system SHALL return a minimal readiness payload from `/health` that indicates service reachability and basic dependency availability when available.

#### Scenario: Health checks reflect liveness
- **WHEN** a GET request is sent to `/health`
- **THEN** the response SHALL be HTTP 200 and include a success indicator, and SHOULD include key dependency flags when available.

## MODIFIED Requirements

### Requirement: Server entrypoint behavior SHALL be deterministic across dev and runtime environments
Existing ad-hoc handler-only exports SHALL be replaced so deployment and local runtimes share one deterministic startup path.

#### Scenario: Same startup contract across environments
- **WHEN** the same commit is executed locally and in CI/staging
- **THEN** both environments SHALL use the same HTTP-start contract and expose `/health` with equivalent semantics.
