# reference-intake-persistence Specification

## Purpose
Persist the normalized reference-first intake bundle on the job record so later phases and operator tooling can inspect one durable source of truth.

## Requirements

### Requirement: The system SHALL persist a durable reference-intake bundle for reference-first jobs
When a media job is created with `referenceBrief`, the system SHALL persist a `referenceIntake` bundle that captures the raw brief, normalized brief, and validated debug signals used during intake.

The persisted bundle SHALL support:
- raw `referenceBrief`
- `normalizedReferenceBrief`
- optional `productAnalysisId`
- optional `productAnalysis` snapshot
- optional `taxonomy`

#### Scenario: Reference intake persists on job creation
- **WHEN** a media job is created with `referenceBrief`
- **THEN** the job record SHALL store a durable `referenceIntake` bundle before the request returns success

#### Scenario: Non-reference jobs omit the intake bundle
- **WHEN** a media job is created without `referenceBrief`
- **THEN** the persisted `referenceIntake` bundle SHALL be absent
