## ADDED Requirements

### Requirement: External API responses SHALL have deterministic parse error handling
The API clients SHALL handle malformed or non-JSON responses as deterministic errors and MUST not rely on silent fallback objects.

#### Scenario: Toss payment response is non-JSON

- **WHEN** Toss payment API returns non-JSON body
- **THEN** request handling **SHALL** throw `TossPaymentsApiError`
- **AND** the error code message must indicate parsing failure.

#### Scenario: Web API response has invalid JSON

- **WHEN** `apps/web/src/lib/api.ts` receives a response with invalid JSON
- **THEN** it **MUST** throw an error instead of returning a casted object.

#### Scenario: Web share endpoint returns malformed success payload

- **WHEN** `shareToSocial` receives `OK` status but malformed JSON
- **THEN** it **MUST** throw an error so callers do not proceed with invalid payload.
