## ADDED Requirements

### Requirement: Media Route Error Logging SHALL

Media route failure-handling logic SHALL emit structured logs when recoverable failures happen, while preserving existing API response behavior.

#### Scenario: POST body parsing failure is logged

- **WHEN** a media endpoint receives an invalid JSON body
- **THEN** the endpoint **MUST** return the existing validation/error response
- **AND** a warning log **MUST** be emitted with route context, `userId` (if available), and the parsing error

#### Scenario: Upload retry failure is logged per attempt

- **WHEN** a social upload fails in `shareWithRetry`
- **THEN** each failed attempt **MUST** be logged with `platform`, `attempt`, `userId`, and the thrown error
- **AND** a final failure **MUST** still return the existing failure response format

#### Scenario: SSE stream close race is handled safely with logs

- **WHEN** `ReadableStream` close fails due to a race condition
- **THEN** the error **MUST** be logged
- **AND** stream cleanup **MUST** continue without throwing to the client
