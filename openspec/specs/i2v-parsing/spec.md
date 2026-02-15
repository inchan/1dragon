# i2v-parsing Specification

## Purpose
TBD - created by archiving change harden-i2v-json-parsing. Update Purpose after archive.
## Requirements
### Requirement: I2V provider responses SHALL reject malformed JSON payloads deterministically
The I2V adapter layer SHALL reject malformed or empty JSON responses as `I2VProviderError` instead of silently continuing.

#### Scenario: I2V base provider receives non-JSON response

- **WHEN** `BaseI2VAdapter.request` receives a non-JSON response body
- **THEN** it **MUST** throw `I2VProviderError`
- **AND** the error message must include `Invalid JSON`.

#### Scenario: I2V Gemini adapter receives malformed response on success path

- **WHEN** `GeminiVeoI2VAdapter.request` receives an invalid JSON body while `response.ok` is true
- **THEN** it **MUST** throw `I2VProviderError`
- **AND** request processing must not return an empty result object.

#### Scenario: I2V Gemini adapter receives invalid JSON on error path

- **WHEN** `GeminiVeoI2VAdapter.request` receives an invalid JSON body while `response.ok` is false
- **THEN** it **MUST** throw `I2VProviderError` with a parse-aware message and preserve provider context.

