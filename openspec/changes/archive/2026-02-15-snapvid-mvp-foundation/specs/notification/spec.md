## ADDED Requirements

### Requirement: SSE-based real-time job status streaming
The system SHALL provide Server-Sent Events (SSE) endpoint at `GET /api/v1/media/jobs/stream` for real-time job status updates. The stream MUST deliver JobStatusChanged events for all active jobs belonging to the authenticated user. Each event MUST include: job_id, status, progress percentage (0~100), message, and timestamp. SSE MUST support `Last-Event-ID` header for reconnection.

#### Scenario: SSE connection established
- **WHEN** a user connects to the SSE endpoint after submitting a generation job
- **THEN** the server establishes a persistent connection and starts streaming status events

#### Scenario: Job status update via SSE
- **WHEN** a job transitions from ANALYZING to GENERATING
- **THEN** the SSE stream sends an event with `{job_id, status: "GENERATING", progress: 30, message: "영상 생성 중..."}`

#### Scenario: Job completion via SSE
- **WHEN** a job transitions to SUCCEEDED
- **THEN** the SSE stream sends a final event with `{job_id, status: "SUCCEEDED", progress: 100, video_url: "..."}` and the job is removed from the active stream

#### Scenario: SSE reconnection with Last-Event-ID
- **WHEN** the SSE connection drops and the client reconnects with `Last-Event-ID: 42`
- **THEN** the server replays all events after ID 42 from the Outbox cache (TTL: 5 minutes)

#### Scenario: Multiple concurrent jobs
- **WHEN** a user has 2 active generation jobs
- **THEN** both jobs' status events are multiplexed on the same SSE connection, distinguished by job_id

---

### Requirement: Polling fallback for job status
The system SHALL provide a polling endpoint at `GET /api/v1/media/jobs/:jobId` for environments where SSE is not supported. The response MUST include: job_id, status, progress, message, created_at, updated_at. Clients MUST poll at no more than 2-second intervals.

#### Scenario: Poll job status
- **WHEN** a client sends GET /api/v1/media/jobs/{jobId}
- **THEN** the server returns the current job status with progress percentage

#### Scenario: Poll completed job
- **WHEN** a client polls a SUCCEEDED job
- **THEN** the response includes status "SUCCEEDED", progress 100, and video_url for download/preview

#### Scenario: Poll non-existent job
- **WHEN** a client polls with an invalid job ID
- **THEN** the server returns HTTP 404 with message "Job not found"

---

### Requirement: Outbox pattern for event persistence
The system SHALL use the Outbox pattern for reliable event delivery. Every job state transition MUST write a JobStatusChanged event to the `job_events` table within the same database transaction as the state change. An Outbox Dispatcher worker MUST asynchronously read unpublished events and deliver them to the SSE broker.

#### Scenario: Atomic state change and event write
- **WHEN** a job transitions from GENERATING to COMPOSING
- **THEN** both the job status update and the JobStatusChanged event are written in a single database transaction

#### Scenario: Outbox dispatcher processing
- **WHEN** a new event is written to the Outbox
- **THEN** the dispatcher picks it up within 500ms, delivers it to the SSE broker, and marks it as dispatched

#### Scenario: Dispatcher crash recovery
- **WHEN** the Outbox dispatcher restarts after a crash
- **THEN** it resumes processing from the last undispatched event (at-least-once delivery)

#### Scenario: Duplicate event handling
- **WHEN** the dispatcher delivers the same event twice (at-least-once semantics)
- **THEN** the SSE broker deduplicates using event_id and does not send the duplicate to clients

---

### Requirement: Notification event schema
All notification events MUST conform to a standard schema: `{event_id: string, job_id: string, user_id: string, status: JobStatus, progress: number, message: string, metadata: Record<string, unknown>, occurred_at: ISO8601}`. The `occurred_at` timestamp MUST be used for ordering (not database insert time).

#### Scenario: Event schema validation
- **WHEN** a new JobStatusChanged event is created
- **THEN** it conforms to the standard schema with all required fields populated

#### Scenario: Event ordering by occurred_at
- **WHEN** events arrive out of order (network delay)
- **THEN** the client reorders events by occurred_at for consistent display

---

### Requirement: SSE connection lifecycle management
The system SHALL handle SSE connection lifecycle: heartbeat every 30 seconds to keep connections alive, automatic cleanup of stale connections after 5 minutes of no activity, and maximum connection duration of 1 hour (client must reconnect).

#### Scenario: Heartbeat keeps connection alive
- **WHEN** no job events occur for 30 seconds
- **THEN** the server sends a heartbeat comment (`:heartbeat`) to keep the connection alive

#### Scenario: Stale connection cleanup
- **WHEN** a client disconnects without proper close (network drop)
- **THEN** the server detects the stale connection within 5 minutes and releases resources

#### Scenario: Maximum connection duration
- **WHEN** an SSE connection has been open for 1 hour
- **THEN** the server sends a reconnect event and closes the connection, expecting the client to reconnect

---

### Requirement: Rate limit notification
The system SHALL notify users when their generation request is rate-limited. The notification MUST include: queue position, estimated wait time, and the reason for the wait. Rate limit events MUST be delivered via the same SSE/Polling mechanism.

#### Scenario: Rate limited job notification
- **WHEN** a user's job is queued due to provider rate limiting
- **THEN** an SSE event is sent with `{status: "QUEUED", progress: 0, message: "대기 중입니다 (예상 대기: ~2분)", metadata: {queue_position: 5}}`

#### Scenario: Queue position update
- **WHEN** the queue position changes (e.g., from 5th to 3rd)
- **THEN** an updated event is sent with the new queue position and revised estimated wait time
