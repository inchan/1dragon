## ADDED Requirements

### Requirement: API and stream parsing SHALL be resilient to malformed inputs
The system SHALL avoid uncontrolled exceptions when parsing external inputs and SHALL return or ignore malformed data in a controlled way.

#### Scenario: Toss webhook malformed JSON

- **WHEN** `POST /webhooks/toss` receives a non-JSON body
- **THEN** the webhook endpoint **MUST** return HTTP `400`
- **AND** the response `code` MUST be `INVALID_PAYLOAD`
- **AND** processing must not throw unhandled parsing exceptions.

#### Scenario: SSE malformed message

- **WHEN** the SSE stream delivers non-JSON data or payload missing required fields
- **THEN** the message **MUST** be skipped without throwing
- **AND** the stream handler must remain active for subsequent valid messages.

#### Scenario: Unknown persisted platform value

- **WHEN** a row contains a non-standard video platform value
- **THEN** platform mapping **MUST** fall back to `Platform.TIKTOK`
- **AND** a warning log **MUST** include the unknown value.
