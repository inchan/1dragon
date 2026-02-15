## ADDED Requirements

### Requirement: Generation request SHALL enqueue a BullMQ job for downstream workers
The system SHALL enqueue each valid media generation request into `media:generate` (or equivalent configured queue) and SHALL preserve enough metadata for worker execution.

#### Scenario: Queue enqueue on submit
- **WHEN** a generation request is accepted
- **THEN** the service SHALL enqueue a BullMQ job and persist a corresponding initial job status state.

### Requirement: Worker process lifecycle SHALL be started and connected on application startup
The system SHALL instantiate workers for `generate`, `compose`, and `render-variant` processing during runtime startup and register graceful shutdown hooks.

#### Scenario: Worker startup and shutdown
- **WHEN** the API process starts and stops
- **THEN** worker processors SHALL start without manual bootstrap and stop cleanly on shutdown.

### Requirement: Worker execution SHALL emit state transitions and errors
The system SHALL update job status/events as the worker transitions through each stage and SHALL surface terminal failure reasons through both stream and status APIs.

#### Scenario: Stage transition visibility
- **WHEN** a worker moves a job from queued to rendering
- **THEN** the persisted job status SHALL advance and emitted events SHALL include stage transitions.

#### Scenario: Worker failure propagation
- **WHEN** a queue worker fails a job
- **THEN** the status SHALL become FAILED and include an actionable error message while preserving retryability metadata.

## MODIFIED Requirements

### Requirement: State query and event feed MUST remain consistent with queue processing
Existing status/event contract SHALL be aligned so polling and stream consumers observe the same terminal state ordering for a given job.

#### Scenario: Consistent view across consumers
- **WHEN** a running job emits an update and the UI polls status shortly after
- **THEN** both stream snapshot and polling response SHALL reflect the same current progress and state transition.
