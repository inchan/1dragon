## ADDED Requirements

### Requirement: Route validation failures SHALL use a standard response payload
The route layer SHALL emit standardized payloads for schema validation failures.

#### Scenario: Media route validation failure

- **WHEN** a request body in the media router fails `safeParse`
- **THEN** the response **MUST** use code `VALIDATION`
- **AND** response message **MUST** be `Validation failed`
- **AND** `details.fieldErrors` **MUST** include `field` and `message` pairs

#### Scenario: Payment route validation failure

- **WHEN** a request body in the payment router fails `safeParse`
- **THEN** the response **MUST** use code `VALIDATION`
- **AND** response message **MUST** be `Validation failed`
- **AND** `details.fieldErrors` **MUST** include `field` and `message` pairs
